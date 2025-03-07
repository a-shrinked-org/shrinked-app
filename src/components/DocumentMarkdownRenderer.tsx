import React from 'react';
import { Box, Text, Paper, Loader, Alert, Button, Progress } from '@mantine/core';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import Markdoc from '@markdoc/markdoc';
import { renderers } from '@markdoc/markdoc';

// Define component props interface
interface DocumentMarkdocRendererProps {
  data?: {
    title?: string;
    abstract?: string;
    contributors?: string;
    introduction?: string;
    conclusion?: string;
    passages?: string[];
    references?: Array<{ item: string }>;
    chapters?: Array<{ title: string }>;
  } | null;
  markdown?: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  processingStatus?: string;
}

// Custom config for Markdoc
const config = {
  nodes: {
    heading: {
      render: 'Heading',
      attributes: {
        level: { type: Number, required: true },
        id: { type: String }
      }
    },
    paragraph: {
      render: 'Paragraph'
    },
    link: {
      render: 'Link',
      attributes: {
        href: { type: String, required: true },
        title: { type: String }
      }
    }
  }
};

// Custom components for rendering
const components = {
  Heading: ({ level, children }) => {
    const HeadingTag = `h${level}`;
    return React.createElement(HeadingTag, { style: { color: '#000000' } }, children);
  },
  Paragraph: ({ children }) => (
    <p style={{ color: '#000000', marginBottom: '1rem' }}>{children}</p>
  ),
  Link: ({ href, children }) => (
    <a href={href} style={{ color: '#0066cc', textDecoration: 'underline' }}>
      {children}
    </a>
  )
};

function DocumentMarkdocRenderer({
  data,
  markdown,
  isLoading,
  errorMessage,
  onRefresh,
  processingStatus
}: DocumentMarkdocRendererProps) {
  
  // Check if the document is still processing
  const isProcessing = processingStatus && 
    (processingStatus.toLowerCase() === 'processing' || 
     processingStatus.toLowerCase() === 'in_progress' ||
     processingStatus.toLowerCase() === 'pending');
  
  // If we're in processing state, show a nicer waiting UI
  if (isProcessing) {
    return (
      <Paper p="xl" style={{ 
        backgroundColor: '#1a1a1a', 
        color: '#ffffff', 
        borderRadius: '8px',
        position: 'relative',
        textAlign: 'center',
        padding: '50px 20px'
      }}>
        <Box style={{ maxWidth: '500px', margin: '0 auto' }}>
          <Clock size={48} style={{ opacity: 0.7, margin: '0 auto 20px' }} />
          <Text size="xl" fw={600} mb="md">Your document is being processed</Text>
          <Text size="sm" c="dimmed" mb="lg">
            We&apos;re analyzing your content and generating a comprehensive document. 
            This may take a few minutes depending on the file size and complexity.
          </Text>
          <Progress 
            size="sm"
            radius="xl"
            value={75}
            animated
            style={{ maxWidth: '300px', margin: '0 auto 20px' }}
          />
          <Button 
            variant="light" 
            size="sm"
            leftSection={<RefreshCw size={16} />}
            onClick={onRefresh}
          >
            Check Status
          </Button>
        </Box>
      </Paper>
    );
  }
  
  // Render markdown content using Markdoc
  const renderMarkdoc = (content: string) => {
    // Parse the markdown content
    const ast = Markdoc.parse(content);
    
    // Transform AST using config
    const content_ast = Markdoc.transform(ast, config);
    
    // Render the content
    return renderers.react(content_ast, React, { components });
  };
  
  // If markdown content is directly provided, render it instead of generating
  if (markdown) {
    return (
      <Paper
        p="xl" 
        bg="white"
        c="black" 
        radius="md"
        style={{ 
          position: 'relative',
          color: '#000000',
          backgroundColor: '#ffffff',
          borderRadius: '8px'
        }}
        className="markdoc-container"
      >
        <style jsx global>{`
          .markdoc-container p, 
          .markdoc-container h1, 
          .markdoc-container h2, 
          .markdoc-container h3, 
          .markdoc-container h4, 
          .markdoc-container h5, 
          .markdoc-container h6, 
          .markdoc-container li, 
          .markdoc-container a, 
          .markdoc-container span, 
          .markdoc-container div {
            color: #000000;
          }
        `}</style>
        <Box className="markdoc-content" style={{ 
          fontSize: '16px', 
          lineHeight: 1.7, 
          color: '#000000' 
        }}>
          {renderMarkdoc(markdown)}
        </Box>
      </Paper>
    );
  }
  
  // If we're loading, show loader
  if (isLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Loader size="lg" />
      </Box>
    );
  }

  // If there's an error, show error message
  if (errorMessage) {
    return (
      <Alert 
        color="red" 
        title="Error loading document" 
        icon={<AlertCircle size={16} />}
      >
        {errorMessage}
        <Button 
          variant="light" 
          size="sm" 
          mt="md" 
          leftSection={<RefreshCw size={16} />}
          onClick={onRefresh}
        >
          Try again
        </Button>
      </Alert>
    );
  }

  // If no data available, show empty message
  if (!data) {
    return (
      <Alert 
        color="gray" 
        title="No content" 
        icon={<AlertCircle size={16} />}
      >
        No document content is available.
        <Button 
          variant="light" 
          size="sm" 
          mt="md" 
          leftSection={<RefreshCw size={16} />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
      </Alert>
    );
  }

  // Generate markdown from data (fallback if direct markdown isn't available)
  const generateMarkdown = () => {
    let md = '';

    // Title
    if (data.title) {
      md += `# ${data.title}\n\n`;
    }
    
    // Abstract
    if (data.abstract) {
      md += `## Abstract\n\n${data.abstract}\n\n`;
    }
    
    // Contributors
    if (data.contributors) {
      md += `## Contributors\n\n${data.contributors}\n\n`;
    }
    
    // Introduction
    if (data.introduction) {
      md += `## Introduction\n\n${data.introduction}\n\n`;
    }
    
    // Chapters and passages
    if (data.chapters && data.chapters.length > 0) {
      data.chapters.forEach((chapter, index) => {
        md += `## ${chapter.title || `Chapter ${index + 1}`}\n\n`;
        
        // If passages match chapters, add the passage content
        if (data.passages && data.passages[index]) {
          md += `${data.passages[index]}\n\n`;
        }
      });
    } else if (data.passages && data.passages.length > 0) {
      // If no chapters but passages exist
      data.passages.forEach((passage, index) => {
        md += `## Section ${index + 1}\n\n${passage}\n\n`;
      });
    }
    
    // Conclusion
    if (data.conclusion) {
      md += `## Conclusion\n\n${data.conclusion}\n\n`;
    }
    
    // References
    if (data.references && data.references.length > 0) {
      md += `## References\n\n`;
      data.references.forEach((ref, index) => {
        md += `${index + 1}. ${ref.item}\n`;
      });
      md += '\n';
    }
    
    return md;
  };

  // Render the generated markdown using Markdoc
  const markdownContent = generateMarkdown();
  
  return (
    <Paper
      p="xl"
      bg="white"
      c="black"
      radius="md"
      style={{ 
        position: 'relative',
        color: '#000000',
        backgroundColor: '#ffffff',
        borderRadius: '8px'
      }}
      className="markdoc-container"
    >
      <style jsx global>{`
        .markdoc-container p, 
        .markdoc-container h1, 
        .markdoc-container h2, 
        .markdoc-container h3, 
        .markdoc-container h4, 
        .markdoc-container h5, 
        .markdoc-container h6, 
        .markdoc-container li, 
        .markdoc-container a, 
        .markdoc-container span, 
        .markdoc-container div {
          color: #000000;
        }
      `}</style>
      <Box className="markdoc-content" style={{ 
        fontSize: '16px', 
        lineHeight: 1.7, 
        color: '#000000' 
      }}>
        {renderMarkdoc(markdownContent)}
      </Box>
    </Paper>
  );
}

export default DocumentMarkdocRenderer;