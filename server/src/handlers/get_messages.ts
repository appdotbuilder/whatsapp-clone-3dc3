import { db } from '../db';
import { conversationsTable, messagesTable } from '../db/schema';
import { type GetMessagesInput, type Message } from '../schema';
import { eq, or, and, desc } from 'drizzle-orm';

export const getMessages = async (userId: number, input: GetMessagesInput): Promise<Message[]> => {
  try {
    // First verify that user is a participant in the conversation
    const conversation = await db.select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, input.conversation_id),
          or(
            eq(conversationsTable.participant1_id, userId),
            eq(conversationsTable.participant2_id, userId)
          )
        )
      )
      .execute();

    if (conversation.length === 0) {
      throw new Error('Conversation not found or user is not a participant');
    }

    // Query messages for the conversation with pagination
    const results = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, input.conversation_id))
      .orderBy(desc(messagesTable.sent_at)) // Newest first
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Mark unread messages as read for the requesting user (messages sent by others)
    const unreadMessageIds = results
      .filter(msg => !msg.is_read && msg.sender_id !== userId)
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      await db.update(messagesTable)
        .set({ is_read: true })
        .where(
          and(
            eq(messagesTable.conversation_id, input.conversation_id),
            eq(messagesTable.is_read, false)
          )
        )
        .execute();
    }

    // Return messages with updated read status
    return results.map(message => ({
      ...message,
      is_read: message.sender_id === userId ? message.is_read : true // Mark as read for non-sender messages
    }));

  } catch (error) {
    console.error('Failed to get messages:', error);
    throw error;
  }
};