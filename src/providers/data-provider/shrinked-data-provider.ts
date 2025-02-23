import { 
  DataProvider,
  CrudFilters,
  CrudSorting,
  HttpError
} from "@refinedev/core";
import axios, { AxiosInstance } from "axios";

const axiosInstance = axios.create();

axiosInstance.interceptors.response.use(
  (response) => {
	return response;
  },
  (error) => {
	const customError: HttpError = {
	  ...error,
	  message: error.response?.data?.message || "Error occurred",
	  statusCode: error.response?.status,
	};

	return Promise.reject(customError);
  }
);

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

const generateSort = (sorters?: CrudSorting) => {
  if (sorters && sorters.length > 0) {
	const sort = sorters[0].field;
	const order = sorters[0].order;

	return { sort, order };
  }

  return {};
};

export const shrinkedDataProvider = (
  apiUrl: string,
  httpClient: AxiosInstance = axiosInstance
): Partial<DataProvider> => ({
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
	  const url = `${apiUrl}/${resource}`;
	  console.log("Headers:", meta?.headers); // Debug token
	  
	  try {
		const { data } = await httpClient.get(url, {
		  params: {
			page: current,
			limit: pageSize,
			...generateFilters(filters),
			...generateSort(sorters),
		  },
		  headers: meta?.headers,
		});
		
		console.log("API Response:", data); // See exact response structure
		
		// Extract data based on your API structure
		const jobs = data.jobs || data.data || data;
		const total = data.total || (Array.isArray(jobs) ? jobs.length : 0);
  
		console.log("Processed data:", { jobs, total }); // Verify processed data
		
		return {
		  data: jobs,
		  total: total
		};
	  } catch (error) {
		console.error("Error details:", {
		  config: error.config,
		  response: error.response?.data
		});
		throw error;
	  }
	}

  getOne: async ({ resource, id, meta }) => {
	if (!id) {
	  throw new Error('Job ID is required');
	}

	const url = `${apiUrl}/${resource}/${id}`;

	try {
	  const { data } = await httpClient.get(url, {
		headers: meta?.headers,
	  });

	  // Handle the case where the job data is nested under a 'data' property
	  return {
		data: data.data || data,
	  };
	} catch (error) {
	  console.error("Error fetching job:", error);
	  throw error;
	}
  },

  create: async ({ resource, variables, meta }) => {
	const url = `${apiUrl}/${resource}`;

	try {
	  const { data } = await httpClient.post(url, variables, {
		headers: meta?.headers,
	  });

	  return {
		data: data.data || data,
	  };
	} catch (error) {
	  console.error("Error creating job:", error);
	  throw error;
	}
  },

  update: async ({ resource, id, variables, meta }) => {
	if (!id) {
	  throw new Error('Job ID is required');
	}

	const url = `${apiUrl}/${resource}/${id}`;

	try {
	  const { data } = await httpClient.patch(url, variables, {
		headers: meta?.headers,
	  });

	  return {
		data: data.data || data,
	  };
	} catch (error) {
	  console.error("Error updating job:", error);
	  throw error;
	}
  },

  deleteOne: async ({ resource, id, variables, meta }) => {
	if (!id) {
	  throw new Error('Job ID is required');
	}

	const url = `${apiUrl}/${resource}/${id}`;

	try {
	  const { data } = await httpClient.delete(url, {
		data: variables,
		headers: meta?.headers,
	  });

	  return {
		data: data.data || data,
	  };
	} catch (error) {
	  console.error("Error deleting job:", error);
	  throw error;
	}
  },

  getMany: async ({ resource, ids, meta }) => {
	if (!ids || !ids.length) {
	  return { data: [] };
	}

	const url = `${apiUrl}/${resource}`;

	try {
	  const { data } = await httpClient.get(url, {
		params: { ids: ids.join(",") },
		headers: meta?.headers,
	  });

	  return {
		data: data.data || (Array.isArray(data) ? data : []),
	  };
	} catch (error) {
	  console.error("Error fetching multiple jobs:", error);
	  throw error;
	}
  },

  getApiUrl: () => apiUrl,

  custom: async ({ url, method, payload, query, headers }) => {
	try {
	  let axiosResponse;
	  switch (method) {
		case "put":
		case "post":
		case "patch":
		  axiosResponse = await httpClient[method](url, payload, { headers });
		  break;
		case "delete":
		  axiosResponse = await httpClient.delete(url, {
			data: payload,
			headers: headers,
		  });
		  break;
		default:
		  axiosResponse = await httpClient.get(url, {
			params: query,
			headers,
		  });
		  break;
	  }

	  const { data } = axiosResponse;
	  return { data };
	} catch (error) {
	  console.error("Error in custom request:", error);
	  throw error;
	}
  },
});