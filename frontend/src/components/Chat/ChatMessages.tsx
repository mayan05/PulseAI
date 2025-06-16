import React, { useEffect, useRef } from 'react';
import { useChatStore } from '../../store/chatStore';
import { MessageBubble } from './MessageBubble';
import { LoadingMessage } from './LoadingMessage';

export const ChatMessages: React.FC = () => {
  const { chats, activeChat, isLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const currentChat = chats.find(chat => chat.id === activeChat);
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
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg">
            <span className="text-3xl">💬</span>
          </div>
          <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Start a conversation
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Choose a chat from the sidebar or create a new one to get started with T3 Chat.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-br from-background via-background to-muted/10"
    >
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md mx-auto">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/30 to-background/80 flex items-center justify-center shadow-2xl border border-primary/10">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="48" rx="16" fill="#181825" />
                <path d="M24 8c-2.5 0-4.5 2-4.5 4.5V16h9V12.5C28.5 10 26.5 8 24 8z" fill="#a78bfa"/>
                <path d="M19.5 16v2.5c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5V16h-9z" fill="#818cf8"/>
                <ellipse cx="24" cy="28" rx="7" ry="10" fill="#6366f1"/>
                <ellipse cx="24" cy="28" rx="3" ry="5" fill="#fff" fillOpacity=".7"/>
                <path d="M24 38c-2 0-3.5-1.5-3.5-3.5h7c0 2-1.5 3.5-3.5 3.5z" fill="#fbbf24"/>
              </svg>
            </div>
            <div className="bg-card/80 rounded-2xl shadow-xl px-8 py-6 border border-border backdrop-blur-md">
              <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Ready to chat with AI
              </h3>
              <p className="text-muted-foreground mb-2">
                Ask anything—get instant help with code, ideas, research, and more. Try <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">/imagine</span> for image generation.
              </p>
              <p className="text-xs text-muted-foreground/80">
                Try <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">/imagine</span> for image generation, or start a new conversation to explore more features.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <div key={message.id} style={{ animationDelay: `${index * 50}ms` }}>
              <MessageBubble message={message} />
            </div>
          ))}
          {isLoading && (
            <div className="message-animate">
              <LoadingMessage />
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
};
