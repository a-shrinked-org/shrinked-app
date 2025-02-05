// components/logic-builder/nodes/AiNode.tsx
import { Brain } from 'lucide-react';
import { BaseNode } from './BaseNode';

export function AiNode(props) {
  return (
    <BaseNode 
      {...props} 
      icon={<Brain size={16} />}
      color="violet"
    />
  );
}