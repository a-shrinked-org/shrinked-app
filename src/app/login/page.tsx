"use client";

import React, { useState, ChangeEvent, FormEvent, useRef } from "react";
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
  const { mutate: login } = useLogin();
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [step, setStep] = useState<"email" | "password" | "verification-sent">("email");
  
  // Completely separate loading states with useRef to ensure they don't interfere
  const [emailPasswordLoading, setEmailPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Use refs to track which button triggered the action
  const actionTypeRef = useRef<"google" | "email" | null>(null);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
    setInfo("");
  };

  const handleGoogleLogin = () => {
    // Clear any existing loading states first
    setEmailPasswordLoading(false);
    
    // Set action type
    actionTypeRef.current = "google";
    
    // Set only Google loading
    setGoogleLoading(true);
    
    // Set a timeout to restore the button if the redirect fails
    setTimeout(() => {
      if (actionTypeRef.current === "google") {
        setGoogleLoading(false);
        actionTypeRef.current = null;
      }
    }, 5000);
    
    window.location.href = "https://api.shrinked.ai/auth/google";
  };

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");
    
    // Clear any existing loading states first
    setGoogleLoading(false);
    
    // Set action type
    actionTypeRef.current = "email";
    
    // Set only email/password loading
    setEmailPasswordLoading(true);
  
    if (!formData.email) {
      setError("Please enter your email");
      setEmailPasswordLoading(false);
      actionTypeRef.current = null;
      return;
    }
  
    if (step === "email") {
      console.log("Checking email:", formData.email);
      login(
        { email: formData.email, password: "" },
        {
          onSuccess: (response) => {
            // Only process if we're still in email mode
            if (actionTypeRef.current !== "email") return;
            
            console.log("Email check response:", response);
            
            if (response && response.success === true) {
              console.log("Email exists, showing password field");
              setStep("password");
              setEmailPasswordLoading(false);
              actionTypeRef.current = null;
              return;
            } 
            
            console.log("Unexpected success response structure:", response);
            
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
              setEmailPasswordLoading(false);
              actionTypeRef.current = null;
            }
          },
          onError: (error: any) => {
            // Only process if we're still in email mode
            if (actionTypeRef.current !== "email") return;
            
            console.log("Email check result:", error);
            console.log("Error object structure:", JSON.stringify(error, null, 2));
            
            let errorName = '';
            let errorMessage = '';
            
            if (typeof error === 'object' && error !== null) {
              if ('name' in error && typeof error.name === 'string') {
                errorName = error.name;
              }
              
              if ('message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
              }
              
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
              console.error("Login error:", error);
              
              if (typeof error === 'object' && error !== null) {
                if ('message' in error && typeof error.message === 'string') {
                  setError(error.message);
                  setEmailPasswordLoading(false);
                  actionTypeRef.current = null;
                  return;
                }
                
                if ('error' in error && 
                    typeof error.error === 'object' && 
                    error.error !== null &&
                    'message' in error.error && 
                    typeof error.error.message === 'string') {
                  setError(error.error.message);
                  setEmailPasswordLoading(false);
                  actionTypeRef.current = null;
                  return;
                }
              }
              
              setError("An error occurred");
              setEmailPasswordLoading(false);
              actionTypeRef.current = null;
            }
          }
        }
      );
    } else if (step === "password") {
      if (!formData.password) {
        setError("Please enter your password");
        setEmailPasswordLoading(false);
        actionTypeRef.current = null;
        return;
      }
      
      console.log("Attempting login with password");
      login(
        { 
          email: formData.email, 
          password: formData.password,
          skipEmailCheck: true
        },
        {
          onSuccess: () => {
            // Only process if we're still in email mode
            if (actionTypeRef.current !== "email") return;
            
            console.log("Login successful");
            // Keep loading on successful login since we're redirecting
          },
          onError: (error: any) => {
            // Only process if we're still in email mode
            if (actionTypeRef.current !== "email") return;
            
            console.error("Login error:", error);
            
            if (typeof error === 'object' && error !== null) {
              if ('message' in error && typeof error.message === 'string') {
                setError(error.message);
                setEmailPasswordLoading(false);
                actionTypeRef.current = null;
                return;
              }
              
              if ('error' in error && 
                  typeof error.error === 'object' && 
                  error.error !== null &&
                  'message' in error.error && 
                  typeof error.error.message === 'string') {
                setError(error.error.message);
                setEmailPasswordLoading(false);
                actionTypeRef.current = null;
                return;
              }
            }
            
            setError("Invalid email or password");
            setEmailPasswordLoading(false);
            actionTypeRef.current = null;
          }
        }
      );
    }
  };

  const handleRegistrationFlow = () => {
    // We know we're in email flow here
    login(
      { 
        email: formData.email,
        password: "",
        providerName: "register"
      },
      {
        onSuccess: (data) => {
          // Only process if we're still in email mode
          if (actionTypeRef.current !== "email") return;
          
          console.log("Registration initiated successfully", data);
          setStep("verification-sent");
          setEmailPasswordLoading(false);
          actionTypeRef.current = null;
        },
        onError: (regError) => {
          // Only process if we're still in email mode
          if (actionTypeRef.current !== "email") return;
          
          console.error("Registration error:", regError);
          
          if (typeof regError === 'object' && regError !== null) {
            if ('message' in regError && typeof regError.message === 'string') {
              setError(regError.message);
              setEmailPasswordLoading(false);
              actionTypeRef.current = null;
              return;
            }
            
            if ('error' in regError && 
                typeof regError.error === 'object' && 
                regError.error !== null &&
                'message' in regError.error && 
                typeof regError.error.message === 'string') {
              setError(regError.error.message);
              setEmailPasswordLoading(false);
              actionTypeRef.current = null;
              return;
            }
          }
          
          setError("Failed to register with this email");
          setEmailPasswordLoading(false);
          actionTypeRef.current = null;
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
              actionTypeRef.current = null;
              setEmailPasswordLoading(false);
              setGoogleLoading(false);
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
          Your conversation insights are just a sign-up away.
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
          loading={googleLoading}
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
            disabled={emailPasswordLoading || step === "password"}
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
              disabled={emailPasswordLoading}
              styles={{
                input: { backgroundColor: "#333333", color: "#FFFFFF" },
                label: { color: "#333333" },
              }}
            />
          )}
          <Button
            type="submit"
            fullWidth
            loading={emailPasswordLoading}
            disabled={!isButtonActive || emailPasswordLoading}
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