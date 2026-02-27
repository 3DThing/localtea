import type { Metadata } from 'next';
import Script from 'next/script';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/carousel/styles.css';
import './globals.css';
import { Providers } from './providers';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { NotificationsContainer } from '@/components/NotificationsContainer';
import { CookieConsentBanner } from '@/components/CookieConsentBanner';
import { ChatWidget } from '@/components/ChatWidget';

// Feature flags
const ENABLE_TIMEWEB_AI_AGENT = false;

export const metadata: Metadata = {
  title: 'LocalTea - Волшебство в каждой чашке',
  description: 'Откройте мир эксклюзивных чаев. Волшебные вкусы, таинственные ароматы, незабываемые впечатления.',
  keywords: 'чай, tea, эксклюзивный чай, премиум чай, локалти, localtea, магазин чая, купить чай, чай онлайн, чай по локациям, чай по играм, чай по игровым мирам',
  verification: {
    yandex: 'cadfe7b9cb3e29c8',
  },
  icons: {
    icon: [
      { url: '/icon/web/icons8-чай-apple-sf-black-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon/web/icons8-чай-apple-sf-black-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon/web/icons8-чай-apple-sf-black-96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: '/icon/web/icons8-чай-apple-sf-black-96.png',
  },
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
          <CookieConsentBanner />
          <Header />
          <main style={{ minHeight: 'calc(100vh - 200px)', paddingTop: '80px' }}>
            {children}
          </main>
          <Footer />
          <ChatWidget />
        </Providers>
        {ENABLE_TIMEWEB_AI_AGENT && (
          <Script
            src="https://timeweb.cloud/api/v1/cloud-ai/agents/4bb3229e-5087-422c-8b07-e79b885aae84/embed.js?collapsed=true"
            strategy="lazyOnload"
          />
        )}
        {/* Yandex.Metrika counter */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){ 
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=105985169', 'ym');

            ym(105985169, 'init', {
              ssr: true,
              webvisor: true,
              clickmap: true,
              ecommerce: "dataLayer",
              accurateTrackBounce: true,
              trackLinks: true
            });
          `}
        </Script>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/105985169" style={{ position: 'absolute', left: '-9999px' }} alt="" />
          </div>
        </noscript>
      </body>
    </html>
  );
}
