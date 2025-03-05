// Fix for fetchApiKeys function - Properly type the caught error
useEffect(() => {
  const fetchApiKeys = async () => {
    // Use centralized token management
    const token = authUtils.getAccessToken() || identity?.token;
    
    if (!token) {
      console.log("No token available, skipping API keys fetch");
      return;
    }

    setIsLoadingKeys(true);
    setError(null);

    try {
      console.log("Fetching API keys...");
      const fetchedApiKeys = await ApiKeyService.getApiKeys(token);
      console.log("API keys fetched successfully:", fetchedApiKeys.length, "keys");
      setApiKeys(fetchedApiKeys);
    } catch (error: unknown) {
      console.error("Error fetching API keys:", error);
      
      // Try token refresh on auth errors - Properly check the error type
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("403")) {
          const refreshSuccess = await authUtils.refreshToken();
          if (refreshSuccess) {
            // Retry with new token
            const newToken = authUtils.getAccessToken();
            if (newToken) {
              try {
                const fetchedApiKeys = await ApiKeyService.getApiKeys(newToken);
                setApiKeys(fetchedApiKeys);
                return;
              } catch (retryError) {
                console.error("Error fetching API keys after token refresh:", retryError);
              }
            }
          }
        }
      }
      
      setApiKeys([]);
      setError("Error fetching API keys. Please try again later.");
    } finally {
      setIsLoadingKeys(false);
    }
  };

  if (identity?.token) {
    fetchApiKeys();
  }
}, [identity?.token]);

// Fix for refreshApiKeys function
const refreshApiKeys = async () => {
  // Use centralized token management
  const token = authUtils.getAccessToken() || identity?.token;
  
  if (!token) return;

  setIsLoadingKeys(true);
  setError(null);

  try {
    const fetchedApiKeys = await ApiKeyService.getApiKeys(token);
    setApiKeys(fetchedApiKeys);
  } catch (error: unknown) {
    console.error("Error refreshing API keys:", error);
    
    // Try token refresh on auth errors
    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("403")) {
        const refreshSuccess = await authUtils.refreshToken();
        if (refreshSuccess) {
          // Retry with new token
          const newToken = authUtils.getAccessToken();
          if (newToken) {
            try {
              const fetchedApiKeys = await ApiKeyService.getApiKeys(newToken);
              setApiKeys(fetchedApiKeys);
              return;
            } catch (retryError) {
              console.error("Error fetching API keys after token refresh:", retryError);
            }
          }
        }
      }
    }
    
    setApiKeys([]);
    setError("Error refreshing API keys. Please try again later.");
  } finally {
    setIsLoadingKeys(false);
  }
};

// Fix for handleCreateApiKey function
const handleCreateApiKey = async () => {
  if (!keyName) return;

  const effectiveUserId = userId || identity?.userId;
  // Use centralized token management
  const token = authUtils.getAccessToken() || identity?.token;

  if (!effectiveUserId || !token) {
    console.error("Missing required data for creating API key:", {
      keyName: !!keyName,
      userId: !!effectiveUserId,
      token: !!token,
    });
    setError("Cannot create API key: User ID is missing");
    return;
  }

  setIsLoading(true);
  setError(null);

  try {
    console.log(`Creating API key for userId: ${effectiveUserId}`);
    const newKey = await ApiKeyService.createApiKey(token, effectiveUserId, keyName);
    console.log("API key created successfully:", newKey ? "Result received" : "No result returned");

    setNewApiKey(newKey.key);
    setIsCreateModalOpen(false);
    setIsModalOpen(true);

    refreshApiKeys();
  } catch (error: unknown) {
    console.error("Error creating API key:", error);
    
    // Try token refresh on auth errors
    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("403")) {
        const refreshSuccess = await authUtils.refreshToken();
        if (refreshSuccess) {
          // Retry with new token
          try {
            const newToken = authUtils.getAccessToken();
            if (newToken && effectiveUserId) {
              const newKey = await ApiKeyService.createApiKey(newToken, effectiveUserId, keyName);
              setNewApiKey(newKey.key);
              setIsCreateModalOpen(false);
              setIsModalOpen(true);
              refreshApiKeys();
              return;
            }
          } catch (retryError) {
            console.error("Error creating API key after token refresh:", retryError);
          }
        }
      }
    }
    
    setError(`Error creating API key: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    setIsLoading(false);
  }
};

// Fix for handleDeleteApiKey function
const handleDeleteApiKey = async (keyId: string) => {
  // Use centralized token management
  const token = authUtils.getAccessToken() || identity?.token;
  
  if (!token) return;

  try {
    await ApiKeyService.deleteApiKey(token, keyId);
    refreshApiKeys();
  } catch (error: unknown) {
    console.error("Error deleting API key:", error);
    
    // Try token refresh on auth errors
    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("403")) {
        const refreshSuccess = await authUtils.refreshToken();
        if (refreshSuccess) {
          // Retry with new token
          const newToken = authUtils.getAccessToken();
          if (newToken) {
            try {
              await ApiKeyService.deleteApiKey(newToken, keyId);
              refreshApiKeys();
              return;
            } catch (retryError) {
              console.error("Error deleting API key after token refresh:", retryError);
            }
          }
        }
      }
    }
    
    setError(`Error deleting API key: ${error instanceof Error ? error.message : String(error)}`);
  }
};