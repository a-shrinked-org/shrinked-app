// src/types/logic.ts

import { Node, Edge } from '@reactflow/core';

export type NodeData = {
  label: string;
  description?: string;
  config?: {
    maxSize?: string;
    allowedTypes?: string[];
    model?: string;
    template?: string;
    [key: string]: any;
  };
};

export type NodeType = 'upload' | 'ai' | 'pdf' | 'email';

export type LogicNode = Node<NodeData>;

export type LogicEdge = Edge;