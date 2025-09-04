import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { Conversation, User, PublicUser, Message } from '../../../server/src/schema';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  otherParticipant?: PublicUser;
}

export function ChatWindow({ conversation, currentUser, otherParticipant }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getMessages.query({
        userId: currentUser.id,
        query: {
          conversation_id: conversation.id,
          limit: 50,
          offset: 0
        }
      });
      setMessages(result);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, conversation.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const sentMessage = await trpc.sendMessage.mutate({
        userId: currentUser.id,
        message: {
          conversation_id: conversation.id,
          content: newMessage.trim()
        }
      });
      
      // Add the new message to the list
      setMessages((prev: Message[]) => [...prev, sentMessage]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    return messageDate.toLocaleDateString();
  };

  const getInitials = (user: PublicUser): string => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map((name: string) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.username.slice(0, 2).toUpperCase();
  };

  if (!otherParticipant) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-500">Participant not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b bg-white flex items-center space-x-3">
        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={otherParticipant.avatar_url || undefined} />
            <AvatarFallback className="bg-green-100 text-green-700">
              {getInitials(otherParticipant)}
            </AvatarFallback>
          </Avatar>
          {otherParticipant.is_online && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">
            {otherParticipant.full_name || otherParticipant.username}
          </h2>
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-500">@{otherParticipant.username}</p>
            {otherParticipant.is_online && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                Online
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">👋</div>
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message: Message, index: number) => {
              const isFromCurrentUser = message.sender_id === currentUser.id;
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showDateDivider = !prevMessage || 
                formatDate(message.sent_at) !== formatDate(prevMessage.sent_at);

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-gray-200 text-gray-600 text-sm rounded-full">
                        {formatDate(message.sent_at)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isFromCurrentUser
                          ? 'bg-green-600 text-white'
                          : 'bg-white border shadow-sm'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`flex items-center justify-between mt-1 text-xs ${
                        isFromCurrentUser ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        <span>{formatTime(message.sent_at)}</span>
                        {isFromCurrentUser && (
                          <span className="ml-2">
                            {message.is_read ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
            maxLength={1000}
          />
          <Button
            type="submit"
            disabled={isSending || !newMessage.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSending ? '...' : '📤'}
          </Button>
        </form>
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
          <span>{newMessage.length}/1000</span>
          {otherParticipant.is_online && (
            <span className="text-green-600">✓ Online</span>
          )}
        </div>
      </div>
    </div>
  );
}