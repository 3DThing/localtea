'use client';

import { 
  Container, 
  Title, 
  Text, 
  Button, 
  Group, 
  Box, 
  SimpleGrid, 
  Card,
  Stack,
  Badge,
  Image,
  Skeleton
} from '@mantine/core';
import { IconArrowRight, IconSparkles, IconLeaf, IconFlame, IconSnowflake } from '@tabler/icons-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { catalogApi, blogApi } from '@/lib/api';
import { ProductCard } from '@/components/catalog/ProductCard';
import { ArticleCard } from '@/components/blog/ArticleCard';

export default function HomePage() {
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => catalogApi.getProducts({ limit: 4 }),
  });

  const { data: articlesData, isLoading: articlesLoading } = useQuery({
    queryKey: ['featured-articles'],
    queryFn: () => blogApi.getArticles({ limit: 3 }),
  });

  const categories = categoriesData?.data || [];
  const products = productsData?.data?.items || [];
  const articles = articlesData?.data || [];

  return (
    <>
      {/* Hero Section */}
      <Box
        className="hero-section"
        style={{
          minHeight: '90vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          marginTop: '-80px',
          paddingTop: '80px',
        }}
      >
        {/* Background Image */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/forest-hero.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.95,
          }}
        />
        
        <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
          <Stack gap="xl" align="center" ta="center">
            <Badge 
              size="lg" 
              variant="gradient" 
              gradient={{ from: 'darkWood.4', to: 'darkWood.6' }}
              style={{ 
                animation: 'float 3s ease-in-out infinite',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                padding: '8px 16px',
                fontWeight: 400,
              }}
            >
              <Group gap="xs">
                <IconSparkles size={14} />
                Эллийская коллекция
              </Group>
            </Badge>

            <Title
              order={1}
              style={{
                fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                fontWeight: 700,
                lineHeight: 1.15,
                color: '#faf8f4',
                textShadow: '0 4px 18px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.5)',
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: '0.5px',
              }}
            >
              Лесная магия в каждой чашке
            </Title>

            <Text 
              size="xl" 
              maw={640}
              style={{ 
                lineHeight: 1.9,
                color: '#e8f0f8',
                textShadow: '0 3px 12px rgba(0, 0, 0, 0.65), 0 1px 5px rgba(0, 0, 0, 0.5)',
                fontWeight: 400,
                fontSize: '1.15rem',
              }}
            >
              Откройте для себя мир изысканных чаёв со всего мира. 
              Каждый сорт — это уникальная история вкуса и аромата.
            </Text>

            <Group gap="md" mt="xl">
              <Button
                component={Link}
                href="/catalog"
                size="lg"
                variant="filled"
                color="orange.7"
                rightSection={<IconArrowRight size={18} />}
                style={{
                  backgroundColor: '#d4894f',
                  boxShadow: '0 3px 12px rgba(0, 0, 0, 0.35), 0 1px 4px rgba(0, 0, 0, 0.25)',
                  transition: 'all 0.3s ease',
                  borderRadius: '12px',
                  padding: '14px 28px',
                  fontWeight: 500,
                }}
              >
                Открыть лесной каталог
              </Button>
              <Button
                component={Link}
                href="/about"
                size="lg"
                variant="outline"
                style={{ 
                  borderColor: 'rgba(255, 255, 255, 0.4)',
                  borderWidth: '1.5px',
                  color: '#ffffff',
                  backgroundColor: 'rgba(0, 0, 0, 0.15)',
                  borderRadius: '12px',
                  padding: '14px 28px',
                  fontWeight: 400,
                  backdropFilter: 'blur(4px)',
                }}
              >
                Легенда о LocalTea
              </Button>
            </Group>
          </Stack>
        </Container>

        {/* Scroll Indicator */}
        <Box
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'float 2s ease-in-out infinite',
          }}
        >
          <Text size="sm" c="dimmed">Прокрутите вниз</Text>
        </Box>
      </Box>

      {/* Features Section */}
      <Container size="xl" py={80}>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl" style={{ alignItems: 'center', justifyItems: 'center' }}>
          {[
            { icon: IconLeaf, title: 'Натуральный', description: 'Только органический чай без добавок' },
            { icon: IconFlame, title: 'Свежий', description: 'Доставка напрямую с плантаций' },
            { icon: IconSnowflake, title: 'Премиум', description: 'Лучшие сорта со всего мира' },
            { icon: IconSparkles, title: 'Волшебный', description: 'Уникальные вкусы и ароматы' },
          ].map((feature, index) => (
            <Card
              key={index}
              className="glow-card"
              p="xl"
              radius="lg"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}
            >
              <feature.icon size={40} style={{ color: '#e5ff00ff', marginBottom: 16 }} />
              <Text fw={600} size="lg" mb="xs">{feature.title}</Text>
              <Text size="sm" c="dimmed">{feature.description}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* Categories Section */}
      <Box 
        py={80} 
        style={{ 
          background: 'linear-gradient(180deg, transparent 0%, rgba(100, 70, 40, 0.08) 50%, transparent 100%)',
        }}
      >
        <Container size="xl">
          <Stack gap="xl">
            <Group justify="space-between" align="flex-end">
              <Stack gap="xs">
                <Text size="sm" c="orange" fw={600} tt="uppercase" style={{ letterSpacing: "2px" }}>Коллекции</Text>
                <Title order={2}>Наши категории</Title>
              </Stack>
              <Button 
                component={Link} 
                href="/catalog" 
                variant="subtle" 
                color="gray"
                rightSection={<IconArrowRight size={16} />}
              >
                Смотреть все
              </Button>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {categoriesLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} height={250} radius="lg" />
                ))
              ) : categories.length > 0 ? (
                categories.slice(0, 3).map((category: any) => (
                  <Link 
                    key={category.id} 
                    href={`/catalog?category=${category.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Box className="banner-card" h={250}>
                      <Image
                        src={category.image || 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600'}
                        alt={category.name}
                        h="100%"
                        style={{ objectFit: 'cover' }}
                      />
                      <Box
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: 24,
                          zIndex: 2,
                        }}
                      >
                        <Text size="xl" fw={700} c="white" mb="xs">{category.name}</Text>
                        <Text size="sm" c="gray.4" lineClamp={2}>{category.description}</Text>
                        <Button 
                          variant="white" 
                          size="sm" 
                          mt="md"
                          rightSection={<IconArrowRight size={14} />}
                        >
                          Открыть
                        </Button>
                      </Box>
                    </Box>
                  </Link>
                ))
              ) : (
                // Placeholder categories when no data
                [
                  { name: 'Зелёный чай', description: 'Освежающие сорта из Китая и Японии', image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600' },
                  { name: 'Чёрный чай', description: 'Классические насыщенные вкусы', image: 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600' },
                  { name: 'Улун', description: 'Полуферментированный чай с богатым ароматом', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600' },
                ].map((category, index) => (
                  <Link 
                    key={index} 
                    href={`/catalog`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Box className="banner-card" h={250}>
                      <Image
                        src={category.image}
                        alt={category.name}
                        h="100%"
                        style={{ objectFit: 'cover' }}
                      />
                      <Box
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: 24,
                          zIndex: 2,
                        }}
                      >
                        <Text size="xl" fw={700} c="#faf8f5" mb="xs" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)' }}>{category.name}</Text>
                        <Text size="sm" c="#e8dcc8" lineClamp={2} style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)' }}>{category.description}</Text>
                        <Button 
                          variant="white" 
                          size="sm" 
                          mt="md"
                          rightSection={<IconArrowRight size={14} />}
                          style={{
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                          }}
                        >
                          Открыть
                        </Button>
                      </Box>
                    </Box>
                  </Link>
                ))
              )}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Featured Products */}
      <Container size="xl" py={80}>
        <Stack gap="xl">
          <Group justify="space-between" align="flex-end">
            <Stack gap="xs">
              <Text size="sm" c="orange" fw={600} tt="uppercase" style={{ letterSpacing: "2px" }}>Рекомендуем</Text>
              <Title order={2}>Популярные товары</Title>
            </Stack>
            <Button 
              component={Link} 
              href="/catalog" 
              variant="subtle" 
              color="gray"
              rightSection={<IconArrowRight size={16} />}
            >
              Все товары
            </Button>
          </Group>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            {productsLoading ? (
              Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} height={350} radius="lg" />
              ))
            ) : products.length > 0 ? (
              products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              // Placeholder products
              Array(4).fill(0).map((_, i) => (
                <Card key={i} className="product-card" p={0}>
                  <Box className="image-wrapper" h={200}>
                    <Image
                      src={`https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop&q=80&sig=${i}`}
                      alt="Чай"
                      h="100%"
                      style={{ objectFit: 'cover' }}
                    />
                  </Box>
                  <Stack gap="xs" p="md">
                    <Text fw={600}>Премиум чай №{i + 1}</Text>
                    <Text size="sm" c="dimmed" lineClamp={2}>Изысканный вкус с нотками цветов</Text>
                    <Group justify="space-between" mt="xs">
                      <Text fw={700} c="violet">от 500 ₽</Text>
                      <Button size="xs" variant="light" color="violet">Подробнее</Button>
                    </Group>
                  </Stack>
                </Card>
              ))
            )}
          </SimpleGrid>
        </Stack>
      </Container>

      {/* Blog Section */}
      <Box 
        py={80} 
        style={{ 
          background: 'linear-gradient(180deg, transparent 0%, rgba(120, 80, 50, 0.08) 50%, transparent 100%)',
        }}
      >
        <Container size="xl">
          <Stack gap="xl">
            <Group justify="space-between" align="flex-end">
              <Stack gap="xs">
                <Text size="sm" c="orange" fw={600} tt="uppercase" style={{ letterSpacing: "2px" }}>Новости</Text>
                <Title order={2}>Наш блог</Title>
              </Stack>
              <Button 
                component={Link} 
                href="/blog" 
                variant="subtle" 
                color="gray"
                rightSection={<IconArrowRight size={16} />}
              >
                Все статьи
              </Button>
            </Group>

            <Stack gap="lg">
              {articlesLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Skeleton key={i} height={200} radius="lg" />
                ))
              ) : articles.length > 0 ? (
                articles.map((article: any) => (
                  <ArticleCard key={article.id} article={article} />
                ))
              ) : (
                // Placeholder articles
                [
                  { title: 'История чайной культуры', description: 'Погрузитесь в тысячелетнюю историю чая', views: 1234, likes: 89, comments: 12 },
                  { title: 'Как правильно заваривать пуэр', description: 'Секреты приготовления идеального пуэра', views: 876, likes: 45, comments: 8 },
                  { title: 'Топ-10 сортов зелёного чая', description: 'Лучшие сорта для ценителей', views: 2341, likes: 156, comments: 34 },
                ].map((article, index) => (
                  <ArticleCard 
                    key={index} 
                    article={{
                      id: index,
                      slug: `article-${index}`,
                      title: article.title,
                      content: article.description,
                      preview_image: `https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=400&fit=crop&q=80&sig=${index}`,
                      views_count: article.views,
                      likes_count: article.likes,
                      comments_count: article.comments,
                    }} 
                  />
                ))
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* CTA Section */}
      
        {/*
      <Container size="xl" py={80}>

        <Card
          className="glow-card"
          p={60}
          radius="xl"
          style={{
            background: 'linear-gradient(135deg, rgba(100, 70, 40, 0.25) 0%, rgba(80, 50, 20, 0.15) 100%)',
            textAlign: 'center',
          }}
        >
          
          <Stack gap="xl" align="center">
            <Title order={2}>
              Готовы открыть для себя мир чая?
            </Title>
            <Text size="lg" c="dimmed" maw={500}>
              Присоединяйтесь к нашему сообществу ценителей и получите скидку 10% на первый заказ
            </Text>
            <Button
              component={Link}
              href="/register"
              size="xl"
              variant="gradient"
              gradient={{ from: 'darkWood.4', to: 'darkWood.6' }}
              rightSection={<IconArrowRight size={20} />}
            >
              Создать аккаунт
            </Button>
          </Stack> 
        </Card> 
      </Container> */}
    </>
  );
}
