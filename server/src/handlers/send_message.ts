import { db } from '../db';
import { messagesTable, conversationsTable } from '../db/schema';
import { type SendMessageInput, type Message } from '../schema';
import { eq, or, and } from 'drizzle-orm';

export async function sendMessage(senderId: number, input: SendMessageInput): Promise<Message> {
  try {
    // 1. Verify that sender is a participant in the conversation
    const conversations = await db.select()
      .from(conversationsTable)
      .where(
        and(
          eq(conversationsTable.id, input.conversation_id),
          or(
            eq(conversationsTable.participant1_id, senderId),
            eq(conversationsTable.participant2_id, senderId)
          )
        )
      )
      .execute();

    if (conversations.length === 0) {
      throw new Error('Conversation not found or user is not a participant');
    }

    // 2. Create new message record in the database
    const messageResult = await db.insert(messagesTable)
      .values({
        conversation_id: input.conversation_id,
        sender_id: senderId,
        content: input.content,
        is_read: false
      })
      .returning()
      .execute();

    const newMessage = messageResult[0];

    // 3. Update conversation's updated_at timestamp
    await db.update(conversationsTable)
      .set({ updated_at: new Date() })
      .where(eq(conversationsTable.id, input.conversation_id))
      .execute();

    // 4. Return the created message
    return newMessage;
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
}