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
import { nanoid } from "nanoid/non-secure"; // Changed to non-secure for client-side simplicity

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  const { mutate: login, isLoading } = useLogin();
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [step, setStep] = useState<"email" | "password">("email"); // Track form step

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

    if (!formData.email) {
      setError("Please enter your email");
      return;
    }

    if (step === "email") {
      login(
        { email: formData.email, password: "" }, // Send empty password to check email existence
        {
          onSuccess: () => {
            setStep("password"); // Email exists, move to password step
          },
          onError: async (error: any) => {
            console.error("Email check error:", error);
            if (error.name === "RegistrationRequired") {
              const token = nanoid();
              try {
                await sendVerificationEmail(formData.email, token);
                setInfo("Account created! Please check your email for a verification link.");
                localStorage.setItem(
                  "pendingUser",
                  JSON.stringify({ email: formData.email, token, password: "" })
                );
              } catch (err) {
                setError("Failed to send verification email");
              }
            } else {
              setError(error?.message || "Failed to verify email");
            }
          },
        }
      );
    } else if (step === "password") {
      if (!formData.password) {
        setError("Please enter your password");
        return;
      }
      login(
        { email: formData.email, password: formData.password },
        {
          onSuccess: () => {
            // Redirect to /jobs handled by auth provider
          },
          onError: (error: any) => {
            console.error("Password login error:", error);
            setError(error?.message || "Login failed");
          },
        }
      );
    }
  };

  const isButtonActive = step === "email" ? !!formData.email.trim() : !!formData.password.trim();

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
            disabled={isLoading || step === "password"} // Disable email input after first step
            styles={{
              input: { backgroundColor: "#333333", color: "#FFFFFF" },
              label: { color: "#333333" },
            }}
          />
          {step === "password" && (
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
          )}
          <Button
            type="submit"
            fullWidth
            loading={isLoading}
            disabled={!isButtonActive}
            style={{
              backgroundColor: isButtonActive ? "#D87A16" : "#666666",
              color: "#FFFFFF",
              opacity: isButtonActive ? 1 : 0.6,
            }}
          >
            {step === "email" ? "Continue" : "Sign In"}
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