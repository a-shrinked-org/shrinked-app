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
  ConnectionMode,
  NodeTypes,
} from '@xyflow/react';
import { Paper, Loader, Center } from '@mantine/core';

// Import your existing node components
import { UploadNode } from '../logic-builder/nodes/UploadNode';
import { AiNode } from '../logic-builder/nodes/AiNode';
import { PdfNode } from '../logic-builder/nodes/PdfNode';
import { EmailNode } from '../logic-builder/nodes/EmailNode';

// Import your existing types
import type { 
  LogicNode, 
  LogicEdge, 
  NodeData, 
  ProcessingStatus,
  JobProcessingFlowProps 
} from '@/types/logic';

import '@xyflow/react/dist/style.css';

// Define node types mapping to your existing components
const nodeTypes: NodeTypes = {
  uploadNode: UploadNode,
  aiNode: AiNode,
  pdfNode: PdfNode,
  emailNode: EmailNode,
};

// Map job status to node processing status
const mapJobStatusToNodeStatus = (
  jobStatus: string, 
  nodePosition: 'first' | 'middle' | 'last' | 'document'
): ProcessingStatus => {
  if (jobStatus === 'completed') {
    return 'completed';
  }
  
  if (jobStatus === 'in_progress') {
    if (nodePosition === 'first') {
      return 'completed';
    } else if (nodePosition === 'middle') {
      return 'in_progress';
    } else {
      return 'pending';
    }
  }
  
  if (jobStatus === 'failed') {
    if (nodePosition === 'middle') {
      return 'failed';
    } else if (nodePosition === 'first') {
      return 'completed';
    } else {
      return 'pending';
    }
  }
  
  return 'pending';
};

// Define node descriptions based on status
const getNodeDescription = (stepType: string, status: ProcessingStatus): string => {
  switch (stepType) {
    case 'upload':
      return status === 'completed' ? 'File uploaded successfully' : 
             status === 'in_progress' ? 'Uploading file...' : 
             'Waiting for file upload';
    
    case 'processing':
      return status === 'completed' ? 'Processing completed' : 
             status === 'in_progress' ? 'Currently processing' : 
             status === 'failed' ? 'Processing failed' : 
             'Waiting to process';
    
    case 'output':
      return status === 'completed' ? 'Results ready' : 
             status === 'in_progress' ? 'Generating results...' : 
             'Waiting for results';
    
    case 'document':
      return status === 'completed' ? 'Document generated' : 
             status === 'in_progress' ? 'Generating document...' : 
             'Waiting to generate document';
    
    default:
      return '';
  }
};

// Define nodes based on job scenarios
const getNodesForScenario = (scenario: string, jobStatus: string): LogicNode[] => {
  const spacingY = 120; // Vertical spacing between nodes
  
  // Default flow for any scenario
  const baseNodes: LogicNode[] = [
    {
      id: 'upload',
      type: 'uploadNode',
      position: { x: 50, y: 50 },
      data: { 
        label: 'File Upload',
        description: getNodeDescription('upload', 
          mapJobStatusToNodeStatus(jobStatus, 'first')),
        config: {
          status: mapJobStatusToNodeStatus(jobStatus, 'first'),
          allowedTypes: ['audio', 'video', 'document']
        }
      }
    },
    {
      id: 'processing',
      type: 'aiNode',
      position: { x: 50, y: 50 + spacingY },
      data: { 
        label: 'AI Processing',
        description: getNodeDescription('processing', 
          mapJobStatusToNodeStatus(jobStatus, 'middle')),
        config: {
          status: mapJobStatusToNodeStatus(jobStatus, 'middle'),
          model: scenario.includes('PLATOGRAM') ? 'Platogram' : 'Default'
        }
      }
    },
    {
      id: 'output',
      type: 'emailNode',
      position: { x: 50, y: 50 + spacingY * 2 },
      data: { 
        label: 'Result Output',
        description: getNodeDescription('output', 
          mapJobStatusToNodeStatus(jobStatus, 'last')),
        config: {
          status: mapJobStatusToNodeStatus(jobStatus, 'last')
        }
      }
    }
  ];

  // Add scenario-specific nodes
  if (scenario === 'SINGLE_FILE_PLATOGRAM_DOC') {
    baseNodes.push({
      id: 'document',
      type: 'pdfNode',
      position: { x: 50, y: 50 + spacingY * 3 },
      data: { 
        label: 'Document Generation',
        description: getNodeDescription('document', 
          mapJobStatusToNodeStatus(jobStatus, 'document')),
        config: {
          status: mapJobStatusToNodeStatus(jobStatus, 'document'),
          template: 'Standard Report'
        }
      }
    });
  }

  return baseNodes;
};

// Define edges based on nodes
const getEdgesForNodes = (nodes: LogicNode[]): LogicEdge[] => {
  const edges: LogicEdge[] = [];
  
  for (let i = 0; i < nodes.length - 1; i++) {
    const sourceStatus = nodes[i].data.config?.status as ProcessingStatus;
    const targetStatus = nodes[i+1].data.config?.status as ProcessingStatus;
    
    edges.push({
      id: `e${i}-${i+1}`,
      source: nodes[i].id,
      target: nodes[i+1].id,
      type: 'smoothstep',
      animated: sourceStatus === 'completed' && targetStatus === 'in_progress',
      style: {
        stroke: sourceStatus === 'completed' ? '#1890ff' : '#d9d9d9',
        strokeWidth: 2,
      }
    });
  }

  return edges;
};

export default function JobProcessingFlow({ jobScenario, jobStatus }: JobProcessingFlowProps) {
  // Generate nodes based on job scenario and status
  const initialNodes = getNodesForScenario(jobScenario, jobStatus);
  const initialEdges = getEdgesForNodes(initialNodes);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update flow when job status or scenario changes
  useEffect(() => {
    const updatedNodes = getNodesForScenario(jobScenario, jobStatus);
    const updatedEdges = getEdgesForNodes(updatedNodes);
    
    setNodes(updatedNodes);
    setEdges(updatedEdges);
  }, [jobScenario, jobStatus, setNodes, setEdges]);

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
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        attributionPosition="bottom-right"
      >
        <Controls />
        <Background />
      </ReactFlow>
    </Paper>
  );
}