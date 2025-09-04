import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Conversation, User, PublicUser } from '../../../server/src/schema';

interface ConversationListProps {
  conversations: Conversation[];
  users: PublicUser[];
  currentUser: User;
  activeConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  isLoading: boolean;
}

export function ConversationList({
  conversations,
  users,
  currentUser,
  activeConversation,
  onSelectConversation,
  isLoading
}: ConversationListProps) {
  const getOtherParticipant = (conversation: Conversation): PublicUser | null => {
    const otherParticipantId = conversation.participant1_id === currentUser.id 
      ? conversation.participant2_id 
      : conversation.participant1_id;
    
    return users.find((user: PublicUser) => user.id === otherParticipantId) || null;
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

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Now';
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-24 h-3" />
            </div>
            <Skeleton className="w-8 h-3" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="text-4xl mb-2">💬</div>
        <p>No conversations yet</p>
        <p className="text-sm">Start a chat with someone!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <h3 className="text-sm font-semibold text-gray-600 mb-3 px-2">
          Recent Chats ({conversations.length})
        </h3>
        <div className="space-y-1">
          {conversations.map((conversation: Conversation) => {
            const otherParticipant = getOtherParticipant(conversation);
            const isActive = activeConversation?.id === conversation.id;

            if (!otherParticipant) {
              return (
                <div key={conversation.id} className="p-3 rounded-lg bg-gray-100">
                  <p className="text-sm text-gray-500">User not found</p>
                </div>
              );
            }

            return (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation)}
                className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  isActive 
                    ? 'bg-green-100 border border-green-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={otherParticipant.avatar_url || undefined} />
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {getInitials(otherParticipant)}
                    </AvatarFallback>
                  </Avatar>
                  {otherParticipant.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 truncate">
                      {otherParticipant.full_name || otherParticipant.username}
                    </p>
                    <div className="flex items-center space-x-1">
                      {otherParticipant.is_online && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                          Online
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTime(conversation.updated_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    @{otherParticipant.username}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}