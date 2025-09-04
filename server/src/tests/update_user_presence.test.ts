import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserPresenceInput } from '../schema';
import { updateUserPresence } from '../handlers/update_user_presence';
import { eq } from 'drizzle-orm';

describe('updateUserPresence', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        is_online: false
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should set user online status to true', async () => {
    const input: UpdateUserPresenceInput = {
      is_online: true
    };

    const result = await updateUserPresence(testUserId, input);

    expect(result.is_online).toBe(true);
    expect(result.last_seen).toBeNull(); // Should be null when online
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.id).toEqual(testUserId);
    expect(result.username).toEqual('testuser');
  });

  it('should set user online status to false and update last_seen', async () => {
    // First set user online
    await updateUserPresence(testUserId, { is_online: true });

    const input: UpdateUserPresenceInput = {
      is_online: false
    };

    const result = await updateUserPresence(testUserId, input);

    expect(result.is_online).toBe(false);
    expect(result.last_seen).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.id).toEqual(testUserId);
  });

  it('should persist presence changes in database', async () => {
    const input: UpdateUserPresenceInput = {
      is_online: true
    };

    await updateUserPresence(testUserId, input);

    // Verify the change was persisted
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].is_online).toBe(true);
    expect(users[0].last_seen).toBeNull();
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update last_seen timestamp when going offline', async () => {
    const beforeTime = new Date();
    
    const input: UpdateUserPresenceInput = {
      is_online: false
    };

    const result = await updateUserPresence(testUserId, input);

    expect(result.is_online).toBe(false);
    expect(result.last_seen).toBeInstanceOf(Date);
    expect(result.last_seen!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    
    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users[0].last_seen).toBeInstanceOf(Date);
    expect(users[0].last_seen!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
  });

  it('should handle multiple presence updates correctly', async () => {
    // Set online
    let result = await updateUserPresence(testUserId, { is_online: true });
    expect(result.is_online).toBe(true);
    expect(result.last_seen).toBeNull();

    // Set offline
    result = await updateUserPresence(testUserId, { is_online: false });
    expect(result.is_online).toBe(false);
    expect(result.last_seen).toBeInstanceOf(Date);

    // Set online again
    result = await updateUserPresence(testUserId, { is_online: true });
    expect(result.is_online).toBe(true);
    expect(result.last_seen).toBeNull(); // Should clear last_seen when going online
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;
    const input: UpdateUserPresenceInput = {
      is_online: true
    };

    await expect(updateUserPresence(nonExistentUserId, input))
      .rejects
      .toThrow(/User with id 99999 not found/i);
  });

  it('should preserve other user data when updating presence', async () => {
    const input: UpdateUserPresenceInput = {
      is_online: true
    };

    const result = await updateUserPresence(testUserId, input);

    // Verify all original data is preserved
    expect(result.username).toEqual('testuser');
    expect(result.email).toEqual('test@example.com');
    expect(result.password_hash).toEqual('hashed_password');
    expect(result.full_name).toEqual('Test User');
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Only presence-related fields should be updated
    expect(result.is_online).toBe(true);
    expect(result.last_seen).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});