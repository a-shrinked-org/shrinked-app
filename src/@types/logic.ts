// types/logic.ts
export type NodeData = {
  label: string;
  description?: string;
  config?: Record<string, any>;
};

export type NodeType = 'upload' | 'ai' | 'pdf' | 'email';

export type LogicNode = {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
};

export type LogicEdge = {
  id: string;
  source: string;
  target: string;
  type?: string;
};

export type FlowTemplate = {
  name: string;
  nodes: LogicNode[];
  edges: LogicEdge[];
};