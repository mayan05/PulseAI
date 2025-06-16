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
    <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-xl">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="md:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-sm">
              {currentChat?.title || 'New Chat'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {currentChat?.messages.length || 0} messages
            </p>
          </div>
        </div>
      </div>

      {/* App Name */}
      <div className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        Pulse
      </div>
    </div>
  );
};
