"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { 
  Box, 
  Text, 
  Flex,
  UnstyledButton,
  Avatar,
  Group,
  Progress,
  Stack,
  Burger,
  Drawer
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { usePathname, useRouter } from 'next/navigation';
import { useLogout, useGetIdentity } from "@refinedev/core";
import { GeistMono } from 'geist/font/mono';
import Link from 'next/link';
import { UserAvatar } from '@/components/UserAvatar'; // Import the UserAvatar component

interface Identity {
  id?: string;
  name?: string;
  email?: string;
  avatar?: string;
}

interface CustomLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  label: string;
  href?: string;  // Make href optional so Dashboard can be non-clickable
  active: boolean;
  clickable?: boolean; // New prop to control clickability
}

// Function to format user ID: "67c79e808213b8eb757f6cb1" -> "67c..b1"
const formatUserId = (id?: string): string => {
  if (!id || id.length < 6) return "[number]";
  
  const prefix = id.substring(0, 3);
  const suffix = id.substring(id.length - 2);
  return `${prefix}..${suffix}`;
};

const CustomLayout: React.FC<CustomLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { mutate: logout } = useLogout();
  const { data: identity } = useGetIdentity<Identity>();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Format the user ID
  const formattedUserId = formatUserId(identity?.id);

  const menuItems: MenuItem[] = [
    { 
      label: 'Dashboard', 
      active: pathname === '/',
      clickable: false // Make Dashboard non-clickable
    },
    { 
      label: 'JOB LIST', 
      href: '/jobs', 
      active: pathname === '/jobs' || (pathname !== null && pathname.startsWith('/jobs/')),
      clickable: true
    },
    { 
      label: 'DOC STORE', 
      href: '/output',
      active: pathname === '/output' || (pathname !== null && pathname.startsWith('/output/')),
      clickable: true
    },
    { 
      label: 'LOGIC', 
      href: '/logic',
      active: pathname === '/logic' || (pathname !== null && pathname.startsWith('/logic/')),
      clickable: true
    },
    { 
      label: 'API KEYS', 
      href: '/api-keys',
      active: pathname === '/api-keys' || (pathname !== null && pathname.startsWith('/api-keys/')),
      clickable: true
    },
    { 
      label: 'SCHEDULED', 
      href: '/scheduled',
      active: pathname === '/scheduled' || (pathname !== null && pathname.startsWith('/scheduled/')),
      clickable: true
    },
  ];

  // Close drawer when path changes on mobile
  useEffect(() => {
    if (isMobile) {
      setDrawerOpened(false);
    }
  }, [pathname, isMobile]);

  const handleNavigation = (href?: string, clickable?: boolean) => {
    if (href && clickable) {
      router.push(href);
      if (isMobile) {
        setDrawerOpened(false);
      }
    }
  };

  const userInfo = {
    name: identity?.name || 'IVAN CHEREPUKHIN',
    email: identity?.email || 'cherepukhin@damn.vc',
    avatar: identity?.avatar,
  };

  const renderSidebar = () => (
    <Box w={316} style={{ 
      borderRight: '1px solid #2b2b2b',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'auto'
    }}>
      <Box p="md">
        {/* Logo with right-aligned ID block */}
        <Flex align="center" justify="space-between" mb="xl">
          <Link href="https://app.shrinked.ai" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
            <Flex align="center" gap="xs" style={{ cursor: 'pointer' }}>
              <svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="17.4857" height="17" rx="2.5" fill="white"/>
                <path d="M14.1058 2.22437L10.9673 5.41664V2.89371H9.70184V6.96987C9.70184 7.32532 9.98513 7.61347 10.3346 7.61347H14.342V6.32626H11.8616L15 3.13399L14.1058 2.22437Z" fill="#0D0D0D"/>
                <path d="M2.40002 7.74933H3.65351V4.56185C3.65351 3.97505 4.12118 3.49936 4.69808 3.49936H7.83179V2.22437H4.69808C3.4289 2.22437 2.40002 3.27089 2.40002 4.56185V7.74933Z" fill="#0D0D0D"/>
                <path d="M14.9553 12.7029V9.51538H13.7018V12.7029C13.7018 13.2897 13.2342 13.7654 12.6573 13.7654H9.52356V15.0403H12.6573C13.2668 15.0403 13.8513 14.7941 14.2822 14.3557C14.7132 13.9173 14.9553 13.3228 14.9553 12.7029Z" fill="#0D0D0D"/>
                <path d="M3.29431 15.0859L6.43273 11.8936V14.4165H7.69822V10.3404C7.69822 9.98493 7.41493 9.69678 7.06548 9.69678H3.05808V10.984H5.53845L2.40002 14.1763L3.29431 15.0859Z" fill="#0D0D0D"/>
              </svg>
              <Text fw={700}>SHRINKED.AI</Text>
            </Flex>
          </Link>
          
          {/* ID text block with dark background */}
          <Box style={{ 
            background: 'black', 
            padding: '4px 15px', 
            borderRadius: '6px',
            textTransform: 'uppercase',
          }}>
            <Text c="#a1a1a1" size="xs">ID: {formattedUserId}</Text>
          </Box>
        </Flex>

        {/* Updated App Description */}
        <Box mb={48}>
          <Text size="xs" c="#d9d9d9" lh={1.3}>
            BUILD WITH SHRINKED.<br />
            DEVELOP DYNAMIC CONTEXT SOURCES<br />
            WITH STRUCTURED DATA, ENABLING<br />
            CITATION FOR AI SYSTEMS<br />
            EXACTLY WHERE IT&apos;S NEEDED.
          </Text>
          <a 
            href="https://shrinked.ai/manifesto" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ textDecoration: 'none' }}
          >
            <Text size="xs" c="#ffffff" mt="xs" style={{ textDecoration: 'underline' }}>
              Learn more
            </Text>
          </a>
        </Box>

        {/* Navigation Menu */}
        <Stack gap="sm" mb={48}>
          {menuItems.map((item) => (
            <UnstyledButton
              key={item.label}
              onClick={() => handleNavigation(item.href, item.clickable)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: item.clickable ? 'pointer' : 'default',
                opacity: item.clickable ? 1 : 0.9,
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
        {/* Updated Documentation link to go to docs.shrinked.ai */}
        <a 
          href="https://docs.shrinked.ai" 
          style={{ textDecoration: 'none' }}
        >
          <Text size="sm" c="#a1a1a1" mb="xs" style={{ cursor: 'pointer' }}>
            DOCUMENTATION
          </Text>
        </a>
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

        {/* User Profile - Updated with UserAvatar */}
        <Flex align="center" gap="xs">
          <Box>
            <Text size="xs">{userInfo.name}</Text>
            <Text size="xs" c="#a1a1a1">{userInfo.email}</Text>
          </Box>
          {/* Updated Avatar section with UserAvatar */}
          <Group ml="auto" gap={-8}>
            <UserAvatar
              name={userInfo.name}
              src={userInfo.avatar}
              size="sm"
              radius="xl"
              className="border-[1px] border-[#2b2b2b]"
            />
          </Group>
        </Flex>
      </Box>
    </Box>
  );

  return (
    <Flex className="h-screen bg-[#000000] text-[#ffffff] overflow-hidden" style={{ fontFamily: GeistMono.style.fontFamily }}>
      {/* Mobile burger menu */}
      {isMobile && (
        <Box 
          pos="fixed" 
          top={16} 
          left={16} 
          style={{ 
            backgroundColor: '#1a1a1a',
            borderRadius: '4px',
            padding: '8px',
            position: 'fixed',
            zIndex: 1000
          }}
        >
          <Burger 
            opened={drawerOpened} 
            onClick={() => setDrawerOpened(!drawerOpened)} 
            color="#ffffff"
            size="sm"
          />
        </Box>
      )}
      
      {/* Render sidebar based on viewport size */}
      {isMobile ? (
        <Drawer
          opened={drawerOpened}
          onClose={() => setDrawerOpened(false)}
          title=""
          padding={0}
          size={316}
          withCloseButton={false}
          styles={{
            body: {
              padding: 0,
              height: '100%',
            },
            content: {
              backgroundColor: '#000000',
            }
          }}
        >
          {renderSidebar()}
        </Drawer>
      ) : (
        renderSidebar()
      )}

      {/* Main Content */}
      <Box style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </Box>
    </Flex>
  );
};

export default CustomLayout;