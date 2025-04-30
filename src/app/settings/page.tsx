// app/settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGetIdentity } from "@refinedev/core";
import {
  Stack,
  Box,
  Text,
  Group,
  Button,
  Paper,
  Progress,
  Flex,
  LoadingOverlay,
  Divider,
  ActionIcon,
  Badge,
  Modal,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { Settings, ChevronDown, ChevronUp, CreditCard, Check } from "lucide-react";
import { authUtils, API_CONFIG } from "@/utils/authUtils";
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { notifications } from "@mantine/notifications";

// Interface for user profile data
interface UserProfile {
  _id: string;
  userId: string;
  email: string;
  username?: string;
  createdAt: string;
  roles?: string[]; // Added roles field for admin check
  subscription?: {
    id: string;
    planId: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
}

interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
  subscriptionPlan?: {
    name?: string;
  };
}

// Interface for subscription plan
interface SubscriptionPlan {
  _id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  stripeMonthlyPriceId: string;
  stripeYearlyPriceId: string;
  processingTimeLimit: number;
  jobsPerMonth: number;
  maxConcurrentJobs: number;
  apiCallsPerDay: number;
  webhookEndpoints: number;
  storageRepositories: number;
  dataRetentionDays: number;
  domainSupport: number;
  privateRepositories: boolean;
  protocolFormatting: string;
  exportFormats: string;
  relationshipMapping: boolean;
  securityLevel: string;
  onPremiseDeployment: boolean;
  ssoSupport: boolean;
  supportLevel: string;
  dedicatedManager: boolean;
}

// Interface for usage data
interface UsageData {
  jobs: {
    used: number;
    limit: number;
  };
  processing: {
    used: number; // in milliseconds
    limit: number; // in milliseconds
  };
  api: {
    used: number;
    limit: number;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  // Get identity data from Refine
  const { data: identity } = useGetIdentity<Identity>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [usage, setUsage] = useState<UsageData>({
    jobs: { used: 0, limit: 5 },
    processing: { used: 0, limit: 11880000 },
    api: { used: 0, limit: 100 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(false);

  // Define fetchUsageData as a useCallback function so it can be used in useEffect
  const fetchUsageData = useCallback(async (subscriptionId: string) => {
    try {
      // Fetch jobs usage
      const jobsResponse = await fetch(`/api/usage-proxy/${subscriptionId}/jobs`, {
        headers: authUtils.getAuthHeaders(),
      });
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setUsage(prev => ({
          ...prev,
          jobs: {
            used: jobsData.used || 0,
            limit: jobsData.limit || prev.jobs.limit
          }
        }));
      }

      // Fetch processing time usage
      const processingResponse = await fetch(`/api/usage-proxy/${subscriptionId}/processing`, {
        headers: authUtils.getAuthHeaders(),
      });
      
      if (processingResponse.ok) {
        const processingData = await processingResponse.json();
        setUsage(prev => ({
          ...prev,
          processing: {
            used: processingData.used || 0,
            limit: processingData.limit || prev.processing.limit
          }
        }));
      }

      // Fetch API calls usage
      const apiResponse = await fetch(`/api/usage-proxy/${subscriptionId}/api`, {
        headers: authUtils.getAuthHeaders(),
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setUsage(prev => ({
          ...prev,
          api: {
            used: apiData.used || 0,
            limit: apiData.limit || prev.api.limit
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching usage data:", error);
      notifications.show({
        title: "Error",
        message: "Failed to fetch usage data",
        color: "red",
      });
    }
  }, []);

  // Fetch user profile, subscription plans and usage data
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!authUtils.isAuthenticated()) {
          router.push("/login");
          return;
        }

        setIsLoading(true);
        
        // Get user profile
        const profileResponse = await fetch("/api/users-proxy/profile", {
          headers: authUtils.getAuthHeaders(),
          cache: 'no-store',
        });

        if (!profileResponse.ok) {
          if (profileResponse.status === 401 || profileResponse.status === 403) {
            // Token expired or invalid
            const refreshed = await authUtils.refreshToken();
            if (!refreshed) {
              router.push("/login");
              return;
            }
            // Retry with new token
            const retryResponse = await fetch("/api/users-proxy/profile", {
              headers: authUtils.getAuthHeaders(),
              cache: 'no-store',
            });
            if (!retryResponse.ok) {
              throw new Error(`Failed to fetch profile: ${retryResponse.status}`);
            }
            const data = await retryResponse.json();
            setProfile(data);
          } else {
            throw new Error(`Failed to fetch profile: ${profileResponse.status}`);
          }
        } else {
          const data = await profileResponse.json();
          setProfile(data);
        }

        // Fetch subscription plans
        const plansResponse = await fetch("/api/subscriptions-proxy/plans", {
          headers: authUtils.getAuthHeaders(),
        });

        if (plansResponse.ok) {
          const plansData = await plansResponse.json();
          setPlans(Array.isArray(plansData) ? plansData : []);
        } else {
          console.error("Failed to fetch subscription plans:", plansResponse.status);
          notifications.show({
            title: "Error",
            message: "Failed to fetch subscription plans",
            color: "red",
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        notifications.show({
          title: "Error",
          message: "Failed to load account data",
          color: "red",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router, fetchUsageData]);

  // When profile subscription changes, fetch usage data
  useEffect(() => {
    if (profile?.subscription?.id) {
      fetchUsageData(profile.subscription.id);
    }
  }, [profile?.subscription?.id, fetchUsageData]);

  // Check if user is admin - Using BOTH identity from Refine AND profile roles for redundancy
  const isUserAdmin = (
    identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN' || 
    profile?.roles?.some(role => role === "admin" || role === "super_admin")
  ) || false;

  // Improved function to get current plan
  const getCurrentPlan = useCallback(() => {
    // If user has a subscription, try to find the matching plan by ID
    if (profile?.subscription?.planId) {
      const matchedPlan = plans.find(plan => plan._id === profile?.subscription?.planId);
      if (matchedPlan) return matchedPlan;
    }
    
    // If user is an admin but no subscription plan is found, use ADMIN plan
    if (isUserAdmin) {
      const adminPlan = plans.find(plan => 
        plan.name.toUpperCase().includes("ADMIN") || 
        plan.name.toUpperCase().includes("ENTERPRISE")
      );
      if (adminPlan) return adminPlan;
    }
    
    // Default to FREE plan if no other plan is found
    return plans.find(plan => plan.name.toUpperCase() === "FREE") || null;
  }, [plans, profile, isUserAdmin]);

  // Get current plan using the improved function
  const currentPlan = useMemo(() => getCurrentPlan(), [getCurrentPlan]);

  // Calculate usage percentages for progress bars
  const jobsUsed = usage.jobs.used;
  const jobsLimit = currentPlan?.jobsPerMonth || usage.jobs.limit;
  const jobsPercent = (jobsUsed / jobsLimit) * 100;

  const processingUsed = usage.processing.used;
  const processingLimit = currentPlan?.processingTimeLimit || usage.processing.limit;
  const processingPercent = (processingUsed / processingLimit) * 100;

  const apiUsed = usage.api.used;
  const apiLimit = currentPlan?.apiCallsPerDay !== -1 ? (currentPlan?.apiCallsPerDay || usage.api.limit) : Infinity;
  const apiPercent = apiLimit === Infinity ? 0 : (apiUsed / apiLimit) * 100;

  // Format price display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0 
    }).format(price / 100);
  };

  // Format time limit display (from milliseconds to hours)
  const formatTimeLimit = (ms: number) => {
    if (ms === -1) return "Unlimited";
    const hours = Math.round(ms / (1000 * 60 * 60));
    return `${hours} hours`;
  };

  // Format feature value display
  const formatFeature = (value: number | boolean | string) => {
    if (typeof value === 'boolean') return value ? "Yes" : "No";
    if (typeof value === 'number') {
      if (value === -1) return "Unlimited";
      return value.toString();
    }
    return value;
  };

  // Modified handleUpgradePlan function with improved error handling and logging
  const handleUpgradePlan = async () => {
    if (!selectedPlanId) {
      notifications.show({
        title: "Error",
        message: "No plan selected",
        color: "red",
      });
      return;
    }
  
    try {
      setIsSubscriptionLoading(true);
      
      // Get the selected plan
      const selectedPlan = plans.find(p => p._id === selectedPlanId);
      if (!selectedPlan) {
        throw new Error("Selected plan not found");
      }
  
      // Get the correct Stripe price ID based on billing cycle
      const stripePriceId = billingCycle === 'monthly' 
        ? selectedPlan.stripeMonthlyPriceId 
        : selectedPlan.stripeYearlyPriceId;
  
      if (!stripePriceId) {
        throw new Error("Invalid Stripe price ID");
      }
  
      console.log("Creating checkout session with params:", {
        priceId: stripePriceId,
        planId: selectedPlanId,
        billingCycle: billingCycle,
        successUrl: `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancelUrl: `${window.location.origin}/settings?canceled=true`,
      });
  
      // Create checkout session
      const response = await fetch("/api/subscriptions-proxy/create-checkout-session", {
        method: "POST",
        headers: {
          ...authUtils.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: stripePriceId,
          planId: selectedPlanId,
          billingCycle: billingCycle,
          successUrl: `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}&success=true`,
          cancelUrl: `${window.location.origin}/settings?canceled=true`,
        }),
      });
  
      const responseData = await response.json();
      console.log("Checkout session response:", responseData);
  
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Failed to create checkout session");
      }
  
      // Check all possible URL field names that the API might return
      const checkoutUrl = responseData.sessionUrl || responseData.url || responseData.checkoutUrl || responseData.stripeUrl;
      
      if (!checkoutUrl) {
        console.error("No checkout URL found in response:", responseData);
        throw new Error("No checkout URL found in API response");
      }
  
      console.log("Redirecting to checkout:", checkoutUrl);
      
      // Redirect to Stripe checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Error upgrading plan:", error);
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to upgrade plan",
        color: "red",
      });
      setIsSubscriptionLoading(false);
      setIsUpgradeModalOpen(false);
    }
  };

  // Verify Stripe session
  const verifyStripeSession = async (sessionId: string) => {
    try {
      setIsVerifyingSession(true);
      
      const response = await fetch(`/api/subscriptions-proxy/verify-session/${sessionId}`, {
        headers: authUtils.getAuthHeaders(),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Refresh profile data to get updated subscription info
        const profileResponse = await fetch("/api/users-proxy/profile", {
          headers: authUtils.getAuthHeaders(),
          cache: 'no-store',
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);
        }
        
        notifications.show({
          title: "Success",
          message: "Your subscription has been verified and updated successfully",
          color: "green",
        });
      } else {
        const errorData = await response.json();
        console.error("Session verification failed:", errorData);
        
        notifications.show({
          title: "Warning",
          message: "Subscription appears to be created but verification failed",
          color: "yellow",
        });
      }
    } catch (error) {
      console.error("Error verifying session:", error);
      notifications.show({
        title: "Warning",
        message: "Unable to verify subscription status. Please refresh the page.",
        color: "yellow",
      });
    } finally {
      setIsVerifyingSession(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!profile?.subscription?.id) {
      notifications.show({
        title: "Error",
        message: "No active subscription found",
        color: "red",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/subscriptions-proxy/${profile.subscription.id}/cancel`, {
        method: "POST",
        headers: authUtils.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel subscription");
      }

      const { message } = await response.json();
      
      // Update local profile state
      setProfile(prev => {
        if (prev && prev.subscription) {
          return {
            ...prev,
            subscription: {
              ...prev.subscription,
              cancelAtPeriodEnd: true
            }
          };
        }
        return prev;
      });

      notifications.show({
        title: "Success",
        message: message || "Subscription will cancel at the end of the billing period",
        color: "green",
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to cancel subscription",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }
  
    try {
      setIsLoading(true);
      
      const response = await fetch("/api/users-proxy/delete-account", {
        method: "DELETE",
        headers: authUtils.getAuthHeaders(),
      });
    
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete account");
      }
    
      // Log out the user - using authUtils.clearAuthStorage() instead of logout()
      authUtils.clearAuthStorage();
      
      // Redirect to login page
      router.push("/login");
      
      notifications.show({
        title: "Success",
        message: "Your account has been deleted",
        color: "green",
      });
    } catch (error) {
      console.error("Error deleting account:", error);
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to delete account",
        color: "red",
      });
      setIsLoading(false);
    }
  };

  // Open the upgrade modal
  const openUpgradeModal = (planId: string) => {
    setSelectedPlanId(planId);
    setIsUpgradeModalOpen(true);
  };

  // Enhanced useEffect hook to handle payment success/failure in the settings page
  
  useEffect(() => {
    const handlePaymentStatus = async () => {
      try {
        // Get URL search params
        const query = new URLSearchParams(window.location.search);
        const sessionId = query.get('session_id');
        const success = query.get('success');
        const canceled = query.get('canceled');
        
        if (sessionId && success === 'true') {
          // Show loading state while verifying
          setIsVerifyingSession(true);
          
          // Log for debugging
          console.log(`[Payment] Detected successful payment with session ID: ${sessionId}`);
          
          try {
            // Verify the Stripe session
            const response = await fetch(`/api/subscriptions-proxy/verify-session/${sessionId}`, {
              headers: authUtils.getAuthHeaders(),
            });
            
            const data = await response.json();
            
            if (response.ok) {
              console.log(`[Payment] Session verification successful:`, data);
              
              // Refresh profile data to get updated subscription info
              const profileResponse = await fetch("/api/users-proxy/profile", {
                headers: authUtils.getAuthHeaders(),
                cache: 'no-store',
              });
              
              if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setProfile(profileData);
                
                // Re-fetch subscription plans to ensure they're current
                const plansResponse = await fetch("/api/subscriptions-proxy/plans", {
                  headers: authUtils.getAuthHeaders(),
                });
                
                if (plansResponse.ok) {
                  const plansData = await plansResponse.json();
                  setPlans(Array.isArray(plansData) ? plansData : []);
                }
                
                // Update usage data if subscription ID is available
                if (profileData?.subscription?.id) {
                  await fetchUsageData(profileData.subscription.id);
                }
              }
              
              // Show success notification
              notifications.show({
                title: "Payment Successful",
                message: "Your subscription has been activated successfully!",
                color: "green",
                icon: <Check size={16} />,
                autoClose: 5000,
              });
            } else {
              console.error(`[Payment] Session verification failed:`, data);
              
              // Show warning notification
              notifications.show({
                title: "Payment Verification Issue",
                message: "Your payment appears to be successful, but we couldn't verify all details. Your account will be updated shortly.",
                color: "yellow",
                autoClose: 7000,
              });
            }
          } catch (error) {
            console.error(`[Payment] Error verifying session:`, error);
            
            // Show warning notification
            notifications.show({
              title: "Payment Verification Error",
              message: "We encountered an error verifying your payment. If your account is not updated within an hour, please contact support.",
              color: "orange",
              autoClose: 7000,
            });
          } finally {
            setIsVerifyingSession(false);
          }
          
          // Remove query params after processing
          router.replace('/settings', undefined, { shallow: true });
        } else if (canceled === 'true') {
          console.log(`[Payment] Payment was canceled by user`);
          
          // Show canceled notification
          notifications.show({
            title: "Payment Canceled",
            message: "You've canceled the subscription process. No changes were made to your account.",
            color: "gray",
            autoClose: 5000,
          });
          
          // Remove query params
          router.replace('/settings', undefined, { shallow: true });
        }
      } catch (error) {
        console.error(`[Payment] Unexpected error handling payment status:`, error);
        setIsVerifyingSession(false);
      }
    };
    
    // Execute the handler
    handlePaymentStatus();
  }, [router, fetchUsageData]);

  return (
    <Box p="xl" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <LoadingOverlay visible={isLoading || isVerifyingSession} overlayProps={{ blur: 2 }} />
      
      {/* Page Title */}
      <Text
        size="xl"
        fw={600}
        style={{
          fontSize: "40px",
          marginBottom: "16px",
          fontFamily: GeistSans.style.fontFamily,
        }}
      >
        Settings
      </Text>
      <Text mb="xl" c="gray.5">
        You can manage your account, billing, and team settings here.
      </Text>

      <Flex gap="xl" wrap="wrap">
        {/* Basic Information */}
        <Paper
          withBorder
          radius="md"
          p="lg"
          bg="black"
          style={{
            borderColor: "#2B2B2B",
            flex: "1 1 300px",
            minWidth: "300px",
          }}
        >
          <Text
            size="xl"
            fw={600}
            mb="md"
            style={{ fontFamily: GeistSans.style.fontFamily }}
          >
            Basic Information
          </Text>
          
          <Stack gap="md">
            <Box>
              <Text size="sm" c="gray.5">
                Name
              </Text>
              <Text>{profile?.username || "Not set"}</Text>
            </Box>
            
            <Box>
              <Text size="sm" c="gray.5">
                Email
              </Text>
              <Text>{profile?.email || "Not available"}</Text>
            </Box>

            <Box>
              <Text size="sm" c="gray.5">
                User ID
              </Text>
              <Text style={{ fontFamily: GeistMono.style.fontFamily, fontSize: "12px" }}>
                {profile?.userId || "Not available"}
              </Text>
            </Box>
            
            {isUserAdmin && (
              <Box>
                <Text size="sm" c="gray.5">
                  Roles
                </Text>
                <Group gap="xs">
                  {profile?.roles?.map(role => (
                    <Badge key={role} color="blue" variant="filled">
                      {role}
                    </Badge>
                  ))}
                </Group>
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Usage Section */}
        <Paper
          withBorder
          radius="md"
          p="lg"
          bg="black"
          style={{
            borderColor: "#2B2B2B",
            flex: "1 1 500px",
            minWidth: "500px",
          }}
        >
          <Text
            size="xl"
            fw={600}
            mb="md"
            style={{ fontFamily: GeistSans.style.fontFamily }}
          >
            Usage
          </Text>
          
          <Box mb="md">
            <Text size="lg" fw={500} mb="xs">
              Usage (Last 30 days)
            </Text>
            
            <Box mb="md">
              <Flex justify="space-between" mb="xs">
                <Text size="sm">Jobs</Text>
                <Text size="sm">
                  {jobsUsed} / {jobsLimit === -1 ? "∞" : jobsLimit}
                </Text>
              </Flex>
              <Progress
                value={jobsPercent}
                size="sm"
                radius="xs"
                color={jobsPercent > 90 ? "red" : "blue"}
              />
              <Text size="xs" c="gray.5" mt="xs">
                You&apos;ve used {jobsUsed} jobs out of your {jobsLimit === -1 ? "unlimited" : jobsLimit} monthly jobs quota.
              </Text>
            </Box>
            
            <Box mb="md">
              <Flex justify="space-between" mb="xs">
                <Text size="sm">Processing Time</Text>
                <Text size="sm">
                  {Math.round(processingUsed / (1000 * 60 * 60))} / {processingLimit === -1 ? "∞" : Math.round(processingLimit / (1000 * 60 * 60))} hours
                </Text>
              </Flex>
              <Progress
                value={processingPercent}
                size="sm"
                radius="xs"
                color={processingPercent > 90 ? "red" : "blue"}
              />
              <Text size="xs" c="gray.5" mt="xs">
                You&apos;ve used {Math.round(processingUsed / (1000 * 60 * 60))} hours out of your {processingLimit === -1 ? "unlimited" : Math.round(processingLimit / (1000 * 60 * 60))} processing hours.
              </Text>
            </Box>
            
            <Box>
              <Flex justify="space-between" mb="xs">
                <Text size="sm">API Calls (Daily)</Text>
                <Text size="sm">
                  {apiUsed} / {apiLimit === Infinity ? "∞" : apiLimit}
                </Text>
              </Flex>
              <Progress
                value={apiPercent}
                size="sm"
                radius="xs"
                color={apiPercent > 90 ? "red" : "blue"}
              />
              <Text size="xs" c="gray.5" mt="xs">
                You&apos;ve used {apiUsed} API calls out of your {apiLimit === Infinity ? "unlimited" : apiLimit} daily API call quota.
              </Text>
            </Box>
          </Box>
        </Paper>
      </Flex>

      {/* Account & Plans Section */}
      <Paper
        withBorder
        radius="md"
        p="lg"
        bg="black"
        mt="xl"
        style={{ borderColor: "#2B2B2B" }}
      >
        <Text
          size="xl"
          fw={600}
          mb="md"
          style={{ fontFamily: GeistSans.style.fontFamily }}
        >
          Account
        </Text>
        
        <Text mb="lg">
          Current Plan: <Badge color={
              currentPlan?.name === "FREE" ? "gray" : 
              currentPlan?.name === "PRO" ? "blue" : "purple"
            } size="lg">
            {currentPlan?.name || "FREE"}
          </Badge>
          
          {profile?.subscription?.cancelAtPeriodEnd && (
            <Badge ml="sm" color="yellow" size="sm">Cancels at period end</Badge>
          )}
        </Text>
        
        {/* Billing cycle toggle */}
        <Group justify="center" mb="lg">
          <Button.Group>
            <Button 
              variant={billingCycle === 'monthly' ? "filled" : "outline"}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </Button>
            <Button 
              variant={billingCycle === 'yearly' ? "filled" : "outline"}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly (Save 20%)
            </Button>
          </Button.Group>
        </Group>
        
        <Flex gap="md" wrap="wrap">
          {plans
            // Filter out admin plans for non-admin users
            .filter(plan => {
              // If the plan name includes "ADMIN" or "ENTERPRISE", only show to admin users
              const isAdminPlan = plan.name.toUpperCase().includes("ADMIN") || 
                                plan.name.toUpperCase().includes("ENTERPRISE");
              
              // Show the plan if it's not an admin plan OR if the user is an admin
              return !isAdminPlan || isUserAdmin;
            })
            .map((plan) => {
              // Explicitly compare IDs for current plan check
              const isCurrentPlan = currentPlan?._id === plan._id;
              const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
              
              return (
                <Paper
                  key={plan._id}
                  withBorder
                  p="md"
                  radius="md"
                  style={{
                    borderColor: isCurrentPlan ? "#3377FF" : "#2B2B2B",
                    backgroundColor: "#0C0C0C",
                    flex: "1 1 300px",
                    minWidth: "250px",
                  }}
                >
                  <Text fw={600} size="lg" mb="xs">
                    {plan.name}
                    {isCurrentPlan && (
                      <Badge ml="xs" color="blue" size="sm">
                        Current
                      </Badge>
                    )}
                  </Text>
                  
                  <Text c="gray.5" size="sm" mb="md">
                    {plan.name === "FREE" 
                      ? "Basic access with limited features" 
                      : plan.name === "PRO" 
                        ? "Enhanced productivity for individuals" 
                        : "Advanced features for teams"}
                  </Text>
                  
                  <Text fw={600} mb="md">
                    {price === 0 ? "Free" : `${formatPrice(price)}/${billingCycle === 'monthly' ? 'month' : 'year'}`}
                  </Text>
                  
                  <Stack gap="xs" mb="lg">
                    <Group gap="xs">
                      <Check size={16} />
                      <Text size="sm">{formatFeature(plan.jobsPerMonth)} jobs/month</Text>
                    </Group>
                    <Group gap="xs">
                      <Check size={16} />
                      <Text size="sm">{formatTimeLimit(plan.processingTimeLimit)} processing</Text>
                    </Group>
                    <Group gap="xs">
                      <Check size={16} />
                      <Text size="sm">{plan.exportFormats}</Text>
                    </Group>
                    <Group gap="xs">
                      <Check size={16} />
                      <Text size="sm">{plan.supportLevel} Support</Text>
                    </Group>
                  </Stack>
                  
                  <Button
                    fullWidth
                    variant={isCurrentPlan ? "outline" : "filled"}
                    color={isCurrentPlan ? "gray" : "blue"}
                    disabled={isCurrentPlan}
                    onClick={() => openUpgradeModal(plan._id)}
                  >
                    {isCurrentPlan ? "Current Plan" : `Upgrade to ${plan.name}`}
                  </Button>
                </Paper>
              );
            })}
        </Flex>

        {/* Advanced Section (collapsible) */}
        <Box mt="xl">
          <Flex 
            justify="space-between" 
            align="center" 
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            style={{ cursor: "pointer" }}
          >
            <Text fw={600}>Advanced</Text>
            <ActionIcon>
              {isAdvancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </ActionIcon>
          </Flex>
          
          {isAdvancedOpen && (
            <Box mt="md" pl="md">
              <Stack gap="md">
                {profile?.subscription?.id && !profile.subscription.cancelAtPeriodEnd && (
                  <Button 
                    variant="outline" 
                    color="orange" 
                    style={{ width: "fit-content" }}
                    onClick={handleCancelSubscription}
                  >
                    Cancel Subscription
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  color="red" 
                  style={{ width: "fit-content" }}
                  onClick={handleDeleteAccount}
                >
                  Delete Account
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      </Paper>
      
      {/* Plan Upgrade Modal */}
      <Modal
        opened={isUpgradeModalOpen}
        onClose={() => !isSubscriptionLoading && setIsUpgradeModalOpen(false)}
        title="Upgrade Your Plan"
        centered
        styles={{
          title: { fontWeight: 600 },
          body: { paddingTop: 5 },
        }}
        closeOnClickOutside={!isSubscriptionLoading}
        closeOnEscape={!isSubscriptionLoading}
      >
        <LoadingOverlay visible={isSubscriptionLoading} overlayProps={{ blur: 2 }} />
        
        {selectedPlanId && (
          <Box>
            <Text size="sm" mb="md">
              You are about to upgrade to the {plans.find(p => p._id === selectedPlanId)?.name} plan.
            </Text>
            
            <Stack gap="sm" mb="xl">
              <Group justify="apart">
                <Text>Plan:</Text>
                <Text fw={500}>{plans.find(p => p._id === selectedPlanId)?.name}</Text>
              </Group>
              
              <Group justify="apart">
                <Text>Billing:</Text>
                <Text fw={500}>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</Text>
              </Group>
              
              <Group justify="apart">
                <Text>Price:</Text>
                <Text fw={500}>
                  {billingCycle === 'monthly' 
                    ? formatPrice(plans.find(p => p._id === selectedPlanId)?.monthlyPrice || 0) + '/month'
                    : formatPrice(plans.find(p => p._id === selectedPlanId)?.yearlyPrice || 0) + '/year'}
                </Text>
              </Group>
              
              <Divider my="sm" />
              
              <Group justify="apart">
                <Text>Jobs per month:</Text>
                <Text fw={500}>{formatFeature(plans.find(p => p._id === selectedPlanId)?.jobsPerMonth || 0)}</Text>
              </Group>
              
              <Group justify="apart">
                <Text>Processing time:</Text>
                <Text fw={500}>{formatTimeLimit(plans.find(p => p._id === selectedPlanId)?.processingTimeLimit || 0)}</Text>
              </Group>
            </Stack>
            
            <Group justify="right" mt="xl">
              <Button 
                variant="outline" 
                onClick={() => setIsUpgradeModalOpen(false)}
                disabled={isSubscriptionLoading}
              >
                Cancel
              </Button>
              <Button 
                leftSection={<CreditCard size={16} />} 
                onClick={handleUpgradePlan}
                loading={isSubscriptionLoading}
              >
                Confirm Upgrade
              </Button>
            </Group>
          </Box>
        )}
      </Modal>
    </Box>
  );
}