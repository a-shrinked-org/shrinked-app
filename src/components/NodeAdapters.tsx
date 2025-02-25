'use client';

import React from 'react';
import type { NodeProps as XYNodeProps } from '@xyflow/react';

// Import your existing components
import { UploadNode as OriginalUploadNode } from '@/components/logic-builder/nodes/UploadNode';
import { AiNode as OriginalAiNode } from '@/components/logic-builder/nodes/AiNode';
import { PdfNode as OriginalPdfNode } from '@/components/logic-builder/nodes/PdfNode';
import { EmailNode as OriginalEmailNode } from '@/components/logic-builder/nodes/EmailNode';

// Import your types
import type { NodeData } from '@/types/logic';

// Create adapter wrapper components for each of your node types
// These wrappers convert from XYFlow props to your component props format

export const UploadNodeAdapter = (props: XYNodeProps) => {
  // Create props that match what your original component expects
  const adaptedProps = {
    data: props.data as NodeData,
    id: props.id,
    selected: props.selected || false,
    type: props.type,
    isConnectable: props.isConnectable || true,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    dragHandle: props.dragHandle || '',
    dragging: false, // Add the missing dragging property
  };
  
  return <OriginalUploadNode {...adaptedProps} />;
};

export const AiNodeAdapter = (props: XYNodeProps) => {
  const adaptedProps = {
    data: props.data as NodeData,
    id: props.id,
    selected: props.selected || false,
    type: props.type,
    isConnectable: props.isConnectable || true,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    dragHandle: props.dragHandle || '',
    dragging: false, // Add the missing dragging property
  };
  
  return <OriginalAiNode {...adaptedProps} />;
};

export const PdfNodeAdapter = (props: XYNodeProps) => {
  const adaptedProps = {
    data: props.data as NodeData,
    id: props.id,
    selected: props.selected || false,
    type: props.type,
    isConnectable: props.isConnectable || true,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    dragHandle: props.dragHandle || '',
    dragging: false, // Add the missing dragging property
  };
  
  return <OriginalPdfNode {...adaptedProps} />;
};

export const EmailNodeAdapter = (props: XYNodeProps) => {
  const adaptedProps = {
    data: props.data as NodeData,
    id: props.id,
    selected: props.selected || false,
    type: props.type,
    isConnectable: props.isConnectable || true,
    xPos: 0,
    yPos: 0,
    zIndex: 0,
    dragHandle: props.dragHandle || '',
    dragging: false, // Add the missing dragging property
  };
  
  return <OriginalEmailNode {...adaptedProps} />;
};