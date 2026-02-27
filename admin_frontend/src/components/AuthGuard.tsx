'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, Center } from '@mantine/core';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setAuthorized(true);
    } else {
      router.push('/login');
    }
    setChecked(true);
  }, [router]);

  if (!checked || !authorized) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return <>{children}</>;
}
