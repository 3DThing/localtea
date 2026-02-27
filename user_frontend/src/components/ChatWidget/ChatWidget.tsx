'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ChatWidget.module.css';

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'manager' | 'system';
  content: string;
  created_at: string;
}

interface ChatConfig {
  enabled: boolean;
  name: string;
  primary_color: string;
  header_text: string;
  placeholder: string;
  welcome_message: string;
  position: string;
  custom_css: string;
  assistant_avatar_url?: string | null;
}

const AI_API_BASE = process.env.NEXT_PUBLIC_AI_ASSISTANT_URL || '/api/v1/ai';

/** Lightweight markdown → safe HTML (bold, italic, inline code, line breaks) */
function renderMarkdown(text: string): string {
  // Escape HTML first to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  // Bold: **text**
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text* (single asterisk)
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  return html;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [status, setStatus] = useState<string>('active');
  const [managerName, setManagerName] = useState<string | null>(null);
  const [managerAvatarUrl, setManagerAvatarUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Get session ID
  const getSessionId = useCallback(() => {
    if (typeof window === 'undefined') return '';
    let sid = localStorage.getItem('localtea_chat_session');
    if (!sid) {
      sid = 'chat_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('localtea_chat_session', sid);
    }
    return sid;
  }, []);

  // Get auth headers
  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Session-ID': getSessionId(),
    };
    // Token is stored by zustand persist in 'auth-storage' key as JSON
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed?.state?.accessToken || null;
        }
      } catch {}
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [getSessionId]);

  // Load config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${AI_API_BASE}/chat/config`, { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        console.error('Failed to load chat config:', err);
      } finally {
        setConfigLoaded(true);
      }
    };
    fetchConfig();
  }, [getHeaders]);

  // Restore conversation from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedConvId = localStorage.getItem('localtea_conv_id');
      if (savedConvId) {
        setConversationId(parseInt(savedConvId, 10));
      }
    }
  }, []);

  // Load conversation messages when opening an existing one
  useEffect(() => {
    if (isOpen && conversationId && messages.length === 0) {
      loadConversation(conversationId);
    }
  }, [isOpen, conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages (for manager mode and to detect closure)
  useEffect(() => {
    if (isOpen && conversationId && status !== 'closed') {
      // Poll when in manager modes, or even in active mode (to detect status changes)
      const shouldPoll = status === 'manager_connected' || status === 'manager_requested' || status === 'active';
      if (shouldPoll) {
        pollingRef.current = setInterval(async () => {
          try {
            const res = await fetch(`${AI_API_BASE}/chat/conversations/${conversationId}/messages`, {
              headers: getHeaders(),
            });
            if (res.ok) {
              const data = await res.json();
              setMessages(data.messages);
              if (data.status !== status) {
                setStatus(data.status);
              }
              if (data.manager_name) setManagerName(data.manager_name);
              if (data.manager_avatar_url) setManagerAvatarUrl(data.manager_avatar_url);
            }
          } catch {}
        }, 3000);
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, conversationId, status, getHeaders]);

  const loadConversation = async (convId: number) => {
    try {
      const res = await fetch(`${AI_API_BASE}/chat/conversations/${convId}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setStatus(data.status);
        if (data.manager_name) setManagerName(data.manager_name);
        if (data.manager_avatar_url) setManagerAvatarUrl(data.manager_avatar_url);
      } else if (res.status === 404) {
        // Conversation was deleted, start fresh
        setConversationId(null);
        localStorage.removeItem('localtea_conv_id');
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setLoading(true);

    try {
      if (!conversationId) {
        // Create new conversation
        const res = await fetch(`${AI_API_BASE}/chat/conversations`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ message: text }),
        });

        if (!res.ok) {
          if (res.status === 429) {
            const errData = await res.json().catch(() => null);
            throw new Error(errData?.detail || 'Слишком много сообщений');
          }
          throw new Error('Failed to create conversation');
        }
        const data = await res.json();
        
        setConversationId(data.id);
        localStorage.setItem('localtea_conv_id', String(data.id));
        setMessages(data.messages || []);
        setStatus(data.status);
      } else {
        // Add optimistic user message
        const tempMsg: Message = {
          id: Date.now(),
          role: 'user',
          content: text,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempMsg]);

        const res = await fetch(`${AI_API_BASE}/chat/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ content: text }),
        });

        if (!res.ok) {
          if (res.status === 429) {
            const errData = await res.json().catch(() => null);
            // Remove optimistic message and show rate limit warning
            setMessages(prev => {
              const filtered = prev.filter(m => m.id !== tempMsg.id);
              return [...filtered, {
                id: Date.now(),
                role: 'system' as const,
                content: errData?.detail || 'Слишком много сообщений',
                created_at: new Date().toISOString(),
              }];
            });
            return;
          }
          throw new Error('Failed to send message');
        }
        const aiMsg = await res.json();

        // Replace temp msg with actual + AI response
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempMsg.id);
          const userMsg: Message = {
            id: tempMsg.id - 1,
            role: 'user',
            content: text,
            created_at: tempMsg.created_at,
          };
          return [...filtered, userMsg, aiMsg];
        });

        // Re-check status (might have switched to manager mode)
        if (aiMsg.role === 'assistant' && aiMsg.content.includes('менеджер')) {
          // Reload full conversation to get correct status
          await loadConversation(conversationId);
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage = err?.message && err.message !== 'Failed to create conversation'
        ? err.message
        : 'Произошла ошибка. Попробуйте позже.';
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'system',
        content: errorMessage,
        created_at: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setStatus('active');
    setManagerName(null);
    setManagerAvatarUrl(null);
    localStorage.removeItem('localtea_conv_id');
  };

  // Don't render if not enabled or config not loaded
  if (!configLoaded || !config?.enabled) return null;

  const primaryColor = config.primary_color || '#d4894f';
  const position = config.position || 'bottom-right';
  const isRight = position === 'bottom-right';

  return (
    <>
      {config.custom_css && <style>{config.custom_css}</style>}
      <div className={styles.container} data-position={position}>
        {/* Chat Window */}
        {isOpen && (
          <div className={styles.chatWindow}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerContent}>
                <div className={styles.headerIcon}>
                    {config.assistant_avatar_url
                      ? <img src={config.assistant_avatar_url} alt="" className={styles.avatarImg} style={{ width: 28, height: 28 }} />
                      : '🍵'
                    }
                  </div>
                <div>
                  <div className={styles.headerTitle}>{config.header_text || 'Чайный помощник'}</div>
                  <div className={styles.headerStatus}>
                    {status === 'closed' ? '🔒 Диалог завершён' :
                     status === 'manager_connected' ? `👤 ${managerName || 'Менеджер'} в чате` :
                     status === 'manager_requested' ? '⏳ Ожидание менеджера...' :
                     '● Онлайн'}
                  </div>
                </div>
              </div>
              <div className={styles.headerActions}>
                <button 
                  className={styles.headerBtn}
                  onClick={startNewConversation}
                  title="Новый чат"
                >
                  ✨
                </button>
                <button 
                  className={styles.headerBtn}
                  onClick={() => setIsOpen(false)}
                  title="Закрыть"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesContainer}>
              {/* Welcome message */}
              {messages.length === 0 && config.welcome_message && (
                <div className={styles.welcomeMessage}>
                  <div className={styles.welcomeIcon}>🍵</div>
                  <p>{config.welcome_message}</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${
                    msg.role === 'user' ? styles.messageUser :
                    msg.role === 'manager' ? styles.messageManager :
                    msg.role === 'system' ? styles.messageSystem :
                    styles.messageAssistant
                  }`}
                >
                  {msg.role === 'system' ? (
                    <div className={styles.systemBadge}>
                      {msg.content}
                    </div>
                  ) : (
                    <>
                      {msg.role !== 'user' && (
                        <div className={styles.messageAvatar}>
                          {msg.role === 'manager' ? (
                            managerAvatarUrl ? (
                              <img src={managerAvatarUrl} alt="" className={styles.avatarImg} />
                            ) : (
                              (managerName || 'М').charAt(0).toUpperCase()
                            )
                          ) : (
                            config?.assistant_avatar_url
                              ? <img src={config.assistant_avatar_url} alt="" className={styles.avatarImg} />
                              : '🍵'
                          )}
                        </div>
                      )}
                      <div className={`${styles.messageBubble} ${
                        msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant
                      }`}>
                        {msg.role === 'manager' && (
                          <div className={styles.managerLabel}>{managerName || 'Менеджер'}</div>
                        )}
                        <div className={styles.messageText} dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                        <div className={styles.messageTime}>
                          {new Date(msg.created_at).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {loading && (
                <div className={`${styles.message} ${styles.messageAssistant}`}>
                  <div className={styles.messageAvatar}>
                    {config?.assistant_avatar_url
                      ? <img src={config.assistant_avatar_url} alt="" className={styles.avatarImg} />
                      : '🍵'
                    }
                  </div>
                  <div className={`${styles.messageBubble} ${styles.bubbleAssistant}`}>
                    <div className={styles.typing}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input — hidden when conversation is closed */}
            {status === 'closed' ? (
              <div className={styles.closedArea}>
                <button 
                  className={styles.newChatBtn}
                  onClick={startNewConversation}
                >
                  ✨ Начать новый чат
                </button>
              </div>
            ) : (
            <div className={styles.inputArea}>
              <textarea
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={config.placeholder || 'Задайте вопрос о чае...'}
                rows={1}
                disabled={loading}
              />
              <button 
                className={styles.sendBtn}
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{ background: primaryColor }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            )}
          </div>
        )}

        {/* Toggle Button */}
        <button
          className={`${styles.toggleBtn} ${isOpen ? styles.toggleBtnOpen : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          style={{ background: primaryColor }}
          aria-label="Открыть чат с помощником"
        >
          {isOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="10" r="0.5" fill="currentColor" />
              <circle cx="8" cy="10" r="0.5" fill="currentColor" />
              <circle cx="16" cy="10" r="0.5" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
