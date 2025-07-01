import { authUtils } from "@/utils/authUtils";

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId?: string;
  createdAt?: string;
}

const API_BASE_URL = "/api/api-keys-proxy";

export const ApiKeyService = {
  async getApiKeys(): Promise<ApiKey[]> {
    try {
      const response = await authUtils.fetchWithAuth(API_BASE_URL);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`Error fetching API keys: ${response.status}`);
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error("Error fetching API keys:", error);
      throw error;
    }
  },

  async createApiKey(name: string): Promise<ApiKey> {
    try {
      const response = await authUtils.fetchWithAuth(API_BASE_URL, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error(`Error creating API key: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error creating API key:", error);
      throw error;
    }
  },

  async deleteApiKey(keyId: string): Promise<boolean> {
    try {
      const response = await authUtils.fetchWithAuth(`${API_BASE_URL}/${keyId}`, {
        method: "DELETE",
      });
      return response.ok;
    } catch (error) {
      console.error("Error deleting API key:", error);
      throw error;
    }
  },

  async regenerateApiKey(keyId: string): Promise<ApiKey> {
    try {
      const response = await authUtils.fetchWithAuth(`${API_BASE_URL}/${keyId}/regenerate`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Error regenerating API key: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error regenerating API key:", error);
      throw error;
    }
  },
};