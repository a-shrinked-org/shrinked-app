'use client';

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from '@xyflow/react';
import { Paper, Text, Loader, Center } from '@mantine/core';

// Make sure to import the CSS
import '@xyflow/react/dist/style.css';

// Basic job flow component with minimal dependencies
export default function SimpleJobProcessingFlow({ jobScenario = '', jobStatus = 'pending' }) {
  useEffect(() => {
    console.log("Basic flow component mounted with:", { jobScenario, jobStatus });
  }, [jobScenario, jobStatus]);

  // Define basic nodes
  const initialNodes = [
    {
      id: '1',
      position: { x: 100, y: 50 },
      data: { label: 'File Upload' },
      style: {
        background: '#e6ffed',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #d9d9d9',
        width: 150,
      },
    },
    {
      id: '2',
      position: { x: 100, y: 150 },
      data: { label: 'Processing' },
      style: {
        background: '#e6f7ff',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #d9d9d9',
        width: 150,
      },
    },
    {
      id: '3',
      position: { x: 100, y: 250 },
      data: { label: 'Output' },
      style: {
        background: '#f5f5f5',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #d9d9d9',
        width: 150,
      },
    },
  ];

  // Add document node for PLATOGRAM_DOC scenario
  if (jobScenario?.includes('PLATOGRAM_DOC')) {
    initialNodes.push({
      id: '4',
      position: { x: 100, y: 350 },
      data: { label: 'Document' },
      style: {
        background: '#f5f5f5',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #d9d9d9', 
        width: 150,
      },
    });
  }

  // Define basic edges
  const initialEdges = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
  ];

  // Add edge for PLATOGRAM_DOC scenario
  if (jobScenario?.includes('PLATOGRAM_DOC')) {
    initialEdges.push({ id: 'e3-4', source: '3', target: '4' });
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <Paper style={{ width: '100%', height: 400 }} withBorder>
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        {/* Add a fallback text that will show if the flow doesn't render */}
        <div style={{ position: 'absolute', top: 0, left: 0, padding: '10px' }}>
          <Text size="sm">Job Processing: {jobScenario} - Status: {jobStatus}</Text>
        </div>
        
        {/* Render ReactFlow with minimal configuration */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </Paper>
  );
}