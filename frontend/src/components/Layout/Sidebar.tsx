import React from 'react';
import { X, Plus, User, Settings, LogOut, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '@/store/auth';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  profilePic?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user }) => {
  const { chats, activeChat, setActiveChat, createChat, deleteChat } = useChatStore();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const formatChatPreview = (chat: any) => {
    const lastMessage = chat.messages[chat.messages.length - 1];
    if (!lastMessage) return 'No messages yet';
    
    const content = lastMessage.content || 'Attachment';
    return content.length > 40 ? content.substring(0, 40) + '...' : content;
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return 'now';
  };

  return (
    <div className={`h-full flex flex-col bg-card/50 backdrop-blur-xl border-r border-border ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out`}>
      {/* User Profile Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center ring-2 ring-primary/20">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{user?.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={createChat}
          className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 text-muted-foreground">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary/70" />
            </div>
            <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Welcome to Pulse
            </h3>
            <p className="text-sm mb-1">Your AI-powered workspace</p>
            <p className="text-xs text-muted-foreground/80 max-w-[200px]">
              Start a new conversation to explore the capabilities of advanced AI models
            </p>
          </div>
        ) : (
          chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveChat(chat.id)}
              className={`group w-full p-3 text-left rounded-lg transition-all duration-200 cursor-pointer select-none ${
                activeChat === chat.id
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-primary/70" />
                      <h4 className="font-medium text-sm truncate">
                        {chat.title || 'New Chat'}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={e => handleDeleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
                      tabIndex={0}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {chat.messages.length} messages
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Settings Section */}
      <div className="p-4 border-t border-border space-y-2">
        <Link
          to="/settings"
          className="w-full flex items-center justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-2 transition-colors"
          style={{ textDecoration: 'none' }}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <div className="text-xs text-muted-foreground text-center">
          Pulse v1.0.0
        </div>
      </div>

      {/* Mobile Close Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="md:hidden absolute top-4 right-4"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};
