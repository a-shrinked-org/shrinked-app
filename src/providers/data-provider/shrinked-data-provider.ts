import { 
  DataProvider,
  CrudFilters,
  CrudSorting,
  HttpError
} from "@refinedev/core";

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

export const shrinkedDataProvider = (apiUrl: string): Partial<DataProvider> => ({
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
	try {
	  const url = `${apiUrl}/${resource}`;
	  const current = pagination?.current || 1;
	  const pageSize = pagination?.pageSize || 10;

	  const response = await fetch(url, {
		method: 'GET',
		headers: {
		  'Content-Type': 'application/json',
		  ...(meta?.headers || {})
		},
		params: {
		  page: current,
		  limit: pageSize,
		  ...generateFilters(filters),
		  ...generateSort(sorters),
		}
	  });

	  if (!response.ok) {
		throw new HttpError({
		  message: 'Error fetching data',
		  statusCode: response.status
		});
	  }

	  const data = await response.json();
	  const jobs = data.jobs || data.data || data;
	  const total = data.total || (Array.isArray(jobs) ? jobs.length : 0);

	  return {
		data: jobs,
		total
	  };
	} catch (error) {
	  throw new HttpError(error as any);
	}
  },

  getOne: async ({ resource, id, meta }) => {
	try {
	  if (!id) {
		throw new Error('ID is required');
	  }

	  const url = `${apiUrl}/${resource}/${id}`;
	  const response = await fetch(url, {
		headers: {
		  'Content-Type': 'application/json',
		  ...(meta?.headers || {})
		}
	  });

	  if (!response.ok) {
		throw new HttpError({
		  message: 'Error fetching resource',
		  statusCode: response.status
		});
	  }

	  const data = await response.json();
	  return {
		data: data.data || data
	  };
	} catch (error) {
	  throw new HttpError(error as any);
	}
  },

  create: async ({ resource, variables, meta }) => {
	try {
	  const url = `${apiUrl}/${resource}`;
	  const response = await fetch(url, {
		method: 'POST',
		headers: {
		  'Content-Type': 'application/json',
		  ...(meta?.headers || {})
		},
		body: JSON.stringify(variables)
	  });

	  if (!response.ok) {
		throw new HttpError({
		  message: 'Error creating resource',
		  statusCode: response.status
		});
	  }

	  const data = await response.json();
	  return {
		data: data.data || data
	  };
	} catch (error) {
	  throw new HttpError(error as any);
	}
  },

  update: async ({ resource, id, variables, meta }) => {
	try {
	  if (!id) {
		throw new Error('ID is required');
	  }

	  const url = `${apiUrl}/${resource}/${id}`;
	  const response = await fetch(url, {
		method: 'PATCH',
		headers: {
		  'Content-Type': 'application/json',
		  ...(meta?.headers || {})
		},
		body: JSON.stringify(variables)
	  });

	  if (!response.ok) {
		throw new HttpError({
		  message: 'Error updating resource',
		  statusCode: response.status
		});
	  }

	  const data = await response.json();
	  return {
		data: data.data || data
	  };
	} catch (error) {
	  throw new HttpError(error as any);
	}
  },

  deleteOne: async ({ resource, id, variables, meta }) => {
	try {
	  if (!id) {
		throw new Error('ID is required');
	  }

	  const url = `${apiUrl}/${resource}/${id}`;
	  const response = await fetch(url, {
		method: 'DELETE',
		headers: {
		  'Content-Type': 'application/json',
		  ...(meta?.headers || {})
		},
		body: JSON.stringify(variables)
	  });

	  if (!response.ok) {
		throw new HttpError({
		  message: 'Error deleting resource',
		  statusCode: response.status
		});
	  }

	  const data = await response.json();
	  return {
		data: data.data || data
	  };
	} catch (error) {
	  throw new HttpError(error as any);
	}
  },

  getMany: async ({ resource, ids, meta }) => {
	try {
	  if (!ids || !ids.length) {
		return { data: [] };
	  }

	  const url = `${apiUrl}/${resource}`;
	  const response = await fetch(url, {
		headers: {
		  'Content-Type': 'application/json',
		  ...(meta?.headers || {})
		},
		params: { ids: ids.join(",") }
	  });

	  if (!response.ok) {
		throw new HttpError({
		  message: 'Error fetching resources',
		  statusCode: response.status
		});
	  }

	  const data = await response.json();
	  return {
		data: data.data || (Array.isArray(data) ? data : [])
	  };
	} catch (error) {
	  throw new HttpError(error as any);
	}
  },

  custom: async ({ url, method, payload, query, headers }) => {
	try {
	  const config: RequestInit = {
		method: method || 'GET',
		headers: {
		  'Content-Type': 'application/json',
		  ...(headers || {})
		}
	  };

	  if (payload) {
		config.body = JSON.stringify(payload);
	  }

	  const response = await fetch(url, config);

	  if (!response.ok) {
		throw new HttpError({
		  message: 'Error in custom request',
		  statusCode: response.status
		});
	  }

	  const data = await response.json();
	  return { data };
	} catch (error) {
	  throw new HttpError(error as any);
	}
  },

  getApiUrl: () => apiUrl
});