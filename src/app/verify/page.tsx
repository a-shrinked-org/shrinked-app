"use client";

import React, { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Card, Title, TextInput, Button, Container, Alert, Text, Group, ThemeIcon } from "@mantine/core";
import { CheckCircle, AlertCircle } from "lucide-react";

// Import custom styles for verification page
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
    // Get token and email from URL if available
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token") || "";
    const urlEmail = urlParams.get("email") || "";
    
    console.log("VerifyEmail: Component mounted, checking for token in URL:", urlToken ? "Token found" : "No token");
    console.log("VerifyEmail: Email from URL:", urlEmail);
    
    // Use email from URL, fallback to pending user's email
    const initialEmail = urlEmail || "";
    
    // Update form data with token and email from URL
    setFormData(prev => ({ 
      ...prev, 
      token: urlToken,
      email: initialEmail
    }));
    
    // If we don't have an email from the URL, try to get it from localStorage
    if (!urlEmail) {
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
              readOnly={!!formData.email} // Make read-only if pre-filled
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
              readOnly={!!formData.token} // Make read-only if pre-filled
              disabled={isLoading}
              placeholder="Verification token"
            />
            <Button
              type="submit"
              fullWidth
              loading={isLoading}
            >
              VERIFY AND SIGN IN
            </Button>
          </form>
        </Card>
      </Container>
    </div>
  );
}