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
  const [generatingImage, setGeneratingImage] = useState(false);

  const selectedProviderInfo = providers.find(p => p.value === selectedProvider);
  const currentChat = chats.find(chat => chat.id === activeChat);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile || !activeChat) return;

    // Check if this is an image generation request
    if (message.startsWith('/image')) {
      const prompt = message.slice('/image'.length).trim();
      if (!prompt) {
        addMessage(activeChat, {
          role: "assistant",
          content: "Please provide a description for the image you want to generate.",
        });
        return;
      }

      // Add the user's message to the chat
      addMessage(activeChat, {
        role: "user",
        content: message,
      });

      setMessage("");
      setLoading(true);
      setGeneratingImage(true);

      try {
        const response = await fetch('http://localhost:8000/gpt/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            size: "1024x1024",
            quality: "standard",
            style: "natural",
            n: 1
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate image');
        }

        const data = await response.json();
        
        // Add the generated image to the chat
        addMessage(activeChat, {
          role: "assistant",
          content: "Here's your generated image:",
          attachments: [{
            id: Date.now().toString(),
            name: "generated-image.png",
            type: "image/png",
            url: data.image_url,
            size: 0 // Size will be determined when the image is loaded
          }]
        });
      } catch (error) {
        addMessage(activeChat, {
          role: "assistant",
          content: "Sorry, I encountered an error while generating the image. Please try again.",
        });
      } finally {
        setLoading(false);
        setGeneratingImage(false);
      }
      return;
    }

    // Handle regular chat messages
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
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md shadow-lg border border-white/30 transition hover:bg-white/30 cursor-pointer group">
              {getFileIcon(selectedFile.type)}
              <div className="flex flex-col">
                <span className="font-medium text-white truncate max-w-[160px]">{selectedFile.name}</span>
                <span className="text-xs text-white/70">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
              <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/80 text-xs text-white font-semibold uppercase">{selectedFile.type.split('/')[1] || 'file'}</span>
              <button
                type="button"
                className="ml-2 text-white/60 hover:text-red-400 transition"
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
              if (showCommands && filteredCommands.length > 0) {
                if (e.key === 'ArrowDown' || e.key === 'Tab') {
                  e.preventDefault();
                  // Move selection down (not implemented in this snippet, but can be added for full UX)
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCommandSelect(filteredCommands[0].name);
                  return;
                }
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
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
          {/* Command dropdown, positioned relative to the input bar */}
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
        </div>
      </form>
      <div className="text-xs text-white/40 px-6 pb-3 select-none">
        💡 Type <span className="font-mono bg-white/10 px-1 py-0.5 rounded text-xs">/image</span> to generate an image
      </div>
    </div>
  );
};
