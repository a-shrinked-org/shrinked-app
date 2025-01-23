"use client";

import dataProviderSimpleRest from "@refinedev/simple-rest";
import { 
  DataProvider,
  CrudFilters,
  CrudSorting,
  CrudOperators,
  BaseRecord,
  HttpError,
  MetaDataQuery
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
  getList: async ({ 
	resource,
	pagination,
	filters,
	sorters,
	meta
  }) => {
	try {
	  const response = await fetch(`${R2_API_URL}/list`);
	  if (!response.ok) {
		throw new HttpError(response);
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
	  throw new HttpError(error as Response);
	}
  },

  getOne: async ({ 
	resource,
	id,
	meta
  }) => {
	try {
	  const response = await fetch(`${R2_API_URL}/object/${id}`);
	  if (!response.ok) {
		throw new HttpError(response);
	  }
	  const data = await response.json();
	  return { data };
	} catch (error) {
	  throw new HttpError(error as Response);
	}
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = {}> ({ 
	resource,
	variables,
	meta
  }) => {
	try {
	  const formData = new FormData();
	  const file = (variables as any).file;
	  if (file) {
		formData.append('file', file);
	  }
	  
	  const response = await fetch(`${R2_API_URL}/upload`, {
		method: 'POST',
		body: formData,
	  });
	  
	  if (!response.ok) {
		throw new HttpError(response);
	  }
	  
	  const data = await response.json();
	  return { data: data as TData };
	} catch (error) {
	  throw new HttpError(error as Response);
	}
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}> ({ 
	resource,
	id,
	variables,
	meta
  }) => {
	try {
	  const response = await fetch(`${R2_API_URL}/object/${id}`, {
		method: 'DELETE',
	  });
	  if (!response.ok) {
		throw new HttpError(response);
	  }
	  return { data: {} as TData };
	} catch (error) {
	  throw new HttpError(error as Response);
	}
  },
  
  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}> ({ 
	resource,
	id,
	variables,
	meta
  }) => {
	return { data: {} as TData };
  },

  getMany: async ({ 
	resource,
	ids,
	meta
  }) => {
	try {
	  const data = await Promise.all(
		ids.map(async (id) => {
		  const response = await fetch(`${R2_API_URL}/object/${id}`);
		  if (!response.ok) {
			throw new HttpError(response);
		  }
		  return response.json();
		})
	  );
	  return { data };
	} catch (error) {
	  throw new HttpError(error as Response);
	}
  },

  getApiUrl: () => R2_API_URL || "",

  custom: async ({ 
	url,
	method,
	filters,
	sorters,
	payload,
	query,
	headers,
	meta 
  }) => {
	return { data: {} };
  },
};

export const dataProvider = {
  default: mainProvider,
  r2: r2Provider,
};