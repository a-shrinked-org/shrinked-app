'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
} from '@xyflow/react';
import { Paper } from '@mantine/core';

import '@xyflow/react/dist/style.css';

const initialNodes: Node[] = [
  {
    id: 'upload-1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { 
      label: 'Upload Node',
      description: 'Upload files for processing',
      config: {
        maxSize: '10MB',
        allowedTypes: ['pdf', 'docx']
      }
    }
  },
  {
    id: 'ai-1',
    type: 'default',
    position: { x: 0, y: 100 },
    data: { 
      label: 'AI Processing',
      config: {
        model: 'text-analysis-v2'
      }
    }
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: 'upload-1', target: 'ai-1' }
];

export default function LogicBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <Paper className="h-[800px] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </Paper>
  );
}