"use client";
import dataProviderSimpleRest from "@refinedev/simple-rest";
import { DataProvider, CreateParams, BaseRecord } from "@refinedev/core";

// Update the interface to extend BaseRecord
interface R2Variables extends BaseRecord {
  file: File;
  [key: string]: any;
}

const API_URL = "https://api.fake-rest.refine.dev";
const R2_API_URL = process.env.NEXT_PUBLIC_R2_BASE_URL;

const simpleRestProvider = dataProviderSimpleRest(API_URL);

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

const r2Provider: DataProvider = {
  getList: async ({ resource, pagination, sorters, filters }) => {
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
	  console.error('Error fetching list:', error);
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
	  console.error('Error fetching file:', error);
	  throw error;
	}
  },

  // Fixed create method with proper types
  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}>(
	params: CreateParams<TVariables>
  ) => {
	try {
	  const variables = params.variables as R2Variables;
	  const formData = new FormData();
	  formData.append('file', variables.file);
	  
	  const response = await fetch(`${R2_API_URL}/upload`, {
		method: 'POST',
		body: formData,
	  });
	  if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	  }
	  const data = await response.json();
	  return { data: data as TData };
	} catch (error) {
	  console.error('Error uploading file:', error);
	  throw error;
	}
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
	  // Return an empty object cast as TData instead of null
	  return { data: {} as TData };
	} catch (error) {
	  console.error('Error deleting file:', error);
	  throw error;
	}
  },
  
  update: async ({ resource, id, variables }) => {
	return { data: null };
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
	  console.error('Error fetching multiple files:', error);
	  throw error;
	}
  },

  getApiUrl: () => R2_API_URL || "",
};

export const dataProvider = {
  default: mainProvider,
  r2: r2Provider,
};