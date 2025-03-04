"use client";

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useLogin } from "@refinedev/core";
import { 
  Card, 
  Title, 
  TextInput, 
  Button, 
  Container, 
  Divider, 
  Alert,
  SimpleGrid,
  Group,
  Text,
  Box,
} from '@mantine/core';
import { IconBrandGoogle, IconBook, IconCode, IconRocket } from '@tabler/icons-react';

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  const { mutate: login, isLoading } = useLogin();
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleGoogleLogin = () => {
    setMessage("Using NextAuth Google flow...");
    login(
      { providerName: "google" },
      {
        onError: (error: any) => {
          console.error("Google login error:", error);
          setError(error?.message || "Google login failed");
        },
      }
    );
  };

  // Direct API endpoint test
  const handleDirectGoogleLogin = () => {
    setMessage("Redirecting to api.shrinked.ai/auth/google...");
    
    // This will perform a direct redirect to your API's Google auth endpoint
    window.location.href = "https://api.shrinked.ai/auth/google";
  };

  // Test for direct Google OAuth flow
  const handleDirectGoogleOAuth = () => {
    setMessage("Initiating direct Google OAuth flow...");
    
    // Constructing Google OAuth URL directly
    const clientId = "766372410745-62h4u9a79hetvm4858o5e95eg8jvapv8.apps.googleusercontent.com";
    const redirectUri = encodeURIComponent(window.location.origin + "/api/auth/callback/google");
    const scope = encodeURIComponent("openid email profile");
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
    
    window.location.href = googleAuthUrl;
  };

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password");
      return;
    }

    login(
      { email: formData.email, password: formData.password },
      {
        onSuccess: () => {
          // The redirect is handled by the auth provider
        },
        onError: (error: any) => {
          console.error("Email login error:", error);
          setError(error?.message || "Login failed");
        },
      }
    );
  };

  // Determine if the email button should be active (enabled) or passive (disabled)
  const isEmailButtonActive = !!formData.email.trim() && !!formData.password.trim();

  return (
    <Container
      size="xs"
      px={{ base: 'sm', md: 'xl' }}
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card radius="md" p="xl" withBorder style={{ backgroundColor: '#F5F5F5', maxWidth: '100%' }}>
        <Title order={2} ta="center" mb="md">
          Your first deploy
          is just a sign-up away.
        </Title>

        {error && (
          <Alert color="red" mb="md" title="Error">
            {error}
          </Alert>
        )}
        
        {message && (
          <Alert color="blue" mb="md" title="Info">
            {message}
          </Alert>
        )}

        <Button
          fullWidth
          variant="filled"
          onClick={handleGoogleLogin}
          loading={isLoading}
          leftSection={<IconBrandGoogle size={20} />}
          mb="md"
          style={{ 
            backgroundColor: '#4285F4', // Google blue
            color: '#FFFFFF',
            borderColor: 'transparent',
          }}
        >
          Sign in with Google (NextAuth)
        </Button>
        
        <Button
          fullWidth
          variant="outline"
          onClick={handleDirectGoogleLogin}
          mb="md"
          style={{ 
            borderColor: '#4285F4', 
            color: '#4285F4',
          }}
        >
          Test: Direct API Google Auth
        </Button>
        
        <Button
          fullWidth
          variant="outline"
          onClick={handleDirectGoogleOAuth}
          mb="md"
          style={{ 
            borderColor: '#34A853', // Google green 
            color: '#34A853',
          }}
        >
          Test: Direct Google OAuth
        </Button>

        <Divider label="Or continue with email" labelPosition="center" my="lg" />

        <form onSubmit={handleEmailSubmit}>
          <TextInput
            label="Your work email"
            placeholder="you@example.com"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            mb="md"
            disabled={isLoading}
            styles={{
              input: { backgroundColor: '#333333', color: '#FFFFFF' },
              label: { color: '#333333' },
            }}
          />
          <TextInput
            label="Password"
            type="password"
            placeholder="Enter your password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required
            mb="md"
            disabled={isLoading}
            styles={{
              input: { backgroundColor: '#333333', color: '#FFFFFF' },
              label: { color: '#333333' },
            }}
          />
          <Button
            type="submit"
            fullWidth
            loading={isLoading}
            disabled={!isEmailButtonActive}
            style={{
              backgroundColor: isEmailButtonActive ? '#D87A16' : '#666666',
              color: '#FFFFFF',
              opacity: isEmailButtonActive ? 1 : 0.6,
            }}
          >
            Continue with email
          </Button>
        </form>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mt="lg" spacing="md" w="100%">
        <Card radius="md" p="sm" withBorder style={{ backgroundColor: '#F5F5F5' }}>
          <Group justify="center">
            <IconBook size={24} style={{ color: '#333333' }} />
            <Text size="sm" style={{ color: '#333333' }}>Resources</Text>
          </Group>
        </Card>
        <Card radius="md" p="sm" withBorder style={{ backgroundColor: '#F5F5F5' }}>
          <Group justify="center">
            <IconCode size={24} style={{ color: '#333333' }} />
            <Text size="sm" style={{ color: '#333333' }}>Guides</Text>
          </Group>
        </Card>
        <Card radius="md" p="sm" withBorder style={{ backgroundColor: '#F5F5F5' }}>
          <Group justify="center">
            <IconRocket size={24} style={{ color: '#333333' }} />
            <Text size="sm" style={{ color: '#333333' }}>Examples</Text>
          </Group>
        </Card>
      </SimpleGrid>
      
      <Box my="lg" p="md" style={{ backgroundColor: '#F5F5F5', borderRadius: '8px', maxWidth: '100%' }}>
        {/* Changed 'weight' to 'fw' (fontWeight) which is the correct prop in Mantine */}
        <Text size="sm" fw={500} mb="xs">Debug Info:</Text>
        <Text size="xs" color="dimmed">
          NextAuth uses the configured Google provider in NextAuth options.<br/>
          Direct API uses your custom endpoint at api.shrinked.ai.<br/>
          Direct OAuth constructs a Google OAuth URL with your client ID.
        </Text>
      </Box>
    </Container>
  );
}