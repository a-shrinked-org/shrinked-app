// src/services/api-key-service.ts
import { authUtils, API_CONFIG } from "@/utils/authUtils";

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId?: string;
  createdAt?: string;
}

export const ApiKeyService = {
  async getApiKeys(): Promise<ApiKey[]> {
	try {
	  const response = await authUtils.apiRequest(
		`${API_CONFIG.API_URL}/users/api-keys`
	  );

	  if (!response.ok) {
		if (response.status === 404) {
		  return [];
		}
		throw new Error(`Error fetching API keys: ${response.status}`);
	  }

	  const data = await response.json();
	  
	  if (!Array.isArray(data.data)) {
		console.log("No API keys found in response");
		return [];
	  }
	  
	  return data.data;
	} catch (error) {
	  console.error('Error fetching API keys:', error);
	  throw error;
	}
  },

  async createApiKey(name: string): Promise<ApiKey> {
	try {
	  // Correct endpoint is POST /users/api-keys
	  const response = await authUtils.apiRequest(
		`${API_CONFIG.API_URL}/users/api-keys`, 
		{
		  method: 'POST',
		  body: JSON.stringify({ name })
		}
	  );

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

  async deleteApiKey(keyId: string): Promise<boolean> {
	try {
	  // This matches the endpoint: DELETE /users/api-key/:keyId
	  const response = await authUtils.apiRequest(
		`${API_CONFIG.API_URL}/users/api-key/${keyId}`,
		{
		  method: 'DELETE'
		}
	  );

	  return response.ok;
	} catch (error) {
	  console.error('Error deleting API key:', error);
	  throw error;
	}
  },

  async regenerateApiKey(keyId: string): Promise<ApiKey> {
	try {
	  // If your API supports this endpoint
	  const response = await authUtils.apiRequest(
		`${API_CONFIG.API_URL}/users/api-key/${keyId}/regenerate`,
		{
		  method: 'POST'
		}
	  );

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