'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  Connection,
  Edge
} from 'reactflow';
import { Paper, Title, Button, ActionIcon, Tooltip } from '@mantine/core';
import { Plus, Save, PlayCircle } from 'lucide-react';

import 'reactflow/dist/style.css';

import { UploadNode } from './nodes/UploadNode';
import { AiNode } from './nodes/AiNode';
import { PdfNode } from './nodes/PdfNode';
import { EmailNode } from './nodes/EmailNode';

const nodeTypes = {
  upload: UploadNode,
  ai: AiNode,
  pdf: PdfNode,
  email: EmailNode
};

const initialNodes = [
  {
    id: 'upload-1',
    type: 'upload',
    position: { x: 0, y: 50 },
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
    type: 'ai',
    position: { x: 250, y: 50 },
    data: {
      label: 'AI Processing',
      description: 'Process content using AI',
      config: {
        model: 'text-analysis-v2'
      }
    }
  }
];

const initialEdges = [
  {
    id: 'e1-2',
    source: 'upload-1',
    target: 'ai-1',
    animated: true
  }
];

export default function LogicBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const addNode = useCallback(
    (type: string) => {
      const newNode = {
        id: `${type}-${nodes.length + 1}`,
        type,
        position: { 
          x: Math.random() * 500, 
          y: Math.random() * 300 
        },
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          description: `New ${type} node`,
          config: {
            maxSize: type === 'upload' ? '10MB' : undefined,
            allowedTypes: type === 'upload' ? ['pdf', 'docx'] : undefined,
            model: type === 'ai' ? 'text-analysis-v2' : undefined,
            template: type === 'pdf' ? 'default-template' : 
                     type === 'email' ? 'default-email' : undefined
          }
        }
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, nodes.length]
  );

  return (
    <Paper className="h-[800px] w-full">
      <div className="h-full w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          defaultEdgeOptions={{
            animated: true
          }}
        >
          <Background />
          <Controls />
          
          <div className="absolute top-4 left-4 p-4 z-10" style={{ background: 'var(--mantine-color-dark-8)', borderRadius: '8px' }}>
            <Title order={4} className="mb-4">Add Nodes</Title>
            <div className="flex flex-col space-y-2">
              {['upload', 'ai', 'pdf', 'email'].map((type) => (
                <Button
                  key={type}
                  onClick={() => addNode(type)}
                  leftIcon={<Plus size={16} />}
                  fullWidth
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)} Node
                </Button>
              ))}
            </div>
          </div>

          <div className="absolute top-4 right-4 p-4 z-10" style={{ background: 'var(--mantine-color-dark-8)', borderRadius: '8px' }}>
            <div className="flex space-x-2">
              <Tooltip label="Save Flow">
                <ActionIcon onClick={() => console.log({ nodes, edges })} size="lg">
                  <Save size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Run Flow">
                <ActionIcon onClick={() => console.log('Running flow')} size="lg">
                  <PlayCircle size={20} />
                </ActionIcon>
              </Tooltip>
            </div>
          </div>
        </ReactFlow>
      </div>
    </Paper>
  );
}