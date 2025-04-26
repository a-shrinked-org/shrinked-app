// src/providers/data-provider/shrinked-data-provider.ts

import {
	DataProvider,
	CrudFilters,
	CrudSorting,
	HttpError,
	Pagination, // Added for explicit type
	BaseRecord, // Added for explicit type
} from "@refinedev/core";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios"; // Added AxiosRequestConfig
import { authUtils } from "@/utils/authUtils"; // Removed API_CONFIG import as it wasn't used here

// Create axios instance (no changes)
const axiosInstance = axios.create();

// Add response interceptor (no changes)
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
		if ('message' in error.response.data && error.response.data.message) { // Check message exists
		  customError.message = error.response.data.message;
		}
		if ('errors' in error.response.data) {
		  customError.errors = error.response.data.errors;
		}
	  }
	} else if (error.message) { // Handle cases where there's no response (network error)
		customError.message = error.message;
	}

	// Add original error for potential debugging downstream if needed
	// customError.originalError = error;

	console.error("Axios Error Interceptor Processed:", customError); // Log processed error
	return Promise.reject(customError);
  }
);


// Helper function for processing filters (no changes)
const generateFilters = (filters?: CrudFilters) => {
  const queryFilters: { [key: string]: any } = {};
  filters?.forEach((filter) => {
	if ("field" in filter) {
	  const { field, operator, value } = filter;
	  if (operator === "eq") {
		queryFilters[field] = value;
	  }
	  // Add other operators if needed
	}
  });
  return queryFilters;
};

// Helper function for processing sort orders (no changes)
const generateSort = (sorters?: CrudSorting) => {
  if (sorters && sorters.length > 0) {
	const sort = sorters[0].field;
	const order = sorters[0].order;
	// Adjust param names if backend expects something different (e.g., sort=field:asc)
	return { _sort: sort, _order: order };
  }
  return {};
};

// Document operations helper functions (Interface remains)
export interface ProcessedDocument extends BaseRecord { // Ensure it extends BaseRecord
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

// Document-specific operations (Logic remains, ensure export is present)
export const documentOperations = {
  fetchJobIdsForDocs: async (documents: ProcessedDocument[], apiUrl: string): Promise<Record<string, string>> => {
	console.log("[DocOps] fetchJobIdsForDocs called with documents:", documents.map(d => d._id));
	const mapping: Record<string, string> = {};
	const headers = authUtils.getAuthHeaders(); // Get headers once

	for (const doc of documents) {
	  if (!doc._id) {
		console.warn("[DocOps] Document without _id found");
		continue;
	  }
	  try {
		// Assuming fetch is okay here, needs direct API URL or another proxy
		// WARNING: If called client-side, this needs a proxy or direct API CORS enabled
		const targetUrl = `${apiUrl}/jobs/by-result/${doc._id}`;
		// console.log(`[DocOps] Fetching job from: ${targetUrl}`);
		const response = await fetch(targetUrl, {
		  headers: headers as HeadersInit, // Cast required for fetch
		});
		if (!response.ok) {
		  console.error(`[DocOps] Error fetching job ID for doc ${doc._id}: HTTP ${response.status}`);
		  continue;
		}
		const jobData = await response.json();
		if (jobData?._id) {
		  mapping[doc._id] = jobData._id;
		} else {
		  console.warn(`[DocOps] Job data missing _id for doc ${doc._id}:`, jobData);
		}
	  } catch (error) {
		console.error(`[DocOps] Network/fetch error for job ID (doc ${doc._id}):`, error);
	  }
	}
	console.log("[DocOps] Final job ID mapping:", mapping);
	return mapping;
  },

  // Other functions... (Assuming they use fetchWithAuth or similar for proxy/auth)
  sendDocumentEmail: async (docId: string, proxyBaseUrl: string, email?: string): Promise<{ success: boolean; data?: any; error?: HttpError }> => {
	 const targetUrl = `${proxyBaseUrl}/documents/${docId}/email`; // Use proxy
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
	 const targetUrl = `${proxyBaseUrl}/documents/${docId}`; // Use proxy
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
  // Base API URL (e.g., https://api.shrinked.ai) - used ONLY if a resource doesn't have a specific proxy
  apiUrl: string,
  httpClient: AxiosInstance = axiosInstance
): DataProvider => {

  // --- MINIMAL CHANGE: Helper to get correct PROXY URL ---
  const getProxyUrl = (resource: string, meta?: any): string => {
	if (meta?.url) {
		// Assume meta.url is already the correct relative proxy path if provided
		return meta.url.startsWith('/') ? meta.url : `/api/${meta.url}`;
	}
	if (resource === 'capsules') {
		// Force capsules resource to use the proxy route
		return '/api/capsules-proxy';
	}
	 // --- Fallback for other resources ---
	 // WARNING: This uses the direct apiUrl and will likely cause CORS errors from browser.
	 // You would need to add more cases here or ensure these resources are only accessed server-side.
	console.warn(`[DataProvider] No specific proxy route for "${resource}". Using direct API URL: ${apiUrl}/${resource}`);
	// Original logic for non-capsule resources (potentially problematic)
	// return `${apiUrl}/${resource}${resource === "jobs" ? "" : "/key"}`;
	 return `${apiUrl}/${resource}`; // Simplified fallback - adjust if /key is needed for non-proxied resources

  };
  // --- END MINIMAL CHANGE ---

  return {
	getList: async ({ resource, pagination, filters, sorters, meta }) => {
	  const targetUrl = getProxyUrl(resource, meta); // Use helper
	  const { current = 1, pageSize = 10 }: Pagination = pagination ?? {};

	  // --- MINIMAL CHANGE: Ensure headers are Record<string, string> ---
	  const axiosConfig: AxiosRequestConfig = {
		headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		params: {
		  _page: current, // Adjust if backend uses 'page'
		  _limit: pageSize, // Adjust if backend uses 'limit'
		  ...generateFilters(filters),
		  ...generateSort(sorters),
		},
	  };
	  // --- END MINIMAL CHANGE ---

	  console.log(`[DataProvider:getList] ${resource} -> GET ${targetUrl}`);
	  const { data } = await httpClient.get(targetUrl, axiosConfig);

	  // Adapt response structure if necessary (e.g., if backend returns { items: [], count: 0 })
	  return {
		data: data.data ?? data ?? [], // More robust data access
		total: data.total ?? (Array.isArray(data?.data ?? data) ? (data?.data ?? data).length : 0), // More robust total calculation
	  };
	},

	getOne: async ({ resource, id, meta }) => {
	   const baseUrl = getProxyUrl(resource, meta); // Use helper
	   const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`; // Append ID safely

	   // --- MINIMAL CHANGE: Ensure headers are Record<string, string> ---
	   const axiosConfig: AxiosRequestConfig = {
		   headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
	   };
	   // --- END MINIMAL CHANGE ---

	   console.log(`[DataProvider:getOne] ${resource} -> GET ${targetUrl}`);
	   const { data } = await httpClient.get(targetUrl, axiosConfig);
	   return { data };
	},

	create: async ({ resource, variables, meta }) => {
	   const targetUrl = getProxyUrl(resource, meta); // Use helper

	   // --- MINIMAL CHANGE: Ensure headers are Record<string, string> ---
	   const axiosConfig: AxiosRequestConfig = {
		   headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
	   };
	   // --- END MINIMAL CHANGE ---

	   console.log(`[DataProvider:create] ${resource} -> POST ${targetUrl}`);
	   const { data } = await httpClient.post(targetUrl, variables, axiosConfig);
	   return { data };
	},

	update: async ({ resource, id, variables, meta }) => {
	   const baseUrl = getProxyUrl(resource, meta); // Use helper
	   const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`; // Append ID safely

	   // --- MINIMAL CHANGE: Ensure headers are Record<string, string> ---
	   const axiosConfig: AxiosRequestConfig = {
		   headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
	   };
	   // --- END MINIMAL CHANGE ---

	   console.log(`[DataProvider:update] ${resource} -> PATCH ${targetUrl}`);
	   const { data } = await httpClient.patch(targetUrl, variables, axiosConfig);
	   return { data };
	},

	deleteOne: async ({ resource, id, variables, meta }) => {
	   const baseUrl = getProxyUrl(resource, meta); // Use helper
	   const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`; // Append ID safely

	   // --- MINIMAL CHANGE: Ensure headers are Record<string, string> ---
	   const axiosConfig: AxiosRequestConfig = {
		 headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		 data: variables, // Body for DELETE
	   };
		// --- END MINIMAL CHANGE ---

	   console.log(`[DataProvider:deleteOne] ${resource} -> DELETE ${targetUrl}`);
	   const { data } = await httpClient.delete(targetUrl, axiosConfig);
	   // Adapt response if backend returns specific structure on delete
	   return { data: data?.data ?? {} };
	},

	getMany: async ({ resource, ids, meta }) => {
	   const targetUrl = getProxyUrl(resource, meta); // Use helper

		// --- MINIMAL CHANGE: Ensure headers are Record<string, string> ---
	   const axiosConfig: AxiosRequestConfig = {
		 headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		 params: { ids: ids.join(",") } // Adjust if backend expects different format
	   };
	   // --- END MINIMAL CHANGE ---

	   console.log(`[DataProvider:getMany] ${resource} -> GET ${targetUrl}`, axiosConfig.params);
	   const { data } = await httpClient.get(targetUrl, axiosConfig);
	   return { data };
	},

	getApiUrl: () => '/api', // Reflect proxy base path

	custom: async ({ url, method, payload, query, headers }) => {
		// Assume 'url' is the intended relative proxy path
		if (!url.startsWith('/api/')) { // Basic check
			 console.warn(`[DataProvider:custom] URL "${url}" might need prefix '/api'.`);
		}
		const targetUrl = url;

		// --- MINIMAL CHANGE: Ensure headers are Record<string, string> ---
		const axiosConfig: AxiosRequestConfig = {
			 headers: authUtils.getAuthHeaders(headers as Record<string, string>),
		};
		// --- END MINIMAL CHANGE ---

		let responseData;
		console.log(`[DataProvider:custom] ${method.toUpperCase()} ${targetUrl}`);

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
				axiosConfig.params = query; // Add query params
				 ({ data: responseData } = await httpClient.get(targetUrl, axiosConfig));
				break;
		}
		return { data: responseData };
	}
  };
};

// Export types for document operations (Keep this export)
export interface DocumentOperations {
  fetchJobIdsForDocs: (documents: ProcessedDocument[], apiUrl: string) => Promise<Record<string, string>>;
  sendDocumentEmail: (docId: string, apiUrl: string, email?: string) => Promise<{ success: boolean; data?: any; error?: HttpError }>;
  deleteDocument: (docId: string, apiUrl: string) => Promise<{ success: boolean; data?: any; error?: HttpError }>;
}