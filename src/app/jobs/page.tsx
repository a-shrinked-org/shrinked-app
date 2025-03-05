"use client";

import { useNavigation, useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef, flexRender } from "@tanstack/react-table";
import React, { useState, useCallback, useEffect } from "react";
import { 
  Table, 
  Button, 
  Group, 
  Title, 
  Box,
  Select,
  Stack,
  Modal,
  Text,
  LoadingOverlay,
  Badge,
  Alert
} from '@mantine/core';
// Replace Tabler icons with Lucide icons
import { 
  Eye, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';
// Import centralized auth utilities
import { authUtils, API_CONFIG } from "@/utils/authUtils";

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

interface Job {
  _id: string;
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  link: string;
  status: string;
  createdAt: string;
}

// Status helper functions
const getStatusColor = (status: string) => {
  if (!status) return 'gray';
  
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'completed':
      return 'green';
    case 'in_progress':
    case 'processing':
      return 'blue';
    case 'failed':
    case 'error':
      return 'red';
    case 'pending':
    case 'queued':
      return 'yellow';
    default:
      return 'gray';
  }
};

const formatScenarioName = (scenario: string) => {
  if (!scenario) return 'Unknown';
  
  // Check for "Single File Default" scenario
  if (scenario.includes('SINGLE_FILE_DEFAULT')) {
    return (
      <Group gap={8} align="center">
        <Box style={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          backgroundColor: '#7048E8',
          flexShrink: 0
        }} />
        <Text size="sm">Default</Text>
      </Group>
    );
  }
  
  // Legacy check for PLATOGRAM scenario
  if (scenario.includes('PLATOGRAM')) {
    return (
      <Group gap={8} align="center">
        <Box style={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          backgroundColor: '#7048E8',
          flexShrink: 0
        }} />
        <Text size="sm">Default</Text>
      </Group>
    );
  }
  
  // Format other scenario names
  return scenario.replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format status text for display
const formatStatusText = (status: string) => {
  if (!status) return 'Unknown';
  
  return status.toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function JobList() {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // New error state
  
  const { data: identity } = useGetIdentity<Identity>();
  const { edit, show, create } = useNavigation();

  const columns = React.useMemo<ColumnDef<Job>[]>(
    () => [
      {
        id: "jobInfo",
        header: "NAME",
        size: 300,
        cell: function render({ row }) {
          return (
            <Stack gap={4} style={{ padding: '4px 0' }}>
              <Text size="sm" style={{ fontWeight: 500 }}>{row.original.jobName}</Text>
              <Text size="xs" c="dimmed" style={{ letterSpacing: '0.2px' }}>
                ID: {row.original._id.substring(0, 8)}...
              </Text>
            </Stack>
          );
        }
      },
      {
        id: "status",
        accessorKey: "status",
        header: "STATUS",
        size: 200,
        cell: function render({ getValue }) {
          const status = getValue<string>();
          return (
            <Badge 
              color={getStatusColor(status)} 
              variant="light" 
              size="lg"
              style={{
                padding: '6px 12px',
                textTransform: 'capitalize'
              }}
            >
              {formatStatusText(status)}
            </Badge>
          );
        }
      },
      {
        id: "scenario",
        accessorKey: "scenario",
        header: "LOGIC",
        size: 150,
        cell: function render({ getValue }) {
          const scenario = getValue<string>();
          return formatScenarioName(scenario);
        }
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "CREATED AT",
        size: 120,
        cell: function render({ getValue }) {
          const date = new Date(getValue<string>());
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
          }).format(date);
        }
      },
      {
        id: "isPublic",
        accessorKey: "isPublic",
        header: "PUBLIC",
        size: 100,
        cell: function render({ getValue }) {
          const isPublic = getValue<boolean>();
          return (
            <Badge color={isPublic ? "green" : "gray"} variant="light">
              {isPublic ? "Yes" : "No"}
            </Badge>
          );
        }
      },
      {
        id: "createPage",
        accessorKey: "createPage",
        header: "PAGE",
        size: 100,
        cell: function render({ getValue }) {
          const createPage = getValue<boolean>();
          return (
            <Badge color={createPage ? "green" : "gray"} variant="light">
              {createPage ? "Yes" : "No"}
            </Badge>
          );
        }
      }
    ],
    []
  );

  const {
    getHeaderGroups,
    getRowModel,
    refineCore,
    getState,
    setPageIndex,
    getCanPreviousPage,
    getPageCount,
    getCanNextPage,
    nextPage,
    previousPage,
    setPageSize,
  } = useTable<Job>({
    columns,
    refineCoreProps: {
      resource: "jobs",
      queryOptions: {
        enabled: !!identity?.token,
        onSuccess: (data) => {
          setError(null); // Clear any previous errors on success
          console.log("Table query success:", data);
        },
        onError: (error) => {
          console.error("Table query error:", error);
          
          // Enhanced error handling with different error types
          if (!navigator.onLine) {
            setError("You appear to be offline. Please check your internet connection.");
          } else if (error.status === 521 || error.status === 522 || error.status === 523) {
            setError("The server is currently unreachable. Please try again later.");
          } else if (error.status === 401 || error.status === 403) {
            setError("Authentication error. Please log in again.");
            // Attempt to refresh token
            authUtils.refreshToken().then(success => {
              if (success && refineCore.tableQueryResult?.refetch) {
                refineCore.tableQueryResult.refetch(); // Retry the request if token refresh was successful
              }
            });
          } else {
            setError(`Error loading jobs: ${error.message || "Unknown error"}`);
          }
        }
      },
      meta: {
        headers: identity?.token ? {
          'Authorization': `Bearer ${authUtils.getAccessToken() || identity.token}`
        } : undefined
      }
    }
  });

  // Extract data after we've handled the hooks setup
  const tableData = refineCore.tableQueryResult.data;

  // Log table data for debugging
  useEffect(() => {
    console.log("Current table data:", tableData);
  }, [tableData]);

  // Use centralized status check function
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setStatusResult(null);
    setIsStatusModalOpen(true);
    
    try {
      const status = await authUtils.checkServiceStatus();
      setStatusResult(status);
    } catch (error) {
      console.error("Error checking status:", error);
      setStatusResult(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Loading state
  if (!identity?.token) {
    return (
      <Box p="md">
        <LoadingOverlay visible />
        <Text>Loading authentication...</Text>
      </Box>
    );
  }

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Title order={2}>Jobs List</Title>
        <Group>
          <Button variant="light" onClick={checkStatus} leftSection={<Info size={16} />}>
            Check Server Status
          </Button>
          <Button onClick={() => create("jobs")}>
            Create Job
          </Button>
        </Group>
      </Group>

      {/* Display errors if any */}
      {error && (
        <Alert 
          icon={<AlertCircle size={16} />} 
          title="Error" 
          color="red" 
          onClose={() => setError(null)}
          withCloseButton
        >
          {error}
        </Alert>
      )}

      <Box style={{ overflowX: 'auto', position: 'relative' }}>
        <LoadingOverlay visible={isLoading} />
        <Table highlightOnHover>
          <Table.Thead>
            {getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th 
                    key={header.id}
                    style={{ 
                      background: 'none',
                      fontWeight: 500,
                      color: '#666',
                      padding: '12px 16px',
                      textTransform: 'uppercase',
                      fontSize: '12px'
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {getRowModel().rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length} align="center" p="xl">
                  <Text c="dimmed">No jobs found. Create a new job to get started.</Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              getRowModel().rows.map((row) => (
                <Table.Tr 
                  key={row.id}
                  onClick={() => show("jobs", row.original._id)}
                  style={{ cursor: 'pointer' }}
                  className="hover:bg-gray-100 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Box>

      <Group justify="center" gap="xs">
        <Button
          variant="light"
          disabled={!getCanPreviousPage()}
          onClick={() => previousPage()}
          leftSection={<ChevronLeft size={18} />}
        >
          Previous
        </Button>
        <Text>
          Page{' '}
          <strong>
            {getState().pagination.pageIndex + 1} of {getPageCount() || 1}
          </strong>
        </Text>
        <Button
          variant="light"
          disabled={!getCanNextPage()}
          onClick={() => nextPage()}
          rightSection={<ChevronRight size={18} />}
        >
          Next
        </Button>
        <Select
          value={getState().pagination.pageSize.toString()}
          onChange={(value) => setPageSize(Number(value))}
          data={['10', '20', '30', '40', '50'].map((size) => ({
            value: size,
            label: `${size} records per page`,
          }))}
        />
      </Group>

      {/* Status check modal with improved error handling */}
      <Modal
        opened={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Server Status"
      >
        {isLoading ? (
          <Box style={{ position: 'relative', height: '100px' }}>
            <LoadingOverlay visible />
          </Box>
        ) : (
          <>
            {statusResult ? (
              <Text style={{ whiteSpace: 'pre-line' }}>{statusResult}</Text>
            ) : (
              <Text>No status information available.</Text>
            )}
            <Button 
              mt="md" 
              leftSection={<RefreshCw size={16} />}
              onClick={checkStatus}
              loading={isLoading}
            >
              Refresh Status
            </Button>
          </>
        )}
      </Modal>
    </Stack>
  );
}