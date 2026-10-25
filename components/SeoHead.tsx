import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../lib/tools';

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  schema?: object;
}

const SeoHead: React.FC<SeoHeadProps> = ({ title, description, path, schema }) => {
  const url = `${SITE_URL}${path === '/' ? '/' : path}`;
  const fullTitle = title.includes('Dev Tools') ? title : `${title} | Dev Tools`;

  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    url,
    description,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Dev Tools" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

      <script type="application/ld+json">{JSON.stringify(schema ?? defaultSchema)}</script>
    </Helmet>
  );
};

export default SeoHead;
