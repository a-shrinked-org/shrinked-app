import { 
  DataProvider,
  CrudFilters,
  CrudSorting,
  HttpError
} from "@refinedev/core";
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";
import { authUtils, API_CONFIG } from "@/utils/authUtils";

// Create axios instance with base URL
const axiosInstance = axios.create({
  baseURL: API_CONFIG.API_URL
});

// Add request interceptor to include auth token in each request
axiosInstance.interceptors.request.use(
  (config) => {
	// Get the current token from centralized auth utils
	const token = authUtils.getAccessToken();
	if (token && config.headers) {
	  config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
  },
  (error) => {
	return Promise.reject(error);
  }
);

// Improved response interceptor with better error handling
axiosInstance.interceptors.response.use(
  (response) => {
	return response;
  },
  async (error: AxiosError) => {
	const status = error.response?.status;
	
	// Handle authentication errors (401, 403)
	if (status === 401 || status === 403) {
	  try {
		// Attempt to refresh the token using centralized auth utils
		const refreshSuccessful = await authUtils.refreshToken();
		
		if (refreshSuccessful && error.config) {
		  // Get new token after successful refresh
		  const newToken = authUtils.getAccessToken();
		  
		  // Update the Authorization header with the new token
		  if (newToken && error.config.headers) {
			// Create a new config object to avoid mutation of the original request
			const newConfig = { ...error.config } as AxiosRequestConfig;
			newConfig.headers = { 
			  ...newConfig.headers as Record<string, string>, 
			  Authorization: `Bearer ${newToken}` 
			};
			
			// Retry the original request with the new token
			return axios(newConfig);
		  }
		}
	  } catch (refreshError) {
		console.error("Token refresh failed:", refreshError);
		// Continue to error handling below
	  }
	}

	// Handle Cloudflare-specific errors
	if (status === 521 || status === 522 || status === 523) {
	  const customError: HttpError = {
		...error as any,
		message: "The server is currently unreachable. Please try again later.",
		statusCode: status,
	  };
	  // Log the specific error for debugging
	  console.error(`Cloudflare error ${status}: The API server is unreachable`);
	  return Promise.reject(customError);
	}

	// Network errors (no response from server)
	if (!error.response) {
	  const customError: HttpError = {
		...error as any,
		message: "Network error: Please check your internet connection.",
		statusCode: 0,
	  };
	  console.error("Network error:", error);
	  return Promise.reject(customError);
	}

	// Standard error handling
	const customError: HttpError = {
	  ...error as any,
	  message: error.response?.data?.message || "An unexpected error occurred",
	  statusCode: error.response?.status,
	};

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

// Helper function for safe API requests with retries
const safeRequest = async (
  requestFn: () => Promise<any>,
  resource: string,
  operation: string,
  maxRetries = API_CONFIG.RETRY.MAX_ATTEMPTS
) => {
  let retries = 0;
  
  while (retries <= maxRetries) {
	try {
	  return await requestFn();
	} catch (error: any) {
	  // Don't retry if it's not a network or server error
	  if (
		error.statusCode !== 0 && 
		error.statusCode !== 521 && 
		error.statusCode !== 522 && 
		error.statusCode !== 523 &&
		retries === maxRetries
	  ) {
		throw error;
	  }
	  
	  retries++;
	  console.log(`Retry attempt ${retries} for ${operation} on ${resource}`);
	  
	  // Wait before retrying (with exponential backoff)
	  await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY.DELAY_MS * retries));
	}
  }
  
  throw new Error(`Failed ${operation} on ${resource} after ${maxRetries} retries`);
};

// Main data provider implementation
export const shrinkedDataProvider = (
  apiUrl: string = API_CONFIG.API_URL,
  httpClient: AxiosInstance = axiosInstance
): Partial<DataProvider> => ({
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
	const url = `/${resource}${resource === "jobs/key" ? "" : ""}`;

	// Handle pagination
	const { current = 1, pageSize = 10 } = pagination ?? {};

	return safeRequest(
	  async () => {
		const { data } = await httpClient.get(url, {
		  params: {
			page: current,
			limit: pageSize,
			...generateFilters(filters),
			...generateSort(sorters),
		  },
		  headers: meta?.headers,
		});

		return {
		  data: data.data || data,
		  total: data.total || (data.data || data).length,
		};
	  },
	  resource,
	  "getList"
	);
  },

  getOne: async ({ resource, id, meta }) => {
	const url = `/${resource}${resource === "jobs" ? "" : "/key"}/${id}`;

	return safeRequest(
	  async () => {
		const { data } = await httpClient.get(url, {
		  headers: meta?.headers,
		});

		return {
		  data,
		};
	  },
	  resource,
	  "getOne"
	);
  },

  create: async ({ resource, variables, meta }) => {
	const url = `/${resource}${resource === "jobs" ? "" : "/key"}`;

	return safeRequest(
	  async () => {
		const { data } = await httpClient.post(url, variables, {
		  headers: meta?.headers,
		});

		return {
		  data,
		};
	  },
	  resource,
	  "create"
	);
  },

  update: async ({ resource, id, variables, meta }) => {
	const url = `/${resource}${resource === "jobs" ? "" : "/key"}/${id}`;

	return safeRequest(
	  async () => {
		const { data } = await httpClient.patch(url, variables, {
		  headers: meta?.headers,
		});

		return {
		  data,
		};
	  },
	  resource,
	  "update"
	);
  },

  deleteOne: async ({ resource, id, variables, meta }) => {
	const url = `/${resource}${resource === "jobs" ? "" : "/key"}/${id}`;

	return safeRequest(
	  async () => {
		const { data } = await httpClient.delete(url, {
		  data: variables,
		  headers: meta?.headers,
		});

		return {
		  data,
		};
	  },
	  resource,
	  "deleteOne"
	);
  },

  getMany: async ({ resource, ids, meta }) => {
	const url = `/${resource}${resource === "jobs" ? "" : "/key"}`;

	return safeRequest(
	  async () => {
		const { data } = await httpClient.get(url, {
		  params: { ids: ids.join(",") },
		  headers: meta?.headers,
		});

		return {
		  data,
		};
	  },
	  resource,
	  "getMany"
	);
  },

  getApiUrl: () => apiUrl,

  custom: async ({ url, method, payload, query, headers }) => {
	return safeRequest(
	  async () => {
		let axiosResponse;
		
		// Ensure URL starts with a slash if it doesn't include the full path
		const requestUrl = url.startsWith('http') ? url : url.startsWith('/') ? url : `/${url}`;
		
		switch (method) {
		  case "put":
		  case "post":
		  case "patch":
			axiosResponse = await httpClient[method](requestUrl, payload, { headers });
			break;
		  case "delete":
			axiosResponse = await httpClient.delete(requestUrl, {
			  data: payload,
			  headers: headers,
			});
			break;
		  default:
			axiosResponse = await httpClient.get(requestUrl, {
			  params: query,
			  headers,
			});
			break;
		}

		const { data } = axiosResponse;
		return { data };
	  },
	  url,
	  `custom-${method}`
	);
  },
});