"use client";

import React, { useState, ChangeEvent, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Image,
} from "@mantine/core";
import { Book, Code, Rocket, Mailbox } from "lucide-react";
import { customAuthProvider } from "@providers/customAuthProvider";
import { authUtils } from "@/utils/authUtils";
import "@/styles/fonts.css";
import "@/styles/login-styles.css";

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({ email: "", password: "" });
  const [step, setStep] = useState<"email" | "password" | "verification-sent">("email");
  const [emailPasswordLoading, setEmailPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const actionTypeRef = useRef<"google" | "email" | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window._debugAuthState) {
      window._debugAuthState("Login page loaded");
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError("");
    setInfo("");
  };

  const handleGoogleLogin = () => {
    setEmailPasswordLoading(false);
    actionTypeRef.current = "google";
    setGoogleLoading(true);
    window.location.href = "https://api.shrinked.ai/auth/google";
  };

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setGoogleLoading(false);
    actionTypeRef.current = "email";
    setEmailPasswordLoading(true);
  
    if (!formData.email) {
      setError("Please enter your email");
      setEmailPasswordLoading(false);
      actionTypeRef.current = null;
      return;
    }
  
    try {
      if (step === "email") {
        // Check if email exists using the customAuthProvider
        const result = await customAuthProvider.login({ email: formData.email, password: "" });
        
        if (result.success) {
          // Email exists, prompt for password
          setStep("password");
        } else if (result.error?.name === "RegistrationRequired") {
          // Email doesn't exist, start registration
          await handleRegistrationFlow();
        } else {
          // Other error
          setError(result.error?.message || "Unable to verify email");
        }
      } else if (step === "password") {
        if (!formData.password) {
          setError("Please enter your password");
          setEmailPasswordLoading(false);
          actionTypeRef.current = null;
          return;
        }
  
        // Use customAuthProvider for login
        const result = await customAuthProvider.login({ 
          email: formData.email, 
          password: formData.password 
        });
  
        if (result.success) {
          // Use router navigation for client-side redirect
          router.push(result.redirectTo || "/jobs");
        } else {
          setError(result.error?.message || "Invalid email or password");
        }
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      console.error("Login error:", error);
    } finally {
      setEmailPasswordLoading(false);
      actionTypeRef.current = null;
    }
  };

  const handleRegistrationFlow = async () => {
    try {
      // Use customAuthProvider for registration
      const result = await customAuthProvider.register({ email: formData.email });
      if (result.success) {
        setStep("verification-sent");
      } else {
        setError(result.error?.message || "Failed to register");
      }
    } catch (error) {
      setError("Failed to register. Please try again.");
      console.error("Registration error:", error);
    } finally {
      setEmailPasswordLoading(false);
      actionTypeRef.current = null;
    }
  };

  const isButtonActive = step === "email" ? !!formData.email.trim() : !!formData.password.trim();

  const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" baseProfile="basic">
      <polygon fill="#26659f" points="17,15 17,18 22,18 22,24 26,24 26,22 28,22 28,15" />
      <polygon fill="#91c14b" points="20,22 20,24 15,24 15,22 11,22 11,19 6,19 6,24 8,24 8,26 11,26 11,28 22,28 22,26 24,26 24,22" />
      <polygon fill="#e41e2f" points="25,8 25,6 22,6 22,4 11,4 11,6 8,6 8,8 6,8 6,13 11,13 11,11 13,11 13,9 20,9 20,11 23,11 23,13 25,13 25,11 27,11 27,8" />
      <rect width="5" height="10" x="4" y="11" fill="#fcc201" />
    </svg>
  );

  const ArrowIcon = () => (
    <svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.99945 0.755964L11.4975 0.769965L15.1375 4.40997L11.4975 8.06397L10.0135 8.06397L13.6535 4.42396L9.99945 0.755964ZM0.0734497 3.86397L14.4375 3.86396L14.4375 4.95596L0.0734498 4.95597L0.0734497 3.86397Z"
        fill={isButtonActive ? "#000000" : "#A1A1A1"}
      />
    </svg>
  );

  if (step === "verification-sent") {
    return (
      <div className="login-page-container">
        <Container
          size="xs"
          px={{ base: "sm", md: "xl" }}
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Card radius="md" p="xl" withBorder>
            <Group justify="center" mb="md">
              <Mailbox size={64} color="#F5A623" />
            </Group>
            <Title order={2} ta="center" mb="md">
              Check your email
            </Title>
            <Text ta="center" mb="xl">
              We&apos;ve sent a verification link to <b>{formData.email}</b>. Please check your inbox and
              click the link to complete your registration.
            </Text>
            <Text size="sm" ta="center" mb="md" className="footer-text">
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
              style={{ color: "#F5A623" }}
            >
              Back to login
            </Button>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="login-page-container">
      <Container
        size="xs"
        px={{ base: "sm", md: "xl" }}
        style={{
          minHeight: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Card radius="md" p="xl" withBorder>
          <div className="image-container">
            <Image
              src="/images/computer.jpg"
              alt="Computer"
              className="computer-image"
              width={300}
              height={180}
            />
          </div>
          <Title order={1} ta="center" mb={0}>
            Welcome
          </Title>
          <Title order={2} ta="center" mb="md">
            to Shrinked
          </Title>
          <Text ta="center" mb="xl" size="sm" className="subtitle-text">
            Sign in or create an account to build<br />
            with the Shrinked protocol
          </Text>
          {error && <Alert color="red" mb="md" title="Error">{error}</Alert>}
          {info && <Alert color="blue" mb="md" title="Info">{info}</Alert>}
          <Button
            fullWidth
            variant="filled"
            onClick={handleGoogleLogin}
            loading={googleLoading}
            leftSection={<GoogleIcon />}
            className="google-button"
            mb="md"
          >
            CONTINUE WITH GOOGLE
          </Button>
          <Divider label="OR" labelPosition="center" my="md" />
          <form onSubmit={handleEmailSubmit}>
            <TextInput
              placeholder="M@EXAMPLE.COM"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              mb="md"
              disabled={emailPasswordLoading || step === "password"}
            />
            {step === "password" && (
              <TextInput
                type="password"
                placeholder="Enter your password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                mb="md"
                disabled={emailPasswordLoading}
              />
            )}
            <div style={{ position: "relative" }}>
              <Button
                type="submit"
                fullWidth
                loading={emailPasswordLoading}
                disabled={!isButtonActive || emailPasswordLoading}
                className={`email-button ${isButtonActive ? "email-button-active" : "email-button-inactive"}`}
              >
                CONTINUE WITH EMAIL
              </Button>
              <div className="arrow-container">
                <ArrowIcon />
              </div>
            </div>
          </form>
          <div className="footer-text">
            By continuing, you agree to Shrinked{" "}
            <a href="https://shrinked.ai/terms" target="_blank" rel="noopener noreferrer" className="footer-link">
              Terms of Service
            </a>
            , and acknowledge their <span className="footer-link">Privacy Policy</span>.
          </div>
        </Card>
      </Container>
    </div>
  );
}