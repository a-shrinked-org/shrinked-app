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
    status?: 'completed' | 'in_progress' | 'pending' | 'failed';
    [key: string]: unknown;
  };
}

export type NodeType = 'upload' | 'ai' | 'pdf' | 'email';

// Extended node types for job processing flow
export type ProcessingStepType = 'upload' | 'processing' | 'output' | 'document';

// Status type for processing steps
export type ProcessingStatus = 'completed' | 'in_progress' | 'pending' | 'failed';

// Job Processing Flow interfaces
export interface JobProcessingFlowProps {
  jobScenario: string;
  jobStatus: string;
}

export type LogicNode = Node<NodeData>;
export type LogicEdge = Edge;