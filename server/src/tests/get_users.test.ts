import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUsers } from '../handlers/get_users';

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();
    expect(result).toEqual([]);
  });

  it('should return all users with public data only', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        {
          username: 'john_doe',
          email: 'john@example.com',
          password_hash: 'hashed_password_123',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar1.jpg',
          is_online: true,
          last_seen: new Date('2024-01-01T10:00:00Z')
        },
        {
          username: 'jane_smith',
          email: 'jane@example.com',
          password_hash: 'hashed_password_456',
          full_name: null,
          avatar_url: null,
          is_online: false,
          last_seen: null
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);

    // Verify first user
    const user1 = result.find(u => u.username === 'john_doe');
    expect(user1).toBeDefined();
    expect(user1!.id).toBeDefined();
    expect(user1!.username).toEqual('john_doe');
    expect(user1!.full_name).toEqual('John Doe');
    expect(user1!.avatar_url).toEqual('https://example.com/avatar1.jpg');
    expect(user1!.is_online).toEqual(true);
    expect(user1!.last_seen).toBeInstanceOf(Date);
    expect(user1!.last_seen!.toISOString()).toEqual('2024-01-01T10:00:00.000Z');

    // Verify second user (with null values)
    const user2 = result.find(u => u.username === 'jane_smith');
    expect(user2).toBeDefined();
    expect(user2!.id).toBeDefined();
    expect(user2!.username).toEqual('jane_smith');
    expect(user2!.full_name).toBeNull();
    expect(user2!.avatar_url).toBeNull();
    expect(user2!.is_online).toEqual(false);
    expect(user2!.last_seen).toBeNull();

    // Verify sensitive data is not included
    expect((user1 as any).email).toBeUndefined();
    expect((user1 as any).password_hash).toBeUndefined();
    expect((user2 as any).email).toBeUndefined();
    expect((user2 as any).password_hash).toBeUndefined();
  });

  it('should handle users with different online statuses', async () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    await db.insert(usersTable)
      .values([
        {
          username: 'online_user',
          email: 'online@example.com',
          password_hash: 'hash1',
          full_name: 'Online User',
          is_online: true,
          last_seen: now
        },
        {
          username: 'offline_user',
          email: 'offline@example.com',
          password_hash: 'hash2',
          full_name: 'Offline User',
          is_online: false,
          last_seen: fiveMinutesAgo
        },
        {
          username: 'never_seen',
          email: 'never@example.com',
          password_hash: 'hash3',
          full_name: 'Never Seen',
          is_online: false,
          last_seen: null
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    const onlineUser = result.find(u => u.username === 'online_user');
    const offlineUser = result.find(u => u.username === 'offline_user');
    const neverSeenUser = result.find(u => u.username === 'never_seen');

    expect(onlineUser!.is_online).toEqual(true);
    expect(onlineUser!.last_seen).toBeInstanceOf(Date);

    expect(offlineUser!.is_online).toEqual(false);
    expect(offlineUser!.last_seen).toBeInstanceOf(Date);
    expect(offlineUser!.last_seen!.getTime()).toEqual(fiveMinutesAgo.getTime());

    expect(neverSeenUser!.is_online).toEqual(false);
    expect(neverSeenUser!.last_seen).toBeNull();
  });

  it('should return users in database insertion order', async () => {
    await db.insert(usersTable)
      .values([
        {
          username: 'first_user',
          email: 'first@example.com',
          password_hash: 'hash1',
          full_name: 'First User',
          is_online: false
        },
        {
          username: 'second_user',
          email: 'second@example.com',
          password_hash: 'hash2',
          full_name: 'Second User',
          is_online: true
        },
        {
          username: 'third_user',
          email: 'third@example.com',
          password_hash: 'hash3',
          full_name: 'Third User',
          is_online: false
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);
    expect(result[0].username).toEqual('first_user');
    expect(result[1].username).toEqual('second_user');
    expect(result[2].username).toEqual('third_user');
  });
});