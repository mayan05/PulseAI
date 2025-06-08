
import React from 'react';
import { Menu, Bot, ChevronDown } from 'lucide-react';
import { useChatStore, LLMProvider } from '../../store/chatStore';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
}

const providers: { value: LLMProvider; label: string; description: string }[] = [
  { value: 'openai', label: 'OpenAI GPT-4', description: 'Most capable model' },
  { value: 'groq', label: 'Groq Llama', description: 'Lightning fast inference' },
  { value: 'openrouter', label: 'OpenRouter', description: 'Multiple model access' },
];

export const ChatHeader: React.FC<ChatHeaderProps> = ({ onToggleSidebar }) => {
  const { selectedProvider, setProvider, chats, activeChat } = useChatStore();
  
  const currentChat = chats.find(chat => chat.id === activeChat);
  const selectedProviderInfo = providers.find(p => p.value === selectedProvider);

  return (
    <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-xl">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="md:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold text-sm">
              {currentChat?.title || 'New Chat'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {currentChat?.messages.length || 0} messages
            </p>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-card/50">
            <span className="text-sm">{selectedProviderInfo?.label}</span>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {providers.map((provider) => (
            <DropdownMenuItem
              key={provider.value}
              onClick={() => setProvider(provider.value)}
              className={`cursor-pointer ${selectedProvider === provider.value ? 'bg-primary/10' : ''}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{provider.label}</span>
                <span className="text-xs text-muted-foreground">
                  {provider.description}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
