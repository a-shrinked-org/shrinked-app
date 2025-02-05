'use client';

import React, { useCallback } from 'react';
import ReactFlow, {
  Connection,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  XYPosition,
  NodeTypes,
  Panel
} from '@reactflow/core';
import { Background } from '@reactflow/background';
import { Controls } from '@reactflow/controls';
import { Paper, Title, Button, ActionIcon, Tooltip } from '@mantine/core';
import { Plus, Save, PlayCircle } from 'lucide-react';

import '@reactflow/core/dist/style.css';
import '@reactflow/controls/dist/style.css';
import '@reactflow/background/dist/style.css';

import { UploadNode } from './nodes/UploadNode';
import { AiNode } from './nodes/AiNode';
import { PdfNode } from './nodes/PdfNode';
import { EmailNode } from './nodes/EmailNode';
import type { NodeData } from '../../types/logic';

const nodeTypes: NodeTypes = {
  upload: UploadNode,
  ai: AiNode,
  pdf: PdfNode,
  email: EmailNode,
};

const getNewNodePosition = (nodes: Node<NodeData>[]): XYPosition => {
  if (!nodes.length) return { x: 100, y: 100 };
  
  const lastNode = nodes[nodes.length - 1];
  return {
    x: (lastNode.position?.x || 0) + 50,
    y: (lastNode.position?.y || 0) + 50,
  };
};

export default function LogicBuilder() {
  // Explicitly type the states
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback((type: string) => {
    const newNode: Node<NodeData> = {
      id: `${type}-${nodes.length + 1}`,
      type,
      position: getNewNodePosition(nodes),
      data: {
        label: `New ${type} Node`,
        description: `Description for ${type} node`,
        config: getNodeConfig(type),
      },
    };
    setNodes(nodes => [...nodes, newNode]);
  }, [nodes, setNodes]);

  const getNodeConfig = (type: string) => {
    switch (type) {
      case 'upload':
        return {
          maxSize: '10MB',
          allowedTypes: ['pdf', 'docx'],
        };
      case 'ai':
        return {
          model: 'text-analysis-v2',
        };
      case 'pdf':
        return {
          template: 'default-template',
        };
      case 'email':
        return {
          template: 'default-email',
        };
      default:
        return {};
    }
  };

  const saveFlow = async () => {
    console.log('Flow:', { nodes, edges });
  };

  const runFlow = async () => {
    console.log('Running flow');
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
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background />
          <Controls />
          
          <Panel position="top-left" style={{ background: 'var(--mantine-color-dark-8)' }} className="p-4 rounded-lg">
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
          </Panel>

          <Panel position="top-right" style={{ background: 'var(--mantine-color-dark-8)' }} className="p-4 rounded-lg">
            <div className="flex space-x-2">
              <Tooltip label="Save Flow">
                <ActionIcon onClick={saveFlow} size="lg">
                  <Save size={20} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Run Flow">
                <ActionIcon onClick={runFlow} size="lg">
                  <PlayCircle size={20} />
                </ActionIcon>
              </Tooltip>
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </Paper>
  );
}