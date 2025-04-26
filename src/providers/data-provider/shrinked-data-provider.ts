import { 
  DataProvider,
  CrudFilters,
  CrudSorting,
  HttpError
} from "@refinedev/core";
import axios, { AxiosInstance } from "axios";
import { authUtils, API_CONFIG } from "@/utils/authUtils";

// Create axios instance
const axiosInstance = axios.create();

// Add response interceptor with proper typing
axiosInstance.interceptors.response.use(
  (response) => {
	return response;
  },
  (error) => {
	// Create properly typed HttpError object with guaranteed properties
	const customError: HttpError = {
	  message: "An unexpected error occurred",
	  statusCode: 500,
	};

	// Only add response properties if they exist
	if (error.response) {
	  customError.statusCode = error.response.status;
	  
	  // Safely access data.message if it exists
	  if (error.response.data && typeof error.response.data === 'object') {
		if ('message' in error.response.data) {
		  customError.message = error.response.data.message;
		}
		
		// Add errors property if it exists
		if ('errors' in error.response.data) {
		  customError.errors = error.response.data.errors;
		}
	  }
	}

	// Add any additional properties from the original error
	if (error && typeof error === 'object') {
	  Object.assign(customError, error);
	}

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
	return { sort, order };
  }
  return {};
};

// Document operations helper functions
export interface ProcessedDocument {
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
  fetchJobIdsForDocs: async (documents: ProcessedDocument[], apiUrl: string) => {
	console.log("fetchJobIdsForDocs called with documents:", documents.map(d => d._id));
	
	const mapping: Record<string, string> = {};
	
	// Process one document at a time for better error handling
	for (const doc of documents) {
	  if (!doc._id) {
		console.warn("Document without _id found in fetchJobIdsForDocs");
		continue;
	  }
	  
	  try {
		console.log(`Fetching job for document ${doc._id}`);
		const response = await fetch(`${apiUrl}/jobs/by-result/${doc._id}`, {
		  headers: authUtils.getAuthHeaders()
		});
		
		if (!response.ok) {
		  console.error(`Error fetching job ID for document ${doc._id}: HTTP ${response.status}`);
		  continue;
		}
		
		const jobData = await response.json();
		console.log(`Job data for document ${doc._id}:`, jobData);
		
		if (jobData && jobData._id) {
		  console.log(`Job ID found for document ${doc._id}: ${jobData._id}`);
		  mapping[doc._id] = jobData._id;
		} else {
		  console.error(`Job data doesn't contain _id for document ${doc._id}:`, jobData);
		}
	  } catch (error) {
		console.error(`Error fetching job ID for document ${doc._id}:`, error);
	  }
	}
	
	console.log("Final job ID mapping:", mapping);
	return mapping;
  },

  // Other functions...
  sendDocumentEmail: async (docId: string, apiUrl: string, email?: string) => {
	try {
	  const response = await fetch(`${apiUrl}/documents/${docId}/email`, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  'Authorization': `Bearer ${authUtils.getAccessToken()}`
		},
		body: JSON.stringify({ email })
	  });
	  
	  if (!response.ok) {
		throw new Error(`HTTP error: ${response.status}`);
	  }
	  
	  const data = await response.json();
	  return { success: true, data };
	} catch (error) {
	  console.error("Error sending document email:", error);
	  return { 
		success: false, 
		error: {
		  message: error instanceof Error ? error.message : "Unknown error",
		  statusCode: 500
		} 
	  };
	}
  },

  deleteDocument: async (docId: string, apiUrl: string) => {
	try {
	  const response = await fetch(`${apiUrl}/documents/${docId}`, {
		method: 'DELETE',
		headers: {
		  'Authorization': `Bearer ${authUtils.getAccessToken()}`
		}
	  });
	  
	  if (!response.ok) {
		throw new Error(`HTTP error: ${response.status}`);
	  }
	  
	  const data = await response.json();
	  return { success: true, data };
	} catch (error) {
	  console.error("Error deleting document:", error);
	  return { 
		success: false, 
		error: {
		  message: error instanceof Error ? error.message : "Unknown error",
		  statusCode: 500
		}
	  };
	}
  }
};

/**
 * Enhanced Shrinked Data Provider
 */
export const shrinkedDataProvider = (
  // apiUrl is still passed but we will override it for capsules
  apiUrl: string,
  httpClient: AxiosInstance = axiosInstance
): DataProvider => {

  // --- MINIMAL CHANGE: Helper to get correct base URL ---
  const getBaseUrl = (resource: string, meta?: any): string => {
	if (meta?.url) {
		return meta.url; // Always respect explicit meta.url
	}
	if (resource === 'capsules') {
		// Force capsules resource to use the proxy route
		return '/api/capsules-proxy';
	}
	 // --- For other resources, use the original logic (will call direct API unless other proxies exist) ---
	 // --- THIS WILL LIKELY CAUSE CORS for non-capsule resources! ---
	return `${apiUrl}/${resource}${resource === "jobs" ? "" : "/key"}`;
  };
  // --- END MINIMAL CHANGE ---

  return {
	getList: async ({ resource, pagination, filters, sorters, meta }) => {
	  // --- MINIMAL CHANGE: Use getBaseUrl ---
	  const baseUrl = getBaseUrl(resource, meta);
	  // Construct final URL based on whether baseUrl already includes resource path
	  const url = baseUrl.includes(`/${resource}`) ? baseUrl : `${baseUrl}`; // capsules-proxy already implies /capsules
	  // --- END MINIMAL CHANGE ---

	  const { current = 1, pageSize = 10 } = pagination ?? {};

	  // Add Authorization header using authUtils
	  const headers = authUtils.getAuthHeaders(meta?.headers); // Merge existing meta headers

	  const { data } = await httpClient.get(url, {
		params: {
		  page: current,
		  limit: pageSize,
		  ...generateFilters(filters),
		  ...generateSort(sorters),
		},
		// headers: meta?.headers, // Use merged headers below
		headers: headers, // Pass merged headers
	  });

	  return {
		data: data.data || data, // Adjust based on your API response structure
		total: data.total ?? (Array.isArray(data.data) ? data.data.length : (Array.isArray(data) ? data.length : 0)), // Better total calculation
	  };
	},

	getOne: async ({ resource, id, meta }) => {
	   // --- MINIMAL CHANGE: Use getBaseUrl and construct URL ---
	   const baseUrl = getBaseUrl(resource, meta);
	   // Append ID if the base URL doesn't already contain it (might happen with meta.url)
	   const url = `${baseUrl}/${id}`;
	   // --- END MINIMAL CHANGE ---

	   // Add Authorization header
	   const headers = authUtils.getAuthHeaders(meta?.headers);

	   const { data } = await httpClient.get(url, {
		  // headers: meta?.headers,
		  headers: headers,
	   });

	   return { data };
	},

	create: async ({ resource, variables, meta }) => {
	   // --- MINIMAL CHANGE: Use getBaseUrl and construct URL ---
	   const baseUrl = getBaseUrl(resource, meta);
	   const url = baseUrl.includes(`/${resource}`) ? baseUrl : `${baseUrl}`; // Base proxy URL for create
	   // --- END MINIMAL CHANGE ---

		// Add Authorization header
	   const headers = authUtils.getAuthHeaders(meta?.headers);

	   const { data } = await httpClient.post(url, variables, {
		  // headers: meta?.headers,
		  headers: headers,
	   });

	   return { data };
	},

	update: async ({ resource, id, variables, meta }) => {
	   // --- MINIMAL CHANGE: Use getBaseUrl and construct URL ---
	   const baseUrl = getBaseUrl(resource, meta);
	   const url = `${baseUrl}/${id}`;
	   // --- END MINIMAL CHANGE ---

		// Add Authorization header
	   const headers = authUtils.getAuthHeaders(meta?.headers);

	   const { data } = await httpClient.patch(url, variables, {
		  // headers: meta?.headers,
		  headers: headers,
	   });

	   return { data };
	},

	deleteOne: async ({ resource, id, variables, meta }) => {
	   // --- MINIMAL CHANGE: Use getBaseUrl and construct URL ---
	   const baseUrl = getBaseUrl(resource, meta);
	   const url = `${baseUrl}/${id}`; // DELETE targets specific resource
	   // --- END MINIMAL CHANGE ---

		// Add Authorization header
	   const headers = authUtils.getAuthHeaders(meta?.headers);

	   const { data } = await httpClient.delete(url, {
		 data: variables,
		 // headers: meta?.headers,
		 headers: headers,
	   });

	   return { data };
	},

	// getMany might need adjustment depending on how your proxy handles /api/capsules-proxy?ids=1,2,3
	getMany: async ({ resource, ids, meta }) => {
	   // --- MINIMAL CHANGE: Use getBaseUrl ---
	   const baseUrl = getBaseUrl(resource, meta);
	   const url = baseUrl.includes(`/${resource}`) ? baseUrl : `${baseUrl}`;
		// --- END MINIMAL CHANGE ---

	   // Add Authorization header
	   const headers = authUtils.getAuthHeaders(meta?.headers);

	   // Assuming the proxy or backend handles `ids` query param correctly
	   const { data } = await httpClient.get(url, {
		 params: { ids: ids.join(",") },
		 // headers: meta?.headers,
		 headers: headers,
	   });

	   return { data };
	},

	getApiUrl: () => '/api', // Return the proxy base path now

	// Custom method needs careful handling - ensure `url` passed is the proxy URL
	custom: async ({ url, method, payload, query, headers }) => {
		// --- MINIMAL CHANGE: Add Auth Header ---
		const authHeaders = authUtils.getAuthHeaders(headers);
		// --- END MINIMAL CHANGE ---

		let axiosResponse;
		const targetUrl = url; // Assume 'url' passed to custom IS the correct proxy url

		console.log(`[DataProvider Custom] Method: ${method}, URL: ${targetUrl}`); // Debug log

		switch (method) {
			case "put":
			case "post":
			case "patch":
				axiosResponse = await httpClient[method](targetUrl, payload, { headers: authHeaders });
				break;
			case "delete":
				axiosResponse = await httpClient.delete(targetUrl, {
					data: payload,
					headers: authHeaders,
				});
				break;
			default: // GET
				axiosResponse = await httpClient.get(targetUrl, {
					params: query,
					headers: authHeaders, // Use authHeaders
				});
				break;
		}

		const { data } = axiosResponse;
		return { data };
	}
  };
};

// Export types for document operations
export interface DocumentOperations {
  fetchJobIdsForDocs: (documents: ProcessedDocument[], apiUrl: string) => Promise<Record<string, string>>;
  sendDocumentEmail: (docId: string, apiUrl: string, email?: string) => Promise<{ success: boolean; data?: any; error?: HttpError }>;
  deleteDocument: (docId: string, apiUrl: string) => Promise<{ success: boolean; data?: any; error?: HttpError }>;
}