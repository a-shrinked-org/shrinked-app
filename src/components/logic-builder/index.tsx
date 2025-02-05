'use client';

import React, { useCallback } from 'react';
import type { Node, Edge, Connection } from 'reactflow';
import ReactFlow from 'reactflow';
import { Background } from '@reactflow/background';
import { Controls } from '@reactflow/controls';
import { Paper, Title, Button, ActionIcon, Tooltip } from '@mantine/core';
import { Plus, Save, PlayCircle } from 'lucide-react';

import 'reactflow/dist/style.css';

import { UploadNode } from './nodes/UploadNode';
import { AiNode } from './nodes/AiNode';
import { PdfNode } from './nodes/PdfNode';
import { EmailNode } from './nodes/EmailNode';

interface NodeData {
  label: string;
  description?: string;
  config?: Record<string, any>;
}

const nodeTypes = {
  upload: UploadNode,
  ai: AiNode,
  pdf: PdfNode,
  email: EmailNode,
};

export default function LogicBuilder() {
  const [nodes, setNodes] = React.useState<Node<NodeData>[]>([]);
  const [edges, setEdges] = React.useState<Edge[]>([]);

  const onNodesChange = useCallback((changes: any) => {
    setNodes((nds) => nds.map(node => {
      const change = changes.find((c: any) => c.id === node.id);
      if (change) {
        return { ...node, ...change };
      }
      return node;
    }));
  }, []);

  const onEdgesChange = useCallback((changes: any) => {
    setEdges((eds) => eds.map(edge => {
      const change = changes.find((c: any) => c.id === edge.id);
      if (change) {
        return { ...edge, ...change };
      }
      return edge;
    }));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => [...eds, { ...params, id: `e${eds.length}` }]);
  }, []);

  const addNode = useCallback((type: string) => {
    const position = { x: 100 + Math.random() * 100, y: 100 + Math.random() * 100 };
    const newNode: Node<NodeData> = {
      id: `${type}-${nodes.length + 1}`,
      type,
      position,
      data: {
        label: `New ${type} Node`,
        description: `Description for ${type} node`,
        config: {
          maxSize: '10MB',
          allowedTypes: ['pdf', 'docx'],
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes]);

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
        >
          <Background />
          <Controls />
          
          <div className="absolute top-4 left-4 p-4 bg-dark-8 rounded-lg">
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

          <div className="absolute top-4 right-4 p-4 bg-dark-8 rounded-lg">
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