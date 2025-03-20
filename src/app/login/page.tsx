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
  Box,
  Image,
} from "@mantine/core";
import { Book, Code, Rocket, Mailbox } from "lucide-react";

// Import CSS for custom fonts and global styles
import "@/styles/fonts.css";
// Import login styles that we created
import "@/styles/login-styles.css";

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

  // Loading states
  const [emailPasswordLoading, setEmailPasswordLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Action type reference
  const actionTypeRef = useRef<"google" | "email" | null>(null);

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

    setTimeout(() => {
      if (actionTypeRef.current === "google") {
        setGoogleLoading(false);
        actionTypeRef.current = null;
      }
    }, 5000);

    window.location.href = "https://api.shrinked.ai/auth/google";
  };

  // Other handlers remain the same...
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
  
    if (step === "email") {
      // the default login flow via the useLogin hook
        login(
          { email: formData.email, password: "" },
          {
            onSuccess: (response) => {
              if (actionTypeRef.current !== "email") return;
  
              if (response && response.success === true) {
                setStep("password");
                setEmailPasswordLoading(false);
                actionTypeRef.current = null;
                return;
              }
  
              if (
                response &&
                typeof response === "object" &&
                "error" in response &&
                typeof response.error === "object" &&
                response.error !== null &&
                "name" in response.error &&
                response.error.name === "RegistrationRequired"
              ) {
                handleRegistrationFlow();
              } else {
                setError("Unable to verify email status. Please try again.");
                setEmailPasswordLoading(false);
                actionTypeRef.current = null;
              }
            },
            onError: (error: any) => {
              // Error handling remains the same
              if (actionTypeRef.current !== "email") return;
  
              let errorName = "";
              let errorMessage = "";
  
              if (typeof error === "object" && error !== null) {
                // Extract error info...
                if ("name" in error && typeof error.name === "string") {
                  errorName = error.name;
                }
  
                if ("message" in error && typeof error.message === "string") {
                  errorMessage = error.message;
                }
  
                if ("error" in error && typeof error.error === "object" && error.error !== null) {
                  if ("name" in error.error && typeof error.error.name === "string") {
                    errorName = errorName || error.error.name;
                  }
                  if ("message" in error.error && typeof error.error.message === "string") {
                    errorMessage = errorMessage || error.error.message;
                  }
                }
              }
  
              if (
                errorName === "RegistrationRequired" ||
                (errorMessage && errorMessage.includes("not found"))
              ) {
                handleRegistrationFlow();
              } else {
                // Display appropriate error
                if (typeof error === "object" && error !== null) {
                  if ("message" in error && typeof error.message === "string") {
                    setError(error.message);
                  } else if (
                    "error" in error &&
                    typeof error.error === "object" &&
                    error.error !== null &&
                    "message" in error.error &&
                    typeof error.error.message === "string"
                  ) {
                    setError(error.error.message);
                  } else {
                    setError("An error occurred");
                  }
                } else {
                  setError("An error occurred");
                }
  
                setEmailPasswordLoading(false);
                actionTypeRef.current = null;
              }
            },
          }
        );
      }
    } else if (step === "password") {
      if (!formData.password) {
        setError("Please enter your password");
        setEmailPasswordLoading(false);
        actionTypeRef.current = null;
        return;
      }
  
      // Use the proxy endpoint directly instead of relying on the hook
      fetch('/api/auth-proxy/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
        credentials: 'include'
      })
        .then(apiResponse => {
          const responseObj = apiResponse;
          return apiResponse.json().then(data => ({ data, responseObj }));
        })
        .then(({ data, responseObj }) => {
          if (responseObj.ok) {
            // Handle successful login - the API will set cookies
            window.location.href = '/'; // Redirect to home page or dashboard
          } else {
            setError(data.error?.message || 'Invalid email or password');
            setEmailPasswordLoading(false);
            actionTypeRef.current = null;
          }
        })
        .catch(error => {
          console.error("Login error:", error);
          setError("Failed to login. Please try again.");
          setEmailPasswordLoading(false);
          actionTypeRef.current = null;
        });
      
      // Keep the fallback login hook as a backup
      login(
        {
          email: formData.email,
          password: formData.password,
          skipEmailCheck: true,
        },
        {
          onSuccess: () => {
            if (actionTypeRef.current !== "email") return;
            // Keep loading on successful login since we're redirecting
          },
          onError: (error: any) => {
            if (actionTypeRef.current !== "email") return;
  
            if (typeof error === "object" && error !== null) {
              if ("message" in error && typeof error.message === "string") {
                setError(error.message);
              } else if (
                "error" in error &&
                typeof error.error === "object" &&
                error.error !== null &&
                "message" in error.error &&
                typeof error.error.message === "string"
              ) {
                setError(error.error.message);
              } else {
                setError("Invalid email or password");
              }
            } else {
              setError("Invalid email or password");
            }
  
            setEmailPasswordLoading(false);
            actionTypeRef.current = null;
          },
        }
      );
    }
  };
  
  const handleRegistrationFlow = () => {
    // Use the registration proxy endpoint
    fetch('/api/auth-proxy/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: formData.email }),
      credentials: 'include'
    })
      .then(apiResponse => {
        // Store the response object in a variable that will be accessible in the next then block
        const responseObj = apiResponse;
        return apiResponse.json().then(data => ({ data, responseObj }));
      })
      .then(({ data, responseObj }) => {
        if (data.success || (responseObj.ok && !data.error)) {
          setStep("verification-sent");
        } else {
          setError(data.error?.message || 'Failed to register with this email');
        }
        setEmailPasswordLoading(false);
        actionTypeRef.current = null;
      })
      .catch(error => {
        console.error("Registration error:", error);
        setError("Failed to register with this email");
        setEmailPasswordLoading(false);
        actionTypeRef.current = null;
      });
      
    // Fallback to using the login hook with "register" provider
    login(
      {
        email: formData.email,
        password: "",
        providerName: "register",
      },
      {
        onSuccess: () => {
          if (actionTypeRef.current !== "email") return;
          setStep("verification-sent");
          setEmailPasswordLoading(false);
          actionTypeRef.current = null;
        },
        onError: (regError) => {
          if (actionTypeRef.current !== "email") return;
  
          if (typeof regError === "object" && regError !== null) {
            if ("message" in regError && typeof regError.message === "string") {
              setError(regError.message);
            } else if (
              "error" in regError &&
              typeof regError.error === "object" &&
              regError.error !== null &&
              "message" in regError.error &&
              typeof regError.error.message === "string"
            ) {
              setError(regError.error.message);
            } else {
              setError("Failed to register with this email");
            }
          } else {
            setError("Failed to register with this email");
          }
  
          setEmailPasswordLoading(false);
          actionTypeRef.current = null;
        },
      }
    );
  };

  const isButtonActive = step === "email" ? !!formData.email.trim() : !!formData.password.trim();

  // Custom Google icon
  const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="20" height="20" baseProfile="basic">
      <polygon fill="#26659f" points="17,15 17,18 22,18 22,24 26,24 26,22 28,22 28,15" />
      <polygon fill="#91c14b" points="20,22 20,24 15,24 15,22 11,22 11,19 6,19 6,24 8,24 8,26 11,26 11,28 22,28 22,26 24,26 24,22" />
      <polygon fill="#e41e2f" points="25,8 25,6 22,6 22,4 11,4 11,6 8,6 8,8 6,8 6,13 11,13 11,11 13,11 13,9 20,9 20,11 23,11 23,13 25,13 25,11 27,11 27,8" />
      <rect width="5" height="10" x="4" y="11" fill="#fcc201" />
    </svg>
  );

  // Custom Arrow icon
  const ArrowIcon = () => (
    <svg width="16" height="9" viewBox="0 0 16 9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9.99945 0.755964L11.4975 0.769965L15.1375 4.40997L11.4975 8.06397L10.0135 8.06397L13.6535 4.42396L9.99945 0.755964ZM0.0734497 3.86397L14.4375 3.86396L14.4375 4.95596L0.0734498 4.95597L0.0734497 3.86397Z"
        fill={isButtonActive ? "#000000" : "#A1A1A1"}
      />
    </svg>
  );

  // Verification sent UI
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
          
          <SimpleGrid cols={{ base: 1, sm: 3 }} mt="lg" spacing="md" w="100%">
            <Card radius="md" p="sm" withBorder>
              <Group justify="center">
                <Book size={24} color="#AAAAAA" />
                <Text size="sm" className="footer-text">Resources</Text>
              </Group>
            </Card>
            <Card radius="md" p="sm" withBorder>
              <Group justify="center">
                <Code size={24} color="#AAAAAA" />
                <Text size="sm" className="footer-text">Guides</Text>
              </Group>
            </Card>
            <Card radius="md" p="sm" withBorder>
              <Group justify="center">
                <Rocket size={24} color="#AAAAAA" />
                <Text size="sm" className="footer-text">Examples</Text>
              </Group>
            </Card>
          </SimpleGrid>
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
        <Card
          radius="md"
          p="xl"
          withBorder
        >
          <div className="image-container">
            <Image
              src="/images/computer.jpg"
              alt="Computer"
              className="computer-image"
              width={300}
              height={180}
            />
          </div>

          <Title
            order={1}
            ta="center" 
            mb={0}
          >
            Welcome
          </Title>
          <Title
            order={2}
            ta="center"
            mb="md"
          >
            to Shrinked
          </Title>

          <Text ta="center" mb="xl" size="sm" className="subtitle-text">
            Sign in or create an account to build<br />
            with the Shrinked protocol
          </Text>

          {/* Error/Info Alerts */}
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

          <Divider
            label="OR"
            labelPosition="center"
            my="md"
          />

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
                className={`email-button ${isButtonActive ? 'email-button-active' : 'email-button-inactive'}`}
              >
                CONTINUE WITH EMAIL
              </Button>
              <div className="arrow-container">
                <ArrowIcon />
              </div>
            </div>
          </form>

          <div className="footer-text">
            By continuing, you agree to Shrinked <a href="https://shrinked.ai/terms" target="_blank" rel="noopener noreferrer" className="footer-link">Terms of Service</a>, 
            and acknowledge their <span className="footer-link">Privacy Policy</span>.
          </div>
        </Card>
      </Container>
    </div>
  );
}