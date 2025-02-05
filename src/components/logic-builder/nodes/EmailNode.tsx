// components/logic-builder/nodes/EmailNode.tsx
import { Mail } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeProps } from '@reactflow/core';
import type { NodeData } from '../../../types/logic';

export function EmailNode(props: NodeProps<NodeData>) {
  return (
    <BaseNode 
      {...props} 
      icon={<Mail size={16} color="white" />}
      color="green"
    />
  );
}