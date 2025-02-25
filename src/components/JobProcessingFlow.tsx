'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ConnectionMode,
} from '@xyflow/react';
import { Paper } from '@mantine/core';

import '@xyflow/react/dist/style.css';

// Simple node data structure based on the example
const initialNodes = [
  {
    id: 'upload-1',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: 'Upload Node' }
  },
  {
    id: 'ai-1',
    type: 'default',
    position: { x: 0, y: 100 },
    data: { label: 'AI Processing' }
  },
  {
    id: 'output-1',
    type: 'default',
    position: { x: 0, y: 200 },
    data: { label: 'Result Output' }
  }
];

const initialEdges = [
  { 
    id: 'e1-2', 
    source: 'upload-1', 
    target: 'ai-1', 
    type: 'default' 
  },
  {
    id: 'e2-3',
    source: 'ai-1',
    target: 'output-1',
    type: 'default'
  }
];

interface JobProcessingFlowProps {
  jobScenario?: string;
  jobStatus?: string;
}

export default function JobProcessingFlow({ jobScenario, jobStatus }: JobProcessingFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  return (
    <Paper className="h-[400px] w-full" withBorder>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </Paper>
  );
}