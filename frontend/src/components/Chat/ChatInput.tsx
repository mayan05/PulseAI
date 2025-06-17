import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Image, FileText, Command, ChevronDown } from 'lucide-react';
import { useChatStore, Attachment, LLMProvider } from '../../store/chatStore';
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
    label: 'Claude Sonnet', 
    description: 'Best for detailed explanations & coding help'
  },
  { 
    value: 'gpt', 
    label: 'GPT-4', 
    description: 'Great at creative tasks & problem solving'
  },
  { 
    value: 'llama', 
    label: 'Llama 2', 
    description: 'Quick responses • Efficient for simple tasks'
  },
];

export const ChatInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showCommands, setShowCommands] = useState(false);
  const { activeChat, addMessage, setLoading, isLoading, selectedProvider, setProvider, chats } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  const selectedProviderInfo = providers.find(p => p.value === selectedProvider);
  const currentChat = chats.find(chat => chat.id === activeChat);

  const commands = [
    { name: '/imagine', description: 'Generate an image' },
    { name: '/reset', description: 'Clear conversation' },
    { name: '/summarize', description: 'Summarize conversation' },
    { name: '/explain', description: 'Explain in detail' },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile || !activeChat) return;

    // Prepare attachments array if a file is selected
    const attachments = [];
    if (selectedFile) {
      attachments.push({
        id: `${Date.now()}-${selectedFile.name}`,
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        url: URL.createObjectURL(selectedFile),
      });
    }

    // Add the user's message to the chat immediately, with attachments if any
    addMessage(activeChat, {
      role: "user",
      content: message,
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    setMessage("");
    setSelectedFile(null);
    setLoading(true);

    const currentProvider = selectedProvider;

    let response;
    if (currentProvider === 'llama') {
      response = await fetch(`http://localhost:8000/llama/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: message,
          temperature: 0.7,
        }),
      });
    } else {
      const formData = new FormData();
      formData.append("prompt", message);
      formData.append("temperature", "0.7");
      if (selectedFile) {
        formData.append("file", selectedFile);
      }
      response = await fetch(`http://localhost:8000/${currentProvider}/generate`, {
        method: "POST",
        body: formData,
      });
    }

    if (!response.ok) {
      addMessage(activeChat, {
        role: "assistant",
        content: "Sorry, I encountered an error while processing your request. Please try again.",
      });
      setLoading(false);
      return;
    }

    const data = await response.json();
    addMessage(activeChat, {
      role: "assistant",
      content: data.text,
    });
    setLoading(false);
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
    if (selectedProvider === 'llama') {
      setFileUploadError('File upload is only supported for GPT-4 and Claude.');
      setSelectedFile(null);
      return;
    }
    setFileUploadError(null);
    if (file) {
      setSelectedFile(file);
      // Automatically switch to GPT when a file is selected and provider is Claude or GPT
      if (selectedProvider !== 'gpt' && selectedProvider !== 'claude') {
        setProvider('gpt');
      }
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

  return (
    <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-white/10">
      <form onSubmit={handleSubmit} className="container max-w-4xl mx-auto p-4 flex flex-col gap-2">
        {/* Attachment chip UI - show above input if a file is selected */}
        {selectedFile && (
          <div className="flex items-center z-20 mb-2">
            <div className="bg-white/10 text-white/80 px-3 py-1 rounded-lg flex items-center shadow border border-white/10 cursor-pointer hover:bg-white/20 transition-all"
              onClick={() => {
                // For images or PDFs, open a preview; otherwise, download
                const fileURL = URL.createObjectURL(selectedFile);
                if (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')) {
                  window.open(fileURL, '_blank');
                } else {
                  const a = document.createElement('a');
                  a.href = fileURL;
                  a.download = selectedFile.name;
                  a.click();
                }
              }}
              title="Click to preview/download"
            >
              {getFileIcon(selectedFile.type)}
              <span className="ml-2 truncate max-w-[160px]">{selectedFile.name}</span>
              <button
                type="button"
                className="ml-2 text-white/50 hover:text-white focus:outline-none"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                title="Remove attachment"
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div className="relative flex items-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            disabled={selectedProvider === 'llama'}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`absolute left-2 text-white/70 hover:text-white hover:bg-white/10 ${
              selectedProvider === 'llama' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => {
              if (selectedProvider === 'llama') {
                setFileUploadError('File upload is only supported for GPT-4 and Claude.');
                return;
              }
              setFileUploadError(null);
              fileInputRef.current?.click();
            }}
            disabled={selectedProvider === 'llama'}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          {/* Show error if file upload is not allowed */}
          {fileUploadError && (
            <div className="absolute left-12 bottom-full mb-2 bg-red-600 text-white px-2 py-1 rounded text-sm flex items-center z-10">
              <span>{fileUploadError}</span>
              <button
                type="button"
                className="ml-2 text-white/80 hover:text-white"
                onClick={() => setFileUploadError(null)}
              >
                ×
              </button>
            </div>
          )}
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder={`Message ${providers.find(p => p.value === selectedProvider)?.label || "AI"}...`}
            className="w-full bg-white/5 text-white rounded-lg pl-12 pr-20 py-3 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none overflow-hidden"
            style={{ height: "auto", minHeight: "48px", maxHeight: "200px" }}
            rows={1}
          />
          
          <div className="absolute right-2 flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-3 text-xs font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <span>{selectedProviderInfo?.label}</span>
                  <ChevronDown className="w-3 h-3 ml-1.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-[#222222] border-white/10">
                {providers.map((provider) => (
                  <DropdownMenuItem
                    key={provider.value}
                    onClick={() => setProvider(provider.value)}
                    className={`cursor-pointer ${
                      selectedProvider === provider.value 
                        ? 'bg-white/10 text-white' 
                        : 'text-white/70 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{provider.label}</span>
                      <span className={`text-xs ${
                        selectedProvider === provider.value 
                          ? 'text-white/70' 
                          : 'text-white/50 group-hover:text-white/70'
                      }`}>
                        {provider.description}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              type="submit" 
              disabled={isLoading || (!message.trim() && !selectedFile)} 
              className="bg-white/10 text-white hover:bg-white/20"
            >
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
