import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { UserList } from '@/components/UserList';
import { ConversationList } from '@/components/ConversationList';
import { ChatWindow } from '@/components/ChatWindow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import type { User, PublicUser, Conversation } from '../../../server/src/schema';

interface ChatAppProps {
  currentUser: User;
}

export function ChatApp({ currentUser }: ChatAppProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [activeTab, setActiveTab] = useState('conversations');

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    try {
      const result = await trpc.getUsers.query();
      // Filter out current user from the list
      const otherUsers = result.filter((user: PublicUser) => user.id !== currentUser.id);
      setUsers(otherUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUser.id]);

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const result = await trpc.getUserConversations.query({ userId: currentUser.id });
      setConversations(result);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadUsers();
    loadConversations();
  }, [loadUsers, loadConversations]);

  const handleCreateConversation = useCallback(async (participantId: number) => {
    try {
      const newConversation = await trpc.createConversation.mutate({
        userId: currentUser.id,
        conversation: { participant_id: participantId }
      });
      
      // Add to conversations list if not already there
      setConversations((prev: Conversation[]) => {
        const exists = prev.some((conv: Conversation) => conv.id === newConversation.id);
        if (!exists) {
          return [...prev, newConversation];
        }
        return prev;
      });
      
      // Switch to the new conversation
      setActiveConversation(newConversation);
      setActiveTab('conversations');
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [currentUser.id]);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation);
  }, []);

  const getOtherParticipantId = (conversation: Conversation): number => {
    return conversation.participant1_id === currentUser.id 
      ? conversation.participant2_id 
      : conversation.participant1_id;
  };

  const getOtherParticipant = (conversation: Conversation): PublicUser | undefined => {
    const otherParticipantId = getOtherParticipantId(conversation);
    return users.find((user: PublicUser) => user.id === otherParticipantId);
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-1/3 border-r bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 m-2">
            <TabsTrigger value="conversations">Chats</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          
          <TabsContent value="conversations" className="flex-1 overflow-hidden m-0">
            <ConversationList
              conversations={conversations}
              users={users}
              currentUser={currentUser}
              activeConversation={activeConversation}
              onSelectConversation={handleSelectConversation}
              isLoading={isLoadingConversations}
            />
          </TabsContent>
          
          <TabsContent value="users" className="flex-1 overflow-hidden m-0">
            <UserList
              users={users}
              onStartConversation={handleCreateConversation}
              isLoading={isLoadingUsers}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-gray-50">
        {activeConversation ? (
          <ChatWindow
            conversation={activeConversation}
            currentUser={currentUser}
            otherParticipant={getOtherParticipant(activeConversation)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Card className="p-8 text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Welcome to WhatsApp Clone
              </h3>
              <p className="text-gray-500">
                Select a conversation from the sidebar or start a new chat with someone!
              </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}