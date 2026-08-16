import axios from 'axios';
import { User, Document, Conversation, SystemStatus } from '../types';

const API = axios.create({
  baseURL: '/api',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: async (email: string, password: string) => {
    const res = await API.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (email: string, password: string, full_name?: string) => {
    const res = await API.post('/auth/register', { email, password, full_name });
    return res.data;
  },
  me: async () => {
    const res = await API.get<User>('/auth/me');
    return res.data;
  },
};

export const documentAPI = {
  list: async () => {
    const res = await API.get<Document[]>('/documents');
    return res.data;
  },
  get: async (id: number) => {
    const res = await API.get<Document>(`/documents/${id}`);
    return res.data;
  },
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await API.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  delete: async (id: number) => {
    await API.delete(`/documents/${id}`);
  },
};

export const chatAPI = {
  query: async (payload: {
    document_id: number;
    question: string;
    conversation_id?: number;
    engine?: string;
    groq_api_key?: string;
    gemini_api_key?: string;
  }) => {
    const res = await API.post('/chat/query', payload);
    return res.data;
  },
  listConversations: async () => {
    const res = await API.get<Conversation[]>('/chat/conversations');
    return res.data;
  },
  getConversation: async (id: number) => {
    const res = await API.get<Conversation>(`/chat/conversations/${id}`);
    return res.data;
  },
  deleteConversation: async (id: number) => {
    await API.delete(`/chat/conversations/${id}`);
  },
};

export const settingsAPI = {
  getStatus: async () => {
    const res = await API.get<SystemStatus>('/settings/status');
    return res.data;
  },
};

export default API;
