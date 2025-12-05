'use client';

import { Title, Flex } from '@mantine/core';
import { ArticleList } from '@/features/blog/components';

export default function BlogPage() {
  return (
    <>
      <Flex mb="md" justify="space-between" align="center">
        <Title order={3}>Блог</Title>
      </Flex>
      <ArticleList />
    </>
  );
}
