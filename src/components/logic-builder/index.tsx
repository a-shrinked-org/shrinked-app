import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Paper, Title, Button, ActionIcon, Tooltip } from '@mantine/core';
import { Plus, Save, PlayCircle } from 'lucide-react';

// Custom Node Types
const nodeTypes = {
  trigger: TriggerNode,
  process: ProcessNode,
  output: OutputNode,
  control: ControlNode,
};

// Node Components
function TriggerNode({ data }) {
  return (
    <div className="p-4 rounded-lg bg-blue-600 text-white">
      <h3 className="text-lg font-semibold">{data.label}</h3>
      <p className="text-sm">{data.description}</p>
    </div>
  );
}

function ProcessNode({ data }) {
  return (
    <div className="p-4 rounded-lg bg-green-600 text-white">
      <h3 className="text-lg font-semibold">{data.label}</h3>
      <p className="text-sm">{data.description}</p>
    </div>
  );
}

function OutputNode({ data }) {
  return (
    <div className="p-4 rounded-lg bg-purple-600 text-white">
      <h3 className="text-lg font-semibold">{data.label}</h3>
      <p className="text-sm">{data.description}</p>
    </div>
  );
}

function ControlNode({ data }) {
  return (
    <div className="p-4 rounded-lg bg-orange-600 text-white">
      <h3 className="text-lg font-semibold">{data.label}</h3>
      <p className="text-sm">{data.description}</p>
    </div>
  );
}

const LogicBuilder = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const addNode = (type) => {
    const newNode = {
      id: `${type}-${nodes.length + 1}`,
      type,
      position: { x: 100, y: 100 },
      data: { 
        label: `New ${type} Node`,
        description: `Description for ${type} node` 
      },
    };
    setNodes([...nodes, newNode]);
  };

  const saveFlow = () => {
    // TODO: Implement save logic
    console.log('Flow:', { nodes, edges });
  };

  const runFlow = () => {
    // TODO: Implement flow execution
    console.log('Running flow');
  };

  return (
    <Paper className="h-screen w-full">
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
          
          {/* Node Type Panel */}
          <Panel position="top-left" className="p-4 bg-dark-8 rounded-lg">
            <Title order={4} className="mb-4">Add Nodes</Title>
            <div className="flex flex-col space-y-2">
              <Button
                onClick={() => addNode('trigger')}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                Trigger
              </Button>
              <Button
                onClick={() => addNode('process')}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                Process
              </Button>
              <Button
                onClick={() => addNode('output')}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                Output
              </Button>
              <Button
                onClick={() => addNode('control')}
                leftIcon={<Plus size={16} />}
                className="w-full"
              >
                Control
              </Button>
            </div>
          </Panel>

          {/* Actions Panel */}
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
};

export default LogicBuilder;