'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, Center } from '@mantine/core';

const emptySubscribe = () => () => {};

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasToken = useSyncExternalStore(
    emptySubscribe,
    () => !!localStorage.getItem('accessToken'),
    () => false,
  );

  useEffect(() => {
    if (!hasToken) {
      router.push('/login');
    }
  }, [hasToken, router]);

  if (!hasToken) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return <>{children}</>;
}
