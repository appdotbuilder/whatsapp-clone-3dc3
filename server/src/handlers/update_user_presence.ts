import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateUserPresenceInput, type User } from '../schema';

export async function updateUserPresence(userId: number, input: UpdateUserPresenceInput): Promise<User> {
  try {
    // Update user's presence status
    const updateData = {
      is_online: input.is_online,
      last_seen: input.is_online ? null : new Date(), // Set last_seen only when going offline
      updated_at: new Date()
    };

    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User presence update failed:', error);
    throw error;
  }
}