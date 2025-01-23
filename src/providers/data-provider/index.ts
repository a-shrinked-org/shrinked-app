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

const API_URL = "https://api.fake-rest.refine.dev";

// Construct the R2 endpoint URL
const R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.NEXT_PUBLIC_R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY;

// Debug logging for environment variables
console.log('Environment Variables Check:', {
  ACCOUNT_ID: process.env.NEXT_PUBLIC_R2_ACCOUNT_ID ? 'exists' : 'missing',
  BUCKET_NAME: process.env.NEXT_PUBLIC_R2_BUCKET_NAME ? 'exists' : 'missing',
  ACCESS_KEY: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID ? 'exists' : 'missing',
  SECRET_KEY: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY ? 'exists' : 'missing'
});

// R2 file interface
interface R2FileRecord extends BaseRecord {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  contentType?: string;
}

// Construct the R2 API URL
const R2_API_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const S3_ENDPOINT = R2_API_URL;
const BUCKET_PATH = R2_BUCKET_NAME;

// Log the configuration for debugging
console.log('R2 Configuration:', {
  endpoint: S3_ENDPOINT,
  bucket: BUCKET_PATH,
  fullUrl: `${S3_ENDPOINT}/${BUCKET_PATH}`
});

// Helper function to get authorization headers
const getAuthHeaders = () => {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
	console.error('R2 credentials check:', {
	  hasAccessKey: !!R2_ACCESS_KEY_ID,
	  hasSecretKey: !!R2_SECRET_ACCESS_KEY,
	  hasAccountId: !!R2_ACCOUNT_ID,
	  hasBucketName: !!R2_BUCKET_NAME
	});
	throw new Error('R2 credentials not configured - missing required credentials');
  }

  const headers = new Headers({
	'Authorization': 'Basic ' + btoa(`${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}`),
	'Content-Type': 'application/json',
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  
  return headers;
};

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
	  const response = await fetch(`${S3_ENDPOINT}/${BUCKET_PATH}/?list-type=2`, {
		method: 'GET',
		headers: getAuthHeaders(),
		mode: 'cors',
		credentials: 'include'
	  });

	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }

	  const data = await response.json();
	  
	  let items = data.objects || [];
	  
	  // Transform the R2 objects into the format we need
	  items = items.map((item: any) => ({
		id: item.key,
		key: item.key,
		size: item.size,
		lastModified: item.lastModified,
		etag: item.etag,
		contentType: item.contentType
	  }));
	  
	  if (params.pagination?.current !== undefined && params.pagination?.pageSize !== undefined) {
		const start = (params.pagination.current - 1) * params.pagination.pageSize;
		const end = start + params.pagination.pageSize;
		items = items.slice(start, end);
	  }
	  
	  return {
		data: items as unknown as TData[],
		total: (data.objects || []).length,
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
	  const response = await fetch(`${S3_ENDPOINT}/${BUCKET_PATH}/${params.id}`, {
		method: 'GET',
		headers: getAuthHeaders(),
		mode: 'cors',
		credentials: 'include'
	  });
	  
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  
	  const data = await response.json();
	  return { 
		data: {
		  id: data.key,
		  key: data.key,
		  size: data.size,
		  lastModified: data.lastModified,
		  etag: data.etag,
		  contentType: data.contentType
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

	  const headers = getAuthHeaders();
	  headers.set('Content-Type', file.type);

	  const response = await fetch(`${S3_ENDPOINT}/${BUCKET_PATH}/${file.name}`, {
		method: 'PUT',
		headers: headers,
		body: file,
		mode: 'cors',
		credentials: 'include'
	  });
	  
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  
	  return {
		data: {
		  id: file.name,
		  key: file.name,
		  size: file.size,
		  lastModified: new Date().toISOString(),
		  etag: response.headers.get('etag') || '',
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
	  const response = await fetch(`${S3_ENDPOINT}/${BUCKET_PATH}/${params.id}`, {
		method: 'DELETE',
		headers: getAuthHeaders(),
		mode: 'cors',
		credentials: 'include'
	  });
	  
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  
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
		  const response = await fetch(`${S3_ENDPOINT}/${BUCKET_PATH}/${id}`, {
			method: 'GET',
			headers: getAuthHeaders(),
			mode: 'cors',
			credentials: 'include'
		  });
		  if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		  }
		  const fileData = await response.json();
		  return {
			id: fileData.key,
			key: fileData.key,
			size: fileData.size,
			lastModified: fileData.lastModified,
			etag: fileData.etag,
			contentType: fileData.contentType
		  };
		})
	  );
	  return { data: data as unknown as TData[] };
	} catch (error) {
	  console.error('R2 getMany error:', error);
	  throw error;
	}
  },

  getApiUrl: () => `${S3_ENDPOINT}/${BUCKET_PATH}`,

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