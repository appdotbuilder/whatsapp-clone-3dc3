import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import bcrypt from 'bcryptjs';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';
import { eq } from 'drizzle-orm';

const testUserData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  full_name: 'Test User'
};

const testInput: LoginUserInput = {
  email: testUserData.email,
  password: testUserData.password
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully login user with valid credentials', async () => {
    // Create a test user with hashed password
    const passwordHash = await bcrypt.hash(testUserData.password, 10);
    
    const insertedUsers = await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        password_hash: passwordHash,
        full_name: testUserData.full_name,
        is_online: false
      })
      .returning()
      .execute();

    const createdUser = insertedUsers[0];

    // Login the user
    const result = await loginUser(testInput);

    // Verify user authentication
    expect(result.id).toEqual(createdUser.id);
    expect(result.email).toEqual(testUserData.email);
    expect(result.username).toEqual(testUserData.username);
    expect(result.full_name).toEqual(testUserData.full_name);
    expect(result.is_online).toBe(true);
    expect(result.last_seen).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user online status and last_seen on login', async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash(testUserData.password, 10);
    const originalDate = new Date('2023-01-01');
    
    const insertedUsers = await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        password_hash: passwordHash,
        full_name: testUserData.full_name,
        is_online: false,
        last_seen: originalDate
      })
      .returning()
      .execute();

    const createdUser = insertedUsers[0];

    // Login the user
    await loginUser(testInput);

    // Verify database was updated
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    const updatedUser = updatedUsers[0];
    expect(updatedUser.is_online).toBe(true);
    expect(updatedUser.last_seen).toBeInstanceOf(Date);
    expect(updatedUser.last_seen!.getTime()).toBeGreaterThan(originalDate.getTime());
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
    expect(updatedUser.updated_at!.getTime()).toBeGreaterThan(originalDate.getTime());
  });

  it('should throw error for non-existent email', async () => {
    const invalidInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'anypassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create a test user
    const passwordHash = await bcrypt.hash(testUserData.password, 10);
    
    await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        password_hash: passwordHash,
        full_name: testUserData.full_name
      })
      .execute();

    const invalidInput: LoginUserInput = {
      email: testUserData.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should preserve existing user data during login', async () => {
    // Create a test user with specific data
    const passwordHash = await bcrypt.hash(testUserData.password, 10);
    
    const insertedUsers = await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email,
        password_hash: passwordHash,
        full_name: testUserData.full_name,
        avatar_url: 'https://example.com/avatar.jpg'
      })
      .returning()
      .execute();

    const createdUser = insertedUsers[0];

    // Login the user
    const result = await loginUser(testInput);

    // Verify all original data is preserved
    expect(result.id).toEqual(createdUser.id);
    expect(result.username).toEqual(testUserData.username);
    expect(result.email).toEqual(testUserData.email);
    expect(result.full_name).toEqual(testUserData.full_name);
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.password_hash).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Only these fields should be updated
    expect(result.is_online).toBe(true);
    expect(result.last_seen).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle case-sensitive email matching', async () => {
    // Create user with lowercase email
    const passwordHash = await bcrypt.hash(testUserData.password, 10);
    
    await db.insert(usersTable)
      .values({
        username: testUserData.username,
        email: testUserData.email.toLowerCase(),
        password_hash: passwordHash,
        full_name: testUserData.full_name
      })
      .execute();

    // Try to login with uppercase email
    const mixedCaseInput: LoginUserInput = {
      email: testUserData.email.toUpperCase(),
      password: testUserData.password
    };

    // Should fail because email case doesn't match
    await expect(loginUser(mixedCaseInput)).rejects.toThrow(/invalid email or password/i);
  });
});