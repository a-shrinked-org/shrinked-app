"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { useAuthProvider } from "@refinedev/core";
import { Card, Title, TextInput, Button, Container, Alert, Text } from "@mantine/core";

export default function VerifyEmail() {
  const { verifyEmail } = useAuthProvider();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{ token: string; email: string; password: string }>({
    token: new URLSearchParams(window.location.search).get("token") || "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const pendingUser = localStorage.getItem("pendingUser");
    if (pendingUser) {
      const { email } = JSON.parse(pendingUser);
      setFormData((prev) => ({ ...prev, email }));
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!formData.token || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    // Client-side validation (not secure, for demo only)
    const pendingUser = localStorage.getItem("pendingUser");
    if (pendingUser) {
      const { token: storedToken, email: storedEmail, password: storedPassword } = JSON.parse(pendingUser);
      if (storedToken === formData.token && storedEmail === formData.email) {
        localStorage.setItem(
          "verifiedUser",
          JSON.stringify({ email: formData.email, password: formData.password })
        );
        localStorage.removeItem("pendingUser");
        window.location.href = "/jobs"; // Simulate login
        return;
      }
    }

    // Fallback to auth provider if backend is used later
    verifyEmail(
      { token: formData.token, email: formData.email, password: formData.password },
      {
        onSuccess: () => {
          // Redirect to /jobs handled by auth provider
        },
        onError: (error: any) => {
          setError(error?.message || "Verification failed");
          setIsLoading(false);
        },
      }
    );
  };

  return (
    <Container size="xs" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <Card radius="md" p="xl" withBorder style={{ backgroundColor: "#F5F5F5" }}>
        <Title order={2} ta="center" mb="md">
          Verify Your Email
        </Title>
        <Text ta="center" mb="md">
          A verification link has been sent to your email. Enter the details below to complete signup.
        </Text>
        {error && <Alert color="red" mb="md" title="Error">{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextInput
            label="Email"
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
          <TextInput
            label="Verification Token"
            name="token"
            value={formData.token}
            onChange={handleInputChange}
            required
            mb="md"
            disabled
            styles={{
              input: { backgroundColor: "#333333", color: "#FFFFFF" },
              label: { color: "#333333" },
            }}
          />
          <Button
            type="submit"
            fullWidth
            loading={isLoading}
            style={{ backgroundColor: "#D87A16", color: "#FFFFFF" }}
          >
            Verify and Sign In
          </Button>
        </form>
      </Card>
    </Container>
  );
}