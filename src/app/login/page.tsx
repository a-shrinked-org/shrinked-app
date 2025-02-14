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
  Image
} from '@mantine/core';
import { NextImage } from 'next/image';

interface FormData {
  email: string;
  password: string;
  username: string;
}

export default function Login() {
  const { mutate: login } = useLogin();
  const { mutate: register } = useRegister();
  const [error, setError] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    username: ""
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCustomLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    login({
      email: formData.email,
      password: formData.password
    });
  };

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    register(formData);
  };

  const handleAuth0Login = () => {
    login({
      providerName: "auth0"
    });
  };

  return (
    <Container size="xs" mt="xl">
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mt="md" mb="md">
          Welcome
        </Title>

        {error && (
          <Alert color="red" mb="md">
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
              leftSection={
                <Image
                  src="https://refine.ams3.cdn.digitaloceanspaces.com/superplate-auth-icons%2Fauth0-2.svg"
                  alt="Auth0"
                  width={20}
                  height={20}
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
              />
              <Button type="submit" fullWidth>
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
              />
              <TextInput
                label="Username"
                placeholder="Your username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                mb="md"
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
              />
              <Button type="submit" fullWidth>
                Register
              </Button>
            </form>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}