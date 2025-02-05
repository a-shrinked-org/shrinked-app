// types/logic.ts
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