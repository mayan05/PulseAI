import React from 'react';
import { Menu, Bot } from 'lucide-react';
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
  const { chats, activeChat } = useChatStore();
  const currentChat = chats.find(chat => chat.id === activeChat);

  return (
    <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#111111]">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="md:hidden text-white/70 hover:text-white hover:bg-white/5"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-white/70" />
          <div>
            <h2 className="font-semibold text-sm text-white">
              {currentChat?.title || 'New Chat'}
            </h2>
            <p className="text-xs text-white/50">
              {currentChat?.messages.length || 0} messages
            </p>
          </div>
        </div>
      </div>

      {/* App Name */}
      <div className="text-xl font-bold text-white">
        Pulse
      </div>
    </div>
  );
};
