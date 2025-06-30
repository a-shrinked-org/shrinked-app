import React, { useCallback } from 'react';
import DocumentMarkdownRenderer from './DocumentMarkdownRenderer';

interface Highlight {
  xml?: string;
  text?: string;
}

interface DocumentMarkdownWrapperProps {
  markdown?: string;
  highlights?: Highlight[];
}

const DocumentMarkdownWrapper: React.FC<DocumentMarkdownWrapperProps> = ({ markdown, highlights }) => {
  const handleRefresh = useCallback(() => {
    console.log("Refresh requested in DocumentMarkdownWrapper");
  }, []);

  const content = highlights 
    ? highlights.map(h => h.xml || h.text).join('\n\n') 
    : markdown || '';

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