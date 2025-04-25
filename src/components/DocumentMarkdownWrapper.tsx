"use client";

import React, { useCallback } from 'react';
import DocumentMarkdownRenderer from './DocumentMarkdownRenderer';

interface DocumentMarkdownWrapperProps {
  markdown: string;
}

/**
 * A wrapper component for DocumentMarkdownRenderer that provides default values
 * for the required props while passing through the markdown content
 */
const DocumentMarkdownWrapper: React.FC<DocumentMarkdownWrapperProps> = ({ markdown }) => {
  // Provide a dummy refresh handler
  const handleRefresh = useCallback(() => {
    console.log("Refresh requested in DocumentMarkdownWrapper");
  }, []);
  
  return (
    <DocumentMarkdownRenderer
      markdown={markdown}
      isLoading={false}
      errorMessage={null}
      onRefresh={handleRefresh}
    />
  );
};

export default DocumentMarkdownWrapper;