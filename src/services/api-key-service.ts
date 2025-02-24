const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  createdAt: string;
}

export const ApiKeyService = {
  async getApiKeys(token: string): Promise<ApiKey[]> {
	try {
	  const response = await fetch(`${API_URL}/users/api-keys`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		}
	  });

	  if (!response.ok) {
		throw new Error(`Error fetching API keys: ${response.status}`);
	  }

	  const data = await response.json();
	  return data.data || data;
	} catch (error) {
	  console.error('Error fetching API keys:', error);
	  throw error;
	}
  },

  async createApiKey(token: string, userId: string, name: string): Promise<ApiKey> {
	try {
	  const response = await fetch(`${API_URL}/users/${userId}/api-key`, {
		method: 'POST',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		},
		body: JSON.stringify({ name })
	  });

	  if (!response.ok) {
		throw new Error(`Error creating API key: ${response.status}`);
	  }

	  const data = await response.json();
	  return data;
	} catch (error) {
	  console.error('Error creating API key:', error);
	  throw error;
	}
  },

  async deleteApiKey(token: string, keyId: string): Promise<void> {
	try {
	  const response = await fetch(`${API_URL}/users/api-key/${keyId}`, {
		method: 'DELETE',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		}
	  });

	  if (!response.ok) {
		throw new Error(`Error deleting API key: ${response.status}`);
	  }
	} catch (error) {
	  console.error('Error deleting API key:', error);
	  throw error;
	}
  },

  async regenerateApiKey(token: string, keyId: string): Promise<ApiKey> {
	try {
	  const response = await fetch(`${API_URL}/users/api-key/${keyId}/regenerate`, {
		method: 'POST',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		}
	  });

	  if (!response.ok) {
		throw new Error(`Error regenerating API key: ${response.status}`);
	  }

	  const data = await response.json();
	  return data;
	} catch (error) {
	  console.error('Error regenerating API key:', error);
	  throw error;
	}
  }
};