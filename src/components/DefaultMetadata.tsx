// components/DefaultMetadata.tsx
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface DefaultMetadataProps {
  title?: string;
  description?: string;
}

export const DefaultMetadata: React.FC<DefaultMetadataProps> = ({
  title = 'Shrinked',
  description = 'Your default description here'
}) => {
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://yourwebsite.com/" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content="/og-image.png" />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content="https://yourwebsite.com/" />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content="/twitter-image.png" />
    </Helmet>
  );
};