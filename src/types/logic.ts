// src/types/logic.ts
import type { Node, Edge } from '@reactflow/core';

export interface NodeData {
  label: string;
  description?: string;
  config?: {
    maxSize?: string;
    allowedTypes?: string[];
    model?: string;
    template?: string;
    [key: string]: unknown;
  };
}

export type NodeType = 'upload' | 'ai' | 'pdf' | 'email';

// These are helper types if needed
export type LogicNode = Node<NodeData>;
export type LogicEdge = Edge;