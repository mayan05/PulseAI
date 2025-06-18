import React, { useState, useRef } from 'react';
import { User, Bot, Copy, Check, FileText, ExternalLink, Download } from 'lucide-react';
import { Message, Attachment } from '../../store/chatStore';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus';

interface MessageBubbleProps {
  message: Message;
}

interface AttachmentPreview {
  url: string;
  name: string;
  type: string;
}

// Simple text renderer for basic messages (no markdown)
const SimpleTextRenderer: React.FC<{ content: string }> = ({ content }) => {
  // Check if content contains markdown-like patterns
  const hasMarkdown = /[*_`#\[\]()]/.test(content) || content.includes('```') || content.includes('![');
  
  if (!hasMarkdown) {
    // Simple text rendering for better performance
    return (
      <div className="whitespace-pre-wrap break-words">
        {content}
      </div>
    );
  }
  
  // Use ReactMarkdown for complex content
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ code: CodeBlock }}
    >
      {content}
    </ReactMarkdown>
  );
};

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

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message }) => {
  const [copied, setCopied] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentPreview | null>(null);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const isUser = message.role === 'USER';

  // Helper to check if content is an image URL or data URL
  const isImageContent = (content: string | undefined | null) => {
    if (!content) return false;
    return (
      typeof content === 'string' && content.startsWith('data:image/') ||
      typeof content === 'string' && content.match(/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)$/i)
    );
  };

  // Helper to extract image URL from markdown if needed
  const extractImageUrl = (content: string | undefined | null) => {
    if (!content) return null;
    const match = content.match(/!\[[^\]]*\]\(([^)]+)\)/);
    if (match) return match[1];
    if (isImageContent(content)) return content;
    return null;
  };

  const imageUrl = extractImageUrl(message.content);

  const handleOpenImage = () => {
    if (imageUrl) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      // If it's a data URL, set a filename for download
      if (typeof imageUrl === 'string' && imageUrl.startsWith('data:image/')) {
        link.download = 'generated-image.png';
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

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
    if (attachment.type && typeof attachment.type === 'string' && attachment.type.startsWith('image/')) {
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
    if (attachment.type && typeof attachment.type === 'string' && attachment.type.startsWith('image/')) {
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
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-0.5 message-animate`}>
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start max-w-4xl group w-full`}>
          {/* Message Content */}
          {isUser ? (
            <div
              className={`bg-white text-black rounded-2xl px-4 py-2 max-w-[70%] shadow-md break-words whitespace-pre-line`}
              style={{ wordBreak: 'break-word', marginRight: 0 }}
            >
              <SimpleTextRenderer content={message.content} />
              {/* Fallback: Directly render image if markdown fails or is stripped */}
              {(() => {
                // Try to extract a data:image or http(s) image URL from the message content
                const match = message.content.match(/(data:image\/[^)\s]+|https?:\/\/[^)\s]+\.(png|jpg|jpeg|gif|webp|svg))/i);
                if (match && match[1]) {
                  return (
                    <img
                      src={match[1]}
                      alt={message.content.slice(0, 20)}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block',
                        margin: '1rem auto',
                        background: '#222',
                        borderRadius: '0.75rem',
                        boxShadow: '0 2px 16px #0004',
                      }}
                    />
                  );
                }
                return null;
              })()}
              {/* Image style override for .prose */}
              <style>{`
                .prose img {
                  max-width: 100% !important;
                  height: auto !important;
                  display: block !important;
                  margin: 1rem auto !important;
                  background: #222 !important;
                  border-radius: 0.75rem !important;
                  box-shadow: 0 2px 16px #0004;
                }
              `}</style>
              {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                <div className={`${message.content ? 'mt-2' : ''} space-y-2`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id}>{renderAttachmentThumbnail(attachment)}</div>
                    ))}
                  </div>
                </div>
              )}
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 px-3 py-1.5 mt-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium transition shadow backdrop-blur-md"
                  title="Download image"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              )}
            </div>
          ) : (
            <div className="w-full max-w-[70%] text-left px-0 py-0">
              <div className={`prose prose-sm max-w-none text-[#e0e0e0] bg-transparent p-0 m-0`} style={{ margin: 0 }}>
                <SimpleTextRenderer content={message.content} />
                {/* Fallback: Directly render image if markdown fails or is stripped */}
                {(() => {
                  // Try to extract a data:image or http(s) image URL from the message content
                  const match = message.content.match(/(data:image\/[^)\s]+|https?:\/\/[^)\s]+\.(png|jpg|jpeg|gif|webp|svg))/i);
                  if (match && match[1]) {
                    return (
                      <img
                        src={match[1]}
                        alt={message.content.slice(0, 20)}
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          display: 'block',
                          margin: '1rem auto',
                          background: '#222',
                          borderRadius: '0.75rem',
                          boxShadow: '0 2px 16px #0004',
                        }}
                      />
                    );
                  }
                  return null;
                })()}
                {/* Image style override for .prose */}
                <style>{`
                  .prose img {
                    max-width: 100% !important;
                    height: auto !important;
                    display: block !important;
                    margin: 1rem auto !important;
                    background: #222 !important;
                    border-radius: 0.75rem !important;
                    box-shadow: 0 2px 16px #0004;
                  }
                `}</style>
              </div>
              {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                <div className={`${message.content ? 'mt-2' : ''} space-y-2`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {message.attachments.map((attachment) => (
                      <div key={attachment.id}>{renderAttachmentThumbnail(attachment)}</div>
                    ))}
                  </div>
                </div>
              )}
              {imageUrl && (
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 px-3 py-1.5 mt-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-medium transition shadow backdrop-blur-md"
                  title="Download image"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={`mb-2 text-xs text-white/40 ${isUser ? 'text-right mr-8' : 'text-left pl-4'}`}>{formatTime(message.createdAt)}</div>
      {Array.isArray(message.attachments) && message.attachments.length > 0 && (
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
                  {attachment.type && typeof attachment.type === 'string' && attachment.type.startsWith('image/') ? (
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
});
