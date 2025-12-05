'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Container, 
  Paper, 
  Title, 
  Tabs, 
  Button, 
  Group, 
  LoadingOverlay, 
  Breadcrumbs, 
  Anchor,
  TextInput,
  Textarea,
  Checkbox,
  Select,
  Image,
  Text,
  ActionIcon,
  Stack,
  rem,
  Flex,
  Badge
} from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import '@mantine/dropzone/styles.css';
import { IconArrowLeft, IconInfoCircle, IconPhoto, IconSearch, IconUpload, IconX, IconFolder } from '@tabler/icons-react';
import { CatalogService, Category, CategoryCreate, CategoryUpdate } from '@/lib/api';
import { getValidToken } from '@/lib/api-client';
import { API_URL } from '@/lib/axios';
import { notifications } from '@mantine/notifications';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, { message: 'Название обязательно' }),
  slug: z.string().min(1, { message: 'Slug обязателен' }),
  description: z.string().optional(),
  image: z.string().optional(),
  parent_id: z.string().optional().nullable(),
  is_active: z.boolean(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CategoryEditPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('basic');

  const isNew = id === 'new';

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      is_active: true,
    }
  });

  const imageUrl = watch('image');
  const nameValue = watch('name');

  // Auto-generate slug from name for new categories
  useEffect(() => {
    if (isNew && nameValue) {
      const slug = nameValue
        .toLowerCase()
        .replace(/ /g, '-')
        .replace(/[^\w-]+/g, '');
      setValue('slug', slug);
    }
  }, [nameValue, isNew, setValue]);

  const fetchCategory = async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    try {
      const allCategories = await CatalogService.readCategoriesApiV1CatalogCategoriesGet();
      const found = allCategories.find(c => c.id === parseInt(id));
      if (!found) throw new Error('Not found');
      setCategory(found);
      setCategories(allCategories);
      reset({
        name: found.name,
        slug: found.slug,
        description: found.description || '',
        image: found.image || '',
        parent_id: found.parent_id?.toString() || null,
        is_active: found.is_active ?? true,
        seo_title: found.seo_title || '',
        seo_description: found.seo_description || '',
      });
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить категорию', color: 'red' });
      router.push('/dashboard/catalog');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await CatalogService.readCategoriesApiV1CatalogCategoriesGet();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchCategory();
  }, [id]);

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = await getValidToken();
      const response = await fetch(`${API_URL}/catalog/categories/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setValue('image', data.url);
      notifications.show({ title: 'Успешно', message: 'Изображение загружено', color: 'green' });
    } catch (error) {
      console.error(error);
      notifications.show({ title: 'Ошибка', message: 'Не удалось загрузить изображение', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const onFormSubmit = async (data: CategoryFormData) => {
    setSaving(true);
    try {
      const formattedData = {
        ...data,
        parent_id: data.parent_id ? parseInt(data.parent_id) : null,
      };

      if (isNew) {
        const newCategory = await CatalogService.createCategoryApiV1CatalogCategoriesPost(formattedData as CategoryCreate);
        notifications.show({ title: 'Успешно', message: 'Категория создана', color: 'green' });
        router.push(`/dashboard/catalog/categories/${newCategory.id}`);
      } else {
        await CatalogService.updateCategoryApiV1CatalogCategoriesIdPatch(parseInt(id), formattedData as CategoryUpdate);
        notifications.show({ title: 'Успешно', message: 'Категория обновлена', color: 'green' });
        fetchCategory();
      }
    } catch (error) {
      notifications.show({ title: 'Ошибка', message: 'Не удалось сохранить категорию', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = categories
    .filter(c => c.id !== category?.id)
    .map(c => ({ value: c.id.toString(), label: c.name }));

  const breadcrumbItems = [
    { title: 'Каталог', href: '/dashboard/catalog' },
    { title: isNew ? 'Новая категория' : category?.name || 'Загрузка...' },
  ].map((item, index) => (
    item.href ? (
      <Anchor href={item.href} key={index} size="sm">{item.title}</Anchor>
    ) : (
      <Text key={index} size="sm">{item.title}</Text>
    )
  ));

  return (
    <Container size="md" py="md">
      <LoadingOverlay visible={loading} />
      
      <Group mb="md" gap="xs">
        <Button 
          variant="subtle" 
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push('/dashboard/catalog')}
          size="compact-sm"
        >
          Назад
        </Button>
        <Breadcrumbs separator="→">{breadcrumbItems}</Breadcrumbs>
      </Group>

      <Flex justify="space-between" align="center" mb="md">
        <Group gap="sm">
          <IconFolder size={28} style={{ color: 'var(--mantine-color-teal-6)' }} />
          <Title order={2}>{isNew ? 'Новая категория' : category?.name}</Title>
          {category && (
            <Badge color={category.is_active ? 'green' : 'gray'} variant="light">
              {category.is_active ? 'Активна' : 'Скрыта'}
            </Badge>
          )}
        </Group>
        <Button 
          onClick={handleSubmit(onFormSubmit)} 
          loading={saving}
        >
          {isNew ? 'Создать' : 'Сохранить'}
        </Button>
      </Flex>

      <Paper withBorder radius="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="basic" leftSection={<IconInfoCircle size={16} />}>
              Основное
            </Tabs.Tab>
            <Tabs.Tab value="seo" leftSection={<IconSearch size={16} />}>
              SEO
            </Tabs.Tab>
          </Tabs.List>

          <form>
            <Tabs.Panel value="basic" p="md">
              <LoadingOverlay visible={uploading} />
              <Flex gap="lg" wrap="wrap">
                <Stack style={{ flex: 1, minWidth: 280 }} gap="sm">
                  <TextInput
                    label="Название"
                    placeholder="Зеленый чай"
                    required
                    {...register('name')}
                    error={errors.name?.message}
                  />
                  <TextInput
                    label="Slug (URL)"
                    placeholder="green-tea"
                    required
                    {...register('slug')}
                    error={errors.slug?.message}
                  />
                  <Select
                    label="Родительская категория"
                    placeholder="Без родителя"
                    data={parentOptions}
                    clearable
                    value={watch('parent_id')}
                    onChange={(val) => setValue('parent_id', val)}
                  />
                  <Textarea
                    label="Описание"
                    placeholder="Описание категории..."
                    minRows={3}
                    {...register('description')}
                    error={errors.description?.message}
                  />
                  <Checkbox
                    label="Категория активна (видна на сайте)"
                    checked={watch('is_active')}
                    onChange={(e) => setValue('is_active', e.currentTarget.checked)}
                  />
                </Stack>

                <Stack style={{ width: 200 }}>
                  <Text size="sm" fw={500}>Изображение</Text>
                  <Paper 
                    withBorder 
                    p={0} 
                    h={200} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      position: 'relative', 
                      overflow: 'hidden' 
                    }}
                  >
                    {imageUrl ? (
                      <>
                        <Image src={imageUrl} h={200} w="100%" fit="contain" alt="Category" />
                        <ActionIcon 
                          color="red" 
                          variant="filled" 
                          size="sm" 
                          style={{ position: 'absolute', top: 8, right: 8 }}
                          onClick={() => setValue('image', '')}
                        >
                          <IconX size={14} />
                        </ActionIcon>
                      </>
                    ) : (
                      <Dropzone 
                        onDrop={(files) => handleImageUpload(files[0])}
                        onReject={() => notifications.show({ title: 'Ошибка', message: 'Файл не поддерживается', color: 'red' })}
                        maxSize={5 * 1024 ** 2}
                        accept={IMAGE_MIME_TYPE}
                        multiple={false}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          border: 0, 
                          backgroundColor: 'transparent' 
                        }}
                      >
                        <Stack align="center" gap="xs" style={{ pointerEvents: 'none' }}>
                          <Dropzone.Accept>
                            <IconUpload style={{ width: rem(40), height: rem(40), color: 'var(--mantine-color-blue-6)' }} stroke={1.5} />
                          </Dropzone.Accept>
                          <Dropzone.Reject>
                            <IconX style={{ width: rem(40), height: rem(40), color: 'var(--mantine-color-red-6)' }} stroke={1.5} />
                          </Dropzone.Reject>
                          <Dropzone.Idle>
                            <IconPhoto style={{ width: rem(40), height: rem(40), color: 'var(--mantine-color-dimmed)' }} stroke={1.5} />
                          </Dropzone.Idle>
                          <Text size="xs" c="dimmed" ta="center">
                            Перетащите или кликните
                          </Text>
                        </Stack>
                      </Dropzone>
                    )}
                  </Paper>
                </Stack>
              </Flex>
            </Tabs.Panel>

            <Tabs.Panel value="seo" p="md">
              <Stack gap="sm" maw={600}>
                <TextInput
                  label="SEO Title"
                  placeholder="Купить зеленый чай в Москве — LocalTea"
                  {...register('seo_title')}
                />
                <Textarea
                  label="SEO Description"
                  placeholder="Большой выбор зеленого чая высшего качества. Доставка по всей России..."
                  minRows={3}
                  {...register('seo_description')}
                />
                <Text size="xs" c="dimmed">
                  SEO настройки влияют на отображение страницы категории в поисковых системах
                </Text>
              </Stack>
            </Tabs.Panel>
          </form>
        </Tabs>
      </Paper>
    </Container>
  );
}
