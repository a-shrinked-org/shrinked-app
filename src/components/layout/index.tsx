"use client";

import React, { ReactNode } from "react";
import { 
  Box, 
  Text, 
  Flex,
  UnstyledButton,
  Avatar,
  Group,
  Progress,
  Stack
} from '@mantine/core';
import { usePathname, useRouter } from 'next/navigation';
import { useLogout, useGetIdentity } from "@refinedev/core";

interface Identity {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
}

interface CustomLayoutProps {
  children: ReactNode;
}

const CustomLayout: React.FC<CustomLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<Identity>();

  const menuItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'JOB LIST', href: '/jobs', active: true },
    { label: 'DOC STORE', href: '/output' },
    { label: 'API KEYS', href: '/api-keys' },
    { label: 'SCHEDULED', href: '/scheduled' },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const userInfo = {
    name: identity?.name || 'IVAN CHEREPUKHIN',
    email: identity?.email || 'cherepukhin@damn.vc',
    avatar: identity?.avatar,
  };

  return (
    <Flex className="h-screen bg-[#000000] text-[#ffffff] overflow-hidden font-mono">
      {/* Sidebar */}
      <Box w={316} style={{ 
        borderRight: '1px solid #2b2b2b',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Box p="md">
          {/* Logo */}
          <Flex align="center" gap="xs" mb="xl">
            <Box w={24} h={24} style={{ 
              border: '1px solid #ffffff', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Text size="xs">◻</Text>
            </Box>
            <Text fw={700}>SHRINKED.AI</Text>
            <Text c="#a1a1a1" ml="md">ID: [number]</Text>
          </Flex>

          {/* Studio Description */}
          <Box mb={48}>
            <Text size="xs" c="#d9d9d9" lh={1.2}>
              FOUNDED BY A DIVERSE GROUP OF<br />
              CREATIVES, WE ARE<br />
              A BROOKLYN-BASED DESIGN STUDIO<br />
              THAT FOCUSES ON<br />
              WHERE BRAND, MARKETING, AND<br />
              DIGITAL PRODUCTS<br />
              COME TOGETHER.
            </Text>
          </Box>

          {/* Navigation Menu */}
          <Stack gap="sm" mb={48}>
            {menuItems.map((item) => (
              <UnstyledButton
                key={item.label}
                onClick={() => handleNavigation(item.href)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {item.active && (
                  <Box w={8} h={8} style={{ 
                    backgroundColor: '#ffffff', 
                    borderRadius: '50%' 
                  }} />
                )}
                <Text 
                  size="sm" 
                  c={item.active ? '#ffffff' : '#a1a1a1'}
                >
                  {item.label}
                </Text>
              </UnstyledButton>
            ))}
          </Stack>
        </Box>

        {/* Bottom Footer Section */}
        <Box mt="auto" style={{ 
          borderTop: '1px solid #2b2b2b',
          padding: '24px',
        }}>
          <Text size="sm" c="#a1a1a1" mb="xs">DOCUMENTATION</Text>
          <Text size="sm" c="#a1a1a1" mb="xl">FEEDBACK</Text>

          {/* Usage Stats */}
          <Box 
            p="md" 
            mb="xl" 
            style={{ 
              backgroundColor: '#0d0d0d', 
              border: '1px solid #2b2b2b',
              borderRadius: '4px',
            }}
          >
            <Text size="xs" mb="xs">BASE PLAN</Text>
            <Flex justify="space-between" mb="xs">
              <Text size="xs">Pages</Text>
              <Text size="xs">40 / 600</Text>
            </Flex>
            <Progress 
              value={6.67} 
              size="xs" 
              color="#f44336"
              styles={{
                root: {
                  backgroundColor: '#2b2b2b',
                },
              }}
            />
            <Text size="xs" c="#a1a1a1" mt="xs">some exampleiner</Text>
          </Box>

          {/* User Profile */}
          <Flex align="center" gap="xs">
            <Box>
              <Text size="xs">{userInfo.name}</Text>
              <Text size="xs" c="#a1a1a1">{userInfo.email}</Text>
            </Box>
            <Group ml="auto" spacing={-8}>
              <Avatar 
                size="sm" 
                radius="xl" 
                bg="#ffffff"
                style={{ border: '1px solid #2b2b2b' }}
              />
              <Avatar 
                size="sm" 
                radius="xl" 
                bg="#a1a1a1"
                style={{ border: '1px solid #2b2b2b' }}
              />
            </Group>
          </Flex>
        </Box>
      </Box>

      {/* Main Content */}
      <Box style={{ flex: 1 }}>
        {children}
      </Box>
    </Flex>
  );
};

export default CustomLayout;