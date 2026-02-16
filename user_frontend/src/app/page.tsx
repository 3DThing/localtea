    'use client';

    import { 
      Container, 
      Title, 
      Text, 
      Button, 
      Group, 
      Box, 
      SimpleGrid, 
      Stack,
      Badge,
      Image,
      Skeleton
    } from '@mantine/core';
    import { IconArrowRight, IconSparkles, IconLeaf, IconFlame, IconSnowflake, IconStar } from '@tabler/icons-react';
    import Link from 'next/link';
    import { useQuery } from '@tanstack/react-query';
    import { catalogApi, blogApi } from '@/lib/api';
    import { ProductCard } from '@/components/catalog/ProductCard';
    import { ArticleCard } from '@/components/blog/ArticleCard';

    export default function HomePage() {
      const showPromoBanner = false;

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
        <Box style={{ overflow: 'hidden' }}>
          {/* Hero Section - Full Screen Banner */}
          <Box
            className="hero-section"
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              marginTop: '-80px',
              paddingTop: '80px',
            }}
          >
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'url(/Valentin-hero.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(5, 3, 2, 0.7) 0%, rgba(8, 5, 3, 0.55) 40%, rgba(5, 3, 2, 0.75) 100%)',
              }}
            />
            
            <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
              <Stack gap="xl" align="center" ta="center">
                <Badge 
                  size="lg" 
                  variant="filled"
                  style={{ 
                    animation: 'float 3s ease-in-out infinite',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                    padding: '12px 24px',
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, rgba(200, 140, 70, 0.95) 0%, rgba(160, 100, 50, 1) 100%)',
                    border: '1px solid rgba(255, 200, 120, 0.4)',
                  }}
                >
                  <Group gap="xs">
                    <IconSparkles size={14} style={{ color: '#ffd700' }} />
                    Любовная коллекция 2026 ^_^
                  </Group>
                </Badge>

                <Title
                  order={1}
                  style={{
                    fontSize: 'clamp(2.8rem, 8vw, 5.5rem)',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: '#fffdf8',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.9), 0 8px 32px rgba(0, 0, 0, 0.6)',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    letterSpacing: '2px',
                  }}
                >
                  Любовь<br />в каждой чашке
                </Title>

                <Text 
                  size="xl" 
                  maw={550}
                  style={{ 
                    lineHeight: 1.7,
                    color: 'rgba(255, 252, 245, 0.95)',
                    textShadow: '0 2px 12px rgba(0, 0, 0, 0.8)',
                    fontWeight: 400,
                    fontSize: '1.15rem',
                  }}
                >
                  Откройте для себя мир изысканных чаёв.<br />
                  Каждый сорт — уникальная история вкуса и любви.
                </Text>

                <Group gap="lg" mt="xl">
                  <Button
                    component={Link}
                    href="/catalog"
                    size="xl"
                    rightSection={<IconArrowRight size={20} />}
                    style={{
                      background: 'linear-gradient(135deg, #d4894f 0%, #b86d35 100%)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(212, 137, 79, 0.3)',
                      borderRadius: '14px',
                      padding: '18px 36px',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      border: '1px solid rgba(255, 200, 150, 0.3)',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Смотреть каталог
                  </Button>
                </Group>
              </Stack>
            </Container>

            <Box
              style={{
                position: 'absolute',
                bottom: 40,
                left: '50%',
                transform: 'translateX(-50%)',
                animation: 'float 2s ease-in-out infinite',
              }}
            >
              {/*<Text size="sm" style={{ color: 'rgba(255, 250, 240, 0.5)', textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)' }}>↓ Прокрутите вниз</Text> */}
            </Box>
          </Box>
          {/* Valentine's Day Banner */}
    <Box
      py={48}
      style={{
        background: 'linear-gradient(135deg, #1a0a0e 0%, #2d0a16 50%, #1a0a0e 100%)',
        borderBottom: '1px solid rgba(255, 77, 109, 0.15)',
      }}
    >
      <Container size="sm">
        <Stack align="center" gap="lg">
          <Text style={{ fontSize: 40 }}>💝</Text>

          <Title order={2} ta="center" style={{ color: '#fffdf8' }}>
          День влюбленных: Скидки на чай для особых моментов
          </Title>

          <Text ta="center" style={{ color: 'rgba(255, 200, 210, 0.7)' }}>
            Подарите любимым тепло и аромат лучшего чая
          </Text>

          <Badge
            size="xl"
            radius="md"
            variant="filled"
            style={{
              background: 'linear-gradient(135deg, #ff4d6d, #a4133c)',
              padding: '12px 32px',
              fontSize: 24,
              fontWeight: 800,
              height: 'auto',
            }}
          >
            −10%
          </Badge>

          <Box
            style={{
              border: '1.5px dashed rgba(255, 77, 109, 0.4)',
              borderRadius: 12,
              padding: '10px 28px',
              background: 'rgba(255, 77, 109, 0.06)',
              cursor: 'pointer',
            }}
            onClick={() => navigator.clipboard.writeText('DAY_OF_LOVE')}
          >
            <Text fw={700} style={{ color: '#ff758f', letterSpacing: 3, fontFamily: 'monospace' }}>
              DAY_OF_LOVE
            </Text>
          </Box>

          <Text size="xs" style={{ color: 'rgba(255, 200, 210, 0.4)' }}>
            Нажмите на промокод, чтобы скопировать
          </Text>

          <Text size="sm" style={{ color: 'rgba(255, 200, 210, 0.5)' }}>
            📅 9 февраля — 16 февраля
          </Text>
        </Stack>
      </Container>
    </Box>
          {/* Categories - Big Banners Grid */}
          <Box py={100}>
            <Container size="xl">
              <Stack gap={50}>
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="sm" fw={600} tt="uppercase" style={{ letterSpacing: '3px', color: '#d4894f' }}>
                      Коллекции
                    </Text>
                    <Title order={2} style={{ fontSize: '2.5rem', color: '#fffdf8' }}>
                      Выберите вселенную
                    </Title>
                  </Stack>
                  <Button 
                    component={Link} 
                    href="/catalog" 
                    variant="subtle" 
                    color="gray"
                    rightSection={<IconArrowRight size={16} />}
                    style={{ color: 'rgba(255, 250, 240, 0.7)' }}
                  >
                    Все категории
                  </Button>
                </Group>

                {categoriesLoading ? (
                  <SimpleGrid cols={{ base: 1, md: 1 }} spacing="xl">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} height={420} radius="xl" style={{ width: '100%', maxWidth: 900, margin: '0 auto' }} />
                    ))}
                  </SimpleGrid>
                ) : (
                  <SimpleGrid cols={{ base: 1, md: 1 }} spacing="xl" style={{ justifyItems: 'center' }}>
                    {categories.map((category: any) => (
                      <Link 
                        key={category.id} 
                        href={`/catalog?category=${category.id}`}
                        style={{ textDecoration: 'none', width: '100%', maxWidth: 900 }}
                      >
                        <Box
                          className="banner-card"
                          style={{
                            position: 'relative',
                            height: 420,
                            borderRadius: 24,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.4s ease',
                            border: '1px solid rgba(255, 200, 150, 0.1)',
                          }}
                        >
                          <Image
                            src={category.image || 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=1400'}
                            alt={category.name}
                            h="100%"
                            style={{ objectFit: 'cover', transition: 'transform 0.5s ease' }}
                          />
                          {/* Strong gradient overlay for text readability */}
                          <Box
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(180deg, transparent 20%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.9) 100%)',
                              zIndex: 1,
                            }}
                          />
                          <Box
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              padding: 32,
                              zIndex: 2,
                            }}
                          >
                            <Text 
                              size="xl" 
                              fw={700} 
                              mb="xs"
                              style={{ 
                                color: '#ffffff',
                                fontSize: '1.6rem',
                                textShadow: '0 2px 4px rgba(0, 0, 0, 1), 0 4px 12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 0, 0, 0.6)',
                              }}
                            >
                              {category.name}
                            </Text>
                            <Text 
                              size="sm" 
                              lineClamp={2}
                              mb={16}
                              style={{ 
                                color: 'rgba(255, 255, 255, 0.9)',
                                textShadow: '0 1px 3px rgba(0, 0, 0, 1), 0 2px 8px rgba(0, 0, 0, 0.8)',
                              }}
                            >
                              {category.description}
                            </Text>
                            <Group gap="xs">
                              <Text size="sm" fw={500} style={{ color: '#d4894f' }}>
                                Перейти
                              </Text>
                              <IconArrowRight size={16} style={{ color: '#d4894f' }} />
                            </Group>
                          </Box>
                        </Box>
                      </Link>
                    ))}
                  </SimpleGrid>
                )}
              </Stack>
            </Container>
          </Box>

          {/* Products Section with Side Banner */}
          <Box py={100} style={{ background: 'linear-gradient(180deg, rgba(30, 22, 15, 0.5) 0%, transparent 100%)' }}>
            <Container size="xl">
              <Stack gap={50}>
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="sm" fw={600} tt="uppercase" style={{ letterSpacing: '3px', color: '#d4894f' }}>
                      Хиты продаж
                    </Text>
                    <Title order={2} style={{ fontSize: '2.5rem', color: '#fffdf8' }}>
                      Популярные товары
                    </Title>
                  </Stack>
                  <Button 
                    component={Link} 
                    href="/catalog" 
                    variant="subtle" 
                    color="gray"
                    rightSection={<IconArrowRight size={16} />}
                    style={{ color: 'rgba(255, 250, 240, 0.7)' }}
                  >
                    Весь каталог
                  </Button>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                  {productsLoading ? (
                    Array(4).fill(0).map((_, i) => (
                      <Skeleton key={i} height={380} radius="xl" />
                    ))
                  ) : (
                    products.map((product: any) => (
                      <ProductCard key={product.id} product={product} />
                    ))
                  )}
                </SimpleGrid>
              </Stack>
            </Container>
          </Box>

          {/* Promo Banner (disabled) */}
          {showPromoBanner && (
            <Box py={80}>
              <Container size="xl">
                <Box
                  style={{
                    position: 'relative',
                    borderRadius: 24,
                    overflow: 'hidden',
                    background: 'linear-gradient(135deg, #2a1f15 0%, #1a120c 100%)',
                    border: '1px solid rgba(212, 137, 79, 0.2)',
                  }}
                >
                  {/* Background pattern */}
                  <Box
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0.1,
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4894f' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                  />
                  
                  <Box style={{ position: 'relative', padding: '48px 40px' }}>
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl" style={{ alignItems: 'center' }}>
                      <Stack gap="md">
                        <Group gap="sm">
                          <Box
                            style={{
                              background: 'rgba(212, 137, 79, 0.2)',
                              borderRadius: 8,
                              padding: '6px 12px',
                              border: '1px solid rgba(212, 137, 79, 0.3)',
                            }}
                          >
                            <Text size="sm" fw={600} style={{ color: '#d4894f' }}>Новый год 2026</Text>
                          </Box>
                        </Group>
                        
                        <Title order={2} style={{ fontSize: '2rem', color: '#fffdf8', lineHeight: 1.3 }}>
                          Скидка 15% на первый заказ
                        </Title>
                        
                        <Text size="md" style={{ color: 'rgba(255, 250, 240, 0.7)', maxWidth: 380 }}>
                          Введите промокод при оформлении и окунитесь в мир волшебного чая
                        </Text>
                        
                        {/* Promo code box (temporarily disabled)
                        <Box
                          style={{
                            background: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            border: '1px dashed rgba(212, 137, 79, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 12,
                            alignSelf: 'flex-start',
                            marginTop: 8,
                          }}
                        >
                          <Text size="xs" tt="uppercase" style={{ color: 'rgba(255, 250, 240, 0.5)' }}>Промокод:</Text>
                          <Text size="lg" fw={700} style={{ color: '#d4894f', letterSpacing: '2px' }}>NEWYEAR2026</Text>
                        </Box>
                        */}
                        
                        <Button
                          component={Link}
                          href="/catalog"
                          size="md"
                          rightSection={<IconArrowRight size={16} />}
                          style={{
                            background: 'linear-gradient(135deg, #d4894f 0%, #b86d35 100%)',
                            borderRadius: '10px',
                            padding: '14px 28px',
                            fontWeight: 500,
                            border: '1px solid rgba(255, 200, 150, 0.3)',
                            alignSelf: 'flex-start',
                            marginTop: 8,
                          }}
                        >
                          Перейти в каталог
                        </Button>
                      </Stack>
                      
                      {/* Right side - decorative */}
                      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <Box
                          style={{
                            position: 'relative',
                            width: 180,
                            height: 180,
                          }}
                        >
                          {/* Glow effect */}
                          <Box
                            style={{
                              position: 'absolute',
                              inset: -20,
                              borderRadius: '50%',
                              background: 'radial-gradient(circle, rgba(212, 137, 79, 0.2) 0%, transparent 70%)',
                              animation: 'pulse 3s ease-in-out infinite',
                            }}
                          />
                          {/* Circle with percentage */}
                          <Box
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, rgba(212, 137, 79, 0.2) 0%, rgba(212, 137, 79, 0.1) 100%)',
                              border: '2px solid rgba(212, 137, 79, 0.3)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ fontSize: '3rem', fontWeight: 700, color: '#d4894f', lineHeight: 1 }}>15%</Text>
                            <Text size="sm" style={{ color: 'rgba(255, 250, 240, 0.6)' }}>скидка</Text>
                          </Box>
                        </Box>
                      </Box>
                    </SimpleGrid>
                  </Box>
                </Box>
              </Container>
            </Box>
          )}

          {/* Blog Section
          <Box py={100}>
            <Container size="xl">
              <Stack gap={50}>
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="sm" fw={600} tt="uppercase" style={{ letterSpacing: '3px', color: '#d4894f' }}>
                      Блог
                    </Text>
                    <Title order={2} style={{ fontSize: '2.5rem', color: '#fffdf8' }}>
                      Чайные истории
                    </Title>
                  </Stack>
                  <Button 
                    component={Link} 
                    href="/blog" 
                    variant="subtle" 
                    color="gray"
                    rightSection={<IconArrowRight size={16} />}
                    style={{ color: 'rgba(255, 250, 240, 0.7)' }}
                  >
                    Все статьи
                  </Button>
                </Group>
                

                <Stack gap="lg">
                  {articlesLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} height={180} radius="xl" />
                    ))
                  ) : (
                    articles.map((article: any) => (
                      <ArticleCard key={article.id} article={article} />
                    ))
                  )}
                </Stack>
              </Stack>
            </Container>
          </Box>
          */}
        </Box>
      );
    }
