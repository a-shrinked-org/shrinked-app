import { 
  DataProvider,
  CrudFilters,
  CrudSorting
} from "@refinedev/core";

const generateFilters = (filters?: CrudFilters) => {
  const queryFilters: Record<string, string> = {};

  filters?.forEach((filter) => {
	if ("field" in filter) {
	  const { field, operator, value } = filter;
	  if (operator === "eq" && value !== undefined) {
		queryFilters[field] = String(value);
	  }
	}
  });

  return queryFilters;
};

const generateSort = (sorters?: CrudSorting): Record<string, string> => {
  if (sorters && sorters.length > 0) {
	const { field, order } = sorters[0];
	return {
	  sort: String(field),
	  order: String(order)
	};
  }
  return {};
};

export const shrinkedDataProvider = (apiUrl: string): Partial<DataProvider> => ({
  getList: async ({ resource, pagination, filters, sorters, meta }) => {
	try {
	  const current = pagination?.current || 1;
	  const pageSize = pagination?.pageSize || 10;

	  // Combine all query parameters
	  const baseParams = {
		page: String(current),
		limit: String(pageSize)
	  };

	  const filterParams = generateFilters(filters);
	  const sortParams = generateSort(sorters);
	  
	  // Convert params to query string
	  const queryString = new URLSearchParams({
		...baseParams,
		...filterParams,
		...sortParams
	  }).toString();

	  const url = `${apiUrl}/${resource}${queryString ? `?${queryString}` : ''}`;

	  const response = await fetch(url, {
		method: 'GET',
		headers: {
		  'Content-Type': 'application/json',
		  ...(meta?.headers || {})
		}
	  });

	  if (!response.ok) {
		throw {
		  message: 'Error fetching data',
		  statusCode: response.status
		};
	  }

	  const data = await response.json();
	  const jobs = data.jobs || data.data || data;
	  const total = data.total || (Array.isArray(jobs) ? jobs.length : 0);

	  return {
		data: jobs,
		total
	  };
	} catch (error) {
	  throw error;
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
		throw {
		  message: 'Error fetching resource',
		  statusCode: response.status
		};
	  }

	  const data = await response.json();
	  return {
		data: data.data || data
	  };
	} catch (error) {
	  throw error;
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
		throw {
		  message: 'Error creating resource',
		  statusCode: response.status
		};
	  }

	  const data = await response.json();
	  return {
		data: data.data || data
	  };
	} catch (error) {
	  throw error;
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
		throw {
		  message: 'Error updating resource',
		  statusCode: response.status
		};
	  }

	  const data = await response.json();
	  return {
		data: data.data || data
	  };
	} catch (error) {
	  throw error;
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
		throw {
		  message: 'Error deleting resource',
		  statusCode: response.status
		};
	  }

	  const data = await response.json();
	  return {
		data: data.data || data
	  };
	} catch (error) {
	  throw error;
	}
  },

  getMany: async ({ resource, ids, meta }) => {
	try {
	  if (!ids || !ids.length) {
		return { data: [] };
	  }

	  const params = new URLSearchParams({
		ids: ids.join(",")
	  });

	  const url = `${apiUrl}/${resource}?${params.toString()}`;
	  const response = await fetch(url, {
		headers: {
		  'Content-Type': 'application/json',
		  ...(meta?.headers || {})
		}
	  });

	  if (!response.ok) {
		throw {
		  message: 'Error fetching resources',
		  statusCode: response.status
		};
	  }

	  const data = await response.json();
	  return {
		data: data.data || (Array.isArray(data) ? data : [])
	  };
	} catch (error) {
	  throw error;
	}
  },

  custom: async ({ url, method, payload, query, headers }) => {
	try {
	  const params = query ? new URLSearchParams(query as Record<string, string>) : null;
	  const fullUrl = `${url}${params ? `?${params.toString()}` : ''}`;

	  const response = await fetch(fullUrl, {
		method: method || 'GET',
		headers: {
		  'Content-Type': 'application/json',
		  ...(headers || {})
		},
		...(payload ? { body: JSON.stringify(payload) } : {})
	  });

	  if (!response.ok) {
		throw {
		  message: 'Error in custom request',
		  statusCode: response.status
		};
	  }

	  const data = await response.json();
	  return { data };
	} catch (error) {
	  throw error;
	}
  },

  getApiUrl: () => apiUrl
});