// components/logic-builder/nodes/BaseNode.tsx
import { Handle, Position } from '@reactflow/core';
import { Paper, Text, Badge } from '@mantine/core';
import { type NodeData } from '@/types/logic';

export type BaseNodeProps = {
  data: NodeData;
  isConnectable?: boolean;
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
  return (
    <Paper shadow="sm" className={`min-w-[180px] ${className}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        isConnectable={isConnectable} 
      />
      
      <div className={`p-2 flex items-center gap-2 rounded-t-lg bg-${color}-600`}>
        {icon}
        <Text size="sm" fw={500}>{data.label}</Text>
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
            {`${key}: ${value}`}
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
      />
    </Paper>
  );
}