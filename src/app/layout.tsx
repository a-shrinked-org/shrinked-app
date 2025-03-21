"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefineContext } from './_refine_context';
import { MantineProvider, createTheme, ColorSchemeScript, Text, Button, Stack, Group } from '@mantine/core';
import '@mantine/core/styles.css';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { HelmetProvider, Helmet } from 'react-helmet-async';
import { IconWrapper } from '@/utils/ui-utils';
// Import Geist fonts
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { GradientLoader } from "@/components/GradientLoader";

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }, { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }> {
  constructor(props: { children: ReactNode, fallback?: ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <Stack gap="md" p="xl" style={{ 
          maxWidth: 600, 
          margin: '0 auto', 
          background: '#1a1a1a', 
          borderRadius: 8, 
          padding: 24,
          marginTop: 40
        }}>
          <Group align="flex-start">
            <IconWrapper icon={AlertCircle} size={24} color="#fa5252" />
            <Text size="xl" fw={600} color="white">Something went wrong</Text>
          </Group>
          
          <Text c="gray.4">
            We encountered an error while rendering this page. This could be due to a temporary issue or a bug in our application.
          </Text>
          
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <div style={{ 
              background: '#101010', 
              padding: 16, 
              borderRadius: 4, 
              overflow: 'auto',
              maxHeight: 300
            }}>
              <Text c="red.4" size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {this.state.error.toString()}
              </Text>
              {this.state.errorInfo && (
                <Text c="gray.6" size="xs" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </div>
          )}
          
          <Group>
            <Button 
              leftSection={<IconWrapper icon={RefreshCw} size={16} />}
              onClick={this.handleReload}
              style={{ background: '#228be6' }}
            >
              Reload page
            </Button>
            <Button 
              variant="outline" 
              onClick={this.handleGoBack}
              style={{ borderColor: 'gray', color: 'white' }}
            >
              Go back
            </Button>
          </Group>
        </Stack>
      );
    }

    return this.props.children;
  }
}

const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
    blue: [
      '#e6f3ff',
      '#cce3ff',
      '#99c2ff',
      '#66a1ff',
      '#3380ff',
      '#005fff',
      '#0044cc',
      '#003399',
      '#002266',
      '#001133'
    ],
  },
  white: '#fff',
  black: '#1A1B1E',
  
  // Update the font families in the theme
  fontFamily: GeistSans.style.fontFamily,
  fontFamilyMonospace: GeistMono.style.fontFamily,
  headings: {
    fontFamily: GeistSans.style.fontFamily,
  },
  
  components: {
    AppShell: {
      styles: {
        main: {
          backgroundColor: 'var(--mantine-color-dark-9)',
        }
      }
    },
    Button: {
      defaultProps: {
        color: 'blue',
        variant: 'filled',
      },
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-dark-8)',
          color: 'var(--mantine-color-white)',
          '&:hover': {
            backgroundColor: 'var(--mantine-color-blue-7)',
          },
          // Apply Geist Mono to buttons
          fontFamily: GeistMono.style.fontFamily,
        },
      },
    },
    Paper: {
      defaultProps: {
        bg: 'dark.7',
      },
    },
    ActionIcon: {
      defaultProps: {
        color: 'blue',
      },
      styles: {
        root: {
          color: 'var(--mantine-color-white)',
        },
      },
    },
    Input: {
      styles: {
        input: {
          backgroundColor: 'var(--mantine-color-dark-7)',
          color: 'var(--mantine-color-white)',
          borderColor: 'var(--mantine-color-dark-4)',
          '&:focus': {
            borderColor: 'var(--mantine-color-blue-6)',
          },
          // Apply Geist Mono to inputs
          fontFamily: GeistMono.style.fontFamily,
        },
      },
    },
    Table: {
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-dark-7)',
          color: 'var(--mantine-color-white)',
        },
        th: {
          backgroundColor: 'var(--mantine-color-dark-6)',
          color: 'var(--mantine-color-white)',
          // Apply Geist Mono to table headers
          fontFamily: GeistMono.style.fontFamily,
        },
        td: {
          color: 'var(--mantine-color-white)',
          // Apply Geist Mono to table cells
          fontFamily: GeistMono.style.fontFamily,
        },
      },
    },
    Text: {
      styles: {
        root: {
          // Apply Geist Mono to text components
          fontFamily: GeistMono.style.fontFamily,
        }
      }
    },
  },
});

function LoadingFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: 'var(--mantine-color-dark-9)',
      color: '#fff',
      fontFamily: GeistMono.style.fontFamily,
    }}>
      <GradientLoader width={300} height={4} />
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use a HelmetProvider to manage metadata
  const helmetContext = {};

  return (
    <html lang="en" data-mantine-color-scheme="dark" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <ColorSchemeScript forceColorScheme="dark" />
        <meta name="color-scheme" content="dark" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Fix for SVG width/height "rem" attributes */}
        <style dangerouslySetInnerHTML={{ 
          __html: `
            /* Fix SVG width/height rem values */
            svg[width$="rem"], svg[height$="rem"] {
              width: 1em;
              height: 1em;
            }
            
            /* Scale based on common rem values */
            svg[width="1.2rem"], svg[height="1.2rem"] {
              width: 1.2em;
              height: 1.2em;
            }
            
            svg[width="1.5rem"], svg[height="1.5rem"] {
              width: 1.5em;
              height: 1.5em;
            }
            
            svg[width="2rem"], svg[height="2rem"] {
              width: 2em;
              height: 2em;
            }
            
            /* Add CSS variables for Geist fonts */
            :root {
              --font-geist-sans: ${GeistSans.style.fontFamily};
              --font-geist-mono: ${GeistMono.style.fontFamily};
            }
          `
        }} />
      </head>
      <body style={{ 
        backgroundColor: 'var(--mantine-color-dark-9)', 
        color: '#fff',
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        fontFamily: GeistMono.style.fontFamily,
      }}>
        <HelmetProvider context={helmetContext}>
          {/* Define metadata using Helmet */}
          <Helmet>
            <title>Shrinked.ai - Turn conversations into structured data</title>
            <meta name="description" content="Convert any audio or video into structured documents through our intuitive editor. Make your context private or public, collaborate with teammates, and access original sources directly." />
            <link rel="icon" href="/favicon.ico" />
          </Helmet>
          
          <MantineProvider 
            theme={theme} 
            forceColorScheme="dark"
          >
            <ErrorBoundary>
              <RefineContext>{children}</RefineContext>
            </ErrorBoundary>
          </MantineProvider>
        </HelmetProvider>
      </body>
    </html>
  );
}