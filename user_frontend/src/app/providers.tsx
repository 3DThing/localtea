'use client';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import '@mantine/notifications/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/lib/theme';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    const initAuth = async () => {
      // Проверяем есть ли сохраненный токен в localStorage
      const token = localStorage.getItem('auth-storage');
      if (token) {
        try {
          const parsed = JSON.parse(token);
          if (parsed.state?.accessToken) {
            // Токен есть в localStorage, восстанавливаем его в API
            const { setAccessToken } = useAuthStore.getState();
            setAccessToken(parsed.state.accessToken);
          }
        } catch (e) {
          console.error('Failed to parse auth storage:', e);
        }
      }
      
      // После восстановления токена проверяем авторизацию
      const { checkAuth } = useAuthStore.getState();
      await checkAuth();
      
      // Помечаем что инициализация завершена
      setIsInitialized(true);
    };
    
    initAuth();
  }, []);
  
  // Показываем пустой экран пока не завершена инициализация
  if (!isInitialized) {
    return null;
  }
  
  return (
    <>
      <ColorSchemeScript defaultColorScheme="dark" />
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          {children}
        </MantineProvider>
      </QueryClientProvider>
    </>
  );
}
