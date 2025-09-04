import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { PublicUser } from '../../../server/src/schema';

interface UserListProps {
  users: PublicUser[];
  onStartConversation: (userId: number) => void;
  isLoading: boolean;
}

export function UserList({ users, onStartConversation, isLoading }: UserListProps) {
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

  const formatLastSeen = (lastSeen: Date | null): string => {
    if (!lastSeen) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return lastSeen.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="text-4xl mb-2">👥</div>
        <p>No other users found</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <h3 className="text-sm font-semibold text-gray-600 mb-3 px-2">
          Available Users ({users.length})
        </h3>
        <div className="space-y-1">
          {users.map((user: PublicUser) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  {user.is_online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900 truncate">
                      {user.full_name || user.username}
                    </p>
                    {user.is_online && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                        Online
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    @{user.username}
                  </p>
                  {!user.is_online && (
                    <p className="text-xs text-gray-400">
                      Last seen {formatLastSeen(user.last_seen)}
                    </p>
                  )}
                </div>
              </div>
              
              <Button
                size="sm"
                onClick={() => onStartConversation(user.id)}
                className="bg-green-600 hover:bg-green-700 text-xs"
              >
                Chat
              </Button>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}