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

	const { current = 1, pageSize = 10 } = pagination ?? {};

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
	  data: data.jobs || data,
	  total: data.total || (data.jobs || data).length,
	};
  },

  getOne: async ({ resource, id, meta }) => {
	// Ensure we have a valid ID
	if (!id) {
	  throw new Error('Invalid job ID');
	}

	// Use the correct endpoint based on authentication type
	const url = `${apiUrl}/${resource === "jobs/key" ? "jobs/key" : "jobs"}/${id}`;

	const { data } = await httpClient.get(url, {
	  headers: meta?.headers,
	});

	return {
	  data: data.job || data,
	};
  },

  create: async ({ resource, variables, meta }) => {
	const url = `${apiUrl}/${resource}`;

	const { data } = await httpClient.post(url, variables, {
	  headers: meta?.headers,
	});

	return {
	  data,
	};
  },

  update: async ({ resource, id, variables, meta }) => {
	if (!id) {
	  throw new Error('Invalid job ID');
	}

	const url = `${apiUrl}/${resource}/${id}`;

	const { data } = await httpClient.patch(url, variables, {
	  headers: meta?.headers,
	});

	return {
	  data,
	};
  },

  deleteOne: async ({ resource, id, variables, meta }) => {
	if (!id) {
	  throw new Error('Invalid job ID');
	}

	const url = `${apiUrl}/${resource}/${id}`;

	const { data } = await httpClient.delete(url, {
	  data: variables,
	  headers: meta?.headers,
	});

	return {
	  data,
	};
  },

  getMany: async ({ resource, ids, meta }) => {
	if (!ids || !ids.length) {
	  return { data: [] };
	}

	const { data } = await httpClient.get(
	  `${apiUrl}/${resource}`,
	  {
		params: { ids: ids.join(",") },
		headers: meta?.headers,
	  }
	);

	return {
	  data: data.jobs || data,
	};
  },

  getApiUrl: () => apiUrl,

  custom: async ({ url, method, payload, query, headers }) => {
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
  },
});