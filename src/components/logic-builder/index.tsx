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
  Connection,
  ConnectionMode,
} from '@xyflow/react';
import { Paper } from '@mantine/core';

import '@xyflow/react/dist/style.css';

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
  }
];

const initialEdges = [
  { 
    id: 'e1-2', 
    source: 'upload-1', 
    target: 'ai-1', 
    type: 'default' 
  }
];

export default function LogicBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  return (
    <Paper className="h-[800px] w-full">
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
        <MiniMap />
      </ReactFlow>
    </Paper>
  );
}