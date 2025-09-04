import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, conversationsTable } from '../db/schema';
import { getUserConversations } from '../handlers/get_user_conversations';
import { eq } from 'drizzle-orm';

describe('getUserConversations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return conversations where user is participant1', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hash2',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create conversation where user1 is participant1
    const conversation = await db.insert(conversationsTable)
      .values({
        participant1_id: user1Id,
        participant2_id: user2Id
      })
      .returning()
      .execute();

    const result = await getUserConversations(user1Id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(conversation[0].id);
    expect(result[0].participant1_id).toEqual(user1Id);
    expect(result[0].participant2_id).toEqual(user2Id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return conversations where user is participant2', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hash2',
          full_name: 'User Two'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create conversation where user2 is participant1
    const conversation = await db.insert(conversationsTable)
      .values({
        participant1_id: user1Id,
        participant2_id: user2Id
      })
      .returning()
      .execute();

    const result = await getUserConversations(user2Id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(conversation[0].id);
    expect(result[0].participant1_id).toEqual(user1Id);
    expect(result[0].participant2_id).toEqual(user2Id);
  });

  it('should return multiple conversations for a user', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hash2',
          full_name: 'User Two'
        },
        {
          username: 'user3',
          email: 'user3@example.com',
          password_hash: 'hash3',
          full_name: 'User Three'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;
    const user3Id = users[2].id;

    // Create multiple conversations involving user1
    await db.insert(conversationsTable)
      .values([
        {
          participant1_id: user1Id,
          participant2_id: user2Id
        },
        {
          participant1_id: user3Id,
          participant2_id: user1Id
        }
      ])
      .execute();

    const result = await getUserConversations(user1Id);

    expect(result).toHaveLength(2);
    
    // Check that user1 is involved in all returned conversations
    result.forEach(conversation => {
      expect(
        conversation.participant1_id === user1Id || 
        conversation.participant2_id === user1Id
      ).toBe(true);
    });
  });

  it('should return empty array when user has no conversations', async () => {
    // Create a user but no conversations
    const users = await db.insert(usersTable)
      .values({
        username: 'lonely_user',
        email: 'lonely@example.com',
        password_hash: 'hash',
        full_name: 'Lonely User'
      })
      .returning()
      .execute();

    const result = await getUserConversations(users[0].id);

    expect(result).toHaveLength(0);
  });

  it('should order conversations by updated_at descending', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1',
          full_name: 'User One'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hash2',
          full_name: 'User Two'
        },
        {
          username: 'user3',
          email: 'user3@example.com',
          password_hash: 'hash3',
          full_name: 'User Three'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;
    const user3Id = users[2].id;

    // Create conversations with different timestamps
    const conversations = await db.insert(conversationsTable)
      .values([
        {
          participant1_id: user1Id,
          participant2_id: user2Id
        },
        {
          participant1_id: user1Id,
          participant2_id: user3Id
        }
      ])
      .returning()
      .execute();

    // Update one conversation to have a more recent updated_at
    const updatedTime = new Date();
    updatedTime.setMinutes(updatedTime.getMinutes() + 1);
    
    await db.update(conversationsTable)
      .set({ updated_at: updatedTime })
      .where(eq(conversationsTable.id, conversations[1].id))
      .execute();

    const result = await getUserConversations(user1Id);

    expect(result).toHaveLength(2);
    // First conversation should be the one with the more recent updated_at
    expect(result[0].id).toEqual(conversations[1].id);
    expect(result[1].id).toEqual(conversations[0].id);
    expect(result[0].updated_at >= result[1].updated_at).toBe(true);
  });

  it('should not return conversations for non-existent user', async () => {
    const result = await getUserConversations(99999);
    
    expect(result).toHaveLength(0);
  });
});