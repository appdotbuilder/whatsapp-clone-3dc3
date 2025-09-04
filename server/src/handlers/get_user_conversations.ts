import { db } from '../db';
import { conversationsTable } from '../db/schema';
import { type Conversation } from '../schema';
import { eq, or, desc } from 'drizzle-orm';

export async function getUserConversations(userId: number): Promise<Conversation[]> {
  try {
    // Query conversations where user is either participant1 or participant2
    const conversations = await db.select()
      .from(conversationsTable)
      .where(
        or(
          eq(conversationsTable.participant1_id, userId),
          eq(conversationsTable.participant2_id, userId)
        )
      )
      .orderBy(desc(conversationsTable.updated_at))
      .execute();

    return conversations;
  } catch (error) {
    console.error('Failed to get user conversations:', error);
    throw error;
  }
}