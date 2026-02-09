import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Популярные пути админок, которые сканируют боты и скрипт-кидди
const HONEYPOT_PATHS = [
  // WordPress
  '/wp-admin',
  '/wp-login',
  '/wp-login.php',
  '/wp-content',
  '/wordpress',
  
  // Generic admin paths
  '/admin',
  '/administrator',
  '/admin.php',
  '/admincp',
  '/admin_area',
  '/admin-panel',
  '/admin-login',
  '/adminpanel',
  
  // phpMyAdmin и базы данных
  '/phpmyadmin',
  '/pma',
  '/myadmin',
  '/mysql',
  '/mysqladmin',
  '/dbadmin',
  '/db',
  '/sql',
  '/phpMyAdmin',
  '/phpmyadmin2',
  '/pma2',
  
  // Панели управления хостингом
  '/cpanel',
  '/webmail',
  '/whm',
  '/plesk',
  '/directadmin',
  
  // CMS
  '/bitrix',
  '/bitrix/admin',
  '/modx',
  '/joomla',
  '/drupal',
  '/typo3',
  
  // Backend / Management
  '/backend',
  '/backoffice',
  '/back-office',
  '/manager',
  '/manage',
  '/management',
  '/panel',
  '/controlpanel',
  '/control-panel',
  '/dashboard',
  '/cms',
  '/console',
  '/system',
  '/sysadmin',
  '/webadmin',
  
  // Файловые менеджеры
  '/filemanager',
  '/file-manager',
  '/files',
  '/elfinder',
  
  // API и конфиги (часто сканируют)
  '/.env',
  '/.git',
  '/.git/config',
  '/config.php',
  '/configuration.php',
  '/settings.php',
  '/wp-config.php',
  '/config.yml',
  '/config.json',
  '/.htaccess',
  '/.htpasswd',
  '/web.config',
  
  // Shells и бэкдоры (часто ищут)
  '/shell',
  '/c99.php',
  '/r57.php',
  '/webshell',
  '/cmd',
  '/command',
  
  // Другие популярные пути
  '/root',
  '/server-status',
  '/server-info',
  '/test',
  '/testing',
  '/temp',
  '/tmp',
  '/backup',
  '/backups',
  '/old',
  '/new',
  '/dev',
  '/staging',
  '/secret',
  '/hidden',
  '/private',
  '/secure',
  '/install',
  '/setup',
  '/installer',
  
  // Magento
  '/magento',
  '/magento/admin',
  '/downloader',
  
  // Laravel
  '/telescope',
  '/horizon',
  '/nova',
  
  // Debug tools
  '/debug',
  '/debugger',
  '/trace',
  '/profiler',
  '/adminer',
  '/adminer.php',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.toLowerCase();
  
  // Проверяем, совпадает ли путь с honeypot
  const isHoneypot = HONEYPOT_PATHS.some(path => 
    pathname === path || 
    pathname.startsWith(path + '/') ||
    pathname.startsWith(path + '?')
  );
  
  if (isHoneypot) {
    // Логируем попытку (в production можно отправлять в Sentry/аналитику)
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log(`🍯 HONEYPOT: ${ip} tried to access ${pathname}`);
    
    // Редиректим на тролль-страницу
    const url = request.nextUrl.clone();
    url.pathname = '/access-denied';
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

// Указываем на каких путях работает middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
