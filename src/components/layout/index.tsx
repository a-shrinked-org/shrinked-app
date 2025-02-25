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
  IconLayoutDashboard, 
  IconBriefcase, 
  IconCategory, 
  IconLogout,
  IconFiles,
  IconKey
} from '@tabler/icons-react';
import { CanAccess, useGetIdentity, useLogout } from "@refinedev/core";
import { Breadcrumb } from "../breadcrumb";

interface Identity {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
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
    name: session?.user?.name || identity?.name,
    email: session?.user?.email || identity?.email,
    avatar: session?.user?.image || identity?.avatar,
  };

  const handleLogout = () => {
    if (session) {
      signOut();
    } else {
      logout();
    }
  };

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: IconLayoutDashboard,
      href: '/',
      resource: "dashboard" 
    },
    { 
      label: 'Jobs', 
      icon: IconBriefcase,
      href: '/jobs',
      resource: "jobs" 
    },
    { 
      label: 'Files', 
      icon: IconFiles,
      href: '/output',
      resource: "output" 
    },
    { 
      label: 'API Keys', 
      icon: IconKey,
      href: '/api-keys',
      resource: "api-keys" 
    },
    { 
      label: 'Categories', 
      icon: IconCategory,
      href: '/categories',
      resource: "categories" 
    },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ 
        width: 300, 
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger 
              opened={opened} 
              onClick={() => setOpened(!opened)} 
              size="sm"
              hiddenFrom="sm"
            />
            <Title order={3}>Shrinked</Title>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <Stack>
            {menuItems.map((item) => (
              <CanAccess key={item.href} resource={item.resource} action="list">
                <MantineNavLink
                  label={item.label}
                  leftSection={<item.icon size="1.2rem" stroke={1.5} />}
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
                />
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {userInfo.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {userInfo.email}
                  </Text>
                </Stack>
              </Group>
            </Box>
            
            <MantineNavLink
              label="Logout"
              leftSection={<IconLogout size="1.2rem" stroke={1.5} />}
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