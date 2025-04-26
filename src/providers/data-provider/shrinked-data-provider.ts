// src/providers/data-provider/shrinked-data-provider.ts

import {
	DataProvider,
	CrudFilters,
	CrudSorting,
	HttpError,
	Pagination, // Import Pagination type
	BaseRecord // Import BaseRecord
} from "@refinedev/core";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosHeaders, RawAxiosHeaders } from "axios"; // Import Axios types
import { authUtils } from "@/utils/authUtils"; // Removed API_CONFIG import

// Define a more specific type for the data expected in responses
// Adjust based on your actual API structure
interface ListResponse<TData extends BaseRecord = BaseRecord> {
	data: TData[];
	total: number;
	page?: number;
	limit?: number;
}

// Create axios instance
const axiosInstance = axios.create();

// Add response interceptor with proper typing
axiosInstance.interceptors.response.use(
  (response) => {
	// console.log("Axios Response Interceptor:", response); // Optional: Debug successful responses
	return response;
  },
  (error) => {
	console.error("Axios Error Interceptor:", error); // Log the raw error

	// Create properly typed HttpError object with guaranteed properties
	const customError: HttpError = {
	  message: error.message || "An unexpected error occurred", // Start with Axios error message
	  statusCode: error.response?.status || 500, // Get status code from response if available
	};

	// Only add response data properties if they exist
	if (error.response?.data && typeof error.response.data === 'object') {
	  // Use message from response data if more specific
	  if ('message' in error.response.data && error.response.data.message) {
		customError.message = error.response.data.message;
	  }
	  // Add errors property if it exists (e.g., for validation errors)
	  if ('errors' in error.response.data) {
		customError.errors = error.response.data.errors;
	  }
	   // Add raw response data for debugging if needed
	  // customError.response = error.response.data;
	}

	// Add original error details if needed for deeper debugging
	// customError.originalError = error;

	console.error("Processed HttpError:", customError); // Log the processed error
	return Promise.reject(customError);
  }
);

// Helper function for processing filters (no changes needed)
const generateFilters = (filters?: CrudFilters) => {
	const queryFilters: { [key: string]: any } = {};
	filters?.forEach((filter) => {
		if ("field" in filter) {
			const { field, operator, value } = filter;
			// Extend operators if needed (e.g., 'contains', 'gte', etc.)
			if (operator === "eq") {
				queryFilters[field] = value;
			}
			// Example: else if (operator === 'contains') { queryFilters[`${field}_like`] = value; }
		}
	});
	return queryFilters;
};

// Helper function for processing sort orders (no changes needed)
const generateSort = (sorters?: CrudSorting) => {
	if (sorters && sorters.length > 0) {
		const sort = sorters[0].field;
		const order = sorters[0].order;
		// Adjust formatting based on backend expectation (e.g., 'field:asc', 'sort=field&order=asc')
		return { _sort: sort, _order: order }; // Example using _sort/_order params
	}
	return {};
};

// Placeholder for document operations - keep as is for now
// ... (documentOperations code remains the same) ...


/**
 * Enhanced Shrinked Data Provider (Corrected for Build)
 */
export const shrinkedDataProvider = (
  // Base API URL (e.g., https://api.shrinked.ai) - used ONLY if a resource doesn't have a specific proxy
  apiUrl: string,
  httpClient: AxiosInstance = axiosInstance
): DataProvider => {

  // --- Helper to get the correct PROXY URL for a resource ---
  const getProxyUrl = (resource: string, meta?: any): string => {
	// 1. Always prioritize explicit URL from meta
	if (meta?.url) {
	  // Ensure meta.url is relative if it's meant for the proxy
	  return meta.url.startsWith('/') ? meta.url : `/api/${meta.url}`;
	}

	// 2. Define specific proxy routes for known resources
	switch (resource) {
	  case 'capsules':
		return '/api/capsules-proxy'; // Use the dedicated capsules proxy
	  case 'users': // Example: If you add a user proxy
		// return '/api/users-proxy';
		 break;
	  case 'jobs': // Example: If you add a jobs proxy
		 // return '/api/jobs-proxy';
		 break;
		// Add cases for other resources that have proxy routes
	}

	// 3. Fallback for resources WITHOUT a specific proxy route defined above
	// WARNING: This will likely cause CORS errors if called from the browser
	console.warn(`[DataProvider] No specific proxy route defined for resource "${resource}". Falling back to direct API URL (CORS likely).`);
	// Construct the direct URL (less safe) - adjust path construction as needed
	// This part might need refinement based on how non-proxied resources are structured
	return `${apiUrl}/${resource}`;

  };
  // --- End Helper ---

  return {
	getList: async ({ resource, pagination, filters, sorters, meta }) => {
	  const targetUrl = getProxyUrl(resource, meta); // Get the correct proxy URL or fallback

	  const { current = 1, pageSize = 10 }: Pagination = pagination ?? {};

	  // Prepare Axios request config
	  const axiosConfig: AxiosRequestConfig = {
		headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>), // Get headers as object
		params: {
		  // Adjust param names based on backend expectation (e.g., _page, _limit)
		  _page: current,
		  _limit: pageSize,
		  ...generateFilters(filters),
		  ...generateSort(sorters),
		},
	  };

	  console.log(`[DataProvider:getList] ${resource} -> GET ${targetUrl}`, axiosConfig.params);

	  const { data } = await httpClient.get<ListResponse>(targetUrl, axiosConfig); // Specify expected response type

	  // Ensure data and total are returned correctly based on ListResponse structure
	  return {
		data: data.data ?? [], // Default to empty array if data.data is missing
		total: data.total ?? 0, // Default to 0 if data.total is missing
	  };
	},

	getOne: async ({ resource, id, meta }) => {
	   const baseUrl = getProxyUrl(resource, meta);
	   // Ensure ID is appended correctly, avoiding double slashes
	   const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`;

	   const axiosConfig: AxiosRequestConfig = {
		   headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
	   };

	   console.log(`[DataProvider:getOne] ${resource} -> GET ${targetUrl}`);

	   // Assuming the response is the single record directly
	   const { data } = await httpClient.get<BaseRecord>(targetUrl, axiosConfig);

	   return { data };
	},

	create: async ({ resource, variables, meta }) => {
	   const targetUrl = getProxyUrl(resource, meta); // Usually the base resource URL

	   const axiosConfig: AxiosRequestConfig = {
		   headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
	   };

	   console.log(`[DataProvider:create] ${resource} -> POST ${targetUrl}`);

	   const { data } = await httpClient.post<BaseRecord>(targetUrl, variables, axiosConfig);

	   return { data };
	},

	update: async ({ resource, id, variables, meta }) => {
	   const baseUrl = getProxyUrl(resource, meta);
	   const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`;

	   const axiosConfig: AxiosRequestConfig = {
		   headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
	   };

	   console.log(`[DataProvider:update] ${resource} -> PATCH ${targetUrl}`);

	   const { data } = await httpClient.patch<BaseRecord>(targetUrl, variables, axiosConfig);

	   return { data };
	},

	deleteOne: async ({ resource, id, variables, meta }) => {
	   const baseUrl = getProxyUrl(resource, meta);
	   const targetUrl = `${baseUrl.replace(/\/$/, '')}/${id}`;

	   const axiosConfig: AxiosRequestConfig = {
		 headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		 // Axios uses 'data' for DELETE request body
		 data: variables,
	   };

	   console.log(`[DataProvider:deleteOne] ${resource} -> DELETE ${targetUrl}`);

	   // Assuming response might be empty or contain success message
	   const { data } = await httpClient.delete<{ data?: any }>(targetUrl, axiosConfig);

	   return { data: data?.data ?? {} }; // Return empty object if no specific data
	},

	getMany: async ({ resource, ids, meta }) => {
	  // This often requires a specific backend endpoint or query param format
	  const targetUrl = getProxyUrl(resource, meta);

	  const axiosConfig: AxiosRequestConfig = {
		 headers: authUtils.getAuthHeaders(meta?.headers as Record<string, string>),
		 // Common ways to pass multiple IDs:
		 // 1. Comma-separated string: params: { ids: ids.join(",") }
		 // 2. Repeated query param: params: { id: ids } (needs backend/qs support)
		 // 3. JSON body in a GET (less common): data: { ids }
		 params: { ids: ids.join(",") } // Adjust based on your API
	   };

	   console.log(`[DataProvider:getMany] ${resource} -> GET ${targetUrl}`, axiosConfig.params);

	   const { data } = await httpClient.get<BaseRecord[]>(targetUrl, axiosConfig); // Expect an array

	   return { data };
	},

	getApiUrl: () => '/api', // Represents the base path for proxy routes

	custom: async ({ url, method, payload, query, headers }) => {
		// Assume 'url' passed IS the correct relative proxy URL
		if (!url.startsWith('/')) {
			 console.warn(`[DataProvider:custom] URL "${url}" might not be a relative proxy path.`);
		}

		const axiosConfig: AxiosRequestConfig = {
			 headers: authUtils.getAuthHeaders(headers as Record<string, string>),
		};

		let responseData;
		const targetUrl = url; // Use the provided URL directly

		console.log(`[DataProvider:custom] ${method.toUpperCase()} ${targetUrl}`);

		switch (method.toLowerCase()) { // Use lowercase for comparison
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
				 axiosConfig.data = payload; // Add payload to config for delete
				 ({ data: responseData } = await httpClient.delete(targetUrl, axiosConfig));
				break;
			default: // GET
				axiosConfig.params = query; // Add query params for GET
				 ({ data: responseData } = await httpClient.get(targetUrl, axiosConfig));
				break;
		}

		return { data: responseData };
	}
  };
};