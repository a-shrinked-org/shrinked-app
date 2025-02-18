"use client";

import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useLogin, useRegister } from "@refinedev/core";
import { 
  Paper, 
  Title, 
  TextInput, 
  Button, 
  Container, 
  Divider, 
  Alert,
  Tabs,
} from '@mantine/core';

interface FormData {
  email: string;
  password: string;
  username: string;
}

export default function Login() {
  const { mutate: login, isLoading: isLoginLoading } = useLogin();
  const { mutate: register, isLoading: isRegisterLoading } = useRegister();
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    username: ""
  });
  
  const { data: isAuthenticated } = useIsAuthenticated();
  const router = useRouter();
  
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/jobs");
    }
  }, [isAuthenticated, router]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    setError("");
  };

  const handleCustomLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      login({
        email: formData.email,
        password: formData.password
      }, {
        onError: (error: any) => {
          setError(error?.message || "Login failed");
        }
      });
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    if (!formData.email || !formData.password || !formData.username) {
      setError("Please fill in all fields");
      return;
    }

    try {
      register(formData, {
        onError: (error: any) => {
          setError(error?.message || "Registration failed");
        }
      });
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  const handleAuth0Login = () => {
    login({
      providerName: "auth0"
    }, {
      onError: (error: any) => {
        setError(error?.message || "Auth0 login failed");
      }
    });
  };

  return (
    <Container size="xs" mt="xl">
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mt="md" mb="md">
          Welcome
        </Title>

        {error && (
          <Alert color="red" mb="md" title="Error">
            {error}
          </Alert>
        )}

        <Tabs defaultValue="login">
          <Tabs.List grow mb="md">
            <Tabs.Tab value="login">Login</Tabs.Tab>
            <Tabs.Tab value="register">Register</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="login">
            <Button
              fullWidth
              variant="outline"
              onClick={handleAuth0Login}
              loading={isLoginLoading}
              leftSection={
                <img
                  src="https://refine.ams3.cdn.digitaloceanspaces.com/superplate-auth-icons%2Fauth0-2.svg"
                  alt="Auth0"
                  style={{ width: 20, height: 20 }}
                />
              }
            >
              Sign in with Auth0
            </Button>

            <Divider
              label="Or continue with email"
              labelPosition="center"
              my="lg"
            />

            <form onSubmit={handleCustomLogin}>
              <TextInput
                label="Email"
                placeholder="you@example.com"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                mb="md"
                disabled={isLoginLoading}
              />
              <TextInput
                label="Password"
                type="password"
                placeholder="Your password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                mb="md"
                disabled={isLoginLoading}
              />
              <Button 
                type="submit" 
                fullWidth
                loading={isLoginLoading}
              >
                Sign in
              </Button>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="register">
            <form onSubmit={handleRegister}>
              <TextInput
                label="Email"
                placeholder="you@example.com"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                mb="md"
                disabled={isRegisterLoading}
              />
              <TextInput
                label="Username"
                placeholder="Your username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                mb="md"
                disabled={isRegisterLoading}
              />
              <TextInput
                label="Password"
                type="password"
                placeholder="Your password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                mb="md"
                disabled={isRegisterLoading}
              />
              <Button 
                type="submit" 
                fullWidth
                loading={isRegisterLoading}
              >
                Register
              </Button>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}