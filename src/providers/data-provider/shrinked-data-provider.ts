// src/providers/data-provider/shrinked-data-provider.ts

import {
  DataProvider,
  CrudFilters,
  CrudSorting,
  HttpError,
  Pagination,
  BaseRecord,
} from "@refinedev/core";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { authUtils } from "@/utils/authUtils";

// Environment check
const IS_DEV = process.env.NODE_ENV === 'development';

// Create axios instance
const axiosInstance = axios.create();

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
	return response;
  },
  (error) => {
	const customError: HttpError = {
	  message: "An unexpected error occurred",
	  statusCode: 500,
	};
	if (error.response) {
	  customError.statusCode = error.response.status;
	  if (error.response.data && typeof error.response.data === 'object') {
		if ('message' in error.response.data && error.response.data.message) {
		  customError.message = error.response.data.message;
		}
		if ('errors' in error.response.data) {
		  customError.errors = error.response.data.errors;
		}
	  }
	} else if (error.message) {
	  customError.message = error.message;
	}

	if (IS_DEV) console.error("Axios Error Interceptor Processed:", customError);
	return Promise.reject(customError);
  }
);

// Helper function for processing filters
const generateFilters = (filters?: CrudFilters) => {
  const queryFilters: { [key: string]: any } = {};
  filters?.forEach((filter) => {
	if ("field" in filter) {
	  const { field, operator, value } = filter;
	  if (operator === "eq") {
		queryFilters[field] = value;
	  } else if (operator === "contains") {
		queryFilters[`${field}_contains`] = value;
	  } else if (operator === "ne") {
		queryFilters[`${field}_ne`] = value;
	  } else if (operator === "lt") {
		queryFilters[`${field}_lt`] = value;
	  } else if (operator === "gt") {
		queryFilters[`${field}_gt`] = value;
	  } else if (operator === "lte") {
		queryFilters[`${field}_lte`] = value;
	  } else if (operator === "gte") {
		queryFilters[`${field}_gte`] = value;
	  } else if (operator === "in") {
		queryFilters[`${field}_in`] = value;
	  }
	}
  });
  return queryFilters;
};

// Helper function for processing sort orders
const generateSort = (sorters?: CrudSorting) => {
  if (sorters && sorters.length > 0) {
	const sort = sorters[0].field;
	const order = sorters[0].order;
	return { _sort: sort, _order: order };
  }
  return {};
};

// Document operations helper functions
export interface ProcessedDocument extends BaseRecord {
  _id: string;
  jobId?: string;
  title?: string;
  fileName?: string;
  createdAt: string;
  status?: string;
  output?: {
	title?: string;
  }
}

// Document-specific operations
export const documentOperations = {
  fetchJobIdsForDocs: async (documents: ProcessedDocument[], apiUrl: string): Promise<Record<string, string>> => {
	if (IS_DEV) console.log("[DocOps] fetchJobIdsForDocs called with documents:", documents.map(d => d._id));
	const mapping: Record<string, string> = {};
	const headers = authUtils.getAuthHeaders();

	// Batch processing to avoid too many parallel requests
	const BATCH_SIZE = 5;
	const batches = [];
	for (let i = 0; i < documents.length; i += BATCH_SIZE) {
	  batches.push(documents.slice(i, i + BATCH_SIZE));
	}

	for (const batch of batches) {
	  const promises = batch.map(async (doc) => {
		if (!doc._id) {
		  if (IS_DEV) console.warn("[DocOps] Document without _id found");
		  return;
		}
		try {
		  // Use fetchWithAuth for proper token management
		  const response = await authUtils.fetchWithAuth(`/api/documents-proxy/jobs/by-result/${doc._id}`);
		  if (!response.ok) {
			if (IS_DEV) console.error(`[DocOps] Error fetching job ID for doc ${doc._id}: HTTP ${response.status}`);
			return;
		  }
		  const jobData = await response.json();
		  if (jobData?._id) {
			mapping[doc._id] = jobData._id;
		  } else {
			if (IS_DEV) console.warn(`[DocOps] Job data missing _id for doc ${doc._id}:`, jobData);
		  }
		} catch (error) {
		  console.error(`[DocOps] Network/fetch error for job ID (doc ${doc._id}):`, error);
		}
	  });
	  
	  await Promise.allSettled(promises);
	  
	  // Small delay between batches to prevent overwhelming API
	  if (batches.length > 1) {
		await new Promise(resolve => setTimeout(resolve, 300));
	  }
	}

	if (IS_DEV) console.log("[DocOps] Final job ID mapping:", mapping);
	return mapping;
  },

  sendDocumentEmail: async (docId: string, proxyBaseUrl: string, email?: string): Promise<{ success: boolean; data?: any; error?: HttpError }> => {
	const targetUrl = `${proxyBaseUrl}/documents/${docId}/email`;
	try {
	  const response = await authUtils.fetchWithAuth(targetUrl, {
		method: 'POST',
		body: JSON.stringify({ email }),
	  });
	  if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw { statusCode: response.status, message: errorData.message || `HTTP ${response.status}` };
	  }
	  const data = await response.json();
	  return { success: true, data };
	} catch (error: any) {
	  console.error("[DocOps] Error sending document email:", error);
	  return { success: false, error: { message: error.message, statusCode: error.statusCode || 500 } };
	}
  },

  deleteDocument: async (docId: string, proxyBaseUrl: string): Promise<{ success: boolean; data?: any; error?: HttpError }> => {
	const targetUrl = `${proxyBaseUrl}/documents/${docId}`;
	try {
	  const response = await authUtils.fetchWithAuth(targetUrl, { method: 'DELETE' });
	  if (!response.ok && response.status !== 204) {
		const errorData = await response.json().catch(() => ({}));
		throw { statusCode: response.status, message: errorData.message || `HTTP ${response.status}` };
	  }
	  let data = {};
	  if (response.status !== 204) {
		try { data = await response.json(); } catch(e) {/* ignore empty body */}
	  }
	  return { success: true, data };
	} catch (error: any) {
	  console.error("[DocOps] Error deleting document:", error);
	  return { success: false, error: { message: error.message, statusCode: error.statusCode || 500 } };
	}
  }
};

/**
 * Enhanced Shrinked Data Provider
 */
export const shrinkedDataProvider = (
  apiUrl: string,
  httpClient: AxiosInstance = axiosInstance
): DataProvider => {

  // Define proxy mappings with explicit routes - SINGLE DEFINITION
  const proxyMappings: Record<string, string> = {
	// Subscription endpoints
	'subscriptions': '/api/subscriptions-proxy',
	'subscriptions/create-checkout-session': '/api/subscriptions-proxy/create-checkout-session',
	'subscriptions/verify-session': '/api/subscriptions-proxy/verify-session',
	
	// User endpoints - Route to users proxy
	'users/api-keys': '/api/users-proxy/api-keys',
	
	// Processing endpoints (for simple cases)
	'processing': '/api/processing-proxy',
	
	// Jobs endpoints
	'jobs': '/api/jobs-proxy',
	
	// Documents endpoints
	'documents': '/api/documents-proxy'
  };

  // Improved proxy URL helper with enhanced debugging
  const getProxyUrl = (resource: string, meta?: any): string => {
	// Add explicit debug logging
	if (IS_DEV) {
	  console.log(`[getProxyUrl:DEBUG] Resource: ${resource}`);
	  console.log(`[getProxyUrl:DEBUG] Meta:`, meta);
	}

	// Case 1: Direct URL override in meta - handle carefully
	if (meta?.url) {
	  let result = meta.url;
	  
	  // If it's a full URL (starts with http), extract just the path part
	  if (result.startsWith('http')) {
		try {
		  const urlObj = new URL(result);
		  result = urlObj.pathname + urlObj.search; // Include query parameters
		  if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Extracted path from full URL: ${result}`);
		} catch (e) {
		  console.error(`[getProxyUrl:ERROR] Invalid URL: ${result}`);
		  // Fallback to generic proxy
		  result = `/api/${resource}-proxy`;
		}
	  } 
	  // If it already starts with /api/, use it as-is (for jobs page)
	  else if (result.startsWith('/api/')) {
		if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using existing /api/ URL: ${result}`);
		return result;
	  }
	  // If it starts with / but not /api/, use it as-is
	  else if (result.startsWith('/')) {
		if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using absolute path: ${result}`);
		return result;
	  }
	  // Otherwise, prefix with /api/
	  else {
		result = `/api/${result}`;
	  }
	  
	  if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using explicit URL: ${result}`);
	  return result;
	}
	
	// Case 2: Special handling for subscription-related endpoints
	if (resource.startsWith('subscriptions/')) {
	  const specificRoute = proxyMappings[resource];
	  if (specificRoute) {
		if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using specific subscription endpoint: ${specificRoute}`);
		return specificRoute;
	  }
	  
	  // Handle dynamic subscription routes
	  const parts = resource.split('/');
	  if (parts.length >= 2) {
		const basePath = '/api/subscriptions-proxy';
		const subPath = parts.slice(1).join('/');
		const result = `${basePath}/${subPath}`;
		if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using constructed subscription path: ${result}`);
		return result;
	  }
	}
	
	// Case 3: Check for specific resource mapping FIRST (before complex path handling)
	if (proxyMappings[resource]) {
	  if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using specific mapping for ${resource}: ${proxyMappings[resource]}`);
	  return proxyMappings[resource];
	}
	
	// Case 4: Handle complex resource paths like "processing/user/123/documents"
	if (resource.includes('/')) {
	  const parts = resource.split('/');
	  const baseResource = parts[0];
	  const remainingPath = parts.slice(1).join('/');
	  
	  if (baseResource === 'processing') {
		const result = `/api/processing-proxy/${remainingPath}`;
		if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using processing proxy: ${result}`);
		return result;
	  }
	  
	  if (baseResource === 'users') {
		const result = `/api/users-proxy/${remainingPath}`;
		if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using users proxy: ${result}`);
		return result;
	  }
	  
	  // Handle other complex paths generically
	  const result = `/api/${baseResource}-proxy/${remainingPath}`;
	  if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using generic complex path: ${result}`);
	  return result;
	}
	
	// Case 5: Special handling for capsules resource with ID
	if (resource === 'capsules' && meta?.hasId) {
	  if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Capsule with ID, using direct route: /api/capsules-direct`);
	  return '/api/capsules-direct';
	}
	
	// Case 6: Special handling for capsules resource without ID
	if (resource === 'capsules') {
	  if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Capsule without ID, using non-dynamic route: /api/capsules-proxy`);
	  return '/api/capsules-proxy';
	}
	
	// Case 7: Special handling for documents resource
	if (resource === 'documents') {
	  if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using documents proxy: /api/documents-proxy`);
	  return '/api/documents-proxy';
	}
	
	// Case 8: Special handling for jobs resource
	if (resource === 'jobs') {
	  if (IS_DEV) console.log(`[getProxyUrl:DEBUG] Using jobs proxy: /api/jobs-proxy`);
	  return '/api/jobs-proxy';
	}
	
	// Case 9: Generic fallback
	const fallbackUrl = `/api/${resource}-proxy`;
	if (IS_DEV) {
	  console.log(`[getProxyUrl:DEBUG] No specific mapping for "${resource}". Using generic proxy: ${fallbackUrl}`);
	}
	
	return fallbackUrl;
  };

  return {
	getList: async ({ resource, pagination, filters, sorters, meta }) => {
	  const targetUrl = getProxyUrl(resource, meta);
	  const { current = 1, pageSize = 10 }: Pagination = pagination ?? {};

	  const axiosConfig: AxiosRequestConfig = {
		headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		params: {
		  _page: current,
		  _limit: pageSize,
		  ...generateFilters(filters),
		  ...generateSort(sorters),
		  ...(meta?.params || {}), // Add any additional params from meta
		  // Add cache-busting param
		  _t: Date.now()
		},
	  };

	  if (IS_DEV) console.log(`[DataProvider:getList] ${resource} -> GET ${targetUrl}`, axiosConfig.params);
	  const { data } = await httpClient.get(targetUrl, axiosConfig);

	  return {
		data: data.data ?? data ?? [],
		total: data.total ?? (Array.isArray(data?.data ?? data) ? (data?.data ?? data).length : 0),
	  };
	},

	getOne: async ({ resource, id, meta }) => {
	  // Add a flag to indicate this is an ID-based operation
	  const routingMeta = { ...meta, hasId: true };
	  const baseUrl = getProxyUrl(resource, routingMeta);
	  
	  // Add very explicit logging to debug the routing
	  if (IS_DEV) {
		console.log(`[DataProvider:getOne:DEBUG] Resource: ${resource}, ID: ${id}`);
		console.log(`[DataProvider:getOne:DEBUG] Using proxy route: ${baseUrl}`);
	  }
	  
	  const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`;

	  // More logging
	  if (IS_DEV) {
		console.log(`[DataProvider:getOne:DEBUG] Final URL: ${targetUrl}`);
	  }

	  const axiosConfig: AxiosRequestConfig = {
		headers: {
		  ...authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		  // Add cache-busting headers
		  'Cache-Control': 'no-cache, no-store, must-revalidate',
		  'Pragma': 'no-cache',
		  'Expires': '0'
		},
		params: {
		  ...(meta?.params || {}),
		  // Add cache-busting param
		  _t: Date.now()
		},
	  };

	  if (IS_DEV) console.log(`[DataProvider:getOne] ${resource} -> GET ${targetUrl}`);
	  const { data } = await httpClient.get(targetUrl, axiosConfig);
	  return { data };
	},

	create: async ({ resource, variables, meta }) => {
	  const targetUrl = getProxyUrl(resource, meta);

	  const axiosConfig: AxiosRequestConfig = {
		headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		params: meta?.params || {},
	  };

	  if (IS_DEV) console.log(`[DataProvider:create] ${resource} -> POST ${targetUrl}`);
	  const { data } = await httpClient.post(targetUrl, variables, axiosConfig);
	  return { data };
	},

	update: async ({ resource, id, variables, meta }) => {
	  // Add a flag to indicate this is an ID-based operation
	  const routingMeta = { ...meta, hasId: true };
	  const baseUrl = getProxyUrl(resource, routingMeta);
	  
	  // Add explicit logging
	  if (IS_DEV) {
		console.log(`[DataProvider:update:DEBUG] Resource: ${resource}, ID: ${id}`);
		console.log(`[DataProvider:update:DEBUG] Using proxy route: ${baseUrl}`);
	  }
	  
	  const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`;

	  const axiosConfig: AxiosRequestConfig = {
		headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		params: meta?.params || {},
	  };

	  if (IS_DEV) console.log(`[DataProvider:update] ${resource} -> PATCH ${targetUrl}`);
	  const { data } = await httpClient.patch(targetUrl, variables, axiosConfig);
	  return { data };
	},

	deleteOne: async ({ resource, id, variables, meta }) => {
	  // Add a flag to indicate this is an ID-based operation
	  const routingMeta = { ...meta, hasId: true };
	  const baseUrl = getProxyUrl(resource, routingMeta);
	  
	  // Add explicit logging
	  if (IS_DEV) {
		console.log(`[DataProvider:deleteOne:DEBUG] Resource: ${resource}, ID: ${id}`);
		console.log(`[DataProvider:deleteOne:DEBUG] Using proxy route: ${baseUrl}`);
	  }
	  
	  const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`;

	  const axiosConfig: AxiosRequestConfig = {
		headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		params: meta?.params || {},
		data: variables, // Body for DELETE
	  };

	  if (IS_DEV) console.log(`[DataProvider:deleteOne] ${resource} -> DELETE ${targetUrl}`);
	  const { data } = await httpClient.delete(targetUrl, axiosConfig);
	  // Handle both empty responses (204) and JSON responses
	  return { data: data?.data ?? data ?? {} };
	},

	getMany: async ({ resource, ids, meta }) => {
	  // This is tricky - getMany could be routed either way
	  // We'll assume it's not ID-specific since it's getting multiple resources
	  const targetUrl = getProxyUrl(resource, meta);

	  const axiosConfig: AxiosRequestConfig = {
		headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		params: { 
		  ids: ids.join(","),
		  ...(meta?.params || {}),
		  // Add cache-busting param
		  _t: Date.now()
		}
	  };

	  if (IS_DEV) console.log(`[DataProvider:getMany] ${resource} -> GET ${targetUrl}`, axiosConfig.params);
	  const { data } = await httpClient.get(targetUrl, axiosConfig);
	  return { data };
	},

	getApiUrl: () => '/api', // Always reflect proxy base path

	custom: async ({ url, method, payload, query, headers }) => {
	  // Ensure URL starts with /api/ for consistency 
	  // Make special case for subscription checkout - always use the correct route
	  let targetUrl = url;
	  
	  if (url.includes('/subscriptions/create-checkout-session')) {
		targetUrl = '/api/subscriptions-proxy/create-checkout-session';
		if (IS_DEV) console.log(`[DataProvider:custom:DEBUG] Redirecting to correct subscription URL: ${targetUrl}`);
	  } else if (!url.startsWith('/api/')) {
		targetUrl = `/api/${url}`;
	  }

	  const axiosConfig: AxiosRequestConfig = {
		headers: authUtils.getAuthHeaders(headers as Record<string, string>),
		params: {
		  ...query,
		  // Add cache-busting param for GET requests
		  ...(method.toLowerCase() === 'get' ? { _t: Date.now() } : {})
		},
	  };

	  let responseData;
	  if (IS_DEV) console.log(`[DataProvider:custom] ${method.toUpperCase()} ${targetUrl}`);

	  switch (method.toLowerCase()) {
		case "put":
		  ({ data: responseData } = await httpClient.put(targetUrl, payload, axiosConfig));
		  break;
		case "post":
		  ({ data: responseData } = await httpClient.post(targetUrl, payload, axiosConfig));
		  break;
		case "patch":
		  ({ data: responseData } = await httpClient.patch(targetUrl, payload, axiosConfig));
		  break;
		case "delete":
		  axiosConfig.data = payload; // Add payload to config
		  ({ data: responseData } = await httpClient.delete(targetUrl, axiosConfig));
		  break;
		default: // GET
		  ({ data: responseData } = await httpClient.get(targetUrl, axiosConfig));
		  break;
	  }
	  return { data: responseData };
	}
  };
};

// Export types for document operations
export interface DocumentOperations {
  fetchJobIdsForDocs: (documents: ProcessedDocument[], apiUrl: string) => Promise<Record<string, string>>;
  sendDocumentEmail: (docId: string, apiUrl: string, email?: string) => Promise<{ success: boolean; data?: any; error?: HttpError }>;
  deleteDocument: (docId: string, apiUrl: string) => Promise<{ success: boolean; data?: any; error?: HttpError }>;
}