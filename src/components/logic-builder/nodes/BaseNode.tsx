// components/logic-builder/nodes/BaseNode.tsx
import React from 'react';
import { Handle, Position, NodeProps } from '@reactflow/core';
import { Paper, Text, Badge } from '@mantine/core';
import type { NodeData } from '../../../types/logic';

export type BaseNodeProps = NodeProps<NodeData> & {
  className?: string;
  icon?: React.ReactNode;
  color?: string;
};

export function BaseNode({ 
  data, 
  isConnectable,
  className = '',
  icon,
  color = 'blue'
}: BaseNodeProps) {
  const bgColorClass = `bg-${color}-600`;
  
  return (
    <Paper shadow="sm" className={`min-w-[180px] ${className}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
        style={{ backgroundColor: 'var(--mantine-color-blue-6)' }}
      />
      
      <div className={`p-2 flex items-center gap-2 rounded-t-lg ${bgColorClass}`}>
        {icon}
        <Text size="sm" fw={500} c="white">{data.label}</Text>
      </div>
      
      <div className="p-3">
        {data.config && Object.entries(data.config).map(([key, value]) => (
          <Badge 
            key={key}
            color={color} 
            variant="light" 
            size="sm" 
            className="mr-2 mb-2"
          >
            {Array.isArray(value) ? `${key}: ${value.join(', ')}` : `${key}: ${value}`}
          </Badge>
        ))}
        {data.description && (
          <Text size="xs" c="dimmed" mt={2}>
            {data.description}
          </Text>
        )}
      </div>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable} 
        style={{ backgroundColor: 'var(--mantine-color-blue-6)' }}
      />
    </Paper>
  );
}