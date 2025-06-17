import React from 'react';
import { User, Bot, Copy, Check, FileText, ExternalLink } from 'lucide-react';
import { Message, Attachment } from '../../store/chatStore';
import { Button } from '../ui/button';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
}

interface AttachmentPreview {
  id: string;
  name: string;
  type: string;
  url: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentPreview | null>(null);
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const isUser = message.role === 'user';

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

  const renderAttachmentThumbnail = (attachment: Attachment) => {
    if (attachment.type.startsWith('image/')) {
      return (
        <div className="relative group cursor-pointer" onClick={() => openAttachmentPreview(attachment)}>
          <img
            src={attachment.url}
            alt={attachment.name}
            className="w-32 h-32 object-cover rounded-xl border border-border hover:opacity-90 transition-opacity shadow-md"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors flex items-center justify-center">
            <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="mt-2 text-xs text-muted-foreground truncate max-w-32">
            {attachment.name}
          </div>
        </div>
      );
    } else {
      return (
        <div 
          className="flex items-center space-x-3 p-3 bg-background/50 rounded-xl border border-border cursor-pointer hover:bg-background/70 transition-colors max-w-64 shadow-sm"
          onClick={() => openAttachmentPreview(attachment)}
        >
          <FileText className="w-8 h-8 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{attachment.name}</div>
            <div className="text-xs text-muted-foreground">
              {(attachment.size / 1024 / 1024).toFixed(1)} MB
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
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
            className={`relative ${isUser ? 'message-user' : 'message-ai'} px-4 py-3 max-w-[85%] transition-all duration-200`}
          >
            {/* Text Content */}
            <div className={`prose prose-sm max-w-none ${isUser ? '' : 'text-[#e0e0e0]'}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
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
            {/* Message Actions (copy) - top right, only on hover */}
            <div className="absolute top-2 right-2 flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className={`h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
                  isUser ? 'hover:bg-black/10 text-black/70' : 'hover:bg-white/5 text-[#e0e0e0]'
                }`}
              >
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Timestamp below bubble, aligned to sender */}
      <div className={`mb-4 text-xs text-white/40 ${isUser ? 'text-right mr-12' : 'text-left pl-16'}`}>
        {formatTime(message.timestamp)}
      </div>

      {/* Image Preview Modal */}
      <Dialog open={!!previewAttachment} onOpenChange={() => setPreviewAttachment(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-card border-border">
          <DialogHeader>
            <DialogTitle>{previewAttachment?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewAttachment && (
              <img
                src={previewAttachment.url}
                alt={previewAttachment.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
