'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [collapsed, setCollapsed] = useState(false);

  // Read localStorage only after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      if (stored !== null) setCollapsed(JSON.parse(stored));
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('sidebar-collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

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
