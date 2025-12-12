'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import '@/lib/api-client';
import 'dayjs/locale/ru';

const theme = createTheme({
  primaryColor: 'teal',
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        <DatesProvider settings={{ locale: 'ru' }}>
          <Notifications />
          {children}
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
