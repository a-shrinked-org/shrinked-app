"use client";

import { useNavigation } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { ColumnDef, flexRender } from "@tanstack/react-table";
import React from "react";
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
} from '@mantine/core';
import { IconEye, IconDownload, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export default function OutputList() {
  const columns = React.useMemo<ColumnDef<any>[]>(
    () => [
      {
        id: "key",
        accessorKey: "key",
        header: "File Name",
      },
      {
        id: "size",
        accessorKey: "size",
        header: "Size",
        cell: function render({ getValue }) {
          const bytes = getValue<number>();
          if (bytes < 1024) return `${bytes} B`;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
          if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
          return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        },
      },
      {
        id: "uploaded",
        accessorKey: "uploaded",
        header: "Upload Date",
        cell: function render({ getValue }) {
          return new Date(getValue<string>()).toLocaleString(undefined, {
            timeZone: "UTC",
          });
        },
      },
      {
        id: "actions",
        accessorKey: "key",
        header: "Actions",
        cell: function render({ getValue }) {
          return (
            <Group gap="xs">
              <ActionIcon
                variant="default"
                onClick={() => show("output", getValue() as string)}
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                onClick={() => handleDownload(getValue() as string)}
                color="blue"
              >
                <IconDownload size={16} />
              </ActionIcon>
            </Group>
          );
        },
      },
    ],
    []
  );

  const handleDownload = async (key: string) => {
    try {
      // Use your R2_API_URL to construct the download URL
      const downloadUrl = `${process.env.NEXT_PUBLIC_R2_BASE_URL}/object/${key}`;
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const { show } = useNavigation();

  const {
    getHeaderGroups,
    getRowModel,
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
      resource: "output",
      dataProviderName: "r2"
    }
  });

  return (
    <Stack p="md">
      <Group justify="space-between" align="center">
        <Title order={2}>Files List</Title>
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