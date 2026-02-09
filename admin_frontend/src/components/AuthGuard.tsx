'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, Center } from '@mantine/core';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('accessToken');
  });

  useEffect(() => {
    if (!authorized) {
      router.push('/login');
    }
  }, [authorized, router]);

  if (!authorized) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return <>{children}</>;
}
