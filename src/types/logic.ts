// src/types/logic.ts

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

export interface LogicNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
}

export interface LogicEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

export interface Identity {
  token?: string;
  email?: string;
  name?: string;
  id?: string;
  subscriptionPlan?: { name?: string };
}
