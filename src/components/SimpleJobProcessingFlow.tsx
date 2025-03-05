'use client';

import { useCallback, useEffect, useMemo } from 'react';
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
import { Paper, Loader, Center, Text, Group } from '@mantine/core';
// Replace Tabler icons with Lucide icons
import { CheckCircle, Clock, Hourglass, XCircle } from 'lucide-react';

import '@xyflow/react/dist/style.css';

// Define node style based on status - with case-insensitive matching
const getNodeStyle = (status: string) => {
  const normalizedStatus = status.toLowerCase();
  
  switch (normalizedStatus) {
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

// Get icon based on status - with case-insensitive matching
const getStatusIcon = (status: string) => {
  const normalizedStatus = status.toLowerCase();
  
  switch (normalizedStatus) {
    case 'completed':
      return <CheckCircle size={18} color="#52c41a" />;
    case 'in_progress':
      return <Clock size={18} color="#1890ff" />;
    case 'failed':
      return <XCircle size={18} color="#ff4d4f" />;
    default:
      return <Hourglass size={18} color="#8c8c8c" />;
  }
};

// Map job status to node status - with case-insensitive matching
const getNodeStatus = (jobStatus: string = '', nodeIndex: number) => {
  const normalizedStatus = jobStatus.toLowerCase();
  
  if (normalizedStatus === 'completed') {
    return 'completed';
  }
  
  if (normalizedStatus === 'in_progress') {
    if (nodeIndex === 0) return 'completed';
    if (nodeIndex === 1) return 'in_progress';
    return 'pending';
  }
  
  if (normalizedStatus === 'failed') {
    if (nodeIndex === 0) return 'completed';
    if (nodeIndex === 1) return 'failed';
    return 'pending';
  }
  
  return 'pending';
};

// Format time for display
const getTimeForNode = (jobStatus: string, nodeIndex: number) => {
  if (getNodeStatus(jobStatus, nodeIndex) === 'completed') {
    const now = new Date();
    return now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (getNodeStatus(jobStatus, nodeIndex) === 'in_progress') {
    return 'Processing...';
  }
  return '';
};

interface JobProcessingFlowProps {
  jobScenario?: string;
  jobStatus?: string;
}

export default function SimpleJobProcessingFlow({ jobScenario = '', jobStatus = 'pending' }: JobProcessingFlowProps) {
  // Debug output
  useEffect(() => {
    console.log("Flow component props:", { 
      jobScenario, 
      jobStatus, 
      normalizedStatus: jobStatus?.toLowerCase() 
    });
  }, [jobScenario, jobStatus]);
  
  // Create nodes based on job scenario and status
// Create nodes based on job scenario and status
  const initialNodes = useMemo(() => {
    // Base nodes that appear in all scenarios
    const nodes = [
      {
        id: 'upload',
        type: 'default',
        position: { x: 25, y: 50 },
        data: { 
          label: 'File Upload',
          status: getNodeStatus(jobStatus, 0),
          time: getTimeForNode(jobStatus, 0),
          statusIcon: getStatusIcon(getNodeStatus(jobStatus, 0))
        },
        style: {
          width: 200,
          padding: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 8,
          ...getNodeStyle(getNodeStatus(jobStatus, 0))
        }
      },
      {
        id: 'processing',
        type: 'default',
        position: { x: 25, y: 160 },
        data: { 
          label: 'AI Processing',
          status: getNodeStatus(jobStatus, 1),
          time: getTimeForNode(jobStatus, 1),
          statusIcon: getStatusIcon(getNodeStatus(jobStatus, 1))
        },
        style: {
          width: 200,
          padding: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 8,
          ...getNodeStyle(getNodeStatus(jobStatus, 1))
        }
      },
      {
        id: 'output',
        type: 'default',
        position: { x: 25, y: 270 },
        data: { 
          label: 'Result Output',
          status: getNodeStatus(jobStatus, 2),
          time: getTimeForNode(jobStatus, 2),
          statusIcon: getStatusIcon(getNodeStatus(jobStatus, 2))
        },
        style: {
          width: 200,
          padding: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 8,
          ...getNodeStyle(getNodeStatus(jobStatus, 2))
        }
      }
    ];
    
    // Add document node specifically for PLATOGRAM_DOC scenario
    const scenarioUpper = (jobScenario || '').toUpperCase();
    if (scenarioUpper.includes('PLATOGRAM_DOC')) {
      nodes.push({
        id: 'document',
        type: 'default',
        position: { x: 25, y: 380 },
        data: { 
          label: 'Document Generation',
          status: getNodeStatus(jobStatus, 3),
          time: getTimeForNode(jobStatus, 3),
          statusIcon: getStatusIcon(getNodeStatus(jobStatus, 3))
        },
        style: {
          width: 200,
          padding: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 8,
          ...getNodeStyle(getNodeStatus(jobStatus, 3))
        }
      });
    }
    
    console.log("Created nodes:", nodes.length);
    return nodes;
  }, [jobScenario, jobStatus]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Ensure nodes and edges are updated when props change
  useEffect(() => {
    console.log("Updating nodes and edges");
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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
      <div style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          fitView
          attributionPosition="bottom-right"
          style={{ width: '100%', height: '100%' }}
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </Paper>
  );
}
          width: 200,
          padding: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 8,
          ...getNodeStyle(getNodeStatus(jobStatus, 0))
        }
      },
      {
        id: 'processing',
        type: 'default',
        position: { x: 25, y: 160 },
        data: { 
          label: 'AI Processing',
          status: getNodeStatus(jobStatus, 1),
          time: getTimeForNode(jobStatus, 1),
          statusIcon: getStatusIcon(getNodeStatus(jobStatus, 1))
        },
        style: {
          width: 200,
          padding: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 8,
          ...getNodeStyle(getNodeStatus(jobStatus, 1))
        }
      },
      {
        id: 'output',
        type: 'default',
        position: { x: 25, y: 270 },
        data: { 
          label: 'Result Output',
          status: getNodeStatus(jobStatus, 2),
          time: getTimeForNode(jobStatus, 2),
          statusIcon: getStatusIcon(getNodeStatus(jobStatus, 2))
        },
        style: {
          width: 200,
          padding: 12,
          borderWidth: 1,
          borderStyle: 'solid',
          borderRadius: 8,
          ...getNodeStyle(getNodeStatus(jobStatus, 2))
        }
      }
    ];
    
    // Add document node specifically for PLATOGRAM_DOC scenario
    const scenarioUpper = (jobScenario || '').toUpperCase();
    if (scenarioUpper.includes('PLATOGRAM_DOC')) {
      nodes.push({
        id: 'document',
        type: 'default',
        position: { x: 25, y: 380 },
        data: { 
          label: 'Document Generation',
          status: getNodeStatus(jobStatus, 3),
          time: getTimeForNode(jobStatus, 3),
          statusIcon: getStatusIcon(getNodeStatus(jobStatus, 3))
        },
        style: {