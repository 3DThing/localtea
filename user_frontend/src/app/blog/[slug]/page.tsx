import type { Metadata } from 'next';
import ArticleDetailClient from './ArticleDetailClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localtea.ru';
// Для SSR используем внутренний адрес Docker, для клиента - публичный
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  preview_image?: string;
  created_at: string;
  updated_at?: string;
  views_count?: number;
  likes_count?: number;
}

async function getArticle(slug: string): Promise<Article | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/blog/articles/${slug}`, {
      next: { revalidate: 300 }, // Кэшировать на 5 минут
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return null;
  }
}

// Извлечение чистого текста из HTML
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: 'Статья не найдена | LocalTea',
      description: 'Запрошенная статья не найдена в нашем блоге.',
    };
  }

  const title = `${article.title} | Блог LocalTea`;
  const plainContent = stripHtml(article.content);
  const description = plainContent.slice(0, 160) + (plainContent.length > 160 ? '...' : '');
  
  const image = article.preview_image || `${SITE_URL}/og-default.png`;

  return {
    title,
    description,
    keywords: `${article.title}, чай, блог о чае, localtea, чайная культура, статьи о чае`,
    
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/blog/${slug}`,
      siteName: 'LocalTea',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      locale: 'ru_RU',
      type: 'article',
      publishedTime: article.created_at,
      modifiedTime: article.updated_at,
      authors: ['LocalTea'],
    },
    
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    
    alternates: {
      canonical: `${SITE_URL}/blog/${slug}`,
    },
  };
}

// JSON-LD структурированные данные для статьи
async function generateJsonLd(slug: string) {
  const article = await getArticle(slug);
  
  if (!article) return null;
  
  const plainContent = stripHtml(article.content);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: plainContent.slice(0, 160),
    image: article.preview_image,
    url: `${SITE_URL}/blog/${article.slug}`,
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    author: {
      '@type': 'Organization',
      name: 'LocalTea',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'LocalTea',
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon/web/icons8-чай-apple-sf-black-96.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${article.slug}`,
    },
  };
}

export default async function ArticleDetailPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  const jsonLd = await generateJsonLd(slug);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ArticleDetailClient />
    </>
  );
}
