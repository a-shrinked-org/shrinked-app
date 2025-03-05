// src/services/api-key-service.ts
import { authUtils, API_CONFIG } from "@/utils/authUtils";

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  createdAt?: string;
}

export const ApiKeyService = {
  async getApiKeys(token: string): Promise<ApiKey[]> {
	try {
	  // Instead of using a dedicated API keys endpoint, fetch from the profile
	  // since the API keys are included in the profile data
	  const response = await fetch(`${API_CONFIG.API_URL}/users/profile`, {
		method: 'GET',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		}
	  });

	  if (!response.ok) {
		// Try token refresh if unauthorized
		if (response.status === 401 || response.status === 403) {
		  const refreshSuccess = await authUtils.refreshToken();
		  if (refreshSuccess) {
			const newToken = authUtils.getAccessToken();
			if (newToken) {
			  return this.getApiKeys(newToken);
			}
		  }
		}
		
		if (response.status === 404) {
		  return [];
		}
		throw new Error(`Error fetching profile: ${response.status}`);
	  }

	  const profileData = await response.json();
	  
	  // Check if apiKeys exists in the profile data
	  if (!profileData.apiKeys || !Array.isArray(profileData.apiKeys)) {
		console.log("No API keys found in profile data");
		return [];
	  }
	  
	  // Transform the API keys array into the format expected by the UI
	  const formattedApiKeys: ApiKey[] = profileData.apiKeys.map((key: string, index: number) => {
		return {
		  id: key, // Use the key itself as the ID
		  name: `API Key ${index + 1}`, // Generate a name since we don't have one
		  key: key,
		  userId: profileData.userId || profileData._id
		};
	  });
	  
	  console.log(`Transformed ${formattedApiKeys.length} API keys from profile data`);
	  return formattedApiKeys;
	} catch (error) {
	  console.error('Error fetching API keys from profile:', error);
	  throw error;
	}
  },

  async createApiKey(token: string, userId: string, name: string): Promise<ApiKey> {
	try {
	  // Using the correct endpoint from Postman collection
	  const response = await fetch(`${API_CONFIG.API_URL}/users/${userId}/api-key`, {
		method: 'POST',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		},
		body: JSON.stringify({ name })
	  });

	  if (!response.ok) {
		// Try token refresh if unauthorized
		if (response.status === 401 || response.status === 403) {
		  const refreshSuccess = await authUtils.refreshToken();
		  if (refreshSuccess) {
			const newToken = authUtils.getAccessToken();
			if (newToken) {
			  return this.createApiKey(newToken, userId, name);
			}
		  }
		}
		throw new Error(`Error creating API key: ${response.status}`);
	  }

	  const data = await response.json();
	  
	  // Add a name field if not present in the response
	  if (!data.name && name) {
		data.name = name;
	  }
	  
	  return data;
	} catch (error) {
	  console.error('Error creating API key:', error);
	  throw error;
	}
  },

  async deleteApiKey(token: string, keyId: string): Promise<void> {
	try {
	  // Using the correct endpoint from Postman collection
	  const response = await fetch(`${API_CONFIG.API_URL}/users/api-key/${keyId}`, {
		method: 'DELETE',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		}
	  });

	  if (!response.ok) {
		// Try token refresh if unauthorized
		if (response.status === 401 || response.status === 403) {
		  const refreshSuccess = await authUtils.refreshToken();
		  if (refreshSuccess) {
			const newToken = authUtils.getAccessToken();
			if (newToken) {
			  return this.deleteApiKey(newToken, keyId);
			}
		  }
		}
		throw new Error(`Error deleting API key: ${response.status}`);
	  }
	} catch (error) {
	  console.error('Error deleting API key:', error);
	  throw error;
	}
  },

  async regenerateApiKey(token: string, keyId: string): Promise<ApiKey> {
	try {
	  // Using the correct endpoint from Postman collection
	  const response = await fetch(`${API_CONFIG.API_URL}/users/api-key/${keyId}/regenerate`, {
		method: 'POST',
		headers: {
		  'Authorization': `Bearer ${token}`,
		  'Content-Type': 'application/json'
		}
	  });

	  if (!response.ok) {
		// Try token refresh if unauthorized
		if (response.status === 401 || response.status === 403) {
		  const refreshSuccess = await authUtils.refreshToken();
		  if (refreshSuccess) {
			const newToken = authUtils.getAccessToken();
			if (newToken) {
			  return this.regenerateApiKey(newToken, keyId);
			}
		  }
		}
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