"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Card, Title, TextInput, Button, Container, Alert, Text, Group, ThemeIcon } from "@mantine/core";
import { CheckCircle, AlertCircle } from "lucide-react";
import "@/styles/verify-styles.css";

export default function VerifyEmail() {
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [formData, setFormData] = useState<{ token: string; email: string; password: string }>({
    token: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token") || "";
    const urlEmail = urlParams.get("email") || "";
    console.log("VerifyEmail: Component mounted, token:", urlToken ? "Found" : "Not found", "email:", urlEmail);

    const initialEmail = urlEmail || "";
    setFormData((prev) => ({ ...prev, token: urlToken, email: initialEmail }));

    if (!urlEmail) {
      const pendingUser = localStorage.getItem("pendingUser");
      if (pendingUser) {
        try {
          const parsedUser = JSON.parse(pendingUser);
          console.log("VerifyEmail: Pending user email:", parsedUser.email);
          setFormData((prev) => ({ ...prev, email: parsedUser.email }));
        } catch (err) {
          console.error("VerifyEmail: Error parsing pending user:", err);
          setError("Error loading user data. Please try logging in again.");
        }
      }
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
      const pendingUser = localStorage.getItem("pendingUser");
      if (!pendingUser) {
        console.error("VerifyEmail: No pending user found");
        setError("No pending verification found");
        setIsLoading(false);
        return;
      }

      const parsedUser = JSON.parse(pendingUser);
      if (parsedUser.token !== formData.token || parsedUser.email !== formData.email) {
        console.error("VerifyEmail: Token or email mismatch");
        setError("Invalid token or email");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth-proxy/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          username: formData.email.split("@")[0],
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("VerifyEmail: Registration failed:", data);
        setError(data.error?.message || "Registration failed");
        setIsLoading(false);
        return;
      }

      console.log("VerifyEmail: Registration successful");
      localStorage.removeItem("pendingUser");
      setIsVerified(true);

      setTimeout(() => {
        console.log("VerifyEmail: Redirecting to /jobs");
        window.location.href = "/jobs";
      }, 2000);
    } catch (err) {
      console.error("VerifyEmail: Error during verification:", err);
      setError("Verification failed. Please try again.");
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="verify-page-container">
        <Container size="xs">
          <Card radius="md" p="xl" withBorder>
            <Group justify="center" mb="md">
              <ThemeIcon size={80} radius={100} className="success-icon">
                <CheckCircle size={50} />
              </ThemeIcon>
            </Group>
            <Title order={2} ta="center" mb="md">
              Email Verified Successfully!
            </Title>
            <Text ta="center" className="success-message">
              Your account has been verified and you&apos;ll be redirected to the dashboard momentarily.
            </Text>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="verify-page-container">
      <Container size="xs">
        <Card radius="md" p="xl" withBorder>
          <Title order={2} ta="center" mb="md">
            Verify Your Email
          </Title>
          <Text ta="center" mb="md">
            A verification link has been sent to your email. Enter the details below to complete signup.
          </Text>
          {error && (
            <Alert icon={<AlertCircle size={16} />} color="red" mb="md" title="Error">
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
              readOnly={!!formData.email}
              disabled={isLoading}
              placeholder="your@email.com"
            />
            <TextInput
              label="Create a password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              mb="md"
              disabled={isLoading}
              placeholder="Enter password"
            />
            <TextInput
              label="Verification Token"
              name="token"
              value={formData.token}
              onChange={handleInputChange}
              required
              mb="md"
              readOnly={!!formData.token}
              disabled={isLoading}
              placeholder="Verification token"
            />
            <Button type="submit" fullWidth loading={isLoading}>
              VERIFY AND SIGN IN
            </Button>
          </form>
        </Card>
      </Container>
    </div>
  );
}