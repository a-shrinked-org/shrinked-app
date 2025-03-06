"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
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
} from "@mantine/core";
import { IconBrandGoogle, IconBook, IconCode, IconRocket } from "@tabler/icons-react";
// Import nanoid (non-secure version for simplicity in browser)
import { nanoid } from "nanoid";

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  const { mutate: login, isLoading } = useLogin();
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
    setInfo("");
  };

  const handleGoogleLogin = () => {
    window.location.href = "https://api.shrinked.ai/auth/google";
  };

  const sendVerificationEmail = async (email: string, token: string) => {
    const verificationUrl = `${window.location.origin}/verify?token=${token}`;
    try {
      const response = await fetch("https://app.loops.so/api/v1/transactional", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_LOOPS_API_KEY}`, // Public key in Vercel env
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionalId: "cm7wuis1m08624etab0lrimzz", // Your Loops transactional ID
          email,
          dataVariables: { verificationUrl },
        }),
      });
      if (!response.ok) throw new Error("Failed to send verification email");
    } catch (err) {
      throw err;
    }
  };

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password");
      return;
    }

    login(
      { email: formData.email, password: formData.password },
      {
        onSuccess: async (data) => {
          if (data.redirectTo === "/verify-email") {
            const token = nanoid(); // Generate unique token
            try {
              await sendVerificationEmail(formData.email, token);
              setInfo("Account created! Please check your email for a verification link.");
              // Store temp data locally (not secure for production)
              localStorage.setItem(
                "pendingUser",
                JSON.stringify({ email: formData.email, token, password: formData.password })
              );
            } catch (err) {
              setError("Failed to send verification email");
            }
          }
        },
        onError: (error: any) => {
          console.error("Email login error:", error);
          setError(error?.message || "Login failed");
        },
      }
    );
  };

  const isEmailButtonActive = !!formData.email.trim() && !!formData.password.trim();

  return (
    <Container
      size="xs"
      px={{ base: "sm", md: "xl" }}
      style={{
        backgroundColor: "transparent",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card radius="md" p="xl" withBorder style={{ backgroundColor: "#F5F5F5", maxWidth: "100%" }}>
        <Title order={2} ta="center" mb="md">
          Your first deploy is just a sign-up away.
        </Title>

        {error && (
          <Alert color="red" mb="md" title="Error">
            {error}
          </Alert>
        )}
        {info && (
          <Alert color="blue" mb="md" title="Info">
            {info}
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
            backgroundColor: "#4285F4",
            color: "#FFFFFF",
            borderColor: "transparent",
          }}
        >
          Sign in with Google
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
              input: { backgroundColor: "#333333", color: "#FFFFFF" },
              label: { color: "#333333" },
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
              input: { backgroundColor: "#333333", color: "#FFFFFF" },
              label: { color: "#333333" },
            }}
          />
          <Button
            type="submit"
            fullWidth
            loading={isLoading}
            disabled={!isEmailButtonActive}
            style={{
              backgroundColor: isEmailButtonActive ? "#D87A16" : "#666666",
              color: "#FFFFFF",
              opacity: isEmailButtonActive ? 1 : 0.6,
            }}
          >
            Continue with email
          </Button>
        </form>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mt="lg" spacing="md" w="100%">
        <Card radius="md" p="sm" withBorder style={{ backgroundColor: "#F5F5F5" }}>
          <Group justify="center">
            <IconBook size={24} style={{ color: "#333333" }} />
            <Text size="sm" style={{ color: "#333333" }}>Resources</Text>
          </Group>
        </Card>
        <Card radius="md" p="sm" withBorder style={{ backgroundColor: "#F5F5F5" }}>
          <Group justify="center">
            <IconCode size={24} style={{ color: "#333333" }} />
            <Text size="sm" style={{ color: "#333333" }}>Guides</Text>
          </Group>
        </Card>
        <Card radius="md" p="sm" withBorder style={{ backgroundColor: "#F5F5F5" }}>
          <Group justify="center">
            <IconRocket size={24} style={{ color: "#333333" }} />
            <Text size="sm" style={{ color: "#333333" }}>Examples</Text>
          </Group>
        </Card>
      </SimpleGrid>
    </Container>
  );
}