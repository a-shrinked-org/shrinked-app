"use client";

import { useState } from "react";
import { 
  AppShell,
  Burger,
  Group,
  Title,
  Stack,
  NavLink as MantineNavLink,
  Avatar,
  Text,
  Box,
  Container
} from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from "next-auth/react";
import { 
  LayoutDashboard, 
  Briefcase,
  LogOut,
  Files,
  Key,
  Calendar
} from 'lucide-react';
import { CanAccess, useGetIdentity, useLogout } from "@refinedev/core";
import { authUtils } from "@/utils/authUtils";
// Import IconWrapper from the utils file
import { IconWrapper } from '@/utils/ui-utils';
import { DefaultMetadata } from '@/components/DefaultMetadata';

interface Identity {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  username?: string;
}

export const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [opened, setOpened] = useState(true);
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<Identity>();

  // Use either session or custom auth identity
  const userInfo = {
    name: session?.user?.name || identity?.name || identity?.username,
    email: session?.user?.email || identity?.email,
    avatar: session?.user?.image || identity?.avatar,
  };

  // Generate initials from the user's name or email
  const getInitials = () => {
    if (userInfo.name) {
      const nameParts = userInfo.name.split(' ');
      if (nameParts.length > 1) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return userInfo.name.substring(0, 2).toUpperCase();
    } else if (userInfo.email) {
      return userInfo.email.substring(0, 2).toUpperCase();
    }
    return 'UN'; // Unknown
  };

  const handleLogout = () => {
    if (session) {
      signOut();
    } else {
      // Use centralized auth utilities to clear storage
      authUtils.clearAuthStorage();
      logout();
    }
  };

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard,
      href: '/',
      resource: "dashboard" 
    },
    { 
      label: 'Jobs', 
      icon: Briefcase,
      href: '/jobs',
      resource: "jobs" 
    },
    { 
      label: 'docStore', 
      icon: Files,
      href: '/output',
      resource: "output" 
    },
    { 
      label: 'API Keys', 
      icon: Key,
      href: '/api-keys',
      resource: "api-keys" 
    },
    { 
      label: 'Scheduled', 
      icon: Calendar,
      href: '/scheduled',
      resource: "scheduled" 
    },
  ];

  return (
  <>
    <DefaultMetadata />
    <AppShell
      navbar={{ 
        width: 300, 
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding="md"
    >
      {/* Remove the AppShell.Header completely */}
      
      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <Stack>
            {/* Add logo at the top of sidebar */}
            <Box p="md" mb="md">
              <Group align="center">
                {/* Mobile menu toggle */}
                <Burger 
                  opened={opened} 
                  onClick={() => setOpened(!opened)} 
                  size="sm"
                  hiddenFrom="sm"
                />
                <Title order={3}>Shrinked</Title>
              </Group>
            </Box>
            
            {menuItems.map((item) => (
              <CanAccess key={item.href} resource={item.resource} action="list">
                <MantineNavLink
                  label={item.label}
                  leftSection={<IconWrapper icon={item.icon} size={19} />}
                  active={pathname === item.href || pathname?.startsWith(item.href + '/')}
                  onClick={() => router.push(item.href)}
                />
              </CanAccess>
            ))}
          </Stack>

          <Stack>
            <Box p="xs">
              <Group>
                <Avatar 
                  src={userInfo.avatar} 
                  radius="xl" 
                  size="md"
                  color="blue"
                  alt={userInfo.name || userInfo.email || 'User'}
                >
                  {getInitials()}
                </Avatar>
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {userInfo.name || userInfo.email || 'User'}
                  </Text>
                  {userInfo.email && (
                    <Text size="xs" c="dimmed">
                      {userInfo.email}
                    </Text>
                  )}
                </Stack>
              </Group>
            </Box>
            
            <MantineNavLink
              label="Logout"
              leftSection={<IconWrapper icon={LogOut} size={19} />}
              onClick={handleLogout}
              color="red"
            />
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size={1200} px="md">
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
};