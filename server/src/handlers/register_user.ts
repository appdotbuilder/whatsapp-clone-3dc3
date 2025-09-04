import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Check if username or email already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(or(
        eq(usersTable.username, input.username),
        eq(usersTable.email, input.email)
      ))
      .execute();

    if (existingUser.length > 0) {
      const existingUsername = existingUser.find(user => user.username === input.username);
      const existingEmail = existingUser.find(user => user.email === input.email);
      
      if (existingUsername) {
        throw new Error('Username already exists');
      }
      if (existingEmail) {
        throw new Error('Email already exists');
      }
    }

    // Hash the password using crypto
    const salt = randomBytes(32).toString('hex');
    const password_hash = createHash('sha256')
      .update(input.password + salt)
      .digest('hex') + ':' + salt;

    // Insert new user into the database
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        email: input.email,
        password_hash,
        full_name: input.full_name,
        is_online: false
      })
      .returning()
      .execute();

    // Return the created user
    const newUser = result[0];
    return {
      ...newUser,
      created_at: new Date(newUser.created_at),
      updated_at: new Date(newUser.updated_at),
      last_seen: newUser.last_seen ? new Date(newUser.last_seen) : null
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};