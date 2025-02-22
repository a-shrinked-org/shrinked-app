import { 
  DataProvider,
  CrudFilters,
  CrudSorting,
  CrudOperators,
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
): DataProvider => ({
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
	const url = `${apiUrl}/${resource}`;

	const { current = 1, pageSize = 10, mode = "server" } = pagination ?? {};

	const queryFilters = generateFilters(filters);
	const querySort = generateSort(sorters);

	const { data, headers } = await httpClient.get(url, {
	  params: {
		_start: (current - 1) * pageSize,
		_limit: pageSize,
		...queryFilters,
		...querySort,
	  },
	  headers: meta?.headers,
	});

	return {
	  data,
	  total: headers["x-total-count"] || data.length,
	};
  },

  getOne: async ({ resource, id, meta }) => {
	const url = `${apiUrl}/${resource}/${id}`;

	const { data } = await httpClient.get(url, {
	  headers: meta?.headers,
	});

	return {
	  data,
	};
  },

  create: async ({ resource, variables, meta }) => {
	const url = resource === "jobs" ? `${apiUrl}/${resource}` : `${apiUrl}/${resource}/key`;

	const { data } = await httpClient.post(url, variables, {
	  headers: meta?.headers,
	});

	return {
	  data,
	};
  },

  update: async ({ resource, id, variables, meta }) => {
	const url = `${apiUrl}/${resource}/${id}`;

	const { data } = await httpClient.patch(url, variables, {
	  headers: meta?.headers,
	});

	return {
	  data,
	};
  },

  deleteOne: async ({ resource, id, variables, meta }) => {
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
	const { data } = await httpClient.get(
	  `${apiUrl}/${resource}`,
	  {
		params: { id: ids },
		headers: meta?.headers,
	  }
	);

	return {
	  data,
	};
  },

  createMany: async ({ resource, variables, meta }) => {
	const { data } = await httpClient.post(
	  `${apiUrl}/${resource}/bulk`,
	  { bulk: variables },
	  {
		headers: meta?.headers,
	  }
	);

	return {
	  data,
	};
  },

  updateMany: async ({ resource, ids, variables, meta }) => {
	const { data } = await httpClient.patch(
	  `${apiUrl}/${resource}/bulk`,
	  { ids, ...variables },
	  {
		headers: meta?.headers,
	  }
	);

	return {
	  data,
	};
  },

  deleteMany: async ({ resource, ids, variables, meta }) => {
	const { data } = await httpClient.delete(
	  `${apiUrl}/${resource}/bulk`,
	  {
		data: { ids, ...variables },
		headers: meta?.headers,
	  }
	);

	return {
	  data,
	};
  },

  getApiUrl: () => apiUrl,

  custom: async ({ url, method, filters, sorters, payload, query, headers }) => {
	let requestUrl = `${url}`;

	if (filters) {
	  const queryFilters = generateFilters(filters);
	  requestUrl = `${requestUrl}?${queryString.stringify(queryFilters)}`;
	}

	if (sorters) {
	  const querySort = generateSort(sorters);
	  requestUrl = `${requestUrl}${filters ? "&" : "?"}${queryString.stringify(
		querySort
	  )}`;
	}

	let axiosResponse;
	switch (method) {
	  case "put":
	  case "post":
	  case "patch":
		axiosResponse = await httpClient[method](url, payload, {
		  headers,
		});
		break;
	  case "delete":
		axiosResponse = await httpClient.delete(url, {
		  data: payload,
		  headers: headers,
		});
		break;
	  default:
		axiosResponse = await httpClient.get(requestUrl, {
		  headers,
		});
		break;
	}

	const { data } = axiosResponse;

	return Promise.resolve({ data });
  },
});