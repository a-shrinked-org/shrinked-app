"use client";

import { useNavigation, useGetIdentity } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef, flexRender } from "@tanstack/react-table";
import React, { useState, useCallback } from "react";
import { 
  Table, 
  Button, 
  Group, 
  Title, 
  Box,
  Select,
  NumberInput,
  Stack,
  ActionIcon,
  Modal,
  Text,
  LoadingOverlay,
  Badge
} from '@mantine/core';
import { IconEye, IconEdit, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface Identity {
  token?: string;
  email?: string;
  name?: string;
}

interface Job {
  id: string;
  jobName: string;
  scenario: string;
  lang: string;
  isPublic: boolean;
  createPage: boolean;
  link: string;
  status: string;
  createdAt: string;
}

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'green';
    case 'in_progress':
      return 'blue';
    case 'failed':
      return 'red';
    default:
      return 'gray';
  }
};

export default function JobList() {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: identity } = useGetIdentity<Identity>();
  const { edit, show, create } = useNavigation();
  
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setIsStatusModalOpen(true);
    
    try {
      const [sandboxResponse, prodResponse] = await Promise.all([
        fetch("https://sandbox.temporary.name/status", {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${identity?.token}`,
            'Content-Type': 'application/json'
          },
        }),
        fetch("https://temporary.name/status", {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${identity?.token}`,
            'Content-Type': 'application/json'
          },
        })
      ]);
  
      let combinedStatus = "";
  
      if (sandboxResponse.status === 502) {
        combinedStatus += "Sandbox: Server is under maintenance.\n";
      } else if (!sandboxResponse.ok) {
        combinedStatus += `Sandbox: Error ${sandboxResponse.status}\n`;
      } else {
        const sandboxResult = await sandboxResponse.json();
        combinedStatus += `Sandbox: ${sandboxResult.status}\n`;
      }
  
      if (prodResponse.status === 502) {
        combinedStatus += "Production: Server is under maintenance.";
      } else if (!prodResponse.ok) {
        combinedStatus += `Production: Error ${prodResponse.status}`;
      } else {
        const prodResult = await prodResponse.json();
        combinedStatus += `Production: ${prodResult.status}`;
      }
  
      setStatusResult(combinedStatus);
    } catch (error) {
      console.error("Error checking status:", error);
      setStatusResult(`Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [identity?.token]);
  
  const columns = React.useMemo<ColumnDef<Job>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "ID",
        size: 100,
      },
      {
        id: "jobName",
        accessorKey: "jobName",
        header: "Job Name",
      },
      {
        id: "scenario",
        accessorKey: "scenario",
        header: "Scenario",
        cell: function render({ getValue }) {
          const scenario = getValue<string>();
          return scenario?.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      },
      {
        id: "lang",
        accessorKey: "lang",
        header: "Language",
        size: 100,
        cell: function render({ getValue }) {
          const lang = getValue<string>();
          const langMap: Record<string, string> = {
            'en': 'English',
            'uk': 'Ukrainian',
          };
          return langMap[lang] || lang;
        }
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        size: 120,
        cell: function render({ getValue }) {
          const status = getValue<string>();
          return (
            <Badge color={getStatusColor(status)} variant="light">
              {status?.toLowerCase()
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
            </Badge>
          );
        }
      },
      {
        id: "isPublic",
        accessorKey: "isPublic",
        header: "Public",
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
        header: "Page",
        size: 100,
        cell: function render({ getValue }) {
          const createPage = getValue<boolean>();
          return (
            <Badge color={createPage ? "green" : "gray"} variant="light">
              {createPage ? "Yes" : "No"}
            </Badge>
          );
        }
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created At",
        cell: function render({ getValue }) {
          return new Date(getValue<string>()).toLocaleString(undefined, {
            timeZone: "UTC",
          });
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Actions",
        size: 100,
        cell: function render({ row }) {  // Change from getValue to row to access all row data
          const id = row.original.id;  // Get ID directly from the row data
          return (
            <Group gap="xs">
              <ActionIcon
                variant="default"
                onClick={() => show("jobs", id)}  // Pass the ID directly
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                onClick={() => edit("jobs", id)}  // Pass the ID directly
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Group>
          );
        },
      },
    ],
    [edit, show]
  );

  const {
    getHeaderGroups,
    getRowModel,
    setOptions,
    refineCore: { tableQueryResult: { data: tableData } },
    getState,
    setPageIndex,
    getCanPreviousPage,
    getPageCount,
    getCanNextPage,
    nextPage,
    previousPage,
    setPageSize,
  } = useTable<Job>({  // Add Job type here
    columns,
    refineCoreProps: {
      resource: "jobs",  // Add resource explicitly
      meta: {
        headers: {
          'Authorization': `Bearer ${identity?.token}`
        }
      }
    }
  });

  return (
    <Stack gap="md" p="md">
      <Modal
        opened={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Conversion Status"
        size="md"
      >
        <LoadingOverlay visible={isLoading} />
        <Text style={{ whiteSpace: 'pre-line' }}>{statusResult || 'Checking status...'}</Text>
      </Modal>
  
      <Group justify="space-between">
        <Title order={2}>Jobs List</Title>
        <Group>
          <Button 
            variant="light" 
            color="blue" 
            onClick={checkStatus}
            loading={isLoading}
            disabled={!identity?.token}
          >
            Check Conversion Status
          </Button>
          <Button onClick={() => create("jobs")}>Create Job</Button>
        </Group>
      </Group>

      <Box style={{ overflowX: 'auto' }}>
        <Table highlightOnHover>
          <Table.Thead>
            {getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.Th key={header.id}>
                    {!header.isPlaceholder &&
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {getRowModel().rows.map((row) => (
              <Table.Tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      <Group justify="space-between">
        <Group>
          <Button
            variant="default"
            size="sm"
            onClick={() => setPageIndex(0)}
            disabled={!getCanPreviousPage()}
            leftSection={<IconChevronLeft size={14} />}
          >
            First
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => previousPage()}
            disabled={!getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => nextPage()}
            disabled={!getCanNextPage()}
          >
            Next
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setPageIndex(getPageCount() - 1)}
            disabled={!getCanNextPage()}
            rightSection={<IconChevronRight size={14} />}
          >
            Last
          </Button>
        </Group>

        <Group>
          <Group gap="xs" align="center">
            <Text>Page</Text>
            <Text fw={700}>
              {getState().pagination.pageIndex + 1} of {getPageCount()}
            </Text>
          </Group>
          <Group gap="xs" align="center">
            <Text>Go to page:</Text>
            <NumberInput
              size="xs"
              w={70}
              min={1}
              max={getPageCount()}
              defaultValue={getState().pagination.pageIndex + 1}
              onChange={(value) => {
                const page = value ? Number(value) - 1 : 0;
                setPageIndex(page);
              }}
            />
          </Group>
          <Select
            size="xs"
            w={130}
            value={getState().pagination.pageSize.toString()}
            onChange={(value) => {
              setPageSize(Number(value));
            }}
            data={[10, 20, 30, 40, 50].map((pageSize) => ({
              value: pageSize.toString(),
              label: `Show ${pageSize}`
            }))}
          />
        </Group>
      </Group>
    </Stack>
  );
}