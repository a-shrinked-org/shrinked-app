"use client";

import { GetManyResponse, useMany, useNavigation, useGetIdentity } from "@refinedev/core";
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
  LoadingOverlay
} from '@mantine/core';
import { IconEye, IconEdit, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export default function JobList() {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: identity } = useGetIdentity<{
    token?: string;
    email?: string | null;
  }>();

  // Add console logs to debug
  console.log("Identity data:", identity);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    setIsStatusModalOpen(true);
    console.log("Checking status with token:", identity?.token);
    
    try {
      const response = await fetch("https://sandbox.temporary.name/status", {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${identity?.token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log("Response status:", response.status);

      if (response.status === 502) {
        setStatusResult("Our servers are currently undergoing maintenance. Please try again later.");
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Status result:", result);
      setStatusResult(`Current conversion status: ${result.status}`);
    } catch (error) {
      console.error("Error checking status:", error);
      setStatusResult(`Error checking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [identity?.token]);
  
  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "ID",
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
      },
      {
        id: "content",
        accessorKey: "content",
        header: "Content",
      },
      {
        id: "category",
        header: "Category",
        accessorKey: "category",
        cell: function render({ getValue, table }) {
          const meta = table.options.meta as {
            categoryData: GetManyResponse;
          };

          try {
            const category = meta.categoryData?.data?.find(
              (item) => item.id == getValue<any>()?.id
            );

            return category?.title ?? "Loading...";
          } catch (error) {
            return null;
          }
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created At",
        cell: function render({ getValue }) {
          return new Date(getValue<any>()).toLocaleString(undefined, {
            timeZone: "UTC",
          });
        },
      },
      {
        id: "actions",
        accessorKey: "id",
        header: "Actions",
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
  });

  const { data: categoryData } = useMany({
    resource: "categories",
    ids: tableData?.data?.map((item) => item?.category?.id).filter(Boolean) ?? [],
    queryOptions: {
      enabled: !!tableData?.data,
    },
  });

  setOptions((prev) => ({
    ...prev,
    meta: {
      ...prev.meta,
      categoryData,
    },
  }));

  return (
  <Stack p="md">
    <Modal
      opened={isStatusModalOpen}
      onClose={() => setIsStatusModalOpen(false)}
      title="Conversion Status"
      size="md"
    >
      <LoadingOverlay visible={isLoading} />
      <Text>{statusResult || 'Checking status...'}</Text>
    </Modal>
  
    <Group justify="space-between" align="center">
      <Title order={2}>Jobs List</Title>
      <Group>
        <Button 
          variant="light" 
          color="blue" 
          onClick={checkStatus}
          loading={isLoading}
          // Modified disabled condition
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

      <Group justify="space-between" align="center">
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

        <Group align="center">
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Page</span>
            <strong>
              {getState().pagination.pageIndex + 1} of {getPageCount()}
            </strong>
          </Box>
          <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Go to page:</span>
            <NumberInput
              size="xs"
              style={{ width: '70px' }}
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
            style={{ width: '130px' }}
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