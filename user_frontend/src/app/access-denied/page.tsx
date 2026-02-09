'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, TextInput, PasswordInput, Button, Paper, Text, Stack, Progress, Group, Container, Title, Divider } from '@mantine/core';
import { IconLock, IconUser, IconTerminal2 } from '@tabler/icons-react';
import { colors, componentStyles, inputStyles } from '@/lib/theme';

// API для honeypot
const HONEYPOT_API = process.env.NEXT_PUBLIC_HONEYPOT_API || '';

type Stage = 'login' | 'panel' | 'hacking' | 'trolled';

const trollBaseImage = '/access-denied.png';

// Гифки лежат в /public/troll
const trollGifs = [
  '/troll/128151_83449.gif',
  '/troll/i8ijkqb0v2cf1.gif',
  '/troll/icegif-2466.gif',
];

// Генерация случайных "реалистичных" данных
const randomIP = () => `${Math.floor(Math.random()*223)+1}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`;
const randomHex = (len: number) => [...Array(len)].map(() => Math.floor(Math.random()*16).toString(16)).join('');
const randomPort = () => Math.floor(Math.random() * 40000) + 10000;
const timestamp = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// Хак-действия для панели
const hackActions = [
  { id: 'dump_db', label: 'Экспорт данных' },
  { id: 'steal_cards', label: 'Обход платёжного контура' },
  { id: 'get_admin', label: 'Эскалация привилегий' },
  { id: 'deface', label: 'Подмена главной страницы' },
  { id: 'backdoor', label: 'Закрепление доступа' },
];

// Фейковые терминальные логи с реалистичными данными
const getHackingLogs = (action: string): string[] => {
  const dbHost = `db-replica-0${Math.floor(Math.random()*3)+1}.localtea.internal`;
  const apiHost = `api-prod-${Math.floor(Math.random()*5)+1}.localtea.internal`;
  const txCount = Math.floor(Math.random() * 50000) + 30000;
  const userCount = Math.floor(Math.random() * 80000) + 45000;
  
  const logs: Record<string, string[]> = {
    dump_db: [
      `[${timestamp()}] sqlmap/1.8.4#dev - automatic SQL injection tool`,
      `[${timestamp()}] https://sqlmap.org`,
      '',
      `[*] starting @ ${timestamp()}`,
      '',
      `[${timestamp()}] [INFO] testing connection to the target URL`,
      `[${timestamp()}] [INFO] checking if the target is protected by WAF/IPS`,
      `[${timestamp()}] [WARNING] heuristic test shows GET parameter 'id' might be injectable`,
      `[${timestamp()}] [INFO] testing for SQL injection on GET parameter 'id'`,
      `[${timestamp()}] [INFO] GET parameter 'id' appears to be injectable`,
      `[${timestamp()}] [INFO] testing 'PostgreSQL > 8.1 stacked queries'`,
      `[${timestamp()}] [INFO] target URL appears to be UNION injectable with 7 columns`,
      '',
      `[${timestamp()}] [INFO] fetching database names`,
      `[${timestamp()}] [INFO] retrieved: 'localtea_production'`,
      `[${timestamp()}] [INFO] retrieved: 'localtea_analytics'`,
      '',
      `[*] enumerating tables for database: 'localtea_production'`,
      `[${timestamp()}] [INFO] fetching tables`,
      `Database: localtea_production`,
      `[24 tables]`,
      `+------------------------+`,
      `| users                  |`,
      `| orders                 |`,
      `| payments               |`,
      `| admin_users            |`,
      `| api_keys               |`,
      `+------------------------+`,
      '',
      `[*] dumping table 'users' [${userCount} entries]`,
      `[${timestamp()}] [INFO] fetching entries`,
      `[>                                        ] 0/${userCount} (0%)`,
      `[===>                                     ] ${Math.floor(userCount*0.12)}/${userCount} (12%)`,
      `[==========>                              ] ${Math.floor(userCount*0.34)}/${userCount} (34%)`,
      `[==================>                      ] ${Math.floor(userCount*0.58)}/${userCount} (58%)`,
      `[==========================>              ] ${Math.floor(userCount*0.83)}/${userCount} (83%)`,
      `[=====================================] ${userCount}/${userCount} (100%)`,
      '',
      `[${timestamp()}] [INFO] table 'users' dumped to '/tmp/.lt_dump_${randomHex(6)}/users.csv'`,
      '',
      `[*] dumping table 'orders' [${txCount} entries]`,
      `[=====================================] ${txCount}/${txCount} (100%)`,
      `[${timestamp()}] [INFO] table 'orders' dumped to '/tmp/.lt_dump_${randomHex(6)}/orders.csv'`,
      '',
      `[${timestamp()}] [INFO] creating archive...`,
      `[${timestamp()}] [INFO] compressing with gzip level 9`,
      `[${timestamp()}] [INFO] archive created: dump_${new Date().toISOString().slice(0,10)}_${randomHex(8)}.tar.gz (${Math.floor(Math.random()*200)+150}MB)`,
      `[${timestamp()}] [INFO] SHA256: ${randomHex(64)}`,
      '',
      `[${timestamp()}] [INFO] exfiltration complete`,
      '',
      `[*] SUCCESS: Database dump completed`,
    ],
    
    steal_cards: [
      `[${timestamp()}] PCI-Scraper v4.2.1`,
      `[${timestamp()}] Target: ${apiHost}`,
      '',
      `[*] Phase 1: Token Extraction`,
      `[${timestamp()}] [INFO] intercepting API traffic...`,
      `[${timestamp()}] [INFO] captured JWT: eyJhbGciOiJIUzI1NiIs...`,
      `[${timestamp()}] [INFO] user_id: 1, role: "admin"`,
      '',
      `[*] Phase 2: Bypassing Encryption`,
      `[${timestamp()}] [INFO] checking encryption... AES-256-GCM detected`,
      `[${timestamp()}] [INFO] searching for key material...`,
      `[${timestamp()}] [+] Key found at 0x7f${randomHex(10)}`,
      `[${timestamp()}] [INFO] validating key... OK`,
      '',
      `[*] Phase 3: Data Extraction`,
      `[${timestamp()}] [DATA] Processing batch 1/8...`,
      `  → 4*** **** **** 7823 | 09/26 | Иванов А.С.`,
      `  → 5*** **** **** 4521 | 12/25 | Петрова М.И.`,
      `[${timestamp()}] [+] Batch 1 complete: 1,247 cards`,
      `[${timestamp()}] [DATA] Processing batch 2/8...`,
      `[${timestamp()}] [+] Batch 2 complete: 1,892 cards`,
      `[${timestamp()}] [DATA] Processing batch 3/8...`,
      `[${timestamp()}] [+] Batch 3 complete: 1,634 cards`,
      `[${timestamp()}] [DATA] Processing remaining batches...`,
      `[=====>               ] 42%`,
      `[===========>         ] 71%`,
      `[==================>  ] 95%`,
      `[====================] 100%`,
      '',
      `[${timestamp()}] [INFO] Total cards extracted: 12,847`,
      `[${timestamp()}] [INFO] Estimated value: $${Math.floor(Math.random()*500000)+200000}`,
      '',
      `[${timestamp()}] [INFO] saved to: cards_${randomHex(8)}.pgp`,
      `[${timestamp()}] [+] Upload complete: https://${randomHex(12)}.onion/drop/${randomHex(16)}`,
      '',
      `[*] SUCCESS: Payment data extraction completed`,
    ],
    
    get_admin: [
      `[${timestamp()}] PrivEsc Framework v2.1.0`,
      `[${timestamp()}] Target: ${apiHost}`,
      `[${timestamp()}] Current: user=guest, uid=1000`,
      '',
      `[*] Stage 1: Enumeration`,
      `[${timestamp()}] [INFO] checking SUID binaries...`,
      `[${timestamp()}] [+] /usr/bin/pkexec (CVE-2021-4034)`,
      `[${timestamp()}] [INFO] checking capabilities...`,
      `[${timestamp()}] [+] /usr/bin/python3.11 = cap_setuid+ep`,
      '',
      `[*] Stage 2: Exploitation`,
      `[${timestamp()}] [INFO] selected vector: Python capability abuse`,
      `[${timestamp()}] [EXEC] python3 -c 'import os;os.setuid(0);...'`,
      '',
      `[${timestamp()}] [+] Privilege escalation successful!`,
      `[${timestamp()}] [INFO] new context: user=root, uid=0`,
      '',
      `root@${apiHost.split('.')[0]}:/tmp# id`,
      `uid=0(root) gid=0(root) groups=0(root)`,
      '',
      `root@${apiHost.split('.')[0]}:/tmp# cat /opt/localtea/.env`,
      `DATABASE_URL=postgresql://localtea:${randomHex(24)}@${dbHost}`,
      `STRIPE_SECRET_KEY=sk_live_${randomHex(24)}`,
      `JWT_SECRET=${randomHex(48)}`,
      `AWS_ACCESS_KEY_ID=AKIA${randomHex(16).toUpperCase()}`,
      '',
      `[${timestamp()}] [INFO] credentials saved`,
      `[${timestamp()}] [+] SSH key added to authorized_keys`,
      '',
      `[*] SUCCESS: Root access obtained`,
    ],
    
    deface: [
      `[${timestamp()}] WebShell Commander v3.0`,
      `[${timestamp()}] Target: https://localtea.ru`,
      '',
      `[*] Phase 1: Access Verification`,
      `[${timestamp()}] [+] Webshell active at /uploads/.ht.php`,
      `[${timestamp()}] [INFO] current user: www-data`,
      '',
      `[*] Phase 2: Backup Original`,
      `[${timestamp()}] [+] Backup saved: /tmp/.bak_${randomHex(8)}/index.html`,
      '',
      `[*] Phase 3: Deployment`,
      `[${timestamp()}] [INFO] uploading payload...`,
      `[>                    ] 15%`,
      `[=====>               ] 42%`,
      `[===========>         ] 71%`,
      `[====================] 100%`,
      `[${timestamp()}] [+] File replaced successfully`,
      '',
      `[*] Phase 4: Cache Invalidation`,
      `[${timestamp()}] [INFO] purging CDN cache...`,
      `[${timestamp()}] [+] cdn-msk-01 - purged`,
      `[${timestamp()}] [+] cdn-spb-01 - purged`,
      '',
      `[*] Phase 5: Verification`,
      `[${timestamp()}] [INFO] fetching https://localtea.ru ...`,
      `[${timestamp()}] [+] Signature found: "H4CK3D BY..."`,
      `[${timestamp()}] [+] Screenshot saved: proof_${randomHex(8)}.png`,
      '',
      `[*] SUCCESS: Website defaced`,
    ],
    
    backdoor: [
      `[${timestamp()}] Cobalt Strike 4.9`,
      `[${timestamp()}] Team Server: ${randomIP()}:${randomPort()}`,
      `[${timestamp()}] Target: ${apiHost}`,
      '',
      `[*] Stage 1: Payload Generation`,
      `[${timestamp()}] [INFO] generating beacon...`,
      `[${timestamp()}] [INFO] sleep: 60s, jitter: 37%`,
      `[${timestamp()}] [+] Payload: beacon_${randomHex(8)}.bin (271KB)`,
      '',
      `[*] Stage 2: Obfuscation`,
      `[${timestamp()}] [INFO] applying obfuscation...`,
      `[${timestamp()}] [INFO] VirusTotal score: 0/72 (FUD)`,
      '',
      `[*] Stage 3: Deployment`,
      `[${timestamp()}] [INFO] uploading to target...`,
      `[${timestamp()}] [EXEC] python3 -c "import ctypes..."`,
      `[${timestamp()}] [+] Payload executed`,
      '',
      `[*] Stage 4: Beacon Check-in`,
      `[${timestamp()}] [INFO] waiting for callback...`,
      `[${timestamp()}] [+] Beacon ${randomHex(8)} checked in!`,
      ``,
      `  Computer: ${apiHost.split('.')[0].toUpperCase()}`,
      `  User: root`,
      `  Internal IP: 10.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
      `  External IP: ${randomIP()}`,
      '',
      `[*] Stage 5: Persistence`,
      `[${timestamp()}] [+] systemd service installed`,
      `[${timestamp()}] [+] cron job added`,
      `[${timestamp()}] [+] SSH key installed`,
      '',
      `[${timestamp()}] [INFO] next callback: ${new Date(Date.now() + 60000).toISOString().slice(11,19)}`,
      '',
      `[*] SUCCESS: Persistent access established`,
    ],
  };
  
  return logs[action] || logs.dump_db;
};

// Сообщения при троллинге
const trollMessages = [
  'Бро, не там ищешь.',
  'Ты только что потратил своё время впустую. Что чувствуешь?',
  'Если думаешь, что твоя жизнь бесполезная… да. Ты только что слил пару минут, чтобы дойти сюда.',
  'Легенда говорит: где-то есть смысл. Но не здесь.',
  'Поздравляю: ты дошёл до конца. Награда — осознание.',
  'Серьёзно? Это был твой план?',
  'Пока ты тут «ломал», чай успел остыть. Дважды.',
  'Бонусный уровень: закрыть вкладку и сделать что-то полезное.',
  'Ничего личного. Просто ты слишком старался.',
  'Тут нет сокровищ. Только твои потраченные минуты.',
  'Если искал быстрый путь — ты нашёл длинный.',
  'Лови инсайт: иногда лучший хак — заняться делом.',
  'Ты ожидал триумф? Получи текст.',
  'Время — ресурс. Ты только что его донатнул в пустоту.',
  // ── новая порция ──
  'Молодец, ты обнаружил... пустое место.',
  'Админка? Нет, это просто ловушка для людей с завышенной самооценкой.',
  'Ты сейчас чувствуешь себя хакером? Это мило.',
  'Продолжай в том же духе — мир нуждается в таких специалистах.',
  'База данных? Есть. В твоей голове. И она пустая.',
  '404 — смысл жизни не найден. Попробуй перезагрузить самооценку.',
  'Ты не взломал систему. Система взломала твоё время.',
  'Поздравляю, ты официально стал легендой... вкладки "Недавно закрытые".',
  'Это был тест на терпение. Ты его... ну, в общем, ты понял.',
  'Секретный уровень: осознать, что ты зря сюда пришёл.',
  'Ты тратишь на это время, а я даже не напрягаюсь.',
  'Знаешь, что общего у тебя и этого сайта? Вы оба притворяетесь важными.',
  'Ты думал, что это баг? Нет, это фича.',
  'Ваше достижение: мастер по трате времени на фейковые админки.',
  'Следующий шаг: пойти заварить чай. Тебе он нужнее.',
  'Ты не первый. И, к сожалению, не последний.',
  'Это не админка. Это зеркало.',
  'Ты сейчас сидишь и читаешь это. Подумай об этом.',
  'Уровень угрозы: ты сам себе.',
  'Победа засчитана... в графе "потерянное время".',
  'Ты искал админку. Нашёл экзистенциальный кризис. Поздравляю.',
  'Может, вместо brute-force лучше brute-чай?',
  'Ты реально думал, что admin/admin до сих пор работает в 2025?',
  'Спасибо за визит. Теперь иди развиваться, пожалуйста.',
  'Это всё, что ты смог? Серьёзно?',
  'Ты не хакер. Ты просто человек с открытой вкладкой.',
  'Время, которое ты потратил сюда — официально осуждено.',
  'Памятник твоему упорству уже устанавливают... в разделе "лол".'
];

export default function HoneypotPage() {
  const [stage, setStage] = useState<Stage>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [selectedAction, setSelectedAction] = useState('');
  const [hackProgress, setHackProgress] = useState(0);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [trollMessage, setTrollMessage] = useState('');
  const [trollGif, setTrollGif] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  
  const terminalRef = useRef<HTMLDivElement>(null);

  // Отправка отчёта в honeypot backend
  const sendReport = useCallback(async (action: string, extraData: Record<string, unknown> = {}) => {
    if (!HONEYPOT_API) return;
    try {
      await fetch(`${HONEYPOT_API}/api/v1/honeypot/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          path_attempted: window.location.pathname,
          user_agent: navigator.userAgent,
          screen_resolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          referrer: document.referrer,
          ...extraData,
        }),
      });
    } catch (e) {
      // Silent fail
    }
  }, []);

  // При монтировании — репортим визит
  useEffect(() => {
    sendReport('page_view');
  }, [sendReport]);

  // Таймер блокировки
  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(prev => {
          const next = prev - 1;
          if (next === 0) {
            setIsLocked(false);
            setLoginAttempts(0);
          }
          return next;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [lockTimer]);

  // Обработка логина
  const handleLogin = () => {
    if (isLocked) return;
    
    setLoginAttempts(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setIsLocked(true);
        setLockTimer(30);
        setLoginError(`Слишком много попыток. Подождите 30 секунд.`);
        sendReport('rate_limit_triggered', { attempts: next });
      }
      return next;
    });
    
    sendReport('login_attempt', { username_tried: username, password_tried: password, attempt: loginAttempts + 1 });

    // "Правильный" пароль — admin/admin или root/root
    if ((username === 'admin' && password === 'admin') || 
        (username === 'root' && password === 'root') ||
        (username === 'administrator' && password === 'administrator')) {
      setStage('panel');
      sendReport('panel_access', { username_tried: username });
    } else {
      setLoginError(`Неверный логин или пароль (попытка ${loginAttempts + 1})`);
      
      // После 3 попыток "подсказываем"
      if (loginAttempts >= 2 && loginAttempts < 4) {
        setLoginError('Подсказка: попробуй стандартные учётные данные 😉');
      }
    }
  };

  // Запуск "взлома"
  const startHacking = (action: string) => {
    setSelectedAction(action);
    setStage('hacking');
    setHackProgress(0);
    setTerminalLogs([]);
    
    sendReport('hack_attempt', { hack_action: action });

    const logs = getHackingLogs(action);
    let logIndex = 0;

    const runLog = () => {
      if (logIndex < logs.length) {
        setTerminalLogs(prev => [...prev, logs[logIndex]]);
        logIndex++;
        const progress = Math.min(95, (logIndex / logs.length) * 100);
        setHackProgress(progress);
        
        // Автоскролл терминала
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
        
        // Следующий лог с рандомной задержкой
        setTimeout(runLog, 300 + Math.random() * 400);
      } else {
        // Финал — показываем "успех" потом троллим
        setHackProgress(100);
        setTerminalLogs(prev => [...prev, '', '✅ OPERATION COMPLETE!', '', 'Preparing results...']);
        
        // Через 2 секунды — ТРОЛЛЬ!
        setTimeout(() => {
          setTrollMessage(trollMessages[Math.floor(Math.random() * trollMessages.length)]);
          setTrollGif(trollGifs[Math.floor(Math.random() * trollGifs.length)]);
          setStage('trolled');

          sendReport('final_trolled', {
            hack_action: action,
          });
        }, 2000);
      }
    };
    
    // Запускаем первый лог
    setTimeout(runLog, 500);
  };

  // STAGE 1: Фейковый логин
  if (stage === 'login') {
    return (
      <Box
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          padding: '24px 16px',
        }}
      >
        <Container size={420} w="100%" px={0}>
          <Paper p="xl" className="glow-card" style={{ ...componentStyles.card }}>
            <Stack gap="lg">
              <Stack gap={4} ta="center">
                <Title order={2} style={{ color: colors.textPrimary }}>
                  Служебный вход
                </Title>
                <Text size="sm" c={colors.textMuted}>
                  Панель управления LocalTea
                </Text>
              </Stack>

              <Divider style={{ borderColor: 'rgba(212,137,79,0.12)' }} />
            
            <TextInput
              label="Логин"
              placeholder="Введите логин"
              leftSection={<IconUser size={16} />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              styles={inputStyles}
            />
            
            <PasswordInput
              label="Пароль"
              placeholder="Введите пароль"
              leftSection={<IconLock size={16} />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              styles={inputStyles}
            />
            
            {loginError && (
              <Text size="sm" c={colors.error} ta="center">{loginError}</Text>
            )}
            
            <Button 
              fullWidth 
              onClick={handleLogin}
              variant="gradient"
              gradient={colors.gradientButton}
              disabled={isLocked}
            >
              {isLocked ? `Заблокировано (${lockTimer}с)` : 'Войти'}
            </Button>
            
            {/* "Скрытая" подсказка — скрипт-кидди найдут в DevTools */}
            {/* <!-- DEBUG: default credentials admin:admin --> */}
            <Text size="xs" c={colors.textMuted} ta="center" style={{ opacity: 0.35 }}>
              v2.4.1-debug | подсказка: см. исходник страницы
            </Text>
          </Stack>
          </Paper>
        
        {/* Скрытый комментарий в HTML — приманка */}
        <div dangerouslySetInnerHTML={{ __html: '<!-- TODO: remove before production! Default login: admin / admin -->' }} />
        </Container>
      </Box>
    );
  }

  // STAGE 2: Фейковая панель управления
  if (stage === 'panel') {
    return (
      <Box
        style={{
          minHeight: '100vh',
          background: 'transparent',
          padding: '24px 16px',
        }}
      >
        <Container size={860} px={0}>
          <Paper p="xl" className="glow-card" style={{ ...componentStyles.card }}>
            <Stack gap="lg">
              <Group justify="space-between" align="baseline">
                <Title order={2} style={{ color: colors.textPrimary }}>
                  Служебная консоль
                </Title>
                <Text size="sm" c={colors.success}>
                  статус: активен
                </Text>
              </Group>

              <Text c={colors.textSecondary}>
                Добро пожаловать, <b style={{ color: colors.textAccent }}>{username}</b>. Выберите сценарий:
              </Text>

              <Stack gap="sm">
                {hackActions.map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    color="teaGold"
                    size="md"
                    fullWidth
                    leftSection={<IconTerminal2 size={18} />}
                    onClick={() => startHacking(action.id)}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {action.label}
                  </Button>
                ))}
              </Stack>

              <Text size="xs" c={colors.textMuted} ta="center">
              </Text>
            </Stack>
          </Paper>
        </Container>
      </Box>
    );
  }

  // STAGE 3: Терминал "взлома"
  if (stage === 'hacking') {
    return (
      <Box
        style={{
          minHeight: '100vh',
          background: 'transparent',
          padding: '24px 16px',
          fontFamily: 'monospace',
        }}
      >
        <Stack gap="md" maw={980} mx="auto">
          <Group justify="space-between">
            <Group gap="xs">
              <IconTerminal2 size={20} color={colors.textAccent} />
              <Text c={colors.textSecondary} fw={700}>localtea-sim:~</Text>
            </Group>
            <Text c={colors.textSecondary}>{hackProgress.toFixed(0)}%</Text>
          </Group>
          
          <Progress 
            value={hackProgress} 
            color="teaGold"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
          
          <Paper
            ref={terminalRef}
            p="md"
            style={{
              background: colors.bgOverlay,
              border: `1px solid ${colors.borderAccent}`,
              height: '60vh',
              overflow: 'auto',
              fontFamily: 'monospace',
            }}
          >
            {terminalLogs.map((log, i) => {
              const line = typeof log === 'string' ? log : '';
              return (
                <Text
                  key={i}
                  size="sm"
                  c={line.startsWith('>') ? colors.textMuted : line.includes('SUCCESS') ? colors.success : colors.textSecondary}
                  style={{ fontFamily: 'monospace' }}
                >
                  {line}
                </Text>
              );
            })}
            <Text c={colors.textSecondary} style={{ animation: 'blink 1s infinite' }}>▊</Text>
          </Paper>
          
          <Text size="xs" c={colors.textMuted} ta="center">
            Не закрывайте окно. Взлом выполняется…
          </Text>
        </Stack>
        
        <style>{`
          @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
          }
        `}</style>
      </Box>
    );
  }

  // STAGE 4: ТРОЛЛИНГ!
  if (stage === 'trolled') {
    return (
      <Box
        style={{
          minHeight: '100vh',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <Container size={760} px={0}>
          <Stack align="center" gap="xl">
            <Paper p="xl" className="glow-card" style={{ ...componentStyles.card, width: '100%' }}>
              <Stack align="center" gap="lg">

                {/* Базовая картинка */}
                <Box
                  style={{
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: `1px solid ${colors.borderAccent}`,
                    boxShadow: `0 18px 50px ${colors.shadowDark}`,
                    maxWidth: 520,
                    width: '100%',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={trollBaseImage}
                    alt="access denied"
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </Box>

                {/* Тролль-гифка над всем */}
                {trollGif && (
                  <Box
                    style={{
                      borderRadius: 14,
                      overflow: 'hidden',
                      border: `1px solid ${colors.borderAccent}`,
                      background: 'rgba(0,0,0,0.3)',
                      maxWidth: 340,
                      width: '100%',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={trollGif}
                      alt="troll gif"
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </Box>
                )}

                {/* Сообщение */}
                <Box style={{ width: '100%', maxWidth: 620 }}>
                  <Paper p="lg" style={{ background: 'rgba(0,0,0,0.18)', border: `1px solid ${colors.borderAccent}` }}>
                    <Title order={3} ta="center" style={{ color: colors.textPrimary }}>
                      Ну привет.
                    </Title>
                    <Text size="lg" c={colors.textSecondary} ta="center" mt="xs" fw={500}>
                      {trollMessage}
                    </Text>
                  </Paper>
                </Box>
              </Stack>
            </Paper>
          
          {/* Кнопка на главную */}
          <Button
            component="a"
            href="/"
            size="lg"
            variant="gradient"
            gradient={colors.gradientButton}
            style={{ marginTop: 10 }}
          >
            Вернуться на главную
          </Button>
          
          <Text size="xs" c={colors.textMuted} ta="center" maw={560}>
            P.S. Ты правда прошёл весь путь ради этого текста. Сильное решение.
          </Text>
          </Stack>
        </Container>
      </Box>
    );
  }

  return null;
}
