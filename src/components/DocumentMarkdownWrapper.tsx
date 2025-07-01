import React, { useCallback } from 'react';
import DocumentMarkdownRenderer from './DocumentMarkdownRenderer';

interface Highlight {
  xml?: string;
  text?: string;
}

interface DocumentMarkdownWrapperProps {
  markdown?: string;
}

const DocumentMarkdownWrapper: React.FC<DocumentMarkdownWrapperProps> = ({ markdown }) => {
  const handleRefresh = useCallback(() => {
    console.log("Refresh requested in DocumentMarkdownWrapper");
  }, []);

  const content = markdown || '';

  return (
    <DocumentMarkdownRenderer
      markdown={content}
      isLoading={false}
      errorMessage={null}
      onRefresh={handleRefresh}
    />
  );
};


export default DocumentMarkdownWrapper;