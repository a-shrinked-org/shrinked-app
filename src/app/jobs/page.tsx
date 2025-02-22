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
  
  const checkStatus = useCallback(async () => {
    // ... your existing checkStatus implementation ...
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
            // Add other languages as needed
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
            <Badge color={getStatusColor(status)}>
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
            <Badge color={isPublic ? "green" : "gray"}>
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
            <Badge color={createPage ? "green" : "gray"}>
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
        cell: function render({ getValue }) {
          return (
            <Group gap="xs">
              <ActionIcon
                variant="default"
                onClick={() => show("jobs", getValue() as string)}
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                onClick={() => edit("jobs", getValue() as string)}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Group>
          );
        },
      },
    ],
    []
  );

  const { edit, show, create } = useNavigation();

  const {
    getHeaderGroups,
    getRowModel,
    setOptions,
    refineCore: {
      tableQueryResult: { data: tableData },
    },
    getState,
    setPageIndex,
    getCanPreviousPage,
    getPageCount,
    getCanNextPage,
    nextPage,
    previousPage,
    setPageSize,
  } = useTable({
    columns,
    meta: {
      headers: {
        'Authorization': `Bearer ${identity?.token}`
      }
    }
  });

  return (
  <Stack p="md">
  <Modal
    opened={isStatusModalOpen}
    onClose={() => setIsStatusModalOpen(false)}
    title="Conversion Status"
    size="md"
  >
    <LoadingOverlay visible={isLoading} />
    <Text style={{ whiteSpace: 'pre-line' }}>{statusResult || 'Checking status...'}</Text>
  </Modal>
  
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
    
    export default function JobList() {
      const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
      const [statusResult, setStatusResult] = useState<string | null>(null);
      const [isLoading, setIsLoading] = useState(false);
      
      const { data: identity } = useGetIdentity<Identity>();
      
      const { edit, show, create } = useNavigation();
    
      const columns = React.useMemo<ColumnDef<any>[]>(
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
              return getValue<string>()?.replace(/_/g, ' ').toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            }
          },
          {
            id: "status",
            accessorKey: "status",
            header: "Status",
            cell: function render({ getValue }) {
              const status = getValue<string>();
              const color = status?.toLowerCase() === 'completed' ? 'green' 
                : status?.toLowerCase() === 'in_progress' ? 'blue'
                : status?.toLowerCase() === 'failed' ? 'red'
                : 'gray';
              return (
                <Badge color={color} variant="light">
                  {status?.replace(/_/g, ' ')}
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
            cell: function render({ getValue }) {
              return (
                <Group gap="xs">
                  <ActionIcon
                    variant="default"
                    onClick={() => show("jobs", getValue() as string)}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="default"
                    onClick={() => edit("jobs", getValue() as string)}
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
      } = useTable({
        columns,
        refineCoreProps: {
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
                onClick={() => {}}
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
              <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text>Page</Text>
                <Text fw={700}>
                  {getState().pagination.pageIndex + 1} of {getPageCount()}
                </Text>
              </Box>
              <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              </Box>
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