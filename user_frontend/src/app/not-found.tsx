'use client';

import { Container, Title, Text, Button, Group, Box, Stack } from '@mantine/core';
import { IconHome, IconMug, IconLeaf } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const [leaves, setLeaves] = useState<Array<{ left: number; delay: number; duration: number; size: number }>>([]);
  
  useEffect(() => {
    // Генерируем позиции листьев на клиенте
    setLeaves(
      [...Array(12)].map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 8 + Math.random() * 6,
        size: 16 + Math.random() * 16,
      }))
    );
  }, []);

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes steam {
          0% { opacity: 0; transform: translateY(0) scale(1); }
          50% { opacity: 0.6; }
          100% { opacity: 0; transform: translateY(-40px) scale(1.5); }
        }
        @keyframes leafFall {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .tea-cup { animation: float 4s ease-in-out infinite; }
        .steam-1 { animation: steam 2s ease-out infinite; }
        .steam-2 { animation: steam 2.5s ease-out infinite 0.3s; }
        .steam-3 { animation: steam 3s ease-out infinite 0.6s; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 30px rgba(200, 140, 70, 0.4) !important; }
        .btn-outline:hover { background: rgba(200, 140, 70, 0.1); border-color: #c88c46 !important; transform: translateY(-2px); }
      `}</style>
    <Box
      style={{
        minHeight: 'calc(100vh - 160px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0a0705 0%, #1a1210 50%, #0a0705 100%)',
      }}
    >
      {/* Падающие чайные листья */}
      {leaves.map((leaf, i) => (
        <Box
          key={i}
          style={{
            position: 'absolute',
            left: `${leaf.left}%`,
            top: '-50px',
            animation: `leafFall ${leaf.duration}s linear infinite`,
            animationDelay: `${leaf.delay}s`,
            opacity: 0.3,
            color: '#c88c46',
            fontSize: `${leaf.size}px`,
          }}
        >
          <IconLeaf />
        </Box>
      ))}

      {/* Основной контент */}
      <Container size="sm">
        <Stack align="center" gap="xl">
          {/* Чашка с паром - 404 */}
          <Box
            className="tea-cup"
            style={{
              position: 'relative',
            }}
          >
            {/* Пар */}
            <Box
              className="steam-1"
              style={{
                position: 'absolute',
                top: '-30px',
                left: '30%',
                width: '8px',
                height: '30px',
                background: 'linear-gradient(to top, rgba(200, 140, 70, 0.4), transparent)',
                borderRadius: '50%',
              }}
            /> 
            <Box
              className="steam-2"
              style={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                width: '8px',
                height: '30px',
                background: 'linear-gradient(to top, rgba(200, 140, 70, 0.4), transparent)',
                borderRadius: '50%',
              }}
            />
            <Box
              className="steam-3"
              style={{
                position: 'absolute',
                top: '-30px',
                left: '70%',
                width: '8px',
                height: '30px',
                background: 'linear-gradient(to top, rgba(200, 140, 70, 0.4), transparent)',
                borderRadius: '50%',
              }}
            />
            
            {/* Чашка с числом 404 */}
            <Box
              style={{
                width: '180px',
                height: '140px',
                background: 'linear-gradient(135deg, #c88c46 0%, #8b5a2b 100%)',
                borderRadius: '0 0 50% 50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 20px 60px rgba(200, 140, 70, 0.3), inset 0 -10px 30px rgba(0,0,0,0.3)',
                border: '3px solid rgba(255, 200, 120, 0.3)',
              }}
            >
              {/* Ручка чашки */}
              <Box
                style={{
                  position: 'absolute',
                  right: '-35px',
                  top: '20px',
                  width: '40px',
                  height: '60px',
                  border: '8px solid #c88c46',
                  borderLeft: 'none',
                  borderRadius: '0 30px 30px 0',
                  boxShadow: '5px 5px 15px rgba(0,0,0,0.3)',
                }}
              />
              
              {/* Чай внутри */}
              <Box
                style={{
                  position: 'absolute',
                  top: '15px',
                  left: '15px',
                  right: '15px',
                  height: '40px',
                  background: 'linear-gradient(180deg, #4a2c1a 0%, #2d1810 100%)',
                  borderRadius: '50%',
                  boxShadow: 'inset 0 5px 15px rgba(0,0,0,0.5)',
                }}
              />
              
              {/* Число 404 */}
              <Text
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: '#fffdf8',
                  textShadow: '2px 2px 10px rgba(0,0,0,0.5)',
                  position: 'relative',
                  zIndex: 1,
                  marginTop: '20px',
                }}
              >
                404
              </Text>
            </Box>
          </Box>

          {/* Текст */}
          <Stack align="center" gap="md" mt="xl">
            <Title
              order={1}
              style={{
                fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
                fontWeight: 700,
                color: '#fffdf8',
                textAlign: 'center',
              }}
            >
              Ой! Чай пролился...
            </Title>
            
            <Text
              size="lg"
              c="dimmed"
              maw={400}
              ta="center"
              style={{ color: 'rgba(255, 253, 248, 0.6)' }}
            >
              Страница, которую вы ищете, испарилась как пар над горячей чашкой чая. 
              Возможно, она была выпита или никогда не существовала.
            </Text>
          </Stack>

          {/* Кнопки */}
          <Group mt="xl" gap="md">
            <Button
              component={Link}
              href="/"
              size="lg"
              leftSection={<IconHome size={20} />}
              style={{
                background: 'linear-gradient(135deg, #c88c46 0%, #a06432 100%)',
                border: '1px solid rgba(255, 200, 120, 0.3)',
                boxShadow: '0 4px 20px rgba(200, 140, 70, 0.3)',
                transition: 'all 0.3s ease',
              }}
              styles={{
                root: {
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 30px rgba(200, 140, 70, 0.4)',
                  },
                },
              }}
            >
              На главную
            </Button>
            
            <Button
              component={Link}
              href="/catalog"
              size="lg"
              variant="outline"
              leftSection={<IconMug size={20} />}
              style={{
                borderColor: 'rgba(200, 140, 70, 0.5)',
                color: '#c88c46',
                transition: 'all 0.3s ease',
              }}
              styles={{
                root: {
                  '&:hover': {
                    background: 'rgba(200, 140, 70, 0.1)',
                    borderColor: '#c88c46',
                    transform: 'translateY(-2px)',
                  },
                },
              }}
            >
              К каталогу
            </Button>
          </Group>

          {/* Подсказка */}
          <Text
            size="sm"
            mt="xl"
            style={{ color: 'rgba(255, 253, 248, 0.4)' }}
          >
            Или попробуйте поиск, чтобы найти нужный чай
          </Text>
        </Stack>
      </Container>

      {/* Декоративные элементы */}
      <Box
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '5%',
          width: '150px',
          height: '150px',
          background: 'radial-gradient(circle, rgba(200, 140, 70, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }}
      />
      <Box
        style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(200, 140, 70, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
        }}
      />
    </Box>
    </>
  );
}
