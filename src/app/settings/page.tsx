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
  Skeleton,
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
  roles?: string[];
  stripeCustomerId?: string;
  subscriptionPlan?: {
    _id: string;
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    cancelAtPeriodEnd?: boolean; // Add this property
  };
  usage?: {
    jobsCount: number;
    processingTimeUsed: number;
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

interface UsageData {
  jobs: {
    used: number;
    limit: number;
  };
  processing: {
    used: number;
    limit: number;
  };
  api: {
    used: number;
    limit: number;
  };
}

function SkeletonLoader() {
  return (
    <Box p="xl" style={{ maxWidth: "1200px", margin: "0 auto", backgroundColor: "#0D0D0D" }}>
      <Skeleton height={40} width="200px" mb="md" />
      <Skeleton height={16} width="300px" mb="xl" />

      <Flex gap="xl" wrap="wrap">
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
          <Skeleton height={24} width="150px" mb="md" />
          <Stack gap="md">
            <Box>
              <Skeleton height={14} width="80px" mb="xs" />
              <Skeleton height={16} width="120px" />
            </Box>
            <Box>
              <Skeleton height={14} width="80px" mb="xs" />
              <Skeleton height={16} width="150px" />
            </Box>
            <Box>
              <Skeleton height={14} width="80px" mb="xs" />
              <Skeleton height={16} width="100px" />
            </Box>
            <Box>
              <Skeleton height={14} width="80px" mb="xs" />
              <Skeleton height={16} width="140px" />
            </Box>
          </Stack>
        </Paper>

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
          <Skeleton height={24} width="150px" mb="md" />
          <Box mb="md">
            <Skeleton height={20} width="120px" mb="xs" />
            <Box mb="md">
              <Flex justify="space-between" mb="xs">
                <Skeleton height={14} width="80px" />
                <Skeleton height={14} width="100px" />
              </Flex>
              <Skeleton height={8} width="100%" />
              <Skeleton height={12} width="200px" mt="xs" />
            </Box>
            <Box mb="md">
              <Flex justify="space-between" mb="xs">
                <Skeleton height={14} width="80px" />
                <Skeleton height={14} width="100px" />
              </Flex>
              <Skeleton height={8} width="100%" />
              <Skeleton height={12} width="200px" mt="xs" />
            </Box>
            <Box>
              <Flex justify="space-between" mb="xs">
                <Skeleton height={14} width="80px" />
                <Skeleton height={14} width="100px" />
              </Flex>
              <Skeleton height={8} width="100%" />
              <Skeleton height={12} width="200px" mt="xs" />
            </Box>
          </Box>
        </Paper>
      </Flex>

      <Paper
        withBorder
        radius="md"
        p="lg"
        bg="black"
        mt="xl"
        style={{ borderColor: "#2B2B2B" }}
      >
        <Skeleton height={24} width="150px" mb="md" />
        <Group mb="lg">
          <Skeleton height={16} width="150px" />
          <Skeleton height={24} width="80px" radius="md" />
        </Group>
        <Group justify="center" mb="lg">
          <Skeleton height={36} width="100px" radius="md" />
          <Skeleton height={36} width="120px" radius="md" />
        </Group>
        <Flex gap="md" wrap="wrap">
          {[...Array(3)].map((_, index) => (
            <Paper
              key={index}
              withBorder
              p="md"
              radius="md"
              style={{
                borderColor: "#2B2B2B",
                backgroundColor: "#0C0C0C",
                flex: "1 1 300px",
                minWidth: "250px",
              }}
            >
              <Skeleton height={20} width="100px" mb="xs" />
              <Skeleton height={14} width="150px" mb="md" />
              <Skeleton height={20} width="80px" mb="md" />
              <Stack gap="xs" mb="lg">
                <Skeleton height={14} width="120px" />
                <Skeleton height={14} width="120px" />
                <Skeleton height={14} width="120px" />
                <Skeleton height={14} width="120px" />
              </Stack>
              <Skeleton height={36} width="100%" radius="md" />
            </Paper>
          ))}
        </Flex>
        <Box mt="xl">
          <Flex justify="space-between" align="center">
            <Skeleton height={20} width="100px" />
            <Skeleton height={18} width="18px" radius="sm" />
          </Flex>
        </Box>
      </Paper>
    </Box>
  );
}

export default function SettingsPage() {
  const router = useRouter();
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const fetchUsageData = useCallback(async (subscriptionId: string) => {
    setIsLoading(true); // Start loading for usage data
    try {
      // Jobs usage
      const jobsUrl = `/api/subscriptions-proxy/${subscriptionId}/jobs`;
      const jobsResponse = await fetch(jobsUrl, {
        headers: authUtils.getAuthHeaders(),
        cache: 'no-store'
      });
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setUsage(prev => ({
          ...prev,
          jobs: {
            used: jobsData.used ?? 0,
            limit: jobsData.limit ?? prev.jobs.limit
          }
        }));
      } else {
        console.error(`Failed to fetch jobs usage: ${jobsResponse.status}`);
      }
  
      // Processing time usage
      const processingUrl = `/api/subscriptions-proxy/${subscriptionId}/processing`;
      const processingResponse = await fetch(processingUrl, {
        headers: authUtils.getAuthHeaders(),
        cache: 'no-store'
      });
      
      if (processingResponse.ok) {
        const processingData = await processingResponse.json();
        setUsage(prev => ({
          ...prev,
          processing: {
            used: processingData.used ?? 0,
            limit: processingData.limit ?? prev.processing.limit
          }
        }));
      } else {
        console.error(`Failed to fetch processing usage: ${processingResponse.status}`);
      }
  
      // API calls usage
      const apiUrl = `/api/subscriptions-proxy/${subscriptionId}/api`;
      const apiResponse = await fetch(apiUrl, {
        headers: authUtils.getAuthHeaders(),
        cache: 'no-store'
      });
      
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setUsage(prev => ({
          ...prev,
          api: {
            used: apiData.used ?? 0,
            limit: apiData.limit ?? prev.api.limit
          }
        }));
      } else {
        console.error(`Failed to fetch API usage: ${apiResponse.status}`);
      }
    } catch (error) {
      console.error("Error fetching usage data:", error);
      notifications.show({
        title: "Error",
        message: "Failed to fetch usage data. Please try refreshing the page.",
        color: "red",
      });
    } finally {
      setIsLoading(false); // End loading for usage data
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!authUtils.isAuthenticated()) {
          router.push("/login");
          return;
        }

        setIsLoading(true);
        
        const profileResponse = await fetch("/api/users-proxy/profile", {
          headers: authUtils.getAuthHeaders(),
          cache: 'no-store',
        });

        if (!profileResponse.ok) {
          if (profileResponse.status === 401 || profileResponse.status === 403) {
            const refreshed = await authUtils.refreshToken();
            if (!refreshed) {
              router.push("/login");
              return;
            }
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
  }, [router]);

  useEffect(() => {
    if (profile?.subscriptionPlan?._id) {
      console.log(`[Debug] Found Subscription Plan ID: ${profile.subscriptionPlan._id}, calling fetchUsageData`);
      fetchUsageData(profile.subscriptionPlan._id);
    } else {
      console.log(`[Debug] No Subscription Plan ID found in profile:`, profile);
    }
  }, [profile?.subscriptionPlan?._id, fetchUsageData]);

  const isUserAdmin = (
    identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN' || 
    profile?.roles?.some(role => role === "admin" || role === "super_admin")
  ) || false;

  const getCurrentPlan = useCallback(() => {
    if (profile?.subscriptionPlan?._id) {
      const matchedPlan = plans.find(plan => plan._id === profile?.subscriptionPlan?._id);
      if (matchedPlan) return matchedPlan;
    }
    
    if (isUserAdmin) {
      const adminPlan = plans.find(plan => 
        plan.name.toUpperCase().includes("ADMIN") || 
        plan.name.toUpperCase().includes("ENTERPRISE")
      );
      if (adminPlan) return adminPlan;
    }
    
    return plans.find(plan => plan.name.toUpperCase() === "FREE") || null;
  }, [plans, profile, isUserAdmin]);

  const currentPlan = useMemo(() => getCurrentPlan(), [getCurrentPlan]);

  const jobsUsed = usage.jobs.used;
  const jobsLimit = currentPlan?.jobsPerMonth || usage.jobs.limit;
  const jobsPercent = (jobsUsed / jobsLimit) * 100;

  const processingUsed = usage.processing.used;
  const processingLimit = currentPlan?.processingTimeLimit || usage.processing.limit;
  const processingPercent = (processingUsed / processingLimit) * 100;

  const apiUsed = usage.api.used;
  const apiLimit = currentPlan?.apiCallsPerDay !== -1 ? (currentPlan?.apiCallsPerDay || usage.api.limit) : Infinity;
  const apiPercent = apiLimit === Infinity ? 0 : (apiUsed / apiLimit) * 100;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0 
    }).format(price / 100);
  };

  const formatTimeLimit = (ms: number) => {
    if (ms === -1) return "Unlimited";
    const hours = Math.round(ms / (1000 * 60 * 60));
    return `${hours} hours`;
  };

  const formatFeature = (value: number | boolean | string) => {
    if (typeof value === 'boolean') return value ? "Yes" : "No";
    if (typeof value === 'number') {
      if (value === -1) return "Unlimited";
      return value.toString();
    }
    return value;
  };

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
      
      const selectedPlan = plans.find(p => p._id === selectedPlanId);
      if (!selectedPlan) {
        throw new Error("Selected plan not found");
      }
  
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
  
      const checkoutUrl = responseData.sessionUrl || responseData.url || responseData.checkoutUrl || responseData.stripeUrl;
      
      if (!checkoutUrl) {
        console.error("No checkout URL found in response:", responseData);
        throw new Error("No checkout URL found in API response");
      }
  
      console.log("Redirecting to checkout:", checkoutUrl);
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

  const handleCancelSubscription = async () => {
    if (!profile?.stripeCustomerId) {
      notifications.show({
        title: "Error",
        message: "No active subscription found",
        color: "red",
      });
      return;
    }
  
    try {
      setIsLoading(true);
      
      const response = await fetch(`/api/subscriptions-proxy/${profile.stripeCustomerId}/cancel`, {
        method: "POST",
        headers: authUtils.getAuthHeaders(),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel subscription");
      }
  
      const { message } = await response.json();
      
      setProfile(prev => {
        if (!prev) return null;
        
        // If subscriptionPlan exists, update it
        if (prev.subscriptionPlan) {
          return {
            ...prev,
            subscriptionPlan: {
              ...prev.subscriptionPlan,
              cancelAtPeriodEnd: true
            }
          };
        }
        
        // Otherwise return the profile unchanged
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
    
      authUtils.clearAuthStorage();
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

  const openUpgradeModal = (planId: string) => {
    setSelectedPlanId(planId);
    setIsUpgradeModalOpen(true);
  };

  useEffect(() => {
    const handlePaymentStatus = async () => {
      try {
        const query = new URLSearchParams(window.location.search);
        const sessionId = query.get('session_id');
        const success = query.get('success');
        const canceled = query.get('canceled');
        
        if (sessionId && success === 'true') {
          setIsProcessingPayment(true);
          
          console.log(`[Payment] Detected successful payment with session ID: ${sessionId}`);
          
          const profileResponse = await fetch("/api/users-proxy/profile", {
            headers: authUtils.getAuthHeaders(),
            cache: 'no-store',
          });
          
          if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            setProfile(profileData);
            
            const plansResponse = await fetch("/api/subscriptions-proxy/plans", {
              headers: authUtils.getAuthHeaders(),
            });
            
            if (plansResponse.ok) {
              const plansData = await plansResponse.json();
              setPlans(Array.isArray(plansData) ? plansData : []);
            }
            
            if (profileData?.stripeCustomerId) {
              await fetchUsageData(profileData.stripeCustomerId);
            }
            
            // eslint-disable-next-line react/no-unescaped-entities
            notifications.show({
              title: "Payment Successful",
              message: "Your subscription has been activated successfully!",
              color: "green",
              icon: <Check size={16} />,
              autoClose: 5000,
            });
          } else {
            console.error(`[Payment] Failed to fetch profile: ${profileResponse.status}`);
            // eslint-disable-next-line react/no-unescaped-entities
            notifications.show({
              title: "Warning",
              message: "Payment processed, but failed to update profile. Please refresh the page.",
              color: "yellow",
              autoClose: 7000,
            });
          }
          
          router.replace('/settings');
        } else if (canceled === 'true') {
          console.log(`[Payment] Payment was canceled by user`);
          
          notifications.show({
            title: "Payment Canceled",
            message: "You've canceled the subscription process. No changes were made to your account.",
            color: "gray",
            autoClose: 5000,
          });
          
          router.replace('/settings');
        }
      } catch (error) {
        console.error(`[Payment] Unexpected error handling payment status:`, error);
        // eslint-disable-next-line react/no-unescaped-entities
        notifications.show({
          title: "Error",
          message: "An error occurred while processing your payment. Please try again or contact support.",
          color: "red",
          autoClose: 7000,
        });
      } finally {
        setIsProcessingPayment(false);
      }
    };
    
    handlePaymentStatus();
  }, [router, fetchUsageData]);

  return (
    <>
      {isProcessingPayment ? (
        <SkeletonLoader />
      ) : (
        <Box p="xl" style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
          
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
              
              {profile?.subscriptionPlan?.cancelAtPeriodEnd && (
                <Badge ml="sm" color="yellow" size="sm">Cancels at period end</Badge>
              )}
            </Text>
            
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
                .filter(plan => {
                  const isAdminPlan = plan.name.toUpperCase().includes("ADMIN") || 
                                    plan.name.toUpperCase().includes("ENTERPRISE");
                  return !isAdminPlan || isUserAdmin;
                })
                .map((plan) => {
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
                    {profile?.subscriptionPlan?._id && !profile.subscriptionPlan.cancelAtPeriodEnd && (
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
      )}
    </>
  );
}