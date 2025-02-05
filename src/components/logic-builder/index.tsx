'use client';

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Panel,
  Edge,
  Node,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@reactflow/core';
import { Background } from '@reactflow/background';
import { Controls } from '@reactflow/controls';
import { Paper, Title, Button, ActionIcon, Tooltip } from '@mantine/core';
import { Plus, Save, PlayCircle } from 'lucide-react';

// Import styles
import '@reactflow/core/dist/style.css';
import '@reactflow/controls/dist/style.css';
import '@reactflow/background/dist/style.css';

// Node imports
import { UploadNode } from './nodes/UploadNode';
import { AiNode } from './nodes/AiNode';
import { PdfNode } from './nodes/PdfNode';
import { EmailNode } from './nodes/EmailNode';
import { type NodeData, type LogicNode, type LogicEdge } from '@/types/logic';

const nodeTypes = {
  upload: UploadNode,
  ai: AiNode,
  pdf: PdfNode,
  email: EmailNode,
};

export default function LogicBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback((type: string) => {
    const position = getNewNodePosition(nodes);
    const newNode: Node<NodeData> = {
      id: `${type}-${nodes.length + 1}`,
      type,
      position,
      data: { 
        label: `New ${type} Node`,
        description: `Description for ${type} node`,
        config: getDefaultConfig(type)
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'upload':
        return { maxSize: '10MB', allowedTypes: ['pdf', 'docx'] };
      case 'ai':
        return { model: 'text-analysis-v2' };
      case 'pdf':
        return { template: 'default-template' };
      case 'email':
        return { template: 'default-email' };
      default:
        return {};
    }
  };

  const getNewNodePosition = (existingNodes: Node[]) => {
    const position = { x: 100, y: 100 };
    if (existingNodes.length > 0) {
      const lastNode = existingNodes[existingNodes.length - 1];
      position.x = lastNode.position.x + 50;
      position.y = lastNode.position.y + 50;
    }
    return position;
  };

  const saveFlow = async () => {
    try {
      const flow = { nodes, edges };
      console.log('Saving flow:', flow);
      // TODO: API integration
    } catch (error) {
      console.error('Error saving flow:', error);
    }
  };

  const runFlow = async () => {
    try {
      console.log('Running flow');
      // TODO: API integration
    } catch (error) {
      console.error('Error running flow:', error);
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
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background />
          <Controls />
          
          <Panel position="top-left" className="p-4 bg-dark-8 rounded-lg">
            <Title order={4} className="mb-4">Add Nodes</Title>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => addNode('upload')}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                File Upload
              </Button>
              <Button
                onClick={() => addNode('ai')}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                AI Processing
              </Button>
              <Button
                onClick={() => addNode('pdf')}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                PDF Generation
              </Button>
              <Button
                onClick={() => addNode('email')}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                Email
              </Button>
            </div>
          </Panel>

          <Panel position="top-right" className="p-4 bg-dark-8 rounded-lg">
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