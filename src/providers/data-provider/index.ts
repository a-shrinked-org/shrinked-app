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
  BaseRecord
} from "@refinedev/core";

const API_URL = "https://api.fake-rest.refine.dev";
const R2_API_URL = process.env.NEXT_PUBLIC_R2_BASE_URL;

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
  getList: async ({ resource, pagination, filters, sorters }) => {
	try {
	  const response = await fetch(`${R2_API_URL}/list`);
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  const data = await response.json();
	  
	  let items = data.objects || [];
	  
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
	  throw error;
	}
  },

  getOne: async ({ resource, id }) => {
	try {
	  const response = await fetch(`${R2_API_URL}/object/${id}`);
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  const data = await response.json();
	  return { data };
	} catch (error) {
	  throw error;
	}
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(
	params: CreateParams<TVariables>
  ): Promise<CreateResponse<TData>> => {
	try {
	  const formData = new FormData();
	  const file = (params.variables as any).file;
	  if (file) {
		formData.append('file', file);
	  }
	  
	  const response = await fetch(`${R2_API_URL}/upload`, {
		method: 'POST',
		body: formData,
	  });
	  
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  
	  const data = await response.json();
	  return {
		data: data as TData,
	  };
	} catch (error) {
	  throw error;
	}
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(
	params: UpdateParams<TVariables>
  ): Promise<UpdateResponse<TData>> => {
	return {
	  data: {} as TData,
	};
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(
	params: DeleteOneParams<TVariables>
  ): Promise<DeleteOneResponse<TData>> => {
	try {
	  const response = await fetch(`${R2_API_URL}/object/${params.id}`, {
		method: 'DELETE',
	  });
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  return {
		data: {} as TData,
	  };
	} catch (error) {
	  throw error;
	}
  },

  getMany: async ({ resource, ids }) => {
	try {
	  const data = await Promise.all(
		ids.map(async (id) => {
		  const response = await fetch(`${R2_API_URL}/object/${id}`);
		  if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		  }
		  return response.json();
		})
	  );
	  return { data };
	} catch (error) {
	  throw error;
	}
  },

  getApiUrl: () => R2_API_URL || "",

  custom: async <TData extends BaseRecord = BaseRecord, TQuery = unknown, TPayload = unknown>(
	params: CustomParams<TQuery, TPayload>
  ): Promise<CustomResponse<TData>> => {
	return {
	  data: {} as TData,
	};
  },
};

export const dataProvider = {
  default: mainProvider,
  r2: r2Provider,
};