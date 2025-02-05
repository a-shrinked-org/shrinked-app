// components/logic-builder/nodes/AiNode.tsx
import { Brain } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeProps } from '@reactflow/core';
import { type NodeData } from '@/types/logic';

export function AiNode(props: NodeProps<NodeData>) {
  return (
    <BaseNode 
      {...props} 
      icon={<Brain size={16} color="white" />}
      color="violet"
    />
  );
}