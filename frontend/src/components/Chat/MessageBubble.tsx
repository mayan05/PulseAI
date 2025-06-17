import React from 'react';
import { User, Bot, Copy, Check, FileText, ExternalLink } from 'lucide-react';
import { Message, Attachment } from '../../store/chatStore';
import { Button } from '../ui/button';
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';

interface MessageBubbleProps {
  message: Message;
}

interface AttachmentPreview {
  id: string;
  name: string;
  type: string;
  url: string;
}

// Custom CodeBlock component with copy button
const CodeBlock: React.FC<{ inline?: boolean; className?: string; children: React.ReactNode }> = ({ inline, className, children, ...props }) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLPreElement>(null);
  const codeString = String(children).replace(/\n$/, ''); 
  // Extract language from className (e.g., language-python)
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  if (inline) {
    // Plain inline code, no copy button or extra styling
    return <code className="px-1 py-0.5 rounded bg-white/10 text-white/90 text-xs font-mono">{children}</code>;
  }
  // If the code block is only one line, render as inline code style (no copy button)
  if (!codeString.includes('\n')) {
    return <code className="px-1 py-0.5 rounded bg-white/10 text-white/90 text-xs font-mono">{codeString}</code>;
  }
  return (
    <div className="relative group mt-2 mb-4">
      {/* Removed language badge */}
      <SyntaxHighlighter
        ref={codeRef}
        language={language}
        style={vscDarkPlus}
        showLineNumbers={false} // Removed line numbers
        customStyle={{
          borderRadius: '0.75rem',
          padding: '1.5rem 1rem 1rem 1rem', // removed extra left padding for line numbers
          fontSize: '0.95em',
          background: 'none', // Remove background highlight
          margin: 0,
        }}
      >
        {codeString}
      </SyntaxHighlighter>
      <button
        className="absolute top-2 right-2 p-1 rounded bg-black/40 hover:bg-black/70 text-white transition-opacity opacity-0 group-hover:opacity-100"
        onClick={() => {
          navigator.clipboard.writeText(codeString);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        title="Copy code"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentPreview | null>(null);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const isUser = message.role === 'USER';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '--:--';
    }
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const openAttachmentPreview = (attachment: Attachment) => {
    if (attachment.type.startsWith('image/')) {
      setPreviewAttachment(attachment);
    } else {
      window.open(attachment.url, '_blank');
    }
  };

  const handleImageDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      alert('Failed to download image.');
    }
  };

  const renderAttachmentThumbnail = (attachment: Attachment) => {
    if (attachment.type.startsWith('image/')) {
      return (
        <div className="relative group w-full">
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-full h-auto rounded-xl border-2 border-white/10 shadow-lg object-contain bg-black"
            style={{ maxHeight: '420px', display: 'block' }}
          />
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-blue-600 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 sm:opacity-100 z-10 shadow-lg"
            title="Open image in new tab"
            onClick={e => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" /></svg>
          </a>
        </div>
      );
    } else {
      return (
        <div 
          className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md shadow-lg border border-white/30 transition hover:bg-white/30 cursor-pointer group max-w-64"
          onClick={() => openAttachmentPreview(attachment)}
        >
          <FileText className="w-6 h-6 text-blue-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-white truncate max-w-[120px]">{attachment.name}</span>
            <span className="text-xs text-white/70">{(attachment.size / 1024).toFixed(1)} KB</span>
          </div>
          <span className="ml-2 px-2 py-0.5 rounded bg-blue-500/80 text-xs text-white font-semibold uppercase">{attachment.type.split('/')[1] || 'file'}</span>
          <ExternalLink className="w-4 h-4 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
        </div>
      );
    }
  };

  const getUserInitials = () => {
    if (isUser) {
      return 'U';
    }
    return 'AI';
  };

  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1 message-animate`}>
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 max-w-4xl group`}>
          {/* Profile Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
            isUser ? 'bg-white text-black ml-3 ring-2 ring-white/20' : 'bg-[#2a2a2a] text-[#e0e0e0] mr-3 ring-2 ring-white/10'
          }`}>
            {getUserInitials()}
          </div>

          {/* Message Content */}
          <div
            className={`relative ${isUser ? 'message-user' : 'message-ai'} ${message.attachments && message.attachments.length > 0 && !message.content ? 'p-0' : 'px-4'} py-3 max-w-[85%] transition-all duration-200`}
          >
            {/* Text Content */}
            <div className={`prose prose-sm max-w-none ${isUser ? '' : 'text-[#e0e0e0]'}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: CodeBlock,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className={`${message.content ? 'mt-3' : ''} space-y-2`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {message.attachments.map((attachment) => (
                    <div key={attachment.id}>
                      {renderAttachmentThumbnail(attachment)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Timestamp below bubble, aligned to sender */}
      <div className={`mb-4 text-xs text-white/40 ${isUser ? 'text-right mr-12' : 'text-left pl-16'}`}>
        {formatTime(message.createdAt)}
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <Dialog open={showAttachments} onOpenChange={setShowAttachments}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Attachments</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center space-x-2 p-2 rounded-lg bg-muted"
                >
                  {attachment.type.startsWith('image/') ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="flex-shrink-0"
                  >
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
