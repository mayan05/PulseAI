import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './auth';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
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
          // Ensure each chat has a messages array
          const chatsWithMessages = conversations.map((chat: Omit<Chat, 'messages'> & { messages?: Message[] }) => ({
            ...chat,
            messages: chat.messages || [],
          }));
          
          set({ chats: chatsWithMessages });
          
          // Set active chat to the most recent one if none is selected
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
        try {
          // Get auth token
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Not authenticated');
          }

          // Create optimistic message
          const optimisticMessage: Message = {
            id: `temp-${Date.now()}`,
            ...message,
            createdAt: new Date(),
            timestamp: new Date(),
            conversationId: chatId,
          };

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

          // Make API call in the background
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
          console.log('API Response:', { userMessage, aiMessage });

          // Ensure messages have timestamp and are valid
          const messagesWithTimestamp = [userMessage, aiMessage]
            .filter((msg): msg is Message => {
              const isValid = msg !== undefined && msg !== null;
              if (!isValid) {
                console.warn('Invalid message:', msg);
              }
              return isValid;
            })
            .map(msg => {
              const messageWithTimestamp = {
                ...msg,
                timestamp: msg.createdAt || new Date(),
                createdAt: msg.createdAt || new Date(),
              };
              console.log('Processed message:', messageWithTimestamp);
              return messageWithTimestamp;
            });

          console.log('Final messages to add:', messagesWithTimestamp);

          // Replace optimistic message with real messages
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === chatId
                ? {
                    ...chat,
                    messages: (chat.messages || [])
                      .filter((msg) => msg.id !== optimisticMessage.id)
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
                      .filter((msg) => msg.id !== `temp-${Date.now()}`),
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
