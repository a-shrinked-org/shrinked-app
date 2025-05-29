import React from 'react';
import { Box, Text, Paper, Loader, Alert, Button, Progress, Title, Stack } from '@mantine/core';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';
import Markdoc from '@markdoc/markdoc';

interface DocumentMarkdocRendererProps {
  data?: {
    title?: string;
    abstract?: string;
    contributors?: string;
    introduction?: string;
    conclusion?: string;
    passages?: string;
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
  const status = processingStatus?.toLowerCase();

  const isProcessing = status === 'processing' || status === 'in_progress' || status === 'pending';
  const isFailed = status === 'error' || status === 'failed';
  const isCompleted = status === 'completed';

  if (isLoading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <Loader size="lg" />
      </Box>
    );
  }

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

  if (isFailed) {
    return (
      <Alert 
        color="red" 
        title="Processing Failed" 
        icon={<AlertCircle size={16} />}
      >
        The document processing failed. Please try again or contact support.
        <Button 
          variant="light" 
          size="sm" 
          mt="md" 
          leftSection={<RefreshCw size={16} />}
          onClick={onRefresh}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  const processReferences = (html: string): string => {
    console.log('=== DEBUG: processReferences ===');
    console.log('Input HTML sample:', html.substring(0, 500) + '...');
    
    // Look for what Markdoc actually rendered from *[306](url)*
    const italicLinkPattern = /<em><a[^>]*>.*?<\/a><\/em>/g;
    const italicLinks = html.match(italicLinkPattern);
    if (italicLinks) {
      console.log('Found italic links:', italicLinks.slice(0, 3));
    }
    
    // Look for any reference-like patterns
    const anyRefPattern = /\*\*?\d+[^a-zA-Z]/g;
    const anyRefs = html.match(anyRefPattern);
    if (anyRefs) {
      console.log('Found reference-like patterns:', anyRefs.slice(0, 5));
    }
    
    let processed = html;
    
    // Handle the italic reference link format from *[306](url)*
    // Markdoc renders *[306](url)* as <em><a href="url">306</a></em> (WITHOUT brackets)
    const beforeItalic = processed;
    processed = processed.replace(
      /<em><a href="([^"]*#ts-\d+)">(\d+)<\/a><\/em>/g,
      (match, url, num) => {
        console.log(`Replacing italic: ${match} -> <em><a href="${url}" class="citation-ref">[${num}]</a></em>`);
        return `<em><a href="${url}" class="citation-ref">[${num}]</a></em>`;
      }
    );
    
    // Also handle if Markdoc keeps the brackets: <em><a href="url">[306]</a></em>
    processed = processed.replace(
      /<em><a href="([^"]*#ts-\d+)">(\[\d+\])<\/a><\/em>/g,
      (match, url, num) => {
        console.log(`Replacing italic with brackets: ${match} -> <em><a href="${url}" class="citation-ref">${num}</a></em>`);
        return `<em><a href="${url}" class="citation-ref">${num}</a></em>`;
      }
    );
    
    // Handle existing [[num]](#ts-num) format (for backward compatibility)
    processed = processed.replace(
      /\[\[(\d+)\]\]\(#ts-(\d+)\)/g,
      '<a href="#ts-$2" class="citation-ref">[$1]</a>'
    );
    
    // Handle regular [num](#ts-num) format  
    processed = processed.replace(
      /\[(\d+)\]\(#ts-(\d+)\)/g,
      '<a href="#ts-$2" class="citation-ref">[$1]</a>'
    );
    
    // Clean up any leftover reference markers
    processed = processed.replace(/\{#ts-\d+\}/g, '');
    
    // Format reference section
    processed = processed.replace(
      /<p>##### \{#ts-(\d+)\}<\/p>\n<p>(\d+)\.\s+\[([^\]]+)\]\(None#t=(\d+)\):\s+(.+?)<\/p>/g,
      '<p id="ts-$1">$2. [$3]: $5</p>'
    );
    
    if (beforeItalic !== processed) {
      console.log('Output HTML sample:', processed.substring(0, 500) + '...');
    } else {
      console.log('No changes made to HTML');
    }
    
    return processed;
  };
  
  const preprocessMarkdown = (content: string): string => {
    let processed = content;
    // Convert chapters to proper list format
    processed = processed.replace(
      /## Chapters\n([\s\S]+?)(?=\n##|$)/g,
      (match, chaptersContent) => {
        const formattedChapters = chaptersContent
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const cleanLine = line.replace(/^[-*]\s*/, '').trim();
            const timestampMatch = cleanLine.match(/\[(\d+)\]$/);
            if (timestampMatch) {
              const tsNum = timestampMatch[1];
              const cleanText = cleanLine.replace(/\[\d+\]$/, '').trim();
              return `- ${cleanText} [[${tsNum}](#ts-${tsNum})]`;
            }
            return `- ${cleanLine}`;
          })
          .join('\n');
        return `## Chapters\n${formattedChapters}`;
      }
    );
    // Ensure passages have proper sub-headers
    processed = processed.replace(
      /## Passages\n([\s\S]+?)(?=\n##|$)/g,
      (match, passagesContent) => {
        const formattedPassages = passagesContent
          .split('\n\n')
          .filter((section: string) => section.trim())
          .map((section: string) => {
            const lines = section.split('\n');
            const header = lines[0].trim();
            const content = lines.slice(1).join('\n').trim();
            if (!header.startsWith('###')) {
              return `### ${header}\n${content}`;
            }
            return section;
          })
          .join('\n\n');
        return `## Passages\n${formattedPassages}`;
      }
    );
    return processed;
  };

  // Fix the nested list structure in HTML
  const fixNestedLists = (html: string): string => {
    let result = html;
    
    // Clean up reference entries with numbered timestamp links
    // This very specific pattern matches the structure you shared:
    // <li><ol start="289"><li><a href="None#t=1350">00:22:30</a>: Probably more.</li></ol></li>
    result = result.replace(/<li><ol\s+start="\d+"><li>(.*?)<\/li><\/ol><\/li>/g, '<li>$1</li>');
    
    // Fix general nested list items (simple case)
    result = result.replace(/<li>\s*<ul>\s*<li>(.*?)<\/li>\s*<\/ul>\s*<\/li>/g, '<li>$1</li>');
    result = result.replace(/<li>\s*<ol>\s*<li>(.*?)<\/li>\s*<\/ol>\s*<\/li>/g, '<li>$1</li>');
    
    // Fix empty lists that might remain
    result = result.replace(/<ul>\s*<\/ul>/g, '');
    result = result.replace(/<ol>\s*<\/ol>/g, '');
    
    // Second pass for deeply nested structures
    result = result.replace(/<li><ol[^>]*><li>(.*?)<\/li><\/ol><\/li>/g, '<li>$1</li>');
    result = result.replace(/<li><ul[^>]*><li>(.*?)<\/li><\/ul><\/li>/g, '<li>$1</li>');
    
    return result;
  };

  const renderMarkdoc = (content: string) => {
    try {
      const processedContent = preprocessMarkdown(content);
      const ast = Markdoc.parse(processedContent);
      const contentAst = Markdoc.transform(ast);
      let html = Markdoc.renderers.html(contentAst);
      
      // Map headers to Mantine classes
      html = html
        .replace(/<h1([^>]*)>(.*?)<\/h1>/g, '<div class="mantine-title-h1"$1>$2</div>')
        .replace(/<h2([^>]*)>(.*?)<\/h2>/g, '<div class="mantine-title-h2"$1>$2</div>')
        .replace(/<h3([^>]*)>(.*?)<\/h3>/g, '<div class="mantine-title-h3"$1>$2</div>')
        .replace(/<h4([^>]*)>(.*?)<\/h4>/g, '<div class="mantine-title-h4"$1>$2</div>')
        .replace(/<h5([^>]*)>(.*?)<\/h5>/g, '<div class="mantine-title-h5"$1>$2</div>')
        .replace(/<h6([^>]*)>(.*?)<\/h6>/g, '<div class="mantine-title-h6"$1>$2</div>');
      
      // Fix nested lists
      html = fixNestedLists(html);
      
      return html;
    } catch (error) {
      console.error('Error rendering Markdoc:', error);
      return '<div>Error rendering content</div>';
    }
  };

  const generateMarkdown = () => {
    let md = '';
    if (data?.title) md += `# ${data.title}\n\n`;
    if (data?.abstract) md += `## Abstract\n${data.abstract}\n\n`;
    if (data?.contributors) md += `## Contributors\n${data.contributors}\n\n`;
    
    // Format chapters properly
    if (data?.chapters && data.chapters.length > 0) {
      md += `## Chapters\n`;
      md += data.chapters
        .map((chapter: { title: string }) => {
          const title = chapter.title.trim();
          const timestampMatch = title.match(/\[(\d+)\]$/);
          if (timestampMatch) {
            const tsNum = timestampMatch[1];
            const cleanTitle = title.replace(/\[\d+\]$/, '').trim();
            return `- ${cleanTitle} [[${tsNum}](#ts-${tsNum})]`;
          }
          return `- ${title}`;
        })
        .join('\n');
      md += '\n\n';
    }

    if (data?.introduction) md += `## Introduction\n${data.introduction}\n\n`;
    
    // Format passages with sub-headers
    if (data?.passages && data.passages.trim() && data.passages.trim() !== 'No passages provided') {
      md += `## Passages\n`;
      const passagesSections = data.passages.split('\n\n').filter((section: string) => section.trim());
      md += passagesSections
        .map((section: string) => {
          const lines = section.split('\n');
          const header = lines[0].trim();
          const content = lines.slice(1).join('\n').trim();
          return `### ${header}\n${content}`;
        })
        .join('\n\n');
      md += '\n\n';
    }

    if (data?.conclusion) md += `## Conclusion\n${data.conclusion}\n\n`;
    
    if (data?.references && data.references.length > 0) {
      md += `## References\n`;
      md += data.references
        .map((ref: { item: string }, index: number) => {
          const match = ref.item.match(/^(\d+)\.\s+\[([^\]]+)\](?:\((.*?)\))?:\s*(.+)$/);
          if (match) {
            const [, num, timestamp, url, text] = match;
            return `##### {#ts-${num}}\n${num}. [${timestamp}]${url ? `(${url})` : '(None#t=0)'}: ${text}`;
          }
          return ref.item;
        })
        .join('\n\n');
      md += '\n';
    }

    return md.trim();
  };

  const markdownContent = markdown || generateMarkdown();

  return (
    <Paper
      p="xl"
      bg="white"
      c="black"
      radius="md"
      className="markdoc-container"
    >
      <style jsx global>{`
        .mantine-title-h1, .mantine-title-h2, .mantine-title-h3, .mantine-title-h4, .mantine-title-h5, .mantine-title-h6 {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          color: #000000;
        }
        .mantine-title-h1 { font-size: 2.25rem; font-weight: 700; line-height: 1.3; margin-top: 2rem; margin-bottom: 1rem; }
        .mantine-title-h2 { font-size: 1.875rem; font-weight: 600; line-height: 1.35; margin-top: 1.75rem; margin-bottom: 0.75rem; }
        .mantine-title-h3 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        .mantine-title-h4 { font-size: 1.25rem; font-weight: 600; line-height: 1.45; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .mantine-title-h5 { font-size: 1.1rem; font-weight: 600; line-height: 1.5; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .mantine-title-h6 { font-size: 1rem; font-weight: 600; line-height: 1.5; margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .markdoc-container p {
          margin-bottom: 1rem; line-height: 1.7; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 1rem; color: #000000;
        }
        .citation-ref {
          color: #0066cc; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        .citation-ref:hover { text-decoration: underline; }
        .markdoc-container [id^="ts-"] { scroll-margin-top: 2rem; }
        
        /* Style for italic citation links */
        .markdoc-container em .citation-ref {
          font-style: italic;
          color: #0066cc;
          text-decoration: none;
        }
        .markdoc-container em .citation-ref:hover {
          text-decoration: underline;
        }
        
        /* Reset list styles to remove browser default styling first */
        .markdoc-container ul,
        .markdoc-container ol {
          list-style-type: none; /* Remove all bullet points first */
          margin: 0;
          padding: 0;
        }
        
        /* Then add our own styling */
        .markdoc-container ul {
          margin-bottom: 1rem; 
          padding-left: 2rem; 
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          list-style-type: disc; /* Add back disc bullets only for this container */
        }
        
        .markdoc-container ol {
          margin-bottom: 1rem; 
          padding-left: 2rem; 
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          list-style-type: decimal; /* Add back numeric bullets only for this container */
        }
        
        .markdoc-container a {
          color: rgb(161, 161, 161);
        }
        
        /* Menu-specific list styling - keep these free of bullets */
        .menu ul, .menu ol {
          list-style-type: none !important;
          margin: 0 !important;
          padding-left: 1rem !important;
        }
        
        .markdoc-container li { margin-bottom: 0.25rem; }
        .markdoc-container table {
          width: 100%; border-collapse: collapse; margin-bottom: 1rem; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
        .markdoc-container th, .markdoc-container td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; }
        .markdoc-container th { background-color: #f5f5f5; font-weight: 600; }
        .markdoc-container pre, .markdoc-container code {
          font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace; background-color: #f5f5f5; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em;
        }
        .markdoc-container pre { padding: 1em; overflow-x: auto; line-height: 1.5; }
        .markdoc-container pre code { background-color: transparent; padding: 0; }
        .markdoc-container blockquote { border-left: 4px solid #e0e0e0; margin-left: 0; padding-left: 1em; color: #555; font-style: italic; }
      `}</style>
      {markdownContent ? (
        <div
          className="markdoc-content"
          dangerouslySetInnerHTML={{ 
            __html: processReferences(renderMarkdoc(markdownContent)) 
          }}
        />
      ) : (
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
      )}
    </Paper>
  );
}

export default DocumentMarkdocRenderer;