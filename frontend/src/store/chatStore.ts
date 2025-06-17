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

const API_URL = 'http://localhost:3000';

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
          // Fallback to DB fetch
          console.log('Loading chats from DB...');
          const isAuthenticated = useAuthStore.getState().isAuthenticated();
          if (!isAuthenticated) {
            console.log('Not authenticated, skipping chat load');
            return;
          }
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_URL}/conversations`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) throw new Error('Failed to load chats');
          const conversations = await response.json();
          const chatsWithMessages = conversations.map((chat) => ({
            ...chat,
            messages: (chat.messages || []).map(msg => ({
              ...msg,
              attachments: (() => {
                let atts = [];
                if (typeof msg.attachments === 'string') {
                  try {
                    atts = JSON.parse(msg.attachments);
                  } catch {
                    atts = [];
                  }
                } else if (Array.isArray(msg.attachments)) {
                  atts = msg.attachments;
                }
                // Only keep objects with a string type property
                return Array.isArray(atts)
                  ? atts.filter(att => att && typeof att === 'object' && typeof att.type === 'string')
                  : [];
              })(),
            })),
          }));
          set({ chats: chatsWithMessages });
          if (!get().activeChat && chatsWithMessages.length > 0) {
            set({ activeChat: chatsWithMessages[0].id });
          }
        } catch (error) {
          console.error('Error loading chats:', error);
        }
      },

      createChat: async (): Promise<Chat | null> => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Not authenticated');
          }

          // Create optimistic chat immediately
          const optimisticChat: Chat = {
            id: `temp-${Date.now()}`,
            title: 'New Chat',
            createdAt: new Date(),
            updatedAt: new Date(),
            messages: [],
          };

          // Update UI immediately with optimistic chat
          set((state) => ({
            chats: [optimisticChat, ...state.chats],
            activeChat: optimisticChat.id,
          }));

          const response = await fetch(`${API_URL}/conversations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: 'New Chat',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create chat');
          }

          const newChat = await response.json();

          // Replace optimistic chat with real chat
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === optimisticChat.id ? newChat : chat
            ),
            activeChat: newChat.id,
          }));

          return newChat;
        } catch (error) {
          console.error('Error creating chat:', error);
          // Remove optimistic chat on error
          set((state) => ({
            chats: state.chats.filter((chat) => !chat.id.startsWith('temp-')),
            activeChat: null,
          }));
          return null;
        }
      },

      deleteChat: async (chatId: string): Promise<void> => {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Not authenticated');
          }

          // Optimistically remove the chat from UI
          set((state) => ({
            chats: state.chats.filter((chat) => chat.id !== chatId),
            activeChat: state.activeChat === chatId ? null : state.activeChat,
          }));

          // Make the API call in the background
          const response = await fetch(`${API_URL}/conversations/${chatId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to delete chat');
          }

          // No need to update state again since we already removed it optimistically
        } catch (error) {
          console.error('Error deleting chat:', error);
          // If there's an error, we could potentially restore the chat
          // But for now, we'll just log the error since the deletion likely succeeded
          // and the chat is already gone from the UI
        }
      },

      setActiveChat: (chatId: string) => {
        set({ activeChat: chatId });
      },

      addMessage: async (chatId: string, message: Omit<Message, 'id' | 'createdAt' | 'conversationId' | 'timestamp'>): Promise<void> => {
        // Create optimistic message at the start of the function
        const optimisticMessage: Message = {
          id: `temp-${Date.now()}`,
          ...message,
          createdAt: new Date(),
          timestamp: new Date(),
          conversationId: chatId,
        };

        try {
          // Get auth token
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Not authenticated');
          }

          // Update UI immediately with optimistic message
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: [...(chat.messages || []), optimisticMessage],
                  }
                : chat
            ),
          }));

          // Set loading state for AI response
          set({ isLoading: true });

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
            // Add the real user and AI messages
            const userMessage = {
              ...optimisticMessage,
              id: data.userMessage?.id || `user-${Date.now()}`,
              createdAt: new Date(),
              timestamp: new Date(),
            };
            const aiMessage = {
              id: `ai-${Date.now()}`,
              content: data.text || (data.aiMessage && data.aiMessage.text) || 'No response',
              type: 'TEXT' as const,
              model: message.model,
              role: 'ASSISTANT' as const,
              createdAt: new Date(),
              timestamp: new Date(),
              conversationId: chatId,
            };
            set((state) => ({
              chats: state.chats.map((chat) =>
                chat.id === chatId
                  ? {
                      ...chat,
                      messages: (chat.messages || [])
                        .filter((msg) => typeof msg.id === 'string' ? !msg.id.startsWith('temp-') : true)
                        .concat([userMessage, aiMessage]),
                    }
                  : chat
              ),
            }));
            set({ isLoading: false });
            return;
          }
          // --- END FILE HANDLING ---

          // Make API call in the background for all other messages
          const response = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              ...message,
              conversationId: chatId,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to send message');
          }

          const { userMessage, aiMessage } = await response.json();
          // Ensure messages have timestamp and are valid
          const messagesWithTimestamp = [userMessage, aiMessage]
            .filter((msg): msg is Message => {
              const isValid = msg !== undefined && msg !== null;
              if (!isValid) {
                console.warn('Invalid message:', msg);
              }
              return isValid;
            })
            .map(msg => ({
              ...msg,
              timestamp: new Date(msg.createdAt),
              createdAt: new Date(msg.createdAt),
            }));

          // Replace all optimistic messages for this chat with real messages
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: (chat.messages || [])
                      .filter((msg) => typeof msg.id === 'string' ? !msg.id.startsWith('temp-') : true)
                      .concat(messagesWithTimestamp),
                  }
                : chat
            ),
          }));
        } catch (error) {
          console.error('Error sending message:', error);
          // Remove optimistic message on error
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: (chat.messages || [])
                      .filter((msg) => typeof msg.id === 'string' ? msg.id !== optimisticMessage.id : true),
                  }
                : chat
            ),
          }));
          throw error;
        } finally {
          // Clear loading state
          set({ isLoading: false });
        }
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
        try {
          const isAuthenticated = useAuthStore.getState().isAuthenticated();
          if (!isAuthenticated) {
            console.log('Not authenticated, redirecting to login');
            window.location.href = '/login';
            return;
          }

          const token = localStorage.getItem('token');
          const response = await fetch(`${API_URL}/conversations/${chatId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedChat),
          });

          if (!response.ok) throw new Error('Failed to update chat');

          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId ? updatedChat : chat
            ),
          }));
        } catch (error) {
          console.error('Error updating chat:', error);
        }
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
