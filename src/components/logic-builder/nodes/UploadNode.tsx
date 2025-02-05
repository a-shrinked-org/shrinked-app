// components/logic-builder/nodes/UploadNode.tsx
import { FileUp } from 'lucide-react';
import { BaseNode } from './BaseNode';

export function UploadNode(props) {
  return (
    <BaseNode 
      {...props} 
      icon={<FileUp size={16} />}
      color="blue"
    />
  );
}