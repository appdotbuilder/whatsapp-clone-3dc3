import bcrypt from 'bcryptjs';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginUserInput): Promise<User> {
  try {
    // 1. Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // 2. Compare provided password with stored password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // 3. Update user's online status and last_seen timestamp
    const updatedUsers = await db.update(usersTable)
      .set({
        is_online: true,
        last_seen: new Date(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, user.id))
      .returning()
      .execute();

    // 4. Return the authenticated user
    return updatedUsers[0];
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}