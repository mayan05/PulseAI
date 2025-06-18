import React from 'react';
import { Menu, Bot, Trash2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { Button } from '../ui/button';

interface User {
  id: string;
  email: string;
  name: string;
}

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  user: User | null;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onToggleSidebar, user }) => {
  const chats = useChatStore((state) => state.chats);
  const activeChat = useChatStore((state) => state.activeChat);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const currentChat = chats.find(chat => chat.id === activeChat);

  const handleDelete = async () => {
    if (activeChat) {
      try {
        await deleteChat(activeChat);
      } catch (error) {
        console.error('Error deleting chat:', error);
      }
    }
  };

  if (!currentChat) {
    return (
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4">
        <h1 className="text-lg font-semibold">New Chat</h1>
      </div>
    );
  }

  return (
    <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4">
      <div>
        <h1 className="text-lg font-semibold">{currentChat.title}</h1>
        <p className="text-sm text-gray-400">
          {currentChat.messages?.length || 0} messages
        </p>
      </div>
      <button
        onClick={handleDelete}
        className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};
