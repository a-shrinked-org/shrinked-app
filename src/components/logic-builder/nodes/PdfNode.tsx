// components/logic-builder/nodes/PdfNode.tsx
import { FileText } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeProps } from '@reactflow/core';
import { type NodeData } from '@/types/logic';

export function PdfNode(props: NodeProps<NodeData>) {
  return (
    <BaseNode 
      {...props} 
      icon={<FileText size={16} color="white" />}
      color="orange"
    />
  );
}