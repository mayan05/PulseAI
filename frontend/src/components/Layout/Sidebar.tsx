import React from 'react';
import { User, Plus, LogOut, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useChatStore } from '../../store/chatStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user }) => {
  const { chats, activeChat, setActiveChat, createChat, deleteChat } = useChatStore();

  const handleLogout = () => {
    // Implement logout logic
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  return (
    <div className={`h-full flex flex-col bg-[#111111] border-r border-white/10 ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out`}>
      {/* User Profile Section */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center ring-2 ring-white/10">
            <User className="w-5 h-5 text-white/70" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate text-white">{user?.name}</h3>
            <p className="text-xs text-white/50 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white/50 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button
          onClick={createChat}
          className="w-full justify-start bg-white hover:bg-white/90 text-black shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white/70" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">
              Welcome to Pulse
            </h3>
            <p className="text-sm mb-1 text-white/70">Your AI-powered workspace</p>
            <p className="text-xs text-white/50 max-w-[200px]">
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
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-white/50" />
                      <h4 className="font-medium text-sm truncate">
                        {chat.title || 'New Chat'}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={e => handleDeleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded"
                      tabIndex={0}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-white/40 truncate mt-1">
                    {chat.messages.length} messages
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
