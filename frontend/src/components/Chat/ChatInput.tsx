import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, X, Image, FileText, Command, ChevronDown, Check } from 'lucide-react';
import { useChatStore, Attachment, LLMProvider, Message } from '../../store/chatStore';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const providers: { value: LLMProvider; label: string; description: string }[] = [
  { 
    value: 'claude', 
    label: 'Claude Sonnet 4', 
    description: 'Best for detailed explanations & coding help'
  },
  { 
    value: 'gpt', 
    label: 'GPT-4', 
    description: 'Great at creative tasks & problem solving'
  },
  { 
    value: 'llama', 
    label: 'Llama 3.3', 
    description: 'Quick responses • Efficient for simple tasks'
  },
];

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showCommands, setShowCommands] = useState(false);
  const activeChat = useChatStore((state) => state.activeChat);
  const addMessage = useChatStore((state) => state.addMessage);
  const setLoading = useChatStore((state) => state.setLoading);
  const isLoading = useChatStore((state) => state.isLoading);
  const selectedProvider = useChatStore((state) => state.selectedProvider);
  const setProvider = useChatStore((state) => state.setProvider);
  const chats = useChatStore((state) => state.chats);
  const createChat = useChatStore((state) => state.createChat);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [hoveredProvider, setHoveredProvider] = useState<LLMProvider | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const selectedProviderInfo = providers.find(p => p.value === selectedProvider);
  const currentChat = chats.find(chat => chat.id === activeChat);

  // Optimized provider selection handler
  const handleProviderSelect = useCallback((provider: LLMProvider) => {
    setProvider(provider);
  }, [setProvider]);

  const commands = [
    { name: '/image', description: 'Generate an image' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        textareaRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (message.startsWith('/')) {
      setShowCommands(true);
    } else {
      setShowCommands(false);
    }
  }, [message]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
      
      if (scrollHeight > 44) {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) return;

    const msg = message.trim();
    const currentActiveChat = activeChat;
    const token = localStorage.getItem('token');
    console.log('handleSubmit called with:', { msg, activeChat: currentActiveChat });

    // Clear input immediately for better UX
    setMessage('');

    // Handle message submission in background without blocking UI
    const handleMessageSubmission = async () => {
      try {
        // Always call addMessage for all message types (TXT, PDF, regular)
        if (selectedFile && selectedFile.type === 'text/plain') {
          clearSelectedFile();
          const fileText = await selectedFile.text();
          const fullMsg = msg + '\n\n---\nAttached file contents:\n' + fileText;
          addMessage(currentActiveChat!, {
            content: fullMsg,
            type: 'FILE',
            model: selectedProvider,
            role: 'USER',
            attachments: [{
              id: `file-${Date.now()}`,
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size,
              url: URL.createObjectURL(selectedFile)
            }],
          });
          return;
        }
        if (selectedFile && selectedFile.type === 'application/pdf') {
          clearSelectedFile();
          addMessage(currentActiveChat!, {
            content: msg,
            type: 'FILE',
            model: selectedProvider,
            role: 'USER',
            attachments: [{
              id: `file-${Date.now()}`,
              name: selectedFile.name,
              type: selectedFile.type,
              size: selectedFile.size,
              url: URL.createObjectURL(selectedFile),
              file: selectedFile
            }],
          });
          return;
        }
        // Fallback: /image or regular message
        if (!currentActiveChat) {
          // Create chat and send message in parallel
          const newChat = await createChat();
          if (newChat && newChat.id) {
            setActiveChat(newChat.id);
            clearSelectedFile();
            addMessage(newChat.id, {
              content: msg,
              type: selectedFile ? 'FILE' : 'TEXT',
              model: selectedProvider,
              role: 'USER',
              attachments: selectedFile ? [{
                id: `file-${Date.now()}`,
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size,
                url: URL.createObjectURL(selectedFile)
              }] : undefined
            });
          }
        } else {
          if (msg.toLowerCase().startsWith('/image')) {
            const imagePrompt = msg.slice('/image'.length).trim();
            if (!imagePrompt) {
              console.error('No image prompt provided');
              return;
            }
            setLoading(true);
            // Always add the user message first
            const userMessage: Message = {
              id: `temp-${Date.now()}`,
              content: msg,
              type: 'TEXT' as const,
              model: selectedProvider,
              role: 'USER',
              createdAt: new Date(),
              timestamp: new Date(),
              conversationId: currentActiveChat,
            };
            useChatStore.setState((state) => ({
              ...state,
              chats: state.chats.map((chat) =>
                chat.id === currentActiveChat
                  ? {
                      ...chat,
                      messages: [...(chat.messages || []), userMessage],
                    }
                  : chat
              ),
            }));
            try {
              const response = await fetch('https://llmservice-production-7cd2.up.railway.app/gpt/image', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                  prompt: imagePrompt,
                  temperature: 0.7
                }),
              });
              if (!response.ok) throw new Error('Failed to generate image');
              const data = await response.json();
              if (data.image || data.image_url) {
                const aiMessage: Message = {
                  id: `temp-${Date.now() + 1}`,
                  content: data.image ? `![](${data.image})` : `![](${data.image_url})`,
                  type: 'TEXT' as const,
                  model: selectedProvider,
                  role: 'ASSISTANT',
                  createdAt: new Date(),
                  timestamp: new Date(),
                  conversationId: currentActiveChat,
                };
                useChatStore.setState((state) => ({
                  ...state,
                  chats: state.chats.map((chat) =>
                    chat.id === currentActiveChat
                      ? {
                          ...chat,
                          messages: [...(chat.messages || []), aiMessage],
                        }
                      : chat
                  ),
                }));
              } else {
                // Only add error if image is missing
                const errorMessage: Message = {
                  id: `temp-${Date.now() + 2}`,
                  content: 'Sorry, I encountered an error while generating the image. Please try again.',
                  type: 'TEXT' as const,
                  model: 'gpt',
                  role: 'ASSISTANT',
                  createdAt: new Date(),
                  timestamp: new Date(),
                  conversationId: currentActiveChat,
                };
                useChatStore.setState((state) => ({
                  ...state,
                  chats: state.chats.map((chat) =>
                    chat.id === currentActiveChat
                      ? {
                          ...chat,
                          messages: [...(chat.messages || []), errorMessage],
                        }
                      : chat
                  ),
                }));
              }
            } catch (error) {
              // Only add error if fetch fails
              const errorMessage: Message = {
                id: `temp-${Date.now() + 3}`,
                content: 'Sorry, I encountered an error while generating the image. Please try again.',
                type: 'TEXT' as const,
                model: 'gpt',
                role: 'ASSISTANT',
                createdAt: new Date(),
                timestamp: new Date(),
                conversationId: currentActiveChat,
              };
              useChatStore.setState((state) => ({
                ...state,
                chats: state.chats.map((chat) =>
                  chat.id === currentActiveChat
                    ? {
                        ...chat,
                        messages: [...(chat.messages || []), errorMessage],
                      }
                    : chat
                ),
              }));
            } finally {
              setLoading(false);
            }
          } else {
            // Regular message
            clearSelectedFile();
            addMessage(currentActiveChat, {
              content: msg,
              type: selectedFile ? 'FILE' : 'TEXT',
              model: selectedProvider,
              role: 'USER',
              attachments: selectedFile ? [{
                id: `file-${Date.now()}`,
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size,
                url: URL.createObjectURL(selectedFile)
              }] : undefined
            });
          }
        }
      } catch (error) {
        console.error('Error in message submission:', error);
      }
    };

    // Start message submission in background without blocking UI
    handleMessageSubmission();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputFocus = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file type is supported
    const fileType = file.type.toLowerCase();
    const isPdf = fileType === 'application/pdf';
    const isText = fileType === 'text/plain';
    
    if (!isPdf && !isText) {
      setFileUploadError('Only PDF and TXT files are supported.');
      setSelectedFile(null);
      return;
    }

    if (selectedProvider === 'llama') {
      setFileUploadError('File upload is only supported for GPT-4 and Claude.');
      setSelectedFile(null);
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileUploadError('File size must be less than 10MB.');
      setSelectedFile(null);
      return;
    }

    setFileUploadError(null);
    setSelectedFile(file);
    // Automatically switch to GPT when a file is selected and provider is Claude or GPT
    if (selectedProvider !== 'gpt' && selectedProvider !== 'claude') {
      setProvider('gpt');
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const handleCommandSelect = (command: string) => {
    setMessage(command + ' ');
    setShowCommands(false);
    textareaRef.current?.focus();
  };

  const filteredCommands = commands.filter(cmd => 
    cmd.name.toLowerCase().includes(message.toLowerCase())
  );

  // Helper to clear selected file and reset file input
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFileInputKey((k) => k + 1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-white/10">
      <form onSubmit={handleSubmit} className="container max-w-4xl mx-auto p-4 flex flex-col gap-2">
        {/* Attachment chip UI - show above input if a file is selected */}
        {selectedFile && (
          <div className="flex items-center z-20 mb-2">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md shadow-lg border border-white/30 transition hover:bg-white/30 cursor-pointer group">
              {getFileIcon(selectedFile.type)}
              <div className="flex flex-col">
                <span className="font-medium text-white truncate max-w-[160px]">{selectedFile.name}</span>
                <span className="text-xs text-white/70">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/80 text-xs text-white font-semibold uppercase">{selectedFile.type.split('/')[1] || 'file'}</span>
              <button
                type="button"
                onClick={() => clearSelectedFile()}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>
          </div>
        )}

        {/* File upload error message */}
        {fileUploadError && (
          <div className="text-red-500 text-sm mb-2">{fileUploadError}</div>
        )}

        <div className="relative flex items-center gap-2">
          {/* File upload button */}
          <input
            key={fileInputKey}
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.txt"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute left-3 p-2 rounded-full hover:bg-white/10 transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-5 h-5 text-white/70" />
          </button>

          {/* Message input */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={hasInteracted ? "Type a message..." : "Press / to see commands"}
            className="w-full bg-white/5 text-white rounded-lg pl-12 pr-32 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none overflow-hidden leading-relaxed break-words break-all"
            style={{ minHeight: "48px", maxHeight: "300px", height: "auto", wordBreak: "break-word", overflowWrap: "break-word", whiteSpace: "pre-wrap" }}
            rows={1}
          />

          {/* Model selection dropdown */}
          <div className="absolute right-12 top-1/2 -translate-y-1/2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-3 text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>{selectedProviderInfo?.label}</span>
                  <ChevronDown className="w-3 h-3 ml-1.5 opacity-50 transform rotate-180" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-[#222222] border-white/10">
                {providers.map((provider) => {
                  const isSelected = selectedProvider === provider.value;
                  const isHovered = hoveredProvider === provider.value;
                  return (
                    <DropdownMenuItem
                      key={provider.value}
                      onClick={() => handleProviderSelect(provider.value)}
                      onMouseEnter={() => setHoveredProvider(provider.value)}
                      onMouseLeave={() => setHoveredProvider(null)}
                      className={`cursor-pointer flex items-center justify-between transition-colors
                        ${isSelected ? 'bg-white/10 text-white' : isHovered ? 'bg-white/5 text-white' : 'text-white/70 hover:bg-white/5'}
                      `}
                    >
                      <div className="flex flex-col flex-1">
                        <span className="font-medium text-sm">{provider.label}</span>
                        <span className="text-xs" style={{ color: isHovered ? 'black' : undefined }}>{provider.description}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 ml-2 text-green-400" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={(!message.trim() && !selectedFile) || isLoading}
            className={`absolute right-3 p-2 rounded-full transition-colors ${
              (!message.trim() && !selectedFile) || isLoading
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white/70 hover:bg-white/10'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Subtle /image suggestion below input */}
        <div className="mt-1 text-xs text-white/40 flex items-center gap-2 select-none">
          <span className="bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-white/60">/image</span>
          <span>Type <span className="font-mono text-white/60">/image</span> to generate an image</span>
        </div>

        {/* Command dropdown */}
        {showCommands && filteredCommands.length > 0 && (
          <div className="absolute left-0 right-0 bottom-full mb-2 w-full max-w-full bg-[#232323] border border-white/10 rounded-lg shadow-lg z-30">
            {filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.name}
                className={`px-4 py-2 cursor-pointer text-white/90 hover:bg-white/10 ${idx === 0 ? 'rounded-t-lg' : ''} ${idx === filteredCommands.length - 1 ? 'rounded-b-lg' : ''}`}
                onMouseDown={() => handleCommandSelect(cmd.name)}
              >
                <span className="font-mono text-sm">{cmd.name}</span>
                <span className="ml-2 text-xs text-white/50">{cmd.description}</span>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};
