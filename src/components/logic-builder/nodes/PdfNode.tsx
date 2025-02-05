// components/logic-builder/nodes/PdfNode.tsx
import { FileText } from 'lucide-react';
import { BaseNode } from './BaseNode';

export function PdfNode(props) {
  return (
    <BaseNode 
      {...props} 
      icon={<FileText size={16} />}
      color="orange"
    />
  );
}