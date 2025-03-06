"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Card, Title, TextInput, Button, Container, Alert, Text, Group, ThemeIcon } from "@mantine/core";
import { IconCheckCircle, IconAlertCircle } from "@tabler/icons-react";

export default function VerifyEmail() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [formData, setFormData] = useState<{ token: string; email: string; password: string }>({
    token: new URLSearchParams(window.location.search).get("token") || "",
    email: "",
    password: "",
  });

  useEffect(() => {
    console.log("VerifyEmail: Component mounted, checking for token in URL:", formData.token);
    const pendingUser = localStorage.getItem("pendingUser");
    if (pendingUser) {
      try {
        const parsedUser = JSON.parse(pendingUser);
        console.log("VerifyEmail: Found pending user with email:", parsedUser.email);
        setFormData((prev) => ({ ...prev, email: parsedUser.email }));
      } catch (err) {
        console.error("VerifyEmail: Error parsing pending user data:", err);
        setError("Error loading user data. Please try logging in again.");
      }
    } else {
      console.warn("VerifyEmail: No pending user found in localStorage");
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("VerifyEmail: Form submitted", { email: formData.email, hasToken: !!formData.token });
    setError("");
    setIsLoading(true);

    if (!formData.token || !formData.email || !formData.password) {
      console.warn("VerifyEmail: Missing required fields");
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      // Client-side validation (not secure, for demo only)
      const pendingUser = localStorage.getItem("pendingUser");
      if (pendingUser) {
        const parsedUser = JSON.parse(pendingUser);
        console.log("VerifyEmail: Comparing tokens:");
        console.log("- Stored token (first 4 chars):", parsedUser.token.substring(0, 4));
        console.log("- Provided token (first 4 chars):", formData.token.substring(0, 4));
        
        if (parsedUser.token === formData.token && parsedUser.email === formData.email) {
          console.log("VerifyEmail: Token and email verified successfully");
          
          // Store verified user data
          localStorage.setItem(
            "verifiedUser",
            JSON.stringify({ 
              email: formData.email, 
              password: formData.password,
              verifiedAt: new Date().toISOString() 
            })
          );
          
          localStorage.removeItem("pendingUser");
          setIsVerified(true);
          
          // Wait 2 seconds before redirecting
          setTimeout(() => {
            console.log("VerifyEmail: Redirecting to /jobs after successful verification");
            window.location.href = "/jobs";
          }, 2000);
        } else {
          console.error("VerifyEmail: Token or email mismatch");
          setError("Invalid token or email");
          setIsLoading(false);
        }
      } else {
        console.error("VerifyEmail: No pending user found for verification");
        setError("No pending verification found");
        setIsLoading(false);
      }
    } catch (err) {
      console.error("VerifyEmail: Error during verification:", err);
      setError("Verification failed. Please try again.");
      setIsLoading(false);
    }
  };

  // Success state after verification
  if (isVerified) {
    return (
      <Container size="xs" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
        <Card radius="md" p="xl" withBorder style={{ backgroundColor: "#F5F5F5", width: "100%" }}>
          <Group justify="center" mb="md">
            <ThemeIcon size={80} radius={100} color="green">
              <IconCheckCircle size={50} />
            </ThemeIcon>
          </Group>
          <Title order={2} ta="center" mb="md">
            Email Verified Successfully!
          </Title>
          <Text ta="center" mb="xl">
            Your account has been verified and you'll be redirected to the dashboard momentarily.
          </Text>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xs" style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}>
      <Card radius="md" p="xl" withBorder style={{ backgroundColor: "#F5F5F5" }}>
        <Title order={2} ta="center" mb="md">
          Verify Your Email
        </Title>
        <Text ta="center" mb="md">
          A verification link has been sent to your email. Enter the details below to complete signup.
        </Text>
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md" title="Error">
            {error}
          </Alert>
        )}
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
            disabled={!!formData.token} // Only disable if token is present from URL
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