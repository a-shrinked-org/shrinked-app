// app/settings/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  subscription?: {
    id: string;
    planId: string;
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
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

  // Define fetchUsageData as a useCallback function so it can be used in useEffect
  const fetchUsageData = useCallback(async (subscriptionId: string) => {
    try {
      const usageResponse = await fetch(`/api/usage-proxy/${subscriptionId}/jobs`, {
        headers: authUtils.getAuthHeaders(),
      });
      
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        // Update usage state with real data
        setUsage(prev => ({
          ...prev,
          jobs: {
            used: usageData.used || 0,
            limit: usageData.limit || prev.jobs.limit
          }
        }));
      }
    } catch (error) {
      console.error("Error fetching usage data:", error);
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

  // Find current plan based on subscription
  const currentPlan = plans.find(plan => 
    profile?.subscription?.planId === plan._id
  ) || plans.find(plan => plan.name === "FREE") || null;

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

  // Handle plan upgrade
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
      setIsLoading(true);
      
      // Here you would implement the actual plan upgrade logic
      // This would typically involve calling your subscription endpoint
      notifications.show({
        title: "Plan Upgrade",
        message: "Redirecting to payment portal...",
        color: "blue",
      });
      
      // Mock implementation - in reality, you would redirect to a payment page or Stripe checkout
      setTimeout(() => {
        setIsUpgradeModalOpen(false);
        setIsLoading(false);
        
        notifications.show({
          title: "Success",
          message: "Subscription updated successfully",
          color: "green",
        });
        
        // Update local state
        if (profile && selectedPlanId) {
          const newPlan = plans.find(p => p._id === selectedPlanId);
          if (newPlan) {
            setProfile({
              ...profile,
              subscription: {
                ...profile.subscription || { id: 'new-sub-id', status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: '' },
                planId: selectedPlanId
              }
            });
          }
        }
      }, 2000);
    } catch (error) {
      console.error("Error upgrading plan:", error);
      notifications.show({
        title: "Error",
        message: "Failed to upgrade plan",
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

  return (
    <Box p="xl" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 2 }} />
      
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
        <Group position="center" mb="lg">
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
          {plans.map((plan) => {
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
                  <Group spacing="xs">
                    <Check size={16} />
                    <Text size="sm">{formatFeature(plan.jobsPerMonth)} jobs/month</Text>
                  </Group>
                  <Group spacing="xs">
                    <Check size={16} />
                    <Text size="sm">{formatTimeLimit(plan.processingTimeLimit)} processing</Text>
                  </Group>
                  <Group spacing="xs">
                    <Check size={16} />
                    <Text size="sm">{plan.exportFormats}</Text>
                  </Group>
                  <Group spacing="xs">
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
                  >
                    Cancel Subscription
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  color="red" 
                  style={{ width: "fit-content" }}
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
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Upgrade Your Plan"
        centered
        styles={{
          title: { fontWeight: 600 },
          body: { paddingTop: 5 },
        }}
      >
        {selectedPlanId && (
          <Box>
            <Text size="sm" mb="md">
              You are about to upgrade to the {plans.find(p => p._id === selectedPlanId)?.name} plan.
            </Text>
            
            <Stack gap="sm" mb="xl">
              <Group position="apart">
                <Text>Plan:</Text>
                <Text fw={500}>{plans.find(p => p._id === selectedPlanId)?.name}</Text>
              </Group>
              
              <Group position="apart">
                <Text>Billing:</Text>
                <Text fw={500}>{billingCycle === 'monthly' ? 'Monthly' : 'Annual'}</Text>
              </Group>
              
              <Group position="apart">
                <Text>Price:</Text>
                <Text fw={500}>
                  {billingCycle === 'monthly' 
                    ? formatPrice(plans.find(p => p._id === selectedPlanId)?.monthlyPrice || 0) + '/month'
                    : formatPrice(plans.find(p => p._id === selectedPlanId)?.yearlyPrice || 0) + '/year'}
                </Text>
              </Group>
              
              <Divider my="sm" />
              
              <Group position="apart">
                <Text>Jobs per month:</Text>
                <Text fw={500}>{formatFeature(plans.find(p => p._id === selectedPlanId)?.jobsPerMonth || 0)}</Text>
              </Group>
              
              <Group position="apart">
                <Text>Processing time:</Text>
                <Text fw={500}>{formatTimeLimit(plans.find(p => p._id === selectedPlanId)?.processingTimeLimit || 0)}</Text>
              </Group>
            </Stack>
            
            <Group position="right" mt="xl">
              <Button variant="outline" onClick={() => setIsUpgradeModalOpen(false)}>
                Cancel
              </Button>
              <Button leftIcon={<CreditCard size={16} />} onClick={handleUpgradePlan}>
                Confirm Upgrade
              </Button>
            </Group>
          </Box>
        )}
      </Modal>
    </Box>
  );
}