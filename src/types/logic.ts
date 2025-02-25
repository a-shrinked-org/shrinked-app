// src/types/logic.ts
import type { Node as XYNode, Edge as XYEdge } from '@xyflow/react';

export interface NodeData {
  label: string;
  description?: string;
  config?: {
    maxSize?: string;
    allowedTypes?: string[];
    model?: string;
    template?: string;
    status?: ProcessingStatus;
    [key: string]: unknown;
  };
  [key: string]: unknown; // Add index signature to make it compatible with Record<string, unknown>
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

// Use XYFlow's Node and Edge types instead of ReactFlow's
export type LogicNode = XYNode<NodeData>;
export type LogicEdge = XYEdge;

// Legacy compatibility with @reactflow/core for your existing node components
import type { NodeProps as ReactFlowNodeProps } from '@reactflow/core';
export type OriginalNodeProps = ReactFlowNodeProps<NodeData>;