"use client";

import dataProviderSimpleRest from "@refinedev/simple-rest";
import { 
  DataProvider,
  CreateParams,
  UpdateParams,
  DeleteOneParams,
  UpdateResponse,
  CreateResponse,
  DeleteOneResponse,
  CustomResponse,
  CustomParams,
  BaseRecord,
  GetOneResponse,
  GetOneParams,
  GetListResponse,
  GetListParams
} from "@refinedev/core";
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const API_URL = "https://api.fake-rest.refine.dev";

// Construct the R2 endpoint URL
const R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.NEXT_PUBLIC_R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY;

// Initialize S3 client for R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
	accessKeyId: R2_ACCESS_KEY_ID!,
	secretAccessKey: R2_SECRET_ACCESS_KEY!
  }
});

// R2 file interface
interface R2FileRecord extends BaseRecord {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  contentType?: string;
}

const simpleRestProvider = dataProviderSimpleRest(API_URL);

// Main provider for regular API endpoints
const mainProvider: DataProvider = {
  ...simpleRestProvider,
  getList: async ({ resource, ...params }) => {
	return simpleRestProvider.getList({ 
	  resource: resource === "jobs" ? "blog_posts" : resource,
	  ...params 
	});
  },
  getOne: async ({ resource, ...params }) => {
	return simpleRestProvider.getOne({ 
	  resource: resource === "jobs" ? "blog_posts" : resource,
	  ...params 
	});
  },
  create: async ({ resource, ...params }) => {
	return simpleRestProvider.create({ 
	  resource: resource === "jobs" ? "blog_posts" : resource,
	  ...params 
	});
  },
  update: async ({ resource, ...params }) => {
	return simpleRestProvider.update({ 
	  resource: resource === "jobs" ? "blog_posts" : resource,
	  ...params 
	});
  },
  deleteOne: async ({ resource, ...params }) => {
	return simpleRestProvider.deleteOne({ 
	  resource: resource === "jobs" ? "blog_posts" : resource,
	  ...params 
	});
  },
  getMany: async ({ resource, ...params }) => {
	return simpleRestProvider.getMany({ 
	  resource: resource === "jobs" ? "blog_posts" : resource,
	  ...params 
	});
  }
};

// R2 provider for file operations
const r2Provider: DataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>(
	params: GetListParams
  ): Promise<GetListResponse<TData>> => {
	try {
	  const command = new ListObjectsV2Command({
		Bucket: R2_BUCKET_NAME,
	  });

	  const response = await s3Client.send(command);
	  
	  let items = response.Contents || [];
	  
	  // Transform the R2 objects into the format we need
	  const transformedItems = items.map((item) => ({
		id: item.Key,
		key: item.Key,
		size: item.Size,
		lastModified: item.LastModified?.toISOString(),
		etag: item.ETag?.replace(/"/g, ''), // Remove quotes from ETag
		contentType: undefined // S3 API doesn't return content type in list
	  }));
	  
	  if (params.pagination?.current !== undefined && params.pagination?.pageSize !== undefined) {
		const start = (params.pagination.current - 1) * params.pagination.pageSize;
		const end = start + params.pagination.pageSize;
		return {
		  data: transformedItems.slice(start, end) as unknown as TData[],
		  total: transformedItems.length,
		};
	  }
	  
	  return {
		data: transformedItems as unknown as TData[],
		total: transformedItems.length,
	  };
	} catch (error) {
	  console.error('R2 getList error:', error);
	  return {
		data: [] as unknown as TData[],
		total: 0
	  };
	}
  },

  getOne: async <TData extends BaseRecord = BaseRecord>(
	params: GetOneParams
  ): Promise<GetOneResponse<TData>> => {
	try {
	  const command = new GetObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: params.id.toString(),
	  });
	  
	  const response = await s3Client.send(command);
	  
	  return { 
		data: {
		  id: params.id,
		  key: params.id,
		  size: response.ContentLength,
		  lastModified: response.LastModified?.toISOString(),
		  etag: response.ETag?.replace(/"/g, ''),
		  contentType: response.ContentType
		} as unknown as TData
	  };
	} catch (error) {
	  console.error('R2 getOne error:', error);
	  throw error;
	}
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(
	params: CreateParams<TVariables>
  ): Promise<CreateResponse<TData>> => {
	try {
	  const file = (params.variables as any).file;
	  if (!file) {
		throw new Error('No file provided');
	  }

	  const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: file.name,
		Body: file,
		ContentType: file.type
	  });

	  const response = await s3Client.send(command);
	  
	  return {
		data: {
		  id: file.name,
		  key: file.name,
		  size: file.size,
		  lastModified: new Date().toISOString(),
		  etag: response.ETag?.replace(/"/g, ''),
		  contentType: file.type
		} as unknown as TData
	  };
	} catch (error) {
	  console.error('R2 create error:', error);
	  throw error;
	}
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(
	params: DeleteOneParams<TVariables>
  ): Promise<DeleteOneResponse<TData>> => {
	try {
	  const command = new DeleteObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: params.id.toString()
	  });

	  await s3Client.send(command);
	  
	  return {
		data: { id: params.id } as unknown as TData
	  };
	} catch (error) {
	  console.error('R2 deleteOne error:', error);
	  throw error;
	}
  },

  getMany: async <TData extends BaseRecord = BaseRecord>(
	params: { ids: BaseRecord['id'][] }
  ): Promise<{ data: TData[] }> => {
	try {
	  const data = await Promise.all(
		params.ids.map(async (id) => {
		  const command = new GetObjectCommand({
			Bucket: R2_BUCKET_NAME,
			Key: id.toString()
		  });
		  const response = await s3Client.send(command);
		  return {
			id: id,
			key: id,
			size: response.ContentLength,
			lastModified: response.LastModified?.toISOString(),
			etag: response.ETag?.replace(/"/g, ''),
			contentType: response.ContentType
		  };
		})
	  );
	  return { data: data as unknown as TData[] };
	} catch (error) {
	  console.error('R2 getMany error:', error);
	  throw error;
	}
  },

  getApiUrl: () => `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,

  custom: async <TData extends BaseRecord = BaseRecord>(
	params: CustomParams
  ): Promise<CustomResponse<TData>> => {
	return {
	  data: {} as TData,
	};
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(
	params: UpdateParams<TVariables>
  ): Promise<UpdateResponse<TData>> => {
	return {
	  data: {} as TData,
	};
  },
};

export const dataProvider = {
  default: mainProvider,
  r2: r2Provider,
};