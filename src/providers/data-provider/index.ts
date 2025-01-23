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
  GetListResponse
} from "@refinedev/core";

const API_URL = "https://api.fake-rest.refine.dev";

// Construct the R2 endpoint URL
const R2_ACCOUNT_ID = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
const R2_BUCKET_NAME = process.env.NEXT_PUBLIC_R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY;

// R2 file interface
interface R2FileRecord extends BaseRecord {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
  contentType?: string;
}

// Construct the R2 API URL
const R2_API_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}`;

// Helper function to get authorization headers
const getAuthHeaders = () => {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
	console.error('R2 credentials not found');
	throw new Error('R2 credentials not configured');
  }

  const headers = new Headers();
  headers.append('Authorization', 'Basic ' + btoa(`${R2_ACCESS_KEY_ID}:${R2_SECRET_ACCESS_KEY}`));
  headers.append('Content-Type', 'application/json');
  
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
  getList: async ({ resource, pagination, filters, sorters }): Promise<GetListResponse<R2FileRecord>> => {
	try {
	  const response = await fetch(`${R2_API_URL}/`, {
		headers: getAuthHeaders(),
	  });

	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }

	  const data = await response.json();
	  
	  let items = data.objects || [];
	  
	  // Transform the R2 objects into the format we need
	  items = items.map((item: any): R2FileRecord => ({
		id: item.key,
		key: item.key,
		size: item.size,
		lastModified: item.lastModified,
		etag: item.etag,
		contentType: item.contentType
	  }));
	  
	  if (pagination?.current !== undefined && pagination?.pageSize !== undefined) {
		const start = (pagination.current - 1) * pagination.pageSize;
		const end = start + pagination.pageSize;
		items = items.slice(start, end);
	  }
	  
	  return {
		data: items,
		total: (data.objects || []).length,
	  };
	} catch (error) {
	  console.error('R2 getList error:', error);
	  return {
		data: [],
		total: 0
	  };
	}
  },

  getOne: async ({ resource, id }): Promise<GetOneResponse<R2FileRecord>> => {
	try {
	  const response = await fetch(`${R2_API_URL}/${id}`, {
		headers: getAuthHeaders(),
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
		}
	  };
	} catch (error) {
	  console.error('R2 getOne error:', error);
	  throw error;
	}
  },

  create: async ({ resource, variables }): Promise<CreateResponse<R2FileRecord>> => {
	try {
	  const file = (variables as any).file;
	  if (!file) {
		throw new Error('No file provided');
	  }

	  const headers = getAuthHeaders();
	  headers.set('Content-Type', file.type);

	  const response = await fetch(`${R2_API_URL}/${file.name}`, {
		method: 'PUT',
		headers: headers,
		body: file
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
		}
	  };
	} catch (error) {
	  console.error('R2 create error:', error);
	  throw error;
	}
  },

  deleteOne: async ({ resource, id }): Promise<DeleteOneResponse<R2FileRecord>> => {
	try {
	  const response = await fetch(`${R2_API_URL}/${id}`, {
		method: 'DELETE',
		headers: getAuthHeaders(),
	  });
	  
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  
	  return {
		data: { id } as R2FileRecord
	  };
	} catch (error) {
	  console.error('R2 deleteOne error:', error);
	  throw error;
	}
  },

  getMany: async ({ resource, ids }): Promise<{ data: R2FileRecord[] }> => {
	try {
	  const data = await Promise.all(
		ids.map(async (id) => {
		  const response = await fetch(`${R2_API_URL}/${id}`, {
			headers: getAuthHeaders(),
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
	  return { data };
	} catch (error) {
	  console.error('R2 getMany error:', error);
	  throw error;
	}
  },

  getApiUrl: () => R2_API_URL,

  custom: async <TData extends BaseRecord = R2FileRecord>(): Promise<CustomResponse<TData>> => {
	return {
	  data: {} as TData,
	};
  },

  update: async (): Promise<UpdateResponse<R2FileRecord>> => {
	return {
	  data: {} as R2FileRecord,
	};
  },
};

export const dataProvider = {
  default: mainProvider,
  r2: r2Provider,
};