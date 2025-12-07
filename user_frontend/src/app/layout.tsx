import type { Metadata } from 'next';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { NotificationsContainer } from '@/components/NotificationsContainer';

export const metadata: Metadata = {
  title: 'LocalTea - Магия в каждой чашке',
  description: 'Откройте мир эксклюзивных чаев. Волшебные вкусы, таинственные ароматы, незабываемые впечатления.',
  keywords: 'чай, tea, эксклюзивный чай, премиум чай, локалти',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          <NotificationsContainer />
          <Header />
          <main style={{ minHeight: 'calc(100vh - 200px)', paddingTop: '80px' }}>
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
