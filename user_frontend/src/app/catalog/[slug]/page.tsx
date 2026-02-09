import type { Metadata } from 'next';
import ProductDetailClient from './ProductDetailClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localtea.ru';
// Для SSR используем внутренний адрес Docker, для клиента - публичный
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Product {
  id: number;
  title: string;
  slug: string;
  description?: string;
  lore_description?: string;
  category?: {
    name: string;
  };
  tea_type?: string;
  images?: Array<{
    url: string;
    is_main?: boolean;
  }>;
  skus?: Array<{
    price_cents: number;
    discount_cents?: number;
  }>;
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/catalog/products/${slug}`, {
      next: { revalidate: 300 }, // Кэшировать на 5 минут
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch product:', error);
    return null;
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Товар не найден | LocalTea',
      description: 'Запрошенный товар не найден в нашем каталоге.',
    };
  }

  const title = `${product.title} | Купить чай | LocalTea`;
  const description = product.lore_description 
    || product.description 
    || `${product.title} - эксклюзивный чай из коллекции LocalTea. ${product.category?.name || 'Чай'} высочайшего качества.`;
  
  const mainImage = product.images?.find(img => img.is_main)?.url 
    || product.images?.[0]?.url
    || `${SITE_URL}/og-default.png`;

  // Получаем минимальную цену
  const minPrice = product.skus?.reduce((min, sku) => {
    const price = (sku.price_cents - (sku.discount_cents || 0)) / 100;
    return price < min ? price : min;
  }, Infinity);

  return {
    title,
    description: description.slice(0, 160),
    keywords: `${product.title}, чай, купить чай, ${product.category?.name || ''}, ${product.tea_type || ''}, localtea, эксклюзивный чай`.trim(),
    
    openGraph: {
      title,
      description: description.slice(0, 160),
      url: `${SITE_URL}/catalog/${slug}`,
      siteName: 'LocalTea',
      images: [
        {
          url: mainImage,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
      locale: 'ru_RU',
      type: 'website',
    },
    
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 160),
      images: [mainImage],
    },
    
    alternates: {
      canonical: `${SITE_URL}/catalog/${slug}`,
    },
    
    other: minPrice && minPrice !== Infinity ? {
      'product:price:amount': minPrice.toString(),
      'product:price:currency': 'RUB',
    } : {},
  };
}

// JSON-LD структурированные данные для товара
async function generateJsonLd(slug: string) {
  const product = await getProduct(slug);
  
  if (!product) return null;
  
  const mainImage = product.images?.find(img => img.is_main)?.url 
    || product.images?.[0]?.url;
  
  const minPrice = product.skus?.reduce((min, sku) => {
    const price = (sku.price_cents - (sku.discount_cents || 0)) / 100;
    return price < min ? price : min;
  }, Infinity);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.lore_description || product.description,
    image: mainImage,
    url: `${SITE_URL}/catalog/${product.slug}`,
    brand: {
      '@type': 'Brand',
      name: 'LocalTea',
    },
    category: product.category?.name || 'Чай',
    offers: minPrice && minPrice !== Infinity ? {
      '@type': 'Offer',
      price: minPrice,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'LocalTea',
      },
    } : undefined,
  };
}

export default async function ProductDetailPage({ 
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
      <ProductDetailClient />
    </>
  );
}
