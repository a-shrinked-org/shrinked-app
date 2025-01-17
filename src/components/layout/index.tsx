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
  useMantineTheme,
  Box
} from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from "next-auth/react";
import { 
  IconLayoutDashboard, 
  IconBriefcase, 
  IconCategory, 
  IconLogout 
} from '@tabler/icons-react';
import { CanAccess } from "@refinedev/core";
import { Breadcrumb } from "../breadcrumb";

export const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [opened, setOpened] = useState(true);
  const pathname = usePathname();
  const { data: session } = useSession();
  const theme = useMantineTheme();
  const router = useRouter();

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
            <Title order={3}>Refine App</Title>
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
                  active={pathname === item.href}
                  onClick={() => router.push(item.href)}
                />
              </CanAccess>
            ))}
          </Stack>

          <Stack>
            <Box p="xs">
              <Group>
                <Avatar 
                  src={session?.user?.image} 
                  radius="xl" 
                  size="md"
                />
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {session?.user?.name}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {session?.user?.email}
                  </Text>
                </Stack>
              </Group>
            </Box>
            
            <MantineNavLink
              label="Logout"
              leftSection={<IconLogout size="1.2rem" stroke={1.5} />}
              onClick={() => signOut()}
              color="red"
            />
          </Stack>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack>
          <Breadcrumb />
          {children}
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
};
