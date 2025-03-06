// src/components/DocumentMarkdownRenderer.tsx
import React, { useMemo } from 'react';
// For TypeScript compatibility, use require instead of import
const json2md = require('json2md');
import * as Markdoc from '@markdoc/markdoc';
import { Box, Text, Divider, LoadingOverlay, Button } from '@mantine/core';
import { RefreshCw } from 'lucide-react';

// Define props interface for our document data
interface DocumentData {
  title?: string;
  abstract?: string;
  contributors?: string;
  introduction?: string;
  conclusion?: string;
  passages?: string[];
  references?: Array<{ item: string }>;
  chapters?: Array<{ title: string }>;
}

interface DocumentMarkdownRendererProps {
  data: DocumentData | null;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRefresh?: () => void;
}

const DocumentMarkdownRenderer: React.FC<DocumentMarkdownRendererProps> = ({
  data,
  isLoading = false,
  errorMessage = null,
  onRefresh
}) => {
  // Convert document data to markdown format
  const markdownContent = useMemo(() => {
    if (!data) return '';
    
    const markdownArray = [
      { h1: data.title || 'Untitled Document' },
      
      // Abstract section
      { h2: 'Abstract' },
      { p: data.abstract || 'No abstract available.' },
      
      // Introduction section
      { h2: '1. Introduction' },
      { p: data.introduction || 'No introduction available.' }
    ];

    // Add chapters
    if (data.chapters && data.chapters.length > 0) {
      data.chapters.forEach((chapter, index) => {
        markdownArray.push({ h2: `${index + 2}. ${chapter.title}` });
        if (data.passages && data.passages[index]) {
          // Split passages into paragraphs if they contain double line breaks
          const paragraphs = data.passages[index].split(/\n\n+/);
          if (paragraphs.length > 1) {
            paragraphs.forEach(paragraph => {
              if (paragraph.trim()) {
                markdownArray.push({ p: paragraph.trim() });
              }
            });
          } else {
            markdownArray.push({ p: data.passages[index] });
          }
        } else {
          markdownArray.push({ p: 'No content available for this chapter.' });
        }
      });
    }

    // Add conclusion
    markdownArray.push({ h2: `${(data.chapters?.length || 0) + 2}. Conclusion` });
    markdownArray.push({ p: data.conclusion || 'No conclusion available.' });

    // Add references
    markdownArray.push({ h2: `${(data.chapters?.length || 0) + 3}. References` });
    if (data.references && data.references.length > 0) {
      const referenceItems = data.references.map((ref, index) => 
        `[${index + 1}] ${ref.item}`
      );
      markdownArray.push({ ul: referenceItems });
    } else {
      markdownArray.push({ p: 'No references available.' });
    }

    // Add contributors/acknowledgements if available
    if (data.contributors) {
      markdownArray.push({ h2: `${(data.chapters?.length || 0) + 4}. Acknowledgements` });
      markdownArray.push({ p: data.contributors });
    }

    return json2md(markdownArray);
  }, [data]);

  // Parse the markdown with Markdoc
  const renderedContent = useMemo(() => {
    if (!markdownContent) return null;
    
    try {
      const ast = Markdoc.parse(markdownContent);
      const content = Markdoc.transform(ast);
      
      return Markdoc.renderers.react(content, React);
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return <Text>Error rendering document content.</Text>;
    }
  }, [markdownContent]);

  // Render loading state, error, or content
  if (isLoading) {
    return (
      <Box style={{ 
        backgroundColor: 'white', 
        color: 'black', 
        padding: '32px', 
        borderRadius: 8,
        position: 'relative',
        minHeight: '300px'
      }}>
        <LoadingOverlay visible={true} />
      </Box>
    );
  }

  if (errorMessage || !data) {
    return (
      <Box p="lg" bg="white" c="black" style={{ borderRadius: 8 }}>
        <Text>
          Document data not available. {errorMessage && `Error: ${errorMessage}`}
        </Text>
        {onRefresh && (
          <Button 
            leftSection={<RefreshCw size={16} />} 
            onClick={onRefresh} 
            mt="md"
            styles={{
              root: {
                backgroundColor: '#131313',
                borderColor: '#202020',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#202020',
                },
              },
            }}
          >
            Retry
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box style={{ 
      backgroundColor: 'white', 
      color: 'black', 
      padding: '32px', 
      borderRadius: 8,
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    }}>
      <div className="markdown-content" style={{ 
        fontFamily: 'serif',
        fontSize: '16px',
        lineHeight: 1.6,
        maxWidth: '100%',
        overflowX: 'auto'
      }}>
        {renderedContent}
      </div>
    </Box>
  );
};

export default DocumentMarkdownRenderer;