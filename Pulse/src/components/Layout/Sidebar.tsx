
import React from 'react';
import { Plus, MessageSquare, Settings, LogOut, Trash2, MoreVertical } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { 
    chats, 
    activeChat, 
    createChat, 
    setActiveChat, 
    deleteChat,
    setAuthenticated 
  } = useChatStore();

  const handleNewChat = () => {
    createChat();
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const handleLogout = () => {
    setAuthenticated(false);
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
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full w-80 bg-card/95 backdrop-blur-xl border-r border-border z-50 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:relative md:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Pulse
              </h1>
            </div>
            
            <Button 
              onClick={handleNewChat}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={cn(
                  "group p-3 rounded-xl cursor-pointer transition-all duration-200 chat-item-hover",
                  activeChat === chat.id && "bg-primary/10 border border-primary/20 shadow-md"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold truncate">
                        {chat.title}
                      </p>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatTimestamp(chat.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {formatChatPreview(chat)}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        {chat.messages.length} messages
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {chats.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs">Start your first chat to get going</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border space-y-2">
            <Button variant="ghost" className="w-full justify-start hover:bg-muted/50">
              <Settings className="w-4 h-4 mr-3" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
