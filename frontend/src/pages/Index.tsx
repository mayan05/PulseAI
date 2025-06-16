import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { AuthPage } from '@/components/Auth/AuthPage';
import { Sidebar } from '@/components/Layout/Sidebar';
import { ChatHeader } from '@/components/Chat/ChatHeader';
import { ChatMessages } from '@/components/Chat/ChatMessages';
import { ChatInput } from '@/components/Chat/ChatInput';

const Index = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 240 && newWidth <= 640) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    setIsDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  if (!token) {
    return <AuthPage />;
  }

  return (
    <div className="h-screen flex bg-background relative">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`relative transition-all duration-200 ease-in-out ${sidebarOpen ? 'w-[320px]' : 'w-0'}`}
        style={{ width: sidebarOpen ? `${sidebarWidth}px` : '0' }}
      >
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)}
          user={user}
        />
        
        {/* Resize handle */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize transition-colors ${
            isDragging ? 'bg-primary' : 'hover:bg-primary/50'
          }`}
          onMouseDown={handleResizeStart}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute inset-0 bg-background/50 backdrop-blur-xl" />
        <div className="relative flex flex-col h-full">
          <ChatHeader 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
            user={user}
          />
          <ChatMessages />
          <ChatInput />
        </div>
      </div>
    </div>
  );
};

export default Index;
