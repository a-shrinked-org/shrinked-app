import { FileUp } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { NodeProps } from '@reactflow/core';
import { type NodeData } from '@/types/logic';

export function UploadNode(props: NodeProps<NodeData>) {
  return (
    <BaseNode 
      {...props} 
      icon={<FileUp size={16} color="white" />}
      color="blue"
    />
  );
}
