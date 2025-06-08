
import React, { useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { AuthPage } from '../components/Auth/AuthPage';
import { Sidebar } from '../components/Layout/Sidebar';
import { ChatHeader } from '../components/Chat/ChatHeader';
import { ChatMessages } from '../components/Chat/ChatMessages';
import { ChatInput } from '../components/Chat/ChatInput';

const Index = () => {
  const { isAuthenticated } = useChatStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <ChatHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <ChatMessages />
        <ChatInput />
      </div>
    </div>
  );
};

export default Index;
