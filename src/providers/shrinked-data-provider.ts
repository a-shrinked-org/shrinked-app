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
	  message: error.response?.data?.message || "An unexpected error occurred",
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
	const url = `${apiUrl}/${resource}${resource === "jobs/key" ? "" : ""}`;
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
	  data: data.data || data,
	  total: data.total || (data.data || data).length,
	};
  },

  getOne: async ({ resource, id, meta }) => {
	const url = `${apiUrl}/${resource}${resource === "jobs" ? "" : "/key"}/${id}`;

	const { data } = await httpClient.get(url, {
	  headers: meta?.headers,
	});

	return { data };
  },

  create: async ({ resource, variables, meta }) => {
	const url = `${apiUrl}/${resource}${resource === "jobs" ? "" : "/key"}`;

	const { data } = await httpClient.post(url, variables, {
	  headers: meta?.headers,
	});

	return { data };
  },

  update: async ({ resource, id, variables, meta }) => {
	const url = `${apiUrl}/${resource}${resource === "jobs" ? "" : "/key"}/${id}`;

	const { data } = await httpClient.patch(url, variables, {
	  headers: meta?.headers,
	});

	return { data };
  },

  deleteOne: async ({ resource, id, variables, meta }) => {
	const url = `${apiUrl}/${resource}${resource === "jobs" ? "" : "/key"}/${id}`;

	const { data } = await httpClient.delete(url, {
	  data: variables,
	  headers: meta?.headers,
	});

	return { data };
  },

  getMany: async ({ resource, ids, meta }) => {
	const url = `${apiUrl}/${resource}${resource === "jobs" ? "" : "/key"}`;

	const { data } = await httpClient.get(url, {
	  params: { ids: ids.join(",") },
	  headers: meta?.headers,
	});

	return { data };
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