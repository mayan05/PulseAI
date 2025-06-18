import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './auth';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  file?: File; // Allow passing the File object for PDF uploads
}

export interface Message {
  id: string;
  content: string;
  type: 'TEXT' | 'FILE';
  model: string;
  role: 'USER' | 'ASSISTANT';
  createdAt: Date;
  conversationId: string;
  fileType?: string;  // For storing file type (e.g., 'pdf', 'txt')
  fileName?: string;  // For storing original file name
  timestamp: Date;    // For UI display
  attachments?: Attachment[];  // For file attachments
}

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

export type LLMProvider = 'claude' | 'gpt' | 'llama';

interface ChatState {
  chats: Chat[];
  activeChat: string | null;
  isAuthenticated: boolean;
  selectedProvider: LLMProvider;
  isLoading: boolean;
  isGeneratingImage: boolean;
}

interface ChatActions {
  createChat: () => Promise<Chat | null>;
  deleteChat: (chatId: string) => Promise<void>;
  setActiveChat: (chatId: string) => void;
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'createdAt' | 'conversationId' | 'timestamp'>) => Promise<void>;
  setAuthenticated: (authenticated: boolean) => void;
  setProvider: (provider: LLMProvider) => void;
  setLoading: (loading: boolean) => void;
  setGeneratingImage: (generating: boolean) => void;
  updateChat: (chatId: string, updatedChat: Chat) => Promise<void>;
  loadChats: () => Promise<void>;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      activeChat: null,
      isAuthenticated: false,
      selectedProvider: 'llama',
      isLoading: false,
      isGeneratingImage: false,

      loadChats: async () => {
        try {
          // Check for localStorage data first
          const localChats = localStorage.getItem('chat-storage');
          if (localChats) {
            const parsed = JSON.parse(localChats);
            if (parsed && parsed.state && Array.isArray(parsed.state.chats) && parsed.state.chats.length > 0) {
              set({ chats: parsed.state.chats, activeChat: parsed.state.activeChat });
              return;
            }
          }
          // Only use localStorage - no DB fallback to ensure persistence
          console.log('No local chats found, starting fresh');
        } catch (error) {
          console.error('Error loading chats:', error);
        }
      },

      createChat: async (): Promise<Chat | null> => {
        // Create chat purely in localStorage - no DB calls
        const newChat: Chat = {
          id: `chat-${Date.now()}`,
          title: 'New Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        };

        // Update UI immediately
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChat: newChat.id,
        }));

        return newChat;
      },

      deleteChat: async (chatId: string): Promise<void> => {
        // Remove chat from localStorage only - no DB calls
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== chatId),
          activeChat: state.activeChat === chatId ? null : state.activeChat,
        }));
      },

      setActiveChat: (chatId: string) => {
        set({ activeChat: chatId });
      },

      addMessage: async (chatId: string, message: Omit<Message, 'id' | 'createdAt' | 'conversationId' | 'timestamp'>): Promise<void> => {
        // Create user message immediately for instant UI update
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          ...message,
          createdAt: new Date(),
          timestamp: new Date(),
          conversationId: chatId,
        };

        // Create optimistic AI message for instant UI feedback
        const optimisticAiMessage: Message = {
          id: `temp-ai-${Date.now()}`,
          content: '...',
          type: 'TEXT' as const,
          model: message.model,
          role: 'ASSISTANT' as const,
          createdAt: new Date(),
          timestamp: new Date(),
          conversationId: chatId,
        };

        // Update UI immediately with both messages for instant feedback
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...(chat.messages || []), userMessage, optimisticAiMessage],
                }
              : chat
          ),
        }));

        // Set loading state for AI response
        set({ isLoading: true });

        // Handle API calls in the background without blocking UI
        const handleApiCall = async () => {
          try {
            // Get auth token
            const token = localStorage.getItem('token');
            if (!token) {
              throw new Error('Not authenticated');
            }

            // --- PDF/TXT FILE HANDLING FOR GPT/CLAUDE ---
            const hasFile = Array.isArray(message.attachments) && message.attachments.some(att => att.type === 'application/pdf' || att.type === 'text/plain');
            if (hasFile) {
              const fileAttachment = message.attachments!.find(att => att.type === 'application/pdf' || att.type === 'text/plain');
              if (!fileAttachment) throw new Error('No file attachment found');
              const file = fileAttachment.file;
              if (!file) throw new Error('File object missing in attachment');
              const formData = new FormData();
              formData.append('prompt', message.content);
              formData.append('temperature', '0.7');
              formData.append('file', file);
              // Choose endpoint based on model
              let endpoint = '';
              if (message.model === 'claude') {
                endpoint = 'http://localhost:8000/claude/generate';
              } else {
                endpoint = 'http://localhost:8000/gpt/generate-form';
              }
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
                body: formData,
              });
              if (!response.ok) {
                throw new Error('Failed to process file');
              }
              const data = await response.json();
              // Update the optimistic AI message with real content
              const aiMessage = {
                ...optimisticAiMessage,
                id: `ai-${Date.now()}`,
                content: data.text || (data.aiMessage && data.aiMessage.text) || 'No response',
              };
              set((state) => ({
                chats: state.chats.map((chat) =>
                  chat.id === chatId
                    ? {
                        ...chat,
                        messages: (chat.messages || [])
                          .filter((msg) => typeof msg.id === 'string' ? !msg.id.startsWith('temp-ai-') : true)
                          .concat([aiMessage]),
                      }
                    : chat
                ),
              }));
              set({ isLoading: false });
              return;
            }
            // --- END FILE HANDLING ---

            // For regular messages, call the LLM service directly (no DB)
            let endpoint = '';
            if (message.model === 'claude') {
              endpoint = 'http://localhost:8000/claude/generate';
            } else if (message.model === 'gpt') {
              endpoint = 'http://localhost:8000/gpt/generate';
            } else {
              endpoint = 'http://localhost:8000/llama/generate';
            }

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                prompt: message.content,
                temperature: 0.7
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to get AI response');
            }

            const data = await response.json();
            const aiMessage = {
              ...optimisticAiMessage,
              id: `ai-${Date.now()}`,
              content: data.text || data.response || 'No response received',
            };

            // Replace optimistic AI message with real message
            set((state) => ({
              chats: state.chats.map((chat) =>
                chat.id === chatId
                  ? {
                      ...chat,
                      messages: (chat.messages || [])
                        .filter((msg) => typeof msg.id === 'string' ? !msg.id.startsWith('temp-ai-') : true)
                        .concat([aiMessage]),
                    }
                  : chat
              ),
            }));
          } catch (error) {
            console.error('Error sending message:', error);
            // Remove optimistic AI message on error, keep user message
            set((state) => ({
              chats: state.chats.map((chat) =>
                chat.id === chatId
                  ? {
                      ...chat,
                      messages: (chat.messages || [])
                        .filter((msg) => typeof msg.id === 'string' ? !msg.id.startsWith('temp-ai-') : true),
                    }
                  : chat
              ),
            }));
          } finally {
            // Clear loading state
            set({ isLoading: false });
          }
        };

        // Start API call in background without awaiting
        handleApiCall();
      },

      setAuthenticated: (authenticated: boolean) => {
        set({ isAuthenticated: authenticated });
        if (authenticated) {
          get().loadChats();
        } else {
          set({ chats: [], activeChat: null });
        }
      },

      setProvider: (provider: LLMProvider) => {
        set({ selectedProvider: provider });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setGeneratingImage: (generating: boolean) => {
        set({ isGeneratingImage: generating });
      },

      updateChat: async (chatId: string, updatedChat: Chat) => {
        // Update chat in localStorage only - no DB calls
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? updatedChat : chat
          ),
        }));
      },
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({
        chats: state.chats,
        activeChat: state.activeChat,
        selectedProvider: state.selectedProvider,
      }),
    }
  )
);
