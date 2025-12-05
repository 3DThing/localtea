'use client';

import { AppShell } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [collapsed, setCollapsed] = useLocalStorage({
    key: 'sidebar-collapsed',
    defaultValue: false,
  });

  const toggleCollapsed = () => setCollapsed((c) => !c);

  return (
    <AppShell
      header={{ height: 50 }}
      navbar={{
        width: collapsed ? 70 : 220,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="sm"
      transitionDuration={200}
    >
      <AppShell.Header>
        <AppHeader opened={mobileOpened} toggle={toggleMobile} />
      </AppShell.Header>

      <AppShell.Navbar p={collapsed ? 'xs' : 'sm'}>
        <AppSidebar collapsed={collapsed} toggleCollapsed={toggleCollapsed} />
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
