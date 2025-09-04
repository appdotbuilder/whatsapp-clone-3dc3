import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';
import { createHash } from 'crypto';

// Test input data
const testInput: RegisterUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User'
};

const testInputNullName: RegisterUserInput = {
  username: 'testuserNull',
  email: 'testnull@example.com',
  password: 'password123',
  full_name: null
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await registerUser(testInput);

    // Verify all fields are set correctly
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.avatar_url).toBeNull();
    expect(result.last_seen).toBeNull();
    expect(result.is_online).toBe(false);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should create a user with null full_name', async () => {
    const result = await registerUser(testInputNullName);

    expect(result.username).toEqual('testuserNull');
    expect(result.email).toEqual('testnull@example.com');
    expect(result.full_name).toBeNull();
    expect(result.id).toBeDefined();
  });

  it('should save user to database correctly', async () => {
    const result = await registerUser(testInput);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const dbUser = users[0];
    expect(dbUser.username).toEqual('testuser');
    expect(dbUser.email).toEqual('test@example.com');
    expect(dbUser.full_name).toEqual('Test User');
    expect(dbUser.is_online).toBe(false);
    expect(dbUser.password_hash).toBeDefined();
    expect(dbUser.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should properly hash the password', async () => {
    const result = await registerUser(testInput);
    
    // Verify password is hashed (contains salt separated by colon)
    expect(result.password_hash).toContain(':');
    expect(result.password_hash).not.toEqual('password123');
    
    // Verify we can validate the password by recreating the hash
    const [hash, salt] = result.password_hash.split(':');
    const expectedHash = createHash('sha256')
      .update('password123' + salt)
      .digest('hex');
    expect(hash).toEqual(expectedHash);

    // Verify wrong password produces different hash
    const wrongHash = createHash('sha256')
      .update('wrongpassword' + salt)
      .digest('hex');
    expect(hash).not.toEqual(wrongHash);
  });

  it('should throw error when username already exists', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create another user with same username but different email
    const duplicateUsernameInput: RegisterUserInput = {
      username: 'testuser', // Same username
      email: 'different@example.com',
      password: 'password123',
      full_name: 'Different User'
    };

    await expect(registerUser(duplicateUsernameInput)).rejects.toThrow(/username already exists/i);
  });

  it('should throw error when email already exists', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create another user with same email but different username
    const duplicateEmailInput: RegisterUserInput = {
      username: 'differentuser',
      email: 'test@example.com', // Same email
      password: 'password123',
      full_name: 'Different User'
    };

    await expect(registerUser(duplicateEmailInput)).rejects.toThrow(/email already exists/i);
  });

  it('should throw error when both username and email already exist', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create another user with same username and email
    const duplicateInput: RegisterUserInput = {
      username: 'testuser', // Same username
      email: 'test@example.com', // Same email
      password: 'differentpassword',
      full_name: 'Another User'
    };

    // Should throw error for username (first check)
    await expect(registerUser(duplicateInput)).rejects.toThrow(/username already exists/i);
  });

  it('should create multiple users with unique usernames and emails', async () => {
    const user1Input: RegisterUserInput = {
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123',
      full_name: 'User One'
    };

    const user2Input: RegisterUserInput = {
      username: 'user2',
      email: 'user2@example.com',
      password: 'password456',
      full_name: 'User Two'
    };

    const user1 = await registerUser(user1Input);
    const user2 = await registerUser(user2Input);

    // Both users should be created successfully
    expect(user1.id).toBeDefined();
    expect(user2.id).toBeDefined();
    expect(user1.id).not.toEqual(user2.id);
    expect(user1.username).toEqual('user1');
    expect(user2.username).toEqual('user2');

    // Verify both users are in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should set default values correctly', async () => {
    const result = await registerUser(testInput);

    // Verify default values
    expect(result.avatar_url).toBeNull();
    expect(result.last_seen).toBeNull();
    expect(result.is_online).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // created_at and updated_at should be recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    expect(result.created_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
    expect(result.updated_at.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
  });
});