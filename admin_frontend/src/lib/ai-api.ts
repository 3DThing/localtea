import axios from 'axios';

// AI Assistant microservice URL
// NEXT_PUBLIC_AI_API_URL should be full base URL, e.g. http://localhost:8004/api/v1/admin/assistant
const AI_API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8004/api/v1/admin/assistant';

export const aiApi = axios.create({
  baseURL: AI_API_BASE,
});

// Auth interceptor
aiApi.interceptors.request.use((config) => {
  // Don't override Content-Type for multipart/FormData — axios sets it automatically with boundary
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

aiApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ API Functions ============

// Settings
export const getSettings = (group?: string) =>
  aiApi.get('/settings', { params: group ? { group } : {} }).then(r => r.data);

export const updateSetting = (key: string, value: string) =>
  aiApi.put(`/settings/${key}`, { value }).then(r => r.data);

export const updateSettingsBulk = (settings: Record<string, string>) =>
  aiApi.put('/settings', { settings }).then(r => r.data);

// Conversations
export const getConversations = (params?: Record<string, string>) =>
  aiApi.get('/conversations', { params }).then(r => r.data);

export const getConversation = (id: number) =>
  aiApi.get(`/conversations/${id}`).then(r => r.data);

export const switchToManager = (id: number) =>
  aiApi.post(`/conversations/${id}/switch-to-manager`).then(r => r.data);

export const switchToAI = (id: number) =>
  aiApi.post(`/conversations/${id}/switch-to-ai`).then(r => r.data);

export const closeConversation = (id: number) =>
  aiApi.post(`/conversations/${id}/close`).then(r => r.data);

export const deleteConversation = (id: number) =>
  aiApi.delete(`/conversations/${id}`).then(r => r.data);

export const sendManagerMessage = (id: number, content: string) =>
  aiApi.post(`/conversations/${id}/manager-message`, { content }).then(r => r.data);

// RAG Documents
export const getRAGDocuments = (params?: Record<string, string | number>) =>
  aiApi.get('/rag', { params }).then(r => r.data);

export const createRAGDocument = (data: Record<string, string | undefined>) =>
  aiApi.post('/rag', data).then(r => r.data);

export const updateRAGDocument = (id: number, data: Record<string, string | undefined>) =>
  aiApi.put(`/rag/${id}`, data).then(r => r.data);

export const deleteRAGDocument = (id: number) =>
  aiApi.delete(`/rag/${id}`).then(r => r.data);

// Banned Phrases
export const getBannedPhrases = () =>
  aiApi.get('/banned-phrases').then(r => r.data);

export const createBannedPhrase = (data: Record<string, string | boolean | undefined>) =>
  aiApi.post('/banned-phrases', data).then(r => r.data);

export const updateBannedPhrase = (id: number, data: Record<string, string | boolean | undefined>) =>
  aiApi.put(`/banned-phrases/${id}`, data).then(r => r.data);

export const deleteBannedPhrase = (id: number) =>
  aiApi.delete(`/banned-phrases/${id}`).then(r => r.data);

// Statistics
export const getAssistantStats = () =>
  aiApi.get('/stats').then(r => r.data);

// Telegram
export const testTelegram = () =>
  aiApi.post('/telegram/test').then(r => r.data);

// Telegram Links
export const getTelegramLinks = () =>
  aiApi.get('/telegram/links').then(r => r.data);

export const createTelegramLink = (data: {
  admin_user_id: number;
  telegram_chat_id: string;
  telegram_username?: string;
  notify_new_conversation?: boolean;
  notify_manager_request?: boolean;
  notify_new_message?: boolean;
}) =>
  aiApi.post('/telegram/links', data).then(r => r.data);

export const updateTelegramLink = (id: number, data: Record<string, string | boolean>) =>
  aiApi.put(`/telegram/links/${id}`, data).then(r => r.data);

export const deleteTelegramLink = (id: number) =>
  aiApi.delete(`/telegram/links/${id}`).then(r => r.data);

export const testTelegramLink = (id: number) =>
  aiApi.post(`/telegram/links/${id}/test`).then(r => r.data);

export const getTelegramAdmins = () =>
  aiApi.get('/telegram/admins').then(r => r.data);

// AI Avatar
export const uploadAssistantAvatar = (file: File) => {
  const form = new FormData();
  form.append('file', file);
  return aiApi.post('/settings/upload-avatar', form).then(r => r.data as { avatar_url: string });
};

export const deleteAssistantAvatar = () =>
  aiApi.delete('/settings/avatar').then(r => r.data);
