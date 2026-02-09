import { MetadataRoute } from 'next';

// Генерировать sitemap динамически при каждом запросе
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate каждый час

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localtea.ru';
// Для SSR используем внутренний адрес Docker, для клиента - публичный
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Product {
  slug: string;
  updated_at?: string;
  created_at?: string;
}

interface Article {
  slug: string;
  updated_at?: string;
  created_at?: string;
}

interface Category {
  id: number;
  slug?: string;
}

async function getProducts(): Promise<Product[]> {
  try {
    // API ограничивает limit до 100, делаем пагинацию если нужно
    const allProducts: Product[] = [];
    let offset = 0;
    const limit = 100;
    
    while (true) {
      const response = await fetch(`${API_URL}/api/v1/catalog/products?limit=${limit}&offset=${offset}`, {
        next: { revalidate: 3600 },
      });
      if (!response.ok) break;
      const data = await response.json();
      const items = data.items || [];
      allProducts.push(...items);
      
      // Если получили меньше чем limit, значит это последняя страница
      if (items.length < limit) break;
      offset += limit;
    }
    
    return allProducts;
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
    return [];
  }
}

async function getArticles(): Promise<Article[]> {
  try {
    const response = await fetch(`${API_URL}/api/v1/blog/articles/?limit=100`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    // API возвращает массив напрямую
    return Array.isArray(data) ? data : (data.items || []);
  } catch (error) {
    console.error('Failed to fetch articles for sitemap:', error);
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const response = await fetch(`${API_URL}/api/v1/catalog/categories`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Failed to fetch categories for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles, categories] = await Promise.all([
    getProducts(),
    getArticles(),
    getCategories(),
  ]);

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/catalog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/for-business`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/payment-delivery`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/offer`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/bug-bounty`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Страницы категорий
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/catalog?category=${category.id}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Страницы товаров
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/catalog/${product.slug}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Страницы статей
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: article.updated_at ? new Date(article.updated_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...categoryPages, ...productPages, ...articlePages];
}
