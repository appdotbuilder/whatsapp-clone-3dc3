import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, conversationsTable } from '../db/schema';
import { type CreateConversationInput } from '../schema';
import { createConversation } from '../handlers/create_conversation';
import { eq, or, and } from 'drizzle-orm';

describe('createConversation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let user1Id: number;
  let user2Id: number;
  let user3Id: number;

  const testInput: CreateConversationInput = {
    participant_id: 0 // Will be set to user2Id in beforeEach
  };

  beforeEach(async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          email: 'user1@example.com',
          password_hash: 'hash1'
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password_hash: 'hash2'
        },
        {
          username: 'user3',
          email: 'user3@example.com',
          password_hash: 'hash3'
        }
      ])
      .returning()
      .execute();

    user1Id = users[0].id;
    user2Id = users[1].id;
    user3Id = users[2].id;

    testInput.participant_id = user2Id;
  });

  it('should create a new conversation between two users', async () => {
    const result = await createConversation(user1Id, testInput);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.participant1_id).toEqual(user1Id);
    expect(result.participant2_id).toEqual(user2Id);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save conversation to database', async () => {
    const result = await createConversation(user1Id, testInput);

    // Verify conversation exists in database
    const conversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, result.id))
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].participant1_id).toEqual(user1Id);
    expect(conversations[0].participant2_id).toEqual(user2Id);
    expect(conversations[0].created_at).toBeInstanceOf(Date);
    expect(conversations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return existing conversation if one already exists', async () => {
    // Create first conversation
    const firstConversation = await createConversation(user1Id, testInput);

    // Try to create the same conversation again
    const secondConversation = await createConversation(user1Id, testInput);

    // Should return the same conversation
    expect(secondConversation.id).toEqual(firstConversation.id);
    expect(secondConversation.participant1_id).toEqual(firstConversation.participant1_id);
    expect(secondConversation.participant2_id).toEqual(firstConversation.participant2_id);

    // Verify only one conversation exists in database
    const allConversations = await db.select()
      .from(conversationsTable)
      .execute();

    expect(allConversations).toHaveLength(1);
  });

  it('should return existing conversation regardless of participant order', async () => {
    // Create conversation with user1 as participant1 and user2 as participant2
    const firstConversation = await createConversation(user1Id, testInput);

    // Try to create conversation with user2 as current user and user1 as participant
    const reverseInput: CreateConversationInput = {
      participant_id: user1Id
    };
    const secondConversation = await createConversation(user2Id, reverseInput);

    // Should return the same conversation
    expect(secondConversation.id).toEqual(firstConversation.id);

    // Verify only one conversation exists in database
    const allConversations = await db.select()
      .from(conversationsTable)
      .execute();

    expect(allConversations).toHaveLength(1);
  });

  it('should throw error when trying to create conversation with self', async () => {
    const selfInput: CreateConversationInput = {
      participant_id: user1Id
    };

    await expect(createConversation(user1Id, selfInput))
      .rejects.toThrow(/cannot create conversation with yourself/i);
  });

  it('should throw error when participant does not exist', async () => {
    const nonExistentInput: CreateConversationInput = {
      participant_id: 99999
    };

    await expect(createConversation(user1Id, nonExistentInput))
      .rejects.toThrow(/target participant does not exist/i);
  });

  it('should handle multiple different conversations correctly', async () => {
    // Create conversation between user1 and user2
    const conv1 = await createConversation(user1Id, { participant_id: user2Id });

    // Create conversation between user1 and user3
    const conv2 = await createConversation(user1Id, { participant_id: user3Id });

    // Should be different conversations
    expect(conv1.id).not.toEqual(conv2.id);
    expect(conv1.participant2_id).toEqual(user2Id);
    expect(conv2.participant2_id).toEqual(user3Id);

    // Verify both conversations exist in database
    const allConversations = await db.select()
      .from(conversationsTable)
      .execute();

    expect(allConversations).toHaveLength(2);
  });

  it('should query conversations correctly using proper drizzle operators', async () => {
    // Create test conversation
    await createConversation(user1Id, testInput);

    // Test complex query with proper drizzle syntax
    const conversations = await db.select()
      .from(conversationsTable)
      .where(
        or(
          and(
            eq(conversationsTable.participant1_id, user1Id),
            eq(conversationsTable.participant2_id, user2Id)
          ),
          and(
            eq(conversationsTable.participant1_id, user2Id),
            eq(conversationsTable.participant2_id, user1Id)
          )
        )
      )
      .execute();

    expect(conversations).toHaveLength(1);
    expect(conversations[0].participant1_id).toEqual(user1Id);
    expect(conversations[0].participant2_id).toEqual(user2Id);
  });
});