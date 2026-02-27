'use client';

import { useState } from 'react';
import { Tabs, Title, Box, Group, ThemeIcon } from '@mantine/core';
import { IconRobot, IconMessageCircle, IconSettings, IconBrain, IconShieldLock, IconChartBar, IconPalette } from '@tabler/icons-react';
import { ConversationsTab } from './components/ConversationsTab';
import { SettingsTab } from './components/SettingsTab';
import { RAGTab } from './components/RAGTab';
import { BannedPhrasesTab } from './components/BannedPhrasesTab';
import { StatsTab } from './components/StatsTab';
import { ModelSettingsTab } from './components/ModelSettingsTab';
import { DesignTab } from './components/DesignTab';

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<string | null>('conversations');

  return (
    <Box>
      <Group mb="md" gap="xs">
        <ThemeIcon variant="light" size="lg" color="teal">
          <IconRobot size={22} />
        </ThemeIcon>
        <Title order={3}>AI Ассистент</Title>
      </Group>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="conversations" leftSection={<IconMessageCircle size={16} />}>
            Переписки
          </Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
            Общие настройки
          </Tabs.Tab>
          <Tabs.Tab value="model" leftSection={<IconBrain size={16} />}>
            Модель
          </Tabs.Tab>
          <Tabs.Tab value="rag" leftSection={<IconBrain size={16} />}>
            База знаний (RAG)
          </Tabs.Tab>
          <Tabs.Tab value="banned" leftSection={<IconShieldLock size={16} />}>
            Безопасность
          </Tabs.Tab>
          <Tabs.Tab value="design" leftSection={<IconPalette size={16} />}>
            Дизайн
          </Tabs.Tab>
          <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>
            Статистика
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="conversations">
          <ConversationsTab />
        </Tabs.Panel>

        <Tabs.Panel value="settings">
          <SettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="model">
          <ModelSettingsTab />
        </Tabs.Panel>

        <Tabs.Panel value="rag">
          <RAGTab />
        </Tabs.Panel>

        <Tabs.Panel value="banned">
          <BannedPhrasesTab />
        </Tabs.Panel>

        <Tabs.Panel value="design">
          <DesignTab />
        </Tabs.Panel>

        <Tabs.Panel value="stats">
          <StatsTab />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
