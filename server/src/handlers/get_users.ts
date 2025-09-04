import { db } from '../db';
import { usersTable } from '../db/schema';
import { type PublicUser } from '../schema';

export const getUsers = async (): Promise<PublicUser[]> => {
  try {
    // Query all users from database, selecting only public fields
    const results = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      full_name: usersTable.full_name,
      avatar_url: usersTable.avatar_url,
      last_seen: usersTable.last_seen,
      is_online: usersTable.is_online
    })
    .from(usersTable)
    .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};