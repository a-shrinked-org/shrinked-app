"use client";
import dataProviderSimpleRest from "@refinedev/simple-rest";
import { DataProvider } from "@refinedev/core";

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
getList: async ({ resource, pagination }) => {
	const response = await fetch(`${R2_API_URL}/list`);
	const data = await response.json();
	let items = data.objects || [];
	
	// Handle pagination with safe checks
	if (pagination && typeof pagination.current !== 'undefined' && typeof pagination.pageSize !== 'undefined') {
		const start = (pagination.current - 1) * pagination.pageSize;
		const end = start + pagination.pageSize;
		items = items.slice(start, end);
	}
	
	return {
		data: items,
		total: (data.objects || []).length,
	};
},

 getOne: async ({ resource, id }) => {
		const response = await fetch(`${R2_API_URL}/object/${id}`);
		const data = await response.json();
		return { data };
	},

	create: async ({ resource, variables }) => {
		const formData = new FormData();
		formData.append('file', variables.file);
		
		const response = await fetch(`${R2_API_URL}/upload`, {
			method: 'POST',
			body: formData,
		});
		const data = await response.json();
		return { data };
	},

	update: async ({ resource, id, variables }) => {
		// Required by interface but not used
		return { data: null };
	},

	deleteOne: async ({ resource, id }) => {
		await fetch(`${R2_API_URL}/object/${id}`, {
			method: 'DELETE',
		});
		return { data: null };
	},

	getMany: async ({ resource, ids }) => {
		const data = await Promise.all(
			ids.map(async (id) => {
				const response = await fetch(`${R2_API_URL}/object/${id}`);
				return response.json();
			})
		);
		return { data };
	},

	getApiUrl: () => R2_API_URL || "",
};

export const dataProvider = {
  default: mainProvider,
  r2: r2Provider,
};