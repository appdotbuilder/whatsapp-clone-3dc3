import { db } from '../db';
import { conversationsTable, usersTable } from '../db/schema';
import { type CreateConversationInput, type Conversation } from '../schema';
import { eq, or, and } from 'drizzle-orm';

export async function createConversation(currentUserId: number, input: CreateConversationInput): Promise<Conversation> {
  try {
    // Ensure user is not trying to create conversation with themselves
    if (currentUserId === input.participant_id) {
      throw new Error('Cannot create conversation with yourself');
    }

    // Verify that the target participant exists
    const targetUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.participant_id))
      .execute();

    if (targetUser.length === 0) {
      throw new Error('Target participant does not exist');
    }

    // Check if conversation between these users already exists
    // Conversation can exist with either user as participant1 or participant2
    const existingConversation = await db.select()
      .from(conversationsTable)
      .where(
        or(
          and(
            eq(conversationsTable.participant1_id, currentUserId),
            eq(conversationsTable.participant2_id, input.participant_id)
          ),
          and(
            eq(conversationsTable.participant1_id, input.participant_id),
            eq(conversationsTable.participant2_id, currentUserId)
          )
        )
      )
      .execute();

    // If conversation exists, return it
    if (existingConversation.length > 0) {
      return existingConversation[0];
    }

    // Create new conversation with current user as participant1
    const result = await db.insert(conversationsTable)
      .values({
        participant1_id: currentUserId,
        participant2_id: input.participant_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Conversation creation failed:', error);
    throw error;
  }
}