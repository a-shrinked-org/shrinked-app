// components/logic-builder/nodes/EmailNode.tsx
import { Mail } from 'lucide-react';
import { BaseNode } from './BaseNode';

export function EmailNode(props) {
  return (
    <BaseNode 
      {...props} 
      icon={<Mail size={16} />}
      color="green"
    />
  );
}