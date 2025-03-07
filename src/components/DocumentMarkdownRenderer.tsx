import React from 'react';
import { Box, Text, Paper, Loader, Alert, Button, Progress } from '@mantine/core';
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

// Interface for component props
interface HeadingProps {
  level: number;
  children: React.ReactNode;
}

interface ParagraphProps {
  children: React.ReactNode;
}

interface LinkProps {
  href: string;
  children: React.ReactNode;
}

// Custom styles for markdoc content
const markdocStyles = {
  content: {
    fontSize: '16px',
    lineHeight: 1.7,
    color: '#000000',
  },
  container: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '20px',
  }
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
  
  // Render markdown content using Markdoc with enhanced reference support
  const renderMarkdoc = (content: string) => {
    try {
      // Process references in the markdown to support academic-style citations
      // Example: [text](#ts-43) -> <a href="#ts-43" id="ref-ts-43">text</a>
      const processedContent = content.replace(
        /\[\[([^\]]+)\]\]\(#(ts-\d+)\)/g, 
        (match, text, id) => `[${text}](#${id}){#ref-${id}}`
      );
      
      // Parse the markdown content
      const ast = Markdoc.parse(processedContent);
      
      // Define a custom schema with enhanced support for references
      const schema = {
        nodes: {
          document: {
            render: 'div'
          },
          heading: {
            render: 'heading',
            attributes: {
              level: { type: Number, required: true },
              id: { type: String }
            }
          },
          paragraph: {
            render: 'p',
            attributes: {
              id: { type: String }
            }
          },
          link: {
            render: 'a',
            attributes: {
              href: { type: String },
              title: { type: String },
              id: { type: String }
            }
          },
          list: {
            render: ({ ordered }) => ordered ? 'ol' : 'ul',
            attributes: {
              id: { type: String }
            }
          },
          item: {
            render: 'li',
            attributes: {
              id: { type: String }
            }
          },
          blockquote: {
            render: 'blockquote',
            attributes: {
              id: { type: String }
            }
          },
          image: {
            render: 'img',
            attributes: {
              src: { type: String },
              alt: { type: String },
              id: { type: String }
            }
          },
          table: {
            render: 'table',
            attributes: {
              id: { type: String }
            }
          },
          thead: {
            render: 'thead'
          },
          tbody: {
            render: 'tbody'
          },
          tr: {
            render: 'tr'
          },
          th: {
            render: 'th',
            attributes: {
              colspan: { type: String },
              rowspan: { type: String },
              width: { type: String },
              align: { type: String }
            }
          },
          td: {
            render: 'td',
            attributes: {
              colspan: { type: String },
              rowspan: { type: String },
              width: { type: String },
              align: { type: String }
            }
          },
          code: {
            render: 'code',
            attributes: {
              language: { type: String }
            }
          }
        },
        tags: {
          ref: {
            render: 'a',
            attributes: {
              id: { type: String, required: true },
              href: { type: String, required: true }
            }
          },
          cite: {
            render: 'cite',
            attributes: {
              id: { type: String }
            }
          }
        },
        variables: {
          currentYear: new Date().getFullYear()
        },
        functions: {
          uppercase: (str: string) => str.toUpperCase(),
          lowercase: (str: string) => str.toLowerCase()
        }
      };
      
      // Additional configuration for Markdoc
      const config = {
        nodes: {
          link: {
            transform(node, config) {
              const attributes = node.transformAttributes(config);
              const children = node.transformChildren(config);
              
              // Handle ID annotations for references
              const id = node.attributes.find(attr => attr.name === 'id')?.value;
              
              // Special handling for academic citations
              if (attributes.href && attributes.href.startsWith('#ts-')) {
                return new Markdoc.Tag(
                  'a',
                  { 
                    href: attributes.href,
                    id: id,
                    className: 'citation-link'
                  },
                  children
                );
              }
              
              return new Markdoc.Tag('a', attributes, children);
            }
          }
        }
      };
      
      // Transform AST using enhanced schema and config
      const contentAst = Markdoc.transform(ast, {
        ...schema,
        ...config
      });
      
      // Render the content with HTML
      const html = Markdoc.renderers.html(contentAst);
      
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
        style={markdocStyles.container}
        className="markdoc-container"
      >
        <style jsx global>{`
          .markdoc-container h1 {
            font-size: 2.25rem;
            font-weight: 700;
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: #000000;
          }
          .markdoc-container h2 {
            font-size: 1.875rem;
            font-weight: 600;
            margin-top: 1.75rem;
            margin-bottom: 0.75rem;
            color: #000000;
          }
          .markdoc-container h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            color: #000000;
          }
          .markdoc-container h4 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            color: #000000;
          }
          .markdoc-container h5 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            color: #000000;
          }
          .markdoc-container h6 {
            font-size: 1rem;
            font-weight: 600;
            margin-top: 1rem;
            margin-bottom: 0.5rem;
            color: #000000;
          }
          .markdoc-container p {
            margin-bottom: 1rem;
            color: #000000;
          }
          .markdoc-container ul, .markdoc-container ol {
            margin-bottom: 1rem;
            padding-left: 2rem;
            color: #000000;
          }
          .markdoc-container li {
            margin-bottom: 0.5rem;
            color: #000000;
          }
          .markdoc-container a {
            color: #0066cc;
            text-decoration: underline;
          }
          /* Special styling for citation links */
          .markdoc-container a.citation-link {
            color: #0066cc;
            text-decoration: none;
            font-size: 0.8em;
            vertical-align: super;
            line-height: 0;
            padding: 0 2px;
          }
          .markdoc-container a.citation-link:hover {
            text-decoration: underline;
          }
          /* Reference section styling */
          .markdoc-container .references {
            margin-top: 3rem;
            padding-top: 1.5rem;
            border-top: 1px solid #e0e0e0;
          }
          .markdoc-container .references h2 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }
          .markdoc-container .references ol {
            margin-left: 0;
            padding-left: 1.5rem;
          }
          .markdoc-container .references li {
            margin-bottom: 0.75rem;
          }
          /* Target for citation links */
          .markdoc-container [id^="ts-"] {
            scroll-margin-top: 2rem;
          }
          .markdoc-container blockquote {
            border-left: 4px solid #e0e0e0;
            padding-left: 1rem;
            font-style: italic;
            margin: 1rem 0;
            color: #000000;
          }
          .markdoc-container table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
          }
          .markdoc-container th, .markdoc-container td {
            border: 1px solid #e0e0e0;
            padding: 0.5rem;
            text-align: left;
            color: #000000;
          }
          .markdoc-container th {
            background-color: #f5f5f5;
            font-weight: 600;
          }
          .markdoc-container img {
            max-width: 100%;
            height: auto;
          }
          .markdoc-container code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-size: 0.9em;
            color: #000000;
          }
          .markdoc-container pre {
            background-color: #f5f5f5;
            padding: 1rem;
            border-radius: 5px;
            overflow-x: auto;
            margin: 1rem 0;
          }
          .markdoc-container pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            color: #000000;
          }
          /* Markdoc tags and annotations styling */
          .markdoc-container .tag-container {
            margin: 1rem 0;
            padding: 1rem;
            background-color: #f9f9f9;
            border-radius: 5px;
            border-left: 3px solid #0066cc;
          }
          /* Variables styling */
          .markdoc-container .variable {
            font-style: italic;
            color: #0066cc;
          }
        `}</style>
        <div 
          style={markdocStyles.content}
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

  // Render the generated markdown using Markdoc
  const markdownContent = generateMarkdown();
  
  return (
    <Paper
      p="xl"
      bg="white"
      c="black"
      radius="md"
      style={markdocStyles.container}
      className="markdoc-container"
    >
      <style jsx global>{`
        .markdoc-container h1 {
          font-size: 2.25rem;
          font-weight: 700;
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #000000;
        }
        .markdoc-container h2 {
          font-size: 1.875rem;
          font-weight: 600;
          margin-top: 1.75rem;
          margin-bottom: 0.75rem;
          color: #000000;
        }
        .markdoc-container h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #000000;
        }
        .markdoc-container h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #000000;
        }
        .markdoc-container h5 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #000000;
        }
        .markdoc-container h6 {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #000000;
        }
        .markdoc-container p {
          margin-bottom: 1rem;
          color: #000000;
        }
        .markdoc-container ul, .markdoc-container ol {
          margin-bottom: 1rem;
          padding-left: 2rem;
          color: #000000;
        }
        .markdoc-container li {
          margin-bottom: 0.5rem;
          color: #000000;
        }
        .markdoc-container a {
          color: #0066cc;
          text-decoration: underline;
        }
        /* Special styling for citation links */
        .markdoc-container a.citation-link {
          color: #0066cc;
          text-decoration: none;
          font-size: 0.8em;
          vertical-align: super;
          line-height: 0;
          padding: 0 2px;
        }
        .markdoc-container a.citation-link:hover {
          text-decoration: underline;
        }
        /* Reference section styling */
        .markdoc-container .references {
          margin-top: 3rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e0e0e0;
        }
        .markdoc-container .references h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdoc-container .references ol {
          margin-left: 0;
          padding-left: 1.5rem;
        }
        .markdoc-container .references li {
          margin-bottom: 0.75rem;
        }
        /* Target for citation links */
        .markdoc-container [id^="ts-"] {
          scroll-margin-top: 2rem;
        }
        .markdoc-container blockquote {
          border-left: 4px solid #e0e0e0;
          padding-left: 1rem;
          font-style: italic;
          margin: 1rem 0;
          color: #000000;
        }
        .markdoc-container table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }
        .markdoc-container th, .markdoc-container td {
          border: 1px solid #e0e0e0;
          padding: 0.5rem;
          text-align: left;
          color: #000000;
        }
        .markdoc-container th {
          background-color: #f5f5f5;
          font-weight: 600;
        }
        .markdoc-container img {
          max-width: 100%;
          height: auto;
        }
        .markdoc-container code {
          font-family: monospace;
          background-color: #f5f5f5;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-size: 0.9em;
          color: #000000;
        }
        .markdoc-container pre {
          background-color: #f5f5f5;
          padding: 1rem;
          border-radius: 5px;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .markdoc-container pre code {
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          color: #000000;
        }
        /* Markdoc tags and annotations styling */
        .markdoc-container .tag-container {
          margin: 1rem 0;
          padding: 1rem;
          background-color: #f9f9f9;
          border-radius: 5px;
          border-left: 3px solid #0066cc;
        }
        /* Variables styling */
        .markdoc-container .variable {
          font-style: italic;
          color: #0066cc;
        }
      `}</style>
      <div 
        style={markdocStyles.content}
        className="markdoc-content"
        dangerouslySetInnerHTML={{ __html: renderMarkdoc(markdownContent) }}
      />
    </Paper>
  );
}

export default DocumentMarkdocRenderer;