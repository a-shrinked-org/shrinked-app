'use client';

import { useCallback, useMemo } from 'react';
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
import { Paper, Loader, Center } from '@mantine/core';

import '@xyflow/react/dist/style.css';

// Define node style based on status
const getNodeStyle = (status: string) => {
  switch (status) {
    case 'completed':
      return { 
        backgroundColor: '#e6ffed', 
        borderColor: '#52c41a',
        color: '#135200'
      };
    case 'in_progress':
      return { 
        backgroundColor: '#e6f7ff', 
        borderColor: '#1890ff',
        color: '#003a8c'
      };
    case 'failed':
      return { 
        backgroundColor: '#fff2f0', 
        borderColor: '#ff4d4f',
        color: '#a8071a'
      };
    default:
      return { 
        backgroundColor: '#f5f5f5', 
        borderColor: '#d9d9d9',
        color: '#595959'
      };
  }
};

// Map job status to node status
const getNodeStatus = (jobStatus: string, nodeIndex: number) => {
  if (jobStatus === 'completed') {
    return 'completed';
  }
  
  if (jobStatus === 'in_progress') {
    if (nodeIndex === 0) return 'completed';
    if (nodeIndex === 1) return 'in_progress';
    return 'pending';
  }
  
  if (jobStatus === 'failed') {
    if (nodeIndex === 0) return 'completed';
    if (nodeIndex === 1) return 'failed';
    return 'pending';
  }
  
  return 'pending';
};

interface JobProcessingFlowProps {
  jobScenario?: string;
  jobStatus?: string;
}

export default function SimpleJobProcessingFlow({ jobScenario, jobStatus = 'pending' }: JobProcessingFlowProps) {
  // Create nodes based on job scenario and status
  const initialNodes = useMemo(() => {
    const nodes = [
      {
        id: 'upload',
        position: { x: 50, y: 50 },
        data: { 
          label: 'File Upload',
          status: getNodeStatus(jobStatus, 0)
        },
        style: {
          width: 150,
          padding: 10,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 4,
          ...getNodeStyle(getNodeStatus(jobStatus, 0))
        }
      },
      {
        id: 'processing',
        position: { x: 50, y: 150 },
        data: { 
          label: 'AI Processing',
          status: getNodeStatus(jobStatus, 1)
        },
        style: {
          width: 150,
          padding: 10,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 4,
          ...getNodeStyle(getNodeStatus(jobStatus, 1))
        }
      },
      {
        id: 'output',
        position: { x: 50, y: 250 },
        data: { 
          label: 'Result Output',
          status: getNodeStatus(jobStatus, 2)
        },
        style: {
          width: 150,
          padding: 10,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 4,
          ...getNodeStyle(getNodeStatus(jobStatus, 2))
        }
      }
    ];
    
    // Add document node for PLATOGRAM_DOC scenario
    if (jobScenario?.includes('PLATOGRAM_DOC')) {
      nodes.push({
        id: 'document',
        position: { x: 50, y: 350 },
        data: { 
          label: 'Document Generation',
          status: getNodeStatus(jobStatus, 3)
        },
        style: {
          width: 150,
          padding: 10,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 4,
          ...getNodeStyle(getNodeStatus(jobStatus, 3))
        }
      });
    }
    
    return nodes;
  }, [jobScenario, jobStatus]);
  
  // Create edges between nodes
  const initialEdges = useMemo(() => {
    const edges = [];
    
    // Connect upload to processing
    edges.push({
      id: 'e-upload-processing',
      source: 'upload',
      target: 'processing',
      animated: getNodeStatus(jobStatus, 0) === 'completed' && getNodeStatus(jobStatus, 1) === 'in_progress',
      style: {
        stroke: getNodeStatus(jobStatus, 0) === 'completed' ? '#1890ff' : '#d9d9d9',
        strokeWidth: 2
      }
    });
    
    // Connect processing to output
    edges.push({
      id: 'e-processing-output',
      source: 'processing',
      target: 'output',
      animated: getNodeStatus(jobStatus, 1) === 'completed' && getNodeStatus(jobStatus, 2) === 'in_progress',
      style: {
        stroke: getNodeStatus(jobStatus, 1) === 'completed' ? '#1890ff' : '#d9d9d9',
        strokeWidth: 2
      }
    });
    
    // Connect output to document for PLATOGRAM_DOC scenario
    if (jobScenario?.includes('PLATOGRAM_DOC')) {
      edges.push({
        id: 'e-output-document',
        source: 'output',
        target: 'document',
        animated: getNodeStatus(jobStatus, 2) === 'completed' && getNodeStatus(jobStatus, 3) === 'in_progress',
        style: {
          stroke: getNodeStatus(jobStatus, 2) === 'completed' ? '#1890ff' : '#d9d9d9',
          strokeWidth: 2
        }
      });
    }
    
    return edges;
  }, [jobScenario, jobStatus]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge(connection, eds));
  }, [setEdges]);

  if (!jobScenario) {
    return (
      <Paper className="h-[300px] w-full">
        <Center h={300}>
          <Loader size="sm" />
        </Center>
      </Paper>
    );
  }

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
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </Paper>
  );
}