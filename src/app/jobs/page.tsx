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
import { 
  Eye, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react';
// Import only useAuth and API_CONFIG
import { useAuth, API_CONFIG } from "@/utils/authUtils";

// [Status helper functions remain unchanged]

export default function JobList() {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { data: identity } = useGetIdentity<Identity>();
  const { edit, show, create } = useNavigation();
  
  // Use enhanced useAuth hook
  const { getAuthHeaders, refreshToken, fetchWithAuth } = useAuth();

  // [columns definition remains unchanged]

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
            // Attempt to refresh token using the hook
            refreshToken().then(success => {
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
        headers: identity?.token ? getAuthHeaders() : undefined
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
      // Use fetchWithAuth to make the request
      const response = await fetchWithAuth(`${API_CONFIG.API_URL}/health`);
      const status = await response.text();
      setStatusResult(status || "Service is operational.");
    } catch (error) {
      console.error("Error checking status:", error);
      setStatusResult(error instanceof Error ? error.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth]);

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