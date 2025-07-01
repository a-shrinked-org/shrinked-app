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
import { Settings, ChevronDown, ChevronUp, CreditCard, Check, ArrowLeft } from "lucide-react";
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
    cancelAtPeriodEnd?: boolean;
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
    <Box style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#ffffff' 
    }}>
      <Flex 
        justify="space-between" 
        align="center" 
        p="sm" 
        style={{ 
          borderBottom: '1px solid #2b2b2b', 
          flexShrink: 0,
          backgroundColor: '#000000'
        }}
      >
        <Skeleton height={20} width="100px" />
        <Skeleton height={36} width="80px" />
      </Flex>
      <Box style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '24px', 
        flexGrow: 1 
      }}>
        <Flex gap="xl" wrap="wrap">
          <Paper
            withBorder
            radius="md"
            p="lg"
            bg="#0a0a0a"
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
            bg="#0a0a0a"
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
          bg="#0a0a0a"
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
    </Box>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: identity } = useGetIdentity<Identity>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [usage, setUsage] = useState<UsageData>({
    jobs: { used: 0, limit: 0 }, // Default to 0, updated by plans
    processing: { used: 0, limit: 0 },
    api: { used: 0, limit: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);

  const fetchUsageData = useCallback(async (subscriptionId: string) => {
    setIsLoading(true);
    try {
      // Jobs usage
      const jobsUrl = `/api/subscriptions-proxy/${subscriptionId}/jobs`;
      const jobsResponse = await fetch(jobsUrl, {
        headers: authUtils.getAuthHeaders(),
        cache: 'no-store',
      });
      if (!jobsResponse.ok) {
        if (jobsResponse.status === 401 || jobsResponse.status === 403) {
          const refreshed = await authUtils.refreshToken();
          if (!refreshed) throw new Error("Authentication failed");
          const retryResponse = await fetch(jobsUrl, {
            headers: authUtils.getAuthHeaders(),
            cache: 'no-store',
          });
          if (!retryResponse.ok) throw new Error(`Failed to fetch jobs usage: ${retryResponse.status}`);
          const jobsData = await retryResponse.json();
          setUsage(prev => ({
            ...prev,
            jobs: { used: jobsData.used ?? 0, limit: jobsData.limit ?? prev.jobs.limit },
          }));
        } else {
          throw new Error(`Failed to fetch jobs usage: ${jobsResponse.status}`);
        }
      } else {
        const jobsData = await jobsResponse.json();
        setUsage(prev => ({
          ...prev,
          jobs: { used: jobsData.used ?? 0, limit: jobsData.limit ?? prev.jobs.limit },
        }));
      }

      // Processing time usage
      const processingUrl = `/api/subscriptions-proxy/${subscriptionId}/processing`;
      const processingResponse = await fetch(processingUrl, {
        headers: authUtils.getAuthHeaders(),
        cache: 'no-store',
      });
      if (!processingResponse.ok) {
        if (processingResponse.status === 401 || jobsResponse.status === 403) {
          const refreshed = await authUtils.refreshToken();
          if (!refreshed) throw new Error("Authentication failed");
          const retryResponse = await fetch(processingUrl, {
            headers: authUtils.getAuthHeaders(),
            cache: 'no-store',
          });
          if (!retryResponse.ok) throw new Error(`Failed to fetch processing usage: ${retryResponse.status}`);
          const processingData = await retryResponse.json();
          setUsage(prev => ({
            ...prev,
            processing: { used: processingData.used ?? 0, limit: processingData.limit ?? prev.processing.limit },
          }));
        } else {
          throw new Error(`Failed to fetch processing usage: ${processingResponse.status}`);
        }
      } else {
        const processingData = await processingResponse.json();
        setUsage(prev => ({
          ...prev,
          processing: { used: processingData.used ?? 0, limit: processingData.limit ?? prev.processing.limit },
        }));
      }

      // API calls usage
      const apiUrl = `/api/subscriptions-proxy/${subscriptionId}/api`;
      const apiResponse = await fetch(apiUrl, {
        headers: authUtils.getAuthHeaders(),
        cache: 'no-store',
      });
      if (!apiResponse.ok) {
        if (apiResponse.status === 401 || jobsResponse.status === 403) {
          const refreshed = await authUtils.refreshToken();
          if (!refreshed) throw new Error("Authentication failed");
          const retryResponse = await fetch(apiUrl, {
            headers: authUtils.getAuthHeaders(),
            cache: 'no-store',
          });
          if (!retryResponse.ok) throw new Error(`Failed to fetch API usage: ${retryResponse.status}`);
          const apiData = await retryResponse.json();
          setUsage(prev => ({
            ...prev,
            api: { used: apiData.used ?? 0, limit: apiData.limit ?? prev.api.limit },
          }));
        } else {
          throw new Error(`Failed to fetch API usage: ${apiResponse.status}`);
        }
      } else {
        const apiData = await apiResponse.json();
        setUsage(prev => ({
          ...prev,
          api: { used: apiData.used ?? 0, limit: apiData.limit ?? prev.api.limit },
        }));
      }
    } catch (error) {
      console.error("Error fetching usage data:", error);
      notifications.show({
        title: "Error",
        message: "Failed to fetch usage data. Please try refreshing the page.",
        color: "red",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!authUtils.isAuthenticated()) {
        router.push("/login");
        return;
      }

      setIsLoading(true);
      try {
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
          throw new Error(`Failed to fetch subscription plans: ${plansResponse.status}`);
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
      fetchUsageData(profile.subscriptionPlan._id);
    }
  }, [profile?.subscriptionPlan?._id, fetchUsageData]);

  const isUserAdmin = useMemo(() => (
    identity?.subscriptionPlan?.name?.toUpperCase() === 'ADMIN' || 
    profile?.roles?.some(role => role === "admin" || role === "super_admin")
  ) || false, [identity, profile]);

  const getCurrentPlan = useCallback(() => {
    if (!profile) return null;
    if (profile.subscriptionPlan?._id) {
      return plans.find(plan => plan._id === profile.subscriptionPlan?._id) || null;
    }
    if (isUserAdmin) {
      return plans.find(plan => 
        plan.name.toUpperCase().includes("ADMIN") || 
        plan.name.toUpperCase().includes("ENTERPRISE")
      ) || null;
    }
    return plans.find(plan => plan.name.toUpperCase() === "FREE") || null;
  }, [plans, profile, isUserAdmin]);

  const currentPlan = useMemo(() => getCurrentPlan(), [getCurrentPlan]);

  const jobsUsed = usage.jobs.used;
  const jobsLimit = currentPlan?.jobsPerMonth || usage.jobs.limit || 5;
  const jobsPercent = jobsLimit === 0 ? 0 : (jobsUsed / jobsLimit) * 100;

  const processingUsed = usage.processing.used;
  const processingLimit = currentPlan?.processingTimeLimit || usage.processing.limit || 11880000;
  const processingPercent = processingLimit === 0 ? 0 : (processingUsed / processingLimit) * 100;

  const apiUsed = usage.api.used;
  const apiLimit = currentPlan?.apiCallsPerDay !== -1 ? (currentPlan?.apiCallsPerDay || usage.api.limit || 100) : Infinity;
  const apiPercent = apiLimit === Infinity ? 0 : (apiUsed / apiLimit) * 100;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0 
    }).format(price / 100);
  };

  const formatTimeLimit = (ms: number) => {
    if (ms === -1 || ms === 0) return "Unlimited";
    const hours = Math.round(ms / (1000 * 60 * 60));
    return `${hours} hours`;
  };

  const formatFeature = (value: number | boolean | string) => {
    if (typeof value === 'boolean') return value ? "Yes" : "No";
    if (typeof value === 'number') {
      if (value === -1 || value === 0) return "Unlimited";
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
  
    setIsSubscriptionLoading(true);
    try {
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
      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || "Failed to create checkout session");
      }
  
      const checkoutUrl = responseData.sessionUrl || responseData.url || responseData.checkoutUrl || responseData.stripeUrl;
      if (!checkoutUrl) {
        throw new Error("No checkout URL found in API response");
      }
  
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Error upgrading plan:", error);
      notifications.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to upgrade plan",
        color: "red",
      });
    } finally {
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
  
    setIsLoading(true);
    try {
      const response = await fetch(`/api/subscriptions-proxy/${profile.stripeCustomerId}/cancel`, {
        method: "POST",
        headers: authUtils.getAuthHeaders(),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel subscription");
      }
  
      const { message } = await response.json();
      setProfile(prev => prev ? ({
        ...prev,
        subscriptionPlan: prev.subscriptionPlan ? {
          ...prev.subscriptionPlan,
          cancelAtPeriodEnd: true
        } : undefined,
      }) : null);
  
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
  
    setIsLoading(true);
    try {
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
    } finally {
      setIsLoading(false);
    }
  };

  const openUpgradeModal = (planId: string) => {
    setSelectedPlanId(planId);
    setIsUpgradeModalOpen(true);
  };

  useEffect(() => {
    const handlePaymentStatus = async () => {
      const query = new URLSearchParams(window.location.search);
      const sessionId = query.get('session_id');
      const success = query.get('success');
      const canceled = query.get('canceled');
      
      if (!sessionId && !success && !canceled) return;

      setIsLoading(true);
      try {
        if (sessionId && success === 'true') {
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
            
            notifications.show({
              title: "Payment Successful",
              message: "Your subscription has been activated successfully!",
              color: "green",
              icon: <Check size={16} />,
              autoClose: 5000,
            });
          } else {
            throw new Error(`Failed to fetch profile: ${profileResponse.status}`);
          }
        } else if (canceled === 'true') {
          notifications.show({
            title: "Payment Canceled",
            message: "You've canceled the subscription process. No changes were made to your account.",
            color: "gray",
            autoClose: 5000,
          });
        }
      } catch (error) {
        console.error("Error handling payment status:", error);
        notifications.show({
          title: "Error",
          message: "An error occurred while processing your payment. Please try again or contact support.",
          color: "red",
          autoClose: 7000,
        });
      } finally {
        setIsLoading(false);
        router.replace('/settings');
      }
    };
    
    handlePaymentStatus();
  }, [router, fetchUsageData]);

  return (
    <Box style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      backgroundColor: '#0a0a0a', 
      color: '#ffffff' 
    }}>
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      <Flex 
        justify="space-between" 
        align="center" 
        p="sm" 
        style={{ 
          borderBottom: '1px solid #2b2b2b', 
          flexShrink: 0,
          backgroundColor: '#000000'
        }}
      >
        <Text 
          size="sm" 
          fw={500} 
          style={{ 
            fontFamily: GeistMono.style.fontFamily, 
            letterSpacing: '0.5px' 
          }}
        >
          SETTINGS
        </Text>
        <Button 
          variant="subtle" 
          leftSection={<ArrowLeft size={14} />}
          onClick={() => router.back()}
          styles={{
            root: {
              fontFamily: GeistMono.style.fontFamily,
              fontSize: '14px',
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#1a1a1a',
              },
            },
          }}
        >
          BACK
        </Button>
      </Flex>

      <Box style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '24px', 
        flexGrow: 1 
      }}>
        <Flex gap="xl" wrap="wrap">
          <Paper
            withBorder
            radius="md"
            p="lg"
            bg="#0a0a0a"
            style={{
              borderColor: "#2B2B2B",
              flex: "1 1 300px",
              minWidth: "300px",
            }}
          >
            <Text
              size="lg"
              fw={500}
              mb="md"
              style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Basic Information
            </Text>
            
            <Stack gap="md">
              <Box>
                <Text size="xs" c="dimmed" style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Name
                </Text>
                <Text style={{ fontFamily: GeistMono.style.fontFamily }}>{profile?.username || "Not set"}</Text>
              </Box>
              
              <Box>
                <Text size="xs" c="dimmed" style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', marginBottom: '4px' }}>
                  Email
                </Text>
                <Text style={{ fontFamily: GeistMono.style.fontFamily }}>{profile?.email || "Not available"}</Text>
              </Box>

              <Box>
                <Text size="xs" c="dimmed" style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', marginBottom: '4px' }}>
                  User ID
                </Text>
                <Text style={{ fontFamily: GeistMono.style.fontFamily }}>{profile?.userId || "Not available"}</Text>
              </Box>
              
              {isUserAdmin && profile?.roles && (
                <Box>
                  <Text size="xs" c="dimmed" style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', marginBottom: '4px' }}>
                    Roles
                  </Text>
                  <Group gap="xs">
                    {profile.roles.map(role => (
                      <Badge key={role} color="blue" variant="filled" style={{ fontFamily: GeistMono.style.fontFamily }}>
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
            bg="#0a0a0a"
            style={{
              borderColor: "#2B2B2B",
              flex: "1 1 500px",
              minWidth: "500px",
            }}
          >
            <Text
              size="lg"
              fw={500}
              mb="md"
              style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Usage
            </Text>
            
            <Box mb="md">
              <Text size="md" fw={500} mb="xs" style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Usage (Last 30 days)
              </Text>
              
              <Box mb="md">
                <Flex justify="space-between" mb="xs">
                  <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>Jobs</Text>
                  <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>
                    {jobsUsed} / {jobsLimit === -1 ? "∞" : jobsLimit}
                  </Text>
                </Flex>
                <Progress
                  value={jobsPercent}
                  size="sm"
                  radius="xs"
                  color={jobsPercent > 90 ? "red" : "blue"}
                />
                <Text size="xs" c="dimmed" mt="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                  You&apos;ve used {jobsUsed} jobs out of your {jobsLimit === -1 ? "unlimited" : jobsLimit} monthly jobs quota.
                </Text>
              </Box>
              
              <Box mb="md">
                <Flex justify="space-between" mb="xs">
                  <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>Processing Time</Text>
                  <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>
                    {Math.round(processingUsed / (1000 * 60 * 60))} / {formatTimeLimit(processingLimit)} hours
                  </Text>
                </Flex>
                <Progress
                  value={processingPercent}
                  size="sm"
                  radius="xs"
                  color={processingPercent > 90 ? "red" : "blue"}
                />
                <Text size="xs" c="dimmed" mt="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                  You&apos;ve used {Math.round(processingUsed / (1000 * 60 * 60))} hours out of your {formatTimeLimit(processingLimit)} processing hours.
                </Text>
              </Box>
              
              <Box>
                <Flex justify="space-between" mb="xs">
                  <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>API Calls (Daily)</Text>
                  <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>
                    {apiUsed} / {apiLimit === Infinity ? "∞" : apiLimit}
                  </Text>
                </Flex>
                <Progress
                  value={apiPercent}
                  size="sm"
                  radius="xs"
                  color={apiPercent > 90 ? "red" : "blue"}
                />
                <Text size="xs" c="dimmed" mt="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
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
          bg="#0a0a0a"
          mt="xl"
          style={{ borderColor: "#2B2B2B" }}
        >
          <Text
            size="lg"
            fw={500}
            mb="md"
            style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            Account
          </Text>
          
          <Text mb="lg" style={{ fontFamily: GeistMono.style.fontFamily }}>
            Current Plan: <Badge color={
                currentPlan?.name === "FREE" ? "gray" : 
                currentPlan?.name === "PRO" ? "blue" : "purple"
              } size="lg" style={{ fontFamily: GeistMono.style.fontFamily }}>
              {currentPlan?.name || "FREE"}
            </Badge>
            
            {profile?.subscriptionPlan?.cancelAtPeriodEnd && (
              <Badge ml="sm" color="yellow" size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>Cancels at period end</Badge>
            )}
          </Text>
          
          <Group justify="center" mb="lg">
            <Button.Group>
              <Button 
                variant={billingCycle === 'monthly' ? "filled" : "outline"}
                onClick={() => setBillingCycle('monthly')}
                styles={{
                  root: {
                    fontFamily: GeistMono.style.fontFamily,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: billingCycle === 'monthly' ? '#F5A623' : 'transparent',
                    color: billingCycle === 'monthly' ? '#000000' : '#ffffff',
                    borderColor: '#2B2B2B',
                    '&:hover': {
                      backgroundColor: billingCycle === 'monthly' ? '#E09612' : '#1a1a1a',
                    },
                  },
                }}
              >
                Monthly
              </Button>
              <Button 
                variant={billingCycle === 'yearly' ? "filled" : "outline"}
                onClick={() => setBillingCycle('yearly')}
                styles={{
                  root: {
                    fontFamily: GeistMono.style.fontFamily,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: billingCycle === 'yearly' ? '#F5A623' : 'transparent',
                    color: billingCycle === 'yearly' ? '#000000' : '#ffffff',
                    borderColor: '#2B2B2B',
                    '&:hover': {
                      backgroundColor: billingCycle === 'yearly' ? '#E09612' : '#1a1a1a',
                    },
                  },
                }}
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
                      borderColor: isCurrentPlan ? "#F5A623" : "#2B2B2B",
                      backgroundColor: "#0C0C0C",
                      flex: "1 1 300px",
                      minWidth: "250px",
                    }}
                  >
                    <Text fw={600} size="lg" mb="xs" style={{ fontFamily: GeistMono.style.fontFamily }}>
                      {plan.name}
                      {isCurrentPlan && (
                        <Badge ml="xs" color="blue" size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>
                          Current
                        </Badge>
                      )}
                    </Text>
                    
                    <Text c="dimmed" size="sm" mb="md" style={{ fontFamily: GeistMono.style.fontFamily }}>
                      {plan.name === "FREE" 
                        ? "Basic access with limited features" 
                        : plan.name === "PRO" 
                          ? "Enhanced productivity for individuals" 
                          : "Advanced features for teams"}
                    </Text>
                    
                    <Text fw={600} mb="md" style={{ fontFamily: GeistMono.style.fontFamily }}>
                      {price === 0 ? "Free" : `${formatPrice(price)}/${billingCycle === 'monthly' ? 'month' : 'year'}`}
                    </Text>
                    
                    <Stack gap="xs" mb="lg">
                      <Group gap="xs">
                        <Check size={16} color="#3DC28B" />
                        <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>{formatFeature(plan.jobsPerMonth)} jobs/month</Text>
                      </Group>
                      <Group gap="xs">
                        <Check size={16} color="#3DC28B" />
                        <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>{formatTimeLimit(plan.processingTimeLimit)} processing</Text>
                      </Group>
                      <Group gap="xs">
                        <Check size={16} color="#3DC28B" />
                        <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>{plan.exportFormats}</Text>
                      </Group>
                      <Group gap="xs">
                        <Check size={16} color="#3DC28B" />
                        <Text size="sm" style={{ fontFamily: GeistMono.style.fontFamily }}>{plan.supportLevel} Support</Text>
                      </Group>
                    </Stack>
                    
                    <Button
                      fullWidth
                      variant={isCurrentPlan ? "outline" : "filled"}
                      color={isCurrentPlan ? "gray" : "orange"}
                      disabled={isCurrentPlan}
                      onClick={() => openUpgradeModal(plan._id)}
                      styles={{
                        root: {
                          fontFamily: GeistMono.style.fontFamily,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          backgroundColor: isCurrentPlan ? 'transparent' : '#F5A623',
                          color: isCurrentPlan ? '#ffffff' : '#000000',
                          borderColor: isCurrentPlan ? '#2B2B2B' : 'transparent',
                          '&:hover': {
                            backgroundColor: isCurrentPlan ? '#1a1a1a' : '#E09612',
                          },
                        },
                      }}
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
              <Text fw={600} style={{ fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Advanced
              </Text>
              <ActionIcon variant="transparent" style={{ color: '#ffffff' }}>
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
                      styles={{
                        root: {
                          fontFamily: GeistMono.style.fontFamily,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          borderColor: '#F5A623',
                          color: '#F5A623',
                          '&:hover': {
                            backgroundColor: '#1a1a1a',
                          },
                        },
                      }}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    color="red" 
                    style={{ width: "fit-content" }}
                    onClick={handleDeleteAccount}
                    styles={{
                      root: {
                        fontFamily: GeistMono.style.fontFamily,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        borderColor: '#FF4F56',
                        color: '#FF4F56',
                        '&:hover': {
                          backgroundColor: '#1a1a1a',
                        },
                      },
                    }}
                  >
                    Delete Account
                  </Button>
                </Stack>
              </Box>
            )}
          </Box>
        </Paper>
      </Box>

      <Modal
        opened={isUpgradeModalOpen}
        onClose={() => !isSubscriptionLoading && setIsUpgradeModalOpen(false)}
        title="UPGRADE YOUR PLAN"
        centered
        styles={{
          header: { backgroundColor: '#000000', color: '#ffffff', borderBottom: '1px solid #2b2b2b' },
          body: { backgroundColor: '#0a0a0a', color: '#ffffff', paddingTop: 5 },
          content: { backgroundColor: '#0a0a0a', border: '1px solid #2b2b2b' },
          title: { fontFamily: GeistMono.style.fontFamily, textTransform: 'uppercase', letterSpacing: '0.5px' },
          close: { color: '#ffffff' },
        }}
        closeOnClickOutside={!isSubscriptionLoading}
        closeOnEscape={!isSubscriptionLoading}
      >
        <LoadingOverlay visible={isSubscriptionLoading} overlayProps={{ blur: 2 }} />
        
        {selectedPlanId && (
          <Box>
            <Text size="sm" mb="md" style={{ fontFamily: GeistMono.style.fontFamily }}>
              You are about to upgrade to the {plans.find(p => p._id === selectedPlanId)?.name} plan.
            </Text>
            
            <Stack gap="sm" mb="xl">
              <Group justify="apart">
                <Text style={{ fontFamily: GeistMono.style.fontFamily }}>Plan:</Text>
                <Text fw={500} style={{ fontFamily: GeistMono.style.fontFamily }}>{plans.find(p => p._id === selectedPlanId)?.name}</Text>
              </Group>
              
              <Group justify="apart">
                <Text style={{ fontFamily: GeistMono.style.fontFamily }}>Billing:</Text>
                <Text fw={500} style={{ fontFamily: GeistMono.style.fontFamily }}>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</Text>
              </Group>
              
              <Group justify="apart">
                <Text style={{ fontFamily: GeistMono.style.fontFamily }}>Price:</Text>
                <Text fw={500} style={{ fontFamily: GeistMono.style.fontFamily }}>
                  {billingCycle === 'monthly' 
                    ? formatPrice(plans.find(p => p._id === selectedPlanId)?.monthlyPrice || 0) + '/month'
                    : formatPrice(plans.find(p => p._id === selectedPlanId)?.yearlyPrice || 0) + '/year'}
                </Text>
              </Group>
              
              <Divider my="sm" style={{ borderColor: '#2b2b2b' }} />
              
              <Group justify="apart">
                <Text style={{ fontFamily: GeistMono.style.fontFamily }}>Jobs per month:</Text>
                <Text fw={500} style={{ fontFamily: GeistMono.style.fontFamily }}>{formatFeature(plans.find(p => p._id === selectedPlanId)?.jobsPerMonth || 0)}</Text>
              </Group>
              
              <Group justify="apart">
                <Text style={{ fontFamily: GeistMono.style.fontFamily }}>Processing time:</Text>
                <Text fw={500} style={{ fontFamily: GeistMono.style.fontFamily }}>{formatTimeLimit(plans.find(p => p._id === selectedPlanId)?.processingTimeLimit || 0)}</Text>
              </Group>
            </Stack>
            
            <Group justify="right" mt="xl">
              <Button 
                variant="outline" 
                onClick={() => setIsUpgradeModalOpen(false)}
                disabled={isSubscriptionLoading}
                styles={{
                  root: {
                    fontFamily: GeistMono.style.fontFamily,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderColor: '#2B2B2B',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: '#1a1a1a',
                    },
                  },
                }}
              >
                Cancel
              </Button>
              <Button 
                leftSection={<CreditCard size={16} />} 
                onClick={handleUpgradePlan}
                loading={isSubscriptionLoading}
                styles={{
                  root: {
                    fontFamily: GeistMono.style.fontFamily,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: '#F5A623',
                    color: '#000000',
                    '&:hover': {
                      backgroundColor: '#E09612',
                    },
                  },
                }}
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