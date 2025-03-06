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
import { Chrome, Book, Code, Rocket, Mailbox } from "lucide-react";

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  const { mutate: login, isLoading } = useLogin();
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [step, setStep] = useState<"email" | "password" | "verification-sent">("email");

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
    setInfo("");
  };

  const handleGoogleLogin = () => {
    window.location.href = "https://api.shrinked.ai/auth/google";
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
    console.log("Checking email:", formData.email);
    login(
      { email: formData.email, password: "" },
      {
        onSuccess: (response) => {
          // Only move to password step if the response clearly indicates success
          console.log("Email check response:", response);
          
          if (response && response.success === true) {
            // Ignore any redirectTo property at this stage
            console.log("Email exists, showing password field");
            setStep("password"); // Email exists, show password field
            return; // Early return to prevent redirection
          } 
          
          // If response has an unexpected structure, log it for debugging
          console.log("Unexpected success response structure:", response);
          
          // If response contains an error with RegistrationRequired name, handle registration flow
          if (response && 
              typeof response === 'object' && 
              'error' in response && 
              typeof response.error === 'object' && 
              response.error !== null && 
              'name' in response.error && 
              response.error.name === "RegistrationRequired") {
            handleRegistrationFlow();
          } else {
            setError("Unable to verify email status. Please try again.");
          }
        },
        onError: (error: any) => {
            console.log("Email check result:", error);
            
            // Log the full error structure to debug
            console.log("Error object structure:", JSON.stringify(error, null, 2));
            
            // Check if this is a "RegistrationRequired" error
            // The error structure might be nested differently than expected
            let errorName = '';
            let errorMessage = '';
            
            if (typeof error === 'object' && error !== null) {
              // Try to get name directly
              if ('name' in error && typeof error.name === 'string') {
                errorName = error.name;
              }
              
              // Try to get message directly
              if ('message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
              }
              
              // Try to get from nested error object
              if ('error' in error && typeof error.error === 'object' && error.error !== null) {
                if ('name' in error.error && typeof error.error.name === 'string') {
                  errorName = errorName || error.error.name;
                }
                if ('message' in error.error && typeof error.error.message === 'string') {
                  errorMessage = errorMessage || error.error.message;
                }
              }
            }
            
            if (errorName === "RegistrationRequired" || 
                (errorMessage && errorMessage.includes("not found"))) {
              console.log("Email not found, initiating registration flow");
              handleRegistrationFlow();
            } else {
              // For any other errors
              console.error("Login error:", error);
              
              if (typeof error === 'object' && error !== null) {
                // Try to get the message directly
                if ('message' in error && typeof error.message === 'string') {
                  setError(error.message);
                  return;
                }
                
                // Try to get it from a nested error object
                if ('error' in error && 
                    typeof error.error === 'object' && 
                    error.error !== null &&
                    'message' in error.error && 
                    typeof error.error.message === 'string') {
                  setError(error.error.message);
                  return;
                }
              }
              
              setError("An error occurred");
            }
          }
        }
      );
    } else if (step === "password") {
      if (!formData.password) {
        setError("Please enter your password");
        return;
      }
      
      // Login with password
      console.log("Attempting login with password");
      login(
        { 
          email: formData.email, 
          password: formData.password,
          skipEmailCheck: true // Skip email check on login with password
        },
        {
          onSuccess: () => {
            console.log("Login successful");
            // Redirect handled by auth provider
          },
          onError: (error: any) => {
            console.error("Login error:", error);
            
            if (typeof error === 'object' && error !== null) {
              // Try to get the message directly
              if ('message' in error && typeof error.message === 'string') {
                setError(error.message);
                return;
              }
              
              // Try to get it from a nested error object
              if ('error' in error && 
                  typeof error.error === 'object' && 
                  error.error !== null &&
                  'message' in error.error && 
                  typeof error.error.message === 'string') {
                setError(error.error.message);
                return;
              }
            }
            
            setError("Invalid email or password");
          }
        }
      );
    }
  };

  // Separate function to handle the registration flow
  const handleRegistrationFlow = () => {
    login(
      { 
        email: formData.email,
        password: "",
        providerName: "register"
      },
      {
        onSuccess: (data) => {
          console.log("Registration initiated successfully", data);
          if (data.redirectTo === "/verify-email") {
            setStep("verification-sent");
          }
        },
                  onError: (regError) => {
            console.error("Registration error:", regError);
            // Handle various error object structures safely
            if (typeof regError === 'object' && regError !== null) {
              // First try to get the message directly
              if ('message' in regError && typeof regError.message === 'string') {
                setError(regError.message);
                return;
              }
              
              // Then try to get it from a nested error object
              if ('error' in regError && 
                  typeof regError.error === 'object' && 
                  regError.error !== null &&
                  'message' in regError.error && 
                  typeof regError.error.message === 'string') {
                setError(regError.error.message);
                return;
              }
            }
            
            // Default error message if we couldn't extract one
            setError("Failed to register with this email");
          }
      }
    );
  };

  const isButtonActive = step === "email" ? !!formData.email.trim() : !!formData.password.trim();

  // Render verification sent UI when in verification-sent step
  if (step === "verification-sent") {
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
          <Group justify="center" mb="md">
            <Mailbox size={64} color="#D87A16" />
          </Group>
          
          <Title order={2} ta="center" mb="md">
            Check your email
          </Title>
          
          <Text ta="center" mb="xl">
            We&apos;ve sent a verification link to <b>{formData.email}</b>. Please check your inbox and click the link to complete your registration.
          </Text>
          
          <Text size="sm" ta="center" mb="md" c="dimmed">
            Didn&apos;t receive the email? Check your spam folder or try again in a few minutes.
          </Text>
          
          <Button
            variant="subtle"
            fullWidth
            onClick={() => {
              setStep("email");
              setInfo("");
              setError("");
            }}
            style={{ color: "#D87A16" }}
          >
            Back to login
          </Button>
        </Card>
        
        <SimpleGrid cols={{ base: 1, sm: 3 }} mt="lg" spacing="md" w="100%">
          <Card radius="md" p="sm" withBorder style={{ backgroundColor: "#F5F5F5" }}>
            <Group justify="center">
              <Book size={24} color="#333333" />
              <Text size="sm" style={{ color: "#333333" }}>Resources</Text>
            </Group>
          </Card>
          <Card radius="md" p="sm" withBorder style={{ backgroundColor: "#F5F5F5" }}>
            <Group justify="center">
              <Code size={24} color="#333333" />
              <Text size="sm" style={{ color: "#333333" }}>Guides</Text>
            </Group>
          </Card>
          <Card radius="md" p="sm" withBorder style={{ backgroundColor: "#F5F5F5" }}>
            <Group justify="center">
              <Rocket size={24} color="#333333" />
              <Text size="sm" style={{ color: "#333333" }}>Examples</Text>
            </Group>
          </Card>
        </SimpleGrid>
      </Container>
    );
  }

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
          leftSection={<Chrome size={20} />}
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
            disabled={isLoading || step === "password"}
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
            <Book size={24} color="#333333" />
            <Text size="sm" style={{ color: "#333333" }}>Resources</Text>
          </Group>
        </Card>
        <Card radius="md" p="sm" withBorder style={{ backgroundColor: "#F5F5F5" }}>
          <Group justify="center">
            <Code size={24} color="#333333" />
            <Text size="sm" style={{ color: "#333333" }}>Guides</Text>
          </Group>
        </Card>
        <Card radius="md" p="sm" withBorder style={{ backgroundColor: "#F5F5F5" }}>
          <Group justify="center">
            <Rocket size={24} color="#333333" />
            <Text size="sm" style={{ color: "#333333" }}>Examples</Text>
          </Group>
        </Card>
      </SimpleGrid>
    </Container>
  );
}