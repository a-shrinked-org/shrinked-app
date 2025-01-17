"use client";
import dataProviderSimpleRest from "@refinedev/simple-rest";

const API_URL = "https://api.fake-rest.refine.dev";

const simpleRestProvider = dataProviderSimpleRest(API_URL);

export const dataProvider = {
  ...simpleRestProvider,
  // Override methods to map "jobs" to "blog_posts"
  getList: async ({ resource, ...rest }) => {
	const mappedResource = resource === "jobs" ? "blog_posts" : resource;
	return simpleRestProvider.getList({ resource: mappedResource, ...rest });
  },
  getOne: async ({ resource, ...rest }) => {
	const mappedResource = resource === "jobs" ? "blog_posts" : resource;
	return simpleRestProvider.getOne({ resource: mappedResource, ...rest });
  },
  create: async ({ resource, ...rest }) => {
	const mappedResource = resource === "jobs" ? "blog_posts" : resource;
	return simpleRestProvider.create({ resource: mappedResource, ...rest });
  },
  update: async ({ resource, ...rest }) => {
	const mappedResource = resource === "jobs" ? "blog_posts" : resource;
	return simpleRestProvider.update({ resource: mappedResource, ...rest });
  },
  deleteOne: async ({ resource, ...rest }) => {
	const mappedResource = resource === "jobs" ? "blog_posts" : resource;
	return simpleRestProvider.deleteOne({ resource: mappedResource, ...rest });
  },
  getMany: async ({ resource, ...rest }) => {
	const mappedResource = resource === "jobs" ? "blog_posts" : resource;
	return simpleRestProvider.getMany({ resource: mappedResource, ...rest });
  },
  custom: async ({ resource, ...rest }) => {
	const mappedResource = resource === "jobs" ? "blog_posts" : resource;
	return simpleRestProvider.custom({ resource: mappedResource, ...rest });
  },
};