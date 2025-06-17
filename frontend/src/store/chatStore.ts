import { create } from 'zustand';

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
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type LLMProvider = 'openai' | 'groq' | 'openrouter' | 'gpt4.1' | 'claude' | 'llama';

interface ChatState {
  chats: Chat[];
  activeChat: string | null;
  isAuthenticated: boolean;
  selectedProvider: LLMProvider;
  isLoading: boolean;
}

interface ChatActions {
  createChat: () => void;
  deleteChat: (chatId: string) => void;
  setActiveChat: (chatId: string) => void;
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setProvider: (provider: LLMProvider) => void;
  setLoading: (loading: boolean) => void;
}

type ChatStore = ChatState & ChatActions;

const createDefaultChat = (): Chat => ({
  id: `chat_${Date.now()}`,
  title: 'New Chat',
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [createDefaultChat()],
  activeChat: `chat_${Date.now()}`,
  isAuthenticated: false,
  selectedProvider: 'llama',
  isLoading: false,

  createChat: () => {
    const newChat = createDefaultChat();
    set((state) => ({
      chats: [newChat, ...state.chats],
      activeChat: newChat.id,
    }));
  },

  deleteChat: (chatId: string) => {
    set((state) => {
      const updatedChats = state.chats.filter((chat) => chat.id !== chatId);
      const newActiveChat = updatedChats.length > 0 ? updatedChats[0].id : null;
      
      if (updatedChats.length === 0) {
        const defaultChat = createDefaultChat();
        return {
          chats: [defaultChat],
          activeChat: defaultChat.id,
        };
      }
      
      return {
        chats: updatedChats,
        activeChat: state.activeChat === chatId ? newActiveChat : state.activeChat,
      };
    });
  },

  setActiveChat: (chatId: string) => {
    set({ activeChat: chatId });
  },

  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random()}`,
      timestamp: new Date(),
    };

    set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, newMessage],
            updatedAt: new Date(),
          };
          
          if (chat.messages.length === 0 && message.role === 'user') {
            const title = message.content.length > 30 
              ? message.content.substring(0, 30) + '...' 
              : message.content;
            updatedChat.title = title;
          }
          
          return updatedChat;
        }
        return chat;
      });

      return { chats: updatedChats };
    });
  },

  setAuthenticated: (authenticated: boolean) => {
    set({ isAuthenticated: authenticated });
  },

  setProvider: (provider: LLMProvider) => {
    set({ selectedProvider: provider });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
