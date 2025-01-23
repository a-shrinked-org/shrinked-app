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
	accessKeyId: R2_ACCESS_KEY_ID ?? '',
	secretAccessKey: R2_SECRET_ACCESS_KEY ?? ''
  }
});

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
  getList: async <TData extends BaseRecord = BaseRecord>({ 
	resource, 
	pagination 
  }: GetListParams): Promise<GetListResponse<TData>> => {
	try {
	  const command = new ListObjectsV2Command({
		Bucket: R2_BUCKET_NAME ?? '',
	  });

	  const response = await s3Client.send(command);
	  
	  let items = response.Contents || [];
	  
	  // Transform the R2 objects into the format we need
	  const transformedItems = items.map((item) => ({
		id: item.Key ?? '',
		key: item.Key ?? '',
		size: item.Size ?? 0,
		lastModified: item.LastModified?.toISOString() ?? new Date().toISOString(),
		etag: item.ETag?.replace(/"/g, '') ?? '',
		contentType: undefined
	  } as unknown as TData));
	  
	  if (pagination?.current && pagination?.pageSize) {
		const start = (pagination.current - 1) * pagination.pageSize;
		const end = start + pagination.pageSize;
		return {
		  data: transformedItems.slice(start, end),
		  total: transformedItems.length,
		};
	  }
	  
	  return {
		data: transformedItems,
		total: transformedItems.length,
	  };
	} catch (error) {
	  console.error('R2 getList error:', error);
	  return {
		data: [],
		total: 0
	  };
	}
  },

  getOne: async <TData extends BaseRecord = BaseRecord>({
	id,
  }: GetOneParams): Promise<GetOneResponse<TData>> => {
	try {
	  if (!id) throw new Error('No id provided');

	  const command = new GetObjectCommand({
		Bucket: R2_BUCKET_NAME ?? '',
		Key: id.toString(),
	  });
	  
	  const response = await s3Client.send(command);
	  
	  const data = {
		id,
		key: id.toString(),
		size: response.ContentLength ?? 0,
		lastModified: response.LastModified?.toISOString() ?? new Date().toISOString(),
		etag: response.ETag?.replace(/"/g, '') ?? '',
		contentType: response.ContentType
	  } as unknown as TData;
	  
	  return { data };
	} catch (error) {
	  console.error('R2 getOne error:', error);
	  throw error;
	}
  },

  create: async <TData extends BaseRecord = BaseRecord>({
	variables
  }: CreateParams): Promise<CreateResponse<TData>> => {
	try {
	  const file = (variables as any).file;
	  if (!file) {
		throw new Error('No file provided');
	  }

	  const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME ?? '',
		Key: file.name,
		Body: file,
		ContentType: file.type
	  });

	  const response = await s3Client.send(command);
	  
	  const data = {
		id: file.name,
		key: file.name,
		size: file.size,
		lastModified: new Date().toISOString(),
		etag: response.ETag?.replace(/"/g, '') ?? '',
		contentType: file.type
	  } as unknown as TData;

	  return { data };
	} catch (error) {
	  console.error('R2 create error:', error);
	  throw error;
	}
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord>({
	id
  }: DeleteOneParams): Promise<DeleteOneResponse<TData>> => {
	try {
	  if (!id) throw new Error('No id provided');

	  const command = new DeleteObjectCommand({
		Bucket: R2_BUCKET_NAME ?? '',
		Key: id.toString()
	  });

	  await s3Client.send(command);
	  
	  return {
		data: { id } as unknown as TData
	  };
	} catch (error) {
	  console.error('R2 deleteOne error:', error);
	  throw error;
	}
  },

  getMany: async <TData extends BaseRecord = BaseRecord>({
	ids
  }: { ids: BaseRecord['id'][] }): Promise<{ data: TData[] }> => {
	try {
	  if (!ids || ids.length === 0) return { data: [] };

	  const data = await Promise.all(
		ids.map(async (id) => {
		  if (!id) throw new Error('Invalid id in getMany');

		  const command = new GetObjectCommand({
			Bucket: R2_BUCKET_NAME ?? '',
			Key: id.toString()
		  });
		  
		  const response = await s3Client.send(command);
		  
		  return {
			id,
			key: id.toString(),
			size: response.ContentLength ?? 0,
			lastModified: response.LastModified?.toISOString() ?? new Date().toISOString(),
			etag: response.ETag?.replace(/"/g, '') ?? '',
			contentType: response.ContentType
		  } as unknown as TData;
		})
	  );
	  
	  return { data };
	} catch (error) {
	  console.error('R2 getMany error:', error);
	  throw error;
	}
  },

  getApiUrl: () => `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,

  custom: async <TData extends BaseRecord = BaseRecord>({
  }: CustomParams): Promise<CustomResponse<TData>> => {
	return {
	  data: {} as TData,
	};
  },

  update: async <TData extends BaseRecord = BaseRecord>({
  }: UpdateParams): Promise<UpdateResponse<TData>> => {
	return {
	  data: {} as TData,
	};
  },
};

export const dataProvider = {
  default: mainProvider,
  r2: r2Provider,
};