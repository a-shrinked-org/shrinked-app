import React from 'react';
import { Box, Text, Paper, Loader, Alert, Button, Progress, Title, Stack } from '@mantine/core';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import Markdoc from '@markdoc/markdoc';

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
  
  // Clean and properly format references in the markdown content
  const preprocessMarkdown = (content: string) => {
    // First, create anchor targets for references
    let processed = content.replace(
      /\[\[(\d+)\]\]\(#ts-(\d+)\)/g,
      (match, num, id) => `<a id="ts-${id}" class="ref-target"></a>`
    );
    
    // Then handle references in text
    processed = processed.replace(
      /\[\[([^\]]+)\]\]\(#ts-(\d+)\)/g,
      (match, text, id) => `${text} <a href="#ts-${id}" class="citation-ref">[${id}]</a>`
    );
    
    return processed;
  };
  
  // Render markdown content using Markdoc
  const renderMarkdoc = (content: string) => {
    try {
      // Preprocess the markdown to handle references properly
      const processedContent = preprocessMarkdown(content);
      
      // Parse the markdown content
      const ast = Markdoc.parse(processedContent);
      
      // Transform and render the content
      const contentAst = Markdoc.transform(ast);
      
      // Render to HTML
      let html = Markdoc.renderers.html(contentAst);
      
      // Apply heading styles by replacing h1-h6 tags with appropriate Mantine Title classes
      // (We'll add custom CSS to style these)
      html = html
        .replace(/<h1([^>]*)>(.*?)<\/h1>/g, '<div class="mantine-title-h1"$1>$2</div>')
        .replace(/<h2([^>]*)>(.*?)<\/h2>/g, '<div class="mantine-title-h2"$1>$2</div>')
        .replace(/<h3([^>]*)>(.*?)<\/h3>/g, '<div class="mantine-title-h3"$1>$2</div>')
        .replace(/<h4([^>]*)>(.*?)<\/h4>/g, '<div class="mantine-title-h4"$1>$2</div>')
        .replace(/<h5([^>]*)>(.*?)<\/h5>/g, '<div class="mantine-title-h5"$1>$2</div>')
        .replace(/<h6([^>]*)>(.*?)<\/h6>/g, '<div class="mantine-title-h6"$1>$2</div>');
      
      return html;
    } catch (error) {
      console.error('Error rendering Markdoc:', error);
      return '<div>Error rendering content</div>';
    }
  };
  
  // If markdown content is directly provided, render it instead of generating
  if (markdown) {
    return (
      <Paper
        p="xl" 
        bg="white"
        c="black" 
        radius="md"
        className="markdoc-container"
      >
        <style jsx global>{`
          /* Mantine title styles */
          .mantine-title-h1 {
            font-size: 2.25rem;
            font-weight: 700;
            line-height: 1.3;
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: #000000;
          }
          
          .mantine-title-h2 {
            font-size: 1.875rem;
            font-weight: 600;
            line-height: 1.35;
            margin-top: 1.75rem;
            margin-bottom: 0.75rem;
            color: #000000;
          }
          
          .mantine-title-h3 {
            font-size: 1.5rem;
            font-weight: 600;
            line-height: 1.4;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            color: #000000;
          }
          
          .mantine-title-h4 {
            font-size: 1.25rem;
            font-weight: 600;
            line-height: 1.45;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            color: #000000;
          }
          
          /* Citation reference styling */
          .citation-ref {
            color: #0066cc;
            text-decoration: none;
          }
          
          .citation-ref:hover {
            text-decoration: underline;
          }
          
          /* General text styling */
          .markdoc-container p {
            margin-bottom: 1rem;
            line-height: 1.7;
          }
          
          .markdoc-container a {
            color: #0066cc;
          }
          
          /* Reference target styling */
          .markdoc-container [id^="ts-"] {
            scroll-margin-top: 2rem;
          }
          
          /* Lists styling */
          .markdoc-container ul, .markdoc-container ol {
            margin-bottom: 1rem;
            padding-left: 2rem;
          }
          
          .markdoc-container li {
            margin-bottom: 0.5rem;
          }
        `}</style>
        <div 
          className="markdoc-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdoc(markdown) }}
        />
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

  // Render the generated markdown
  const markdownContent = generateMarkdown();
  
  return (
    <Paper
      p="xl"
      bg="white"
      c="black" 
      radius="md"
      className="markdoc-container"
    >
      <style jsx global>{`
        /* Mantine title styles */
        .mantine-title-h1 {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #000000;
        }
        
        .mantine-title-h2 {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
          font-size: 1.875rem;
          font-weight: 600;
          line-height: 1.35;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          color: #000000;
        }
        
        .mantine-title-h3 {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.4;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #000000;
        }
        
        .mantine-title-h4 {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.45;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #000000;
        }
        
        /* Citation reference styling */
        .citation-ref {
          color: #228be6;
          text-decoration: none;
          font-weight: normal;
        }
        
        .citation-ref:hover {
          text-decoration: underline;
        }
        
        /* Reference target styling */
        .ref-target {
          display: inline;
          position: relative;
        }
        
        /* General text styling */
        .markdoc-container p {
          margin-bottom: 1rem;
          line-height: 1.7;
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
          font-size: 1rem;
          color: #000000;
        }
        
        .markdoc-container a {
          color: #0066cc;
        }
        
        /* Reference target styling */
        .markdoc-container [id^="ts-"] {
          scroll-margin-top: 2rem;
        }
        
        /* Lists styling */
        .markdoc-container ul, .markdoc-container ol {
          margin-bottom: 1rem;
          padding-left: 2rem;
        }
        
        .markdoc-container li {
          margin-bottom: 0.5rem;
        }
      `}</style>
      <div
        className="markdoc-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdoc(markdownContent) }}
      />
    </Paper>
  );
}

export default DocumentMarkdocRenderer;