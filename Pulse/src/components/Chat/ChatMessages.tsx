
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
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 flex items-center justify-center shadow-xl">
              <span className="text-4xl">🚀</span>
            </div>
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Ready to chat with AI
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Ask me anything! I can help with coding, creative writing, analysis, and much more.
              Try typing <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">/imagine</span> for image generation.
            </p>
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
