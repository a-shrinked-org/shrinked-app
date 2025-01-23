"use client";

import React from 'react';
import { useTable } from "@refinedev/react-table";
import { ColumnDef, flexRender } from "@tanstack/react-table";
import { 
  Table, 
  Button, 
  Group, 
  Title, 
  Box,
  Stack,
  ActionIcon
} from '@mantine/core';
import { IconEye, IconTrash } from '@tabler/icons-react';
import { useNavigation, useDelete } from "@refinedev/core";

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
          return formatBytes(bytes);
        },
      },
      {
        id: "uploaded",
        accessorKey: "uploaded",
        header: "Upload Date",
        cell: function render({ getValue }) {
          return new Date(getValue<string>()).toLocaleString();
        },
      },
      {
        id: "actions",
        accessorKey: "key",
        header: "Actions",
        cell: function render({ getValue }) {
          const { mutate: deleteFile } = useDelete();
          
          return (
            <Group gap="xs">
              <ActionIcon
                variant="default"
                onClick={() => window.open(`${process.env.NEXT_PUBLIC_R2_BASE_URL}/object/${getValue()}`, '_blank')}
              >
                <IconEye size={16} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                color="red"
                onClick={() => {
                  deleteFile({
                    resource: "output",
                    id: getValue() as string,
                  });
                }}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          );
        },
      },
    ],
    []
  );

  const {
    getHeaderGroups,
    getRowModel,
    refineCore: { tableQueryResult: { data: tableData } },
  } = useTable({
    columns,
    refineCoreProps: {
      resource: "output",
      dataProviderName: "r2",
    }
  });

  return (
    <Stack p="md">
      <Group justify="space-between" align="center">
        <Title order={2}>output</Title>
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
    </Stack>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}