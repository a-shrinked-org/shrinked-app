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

const formatScenarioName = (scenario: string) => {
if (scenario?.includes('PLATOGRAM')) {
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
  return scenario?.replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function JobList() {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
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
              {status?.toLowerCase()
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')}
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
  } = useTable<Job>({
    columns,
    refineCoreProps: {
      resource: "jobs",
      queryOptions: {
        enabled: !!identity?.token,
        onSuccess: (data) => {
          console.log("Table query success:", data);
        },
        onError: (error) => {
          console.error("Table query error:", error);
        }
      },
      meta: {
        headers: identity?.token ? {
          'Authorization': `Bearer ${identity.token}`
        } : undefined
      }
    }
  });

  useEffect(() => {
    console.log("Current table data:", tableData);
  }, [tableData]);

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
          <Button variant="light" onClick={checkStatus}>
            Check Server Status
          </Button>
          <Button onClick={() => create("jobs")}>
            Create Job
          </Button>
        </Group>
      </Group>

     <Box style={{ overflowX: 'auto' }}>
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
           {getRowModel().rows.map((row) => (
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
           ))}
         </Table.Tbody>
       </Table>
     </Box>

      <Group justify="center" gap="xs">
        <Button
          variant="light"
          disabled={!getCanPreviousPage()}
          onClick={() => previousPage()}
        >
          <IconChevronLeft size={18} />
        </Button>
        <Text>
          Page{' '}
          <strong>
            {getState().pagination.pageIndex + 1} of {getPageCount()}
          </strong>
        </Text>
        <Button
          variant="light"
          disabled={!getCanNextPage()}
          onClick={() => nextPage()}
        >
          <IconChevronRight size={18} />
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

      <Modal
        opened={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Server Status"
      >
        {isLoading ? (
          <LoadingOverlay visible />
        ) : (
          <Text style={{ whiteSpace: 'pre-line' }}>{statusResult}</Text>
        )}
      </Modal>
    </Stack>
  );
}