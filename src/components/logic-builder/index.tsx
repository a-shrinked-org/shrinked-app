'use client';

import React, { useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Background,
  Controls,
  Node,
  Edge,
} from '@xyflow/react';
import { Paper, Title, Button, ActionIcon, Tooltip } from '@mantine/core';
import { Plus, Save, PlayCircle } from 'lucide-react';

import '@xyflow/react/dist/style.css';

import { UploadNode } from './nodes/UploadNode';
import { AiNode } from './nodes/AiNode';
import { PdfNode } from './nodes/PdfNode';
import { EmailNode } from './nodes/EmailNode';

const nodeTypes = {
  upload: UploadNode,
  ai: AiNode,
  pdf: PdfNode,
  email: EmailNode,
};

interface NodeData {
  label: string;
  description?: string;
  config?: {
    maxSize?: string;
    allowedTypes?: string[];
    model?: string;
    template?: string;
  };
}

const initialNodes: Node<NodeData>[] = [
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
  }
];

const initialEdges: Edge[] = [];

export default function LogicBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(
    (type: string) => {
      const position = {
        x: Math.random() * 400,
        y: Math.random() * 400
      };

      const newNode: Node<NodeData> = {
        id: `${type}-${nodes.length + 1}`,
        type,
        position,
        data: {
          label: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
          description: `New ${type} node`,
          config: getNodeConfig(type)
        }
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes]
  );

  const getNodeConfig = (type: string) => {
    switch (type) {
      case 'upload':
        return {
          maxSize: '10MB',
          allowedTypes: ['pdf', 'docx']
        };
      case 'ai':
        return {
          model: 'text-analysis-v2'
        };
      case 'pdf':
        return {
          template: 'default-template'
        };
      case 'email':
        return {
          template: 'default-email'
        };
      default:
        return {};
    }
  };

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
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          
          <div 
            className="absolute top-4 left-4 p-4 z-10 rounded-lg"
            style={{ background: 'var(--mantine-color-dark-8)' }}
          >
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

          <div 
            className="absolute top-4 right-4 p-4 z-10 rounded-lg"
            style={{ background: 'var(--mantine-color-dark-8)' }}
          >
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