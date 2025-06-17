import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { LoadingMessage } from './LoadingMessage';

export const ChatMessages: React.FC = () => {
  const { chats, activeChat, isLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find((chat) => chat.id === activeChat);
  const messages = currentChat?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Auto-scroll when new messages arrive
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100); // Small delay to ensure DOM is updated

    return () => clearTimeout(timer);
  }, [messages.length, isLoading]);

  if (!currentChat) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-[#111111]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center shadow-lg">
            <span className="text-3xl">💬</span>
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">
            No chat selected
          </h3>
          <p className="text-white/70">
            Select a chat from the sidebar or create a new one to start messaging.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#111111]"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center shadow-lg border border-white/5">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="16" fill="#222222" />
                <path d="M24 8c-2.5 0-4.5 2-4.5 4.5V16h9V12.5C28.5 10 26.5 8 24 8z" fill="#ffffff"/>
                <path d="M19.5 16v2.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5V16h-9z" fill="#dddddd"/>
                <ellipse cx="24" cy="28" rx="7" ry="10" fill="#cccccc"/>
                <ellipse cx="24" cy="28" rx="3" ry="5" fill="#fff" fillOpacity=".7"/>
                <path d="M24 38c-2 0-3.5-1.5-3.5-3.5h7c0 2-1.5 3.5-3.5 3.5z" fill="#aaaaaa"/>
              </svg>
            </div>
            <div className="bg-[#222222]/80 rounded-2xl shadow-xl px-8 py-6 border border-white/5">
              <h3 className="text-2xl font-bold mb-2 text-white">
                Ready to chat with AI
              </h3>
              <p className="text-white/70 mb-2">
                Ask anything—get instant help with code, ideas, research, and more. Try <span className="font-mono bg-white/10 px-1 py-0.5 rounded text-xs">/imagine</span> for image generation.
              </p>
              <p className="text-xs text-white/50">
                Try <span className="font-mono bg-white/10 px-1 py-0.5 rounded text-xs">/imagine</span> for image generation, or start a new conversation to explore more features.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div 
              key={message.id} 
              className="hover:translate-y-[-1px] transition-transform duration-200"
            >
              <MessageBubble message={message} />
            </div>
          ))}
          {isLoading && (
            <div className="message-animate">
              <LoadingMessage />
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

// Add fade-in-up animation
const style = document.createElement("style");
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .fade-in-up {
    animation: fadeInUp 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);
