import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, conversationsTable, messagesTable } from '../db/schema';
import { type GetMessagesInput } from '../schema';
import { getMessages } from '../handlers/get_messages';
import { eq, and } from 'drizzle-orm';

// Test data setup
let testUser1Id: number;
let testUser2Id: number;
let testUser3Id: number;
let testConversationId: number;

const setupTestData = async () => {
  // Create test users
  const users = await db.insert(usersTable)
    .values([
      {
        username: 'testuser1',
        email: 'user1@test.com',
        password_hash: 'hash1',
        full_name: 'Test User 1'
      },
      {
        username: 'testuser2',
        email: 'user2@test.com',
        password_hash: 'hash2',
        full_name: 'Test User 2'
      },
      {
        username: 'testuser3',
        email: 'user3@test.com',
        password_hash: 'hash3',
        full_name: 'Test User 3'
      }
    ])
    .returning()
    .execute();

  testUser1Id = users[0].id;
  testUser2Id = users[1].id;
  testUser3Id = users[2].id;

  // Create test conversation between user1 and user2
  const conversations = await db.insert(conversationsTable)
    .values({
      participant1_id: testUser1Id,
      participant2_id: testUser2Id
    })
    .returning()
    .execute();

  testConversationId = conversations[0].id;

  // Create test messages
  await db.insert(messagesTable)
    .values([
      {
        conversation_id: testConversationId,
        sender_id: testUser1Id,
        content: 'Hello from user 1',
        is_read: true,
        sent_at: new Date(Date.now() - 3000) // 3 seconds ago
      },
      {
        conversation_id: testConversationId,
        sender_id: testUser2Id,
        content: 'Reply from user 2',
        is_read: false,
        sent_at: new Date(Date.now() - 2000) // 2 seconds ago
      },
      {
        conversation_id: testConversationId,
        sender_id: testUser1Id,
        content: 'Another message from user 1',
        is_read: false,
        sent_at: new Date(Date.now() - 1000) // 1 second ago
      }
    ])
    .execute();
};

describe('getMessages', () => {
  beforeEach(async () => {
    await createDB();
    await setupTestData();
  });
  
  afterEach(resetDB);

  it('should fetch messages for conversation participant', async () => {
    const input: GetMessagesInput = {
      conversation_id: testConversationId,
      limit: 50,
      offset: 0
    };

    const result = await getMessages(testUser1Id, input);

    expect(result).toHaveLength(3);
    expect(result[0].content).toEqual('Another message from user 1');
    expect(result[1].content).toEqual('Reply from user 2');
    expect(result[2].content).toEqual('Hello from user 1');
    
    // Verify all messages belong to the conversation
    result.forEach(message => {
      expect(message.conversation_id).toEqual(testConversationId);
      expect(message.sent_at).toBeInstanceOf(Date);
    });
  });

  it('should order messages by sent_at descending (newest first)', async () => {
    const input: GetMessagesInput = {
      conversation_id: testConversationId,
      limit: 50,
      offset: 0
    };

    const result = await getMessages(testUser1Id, input);

    // Verify chronological order (newest first)
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].sent_at >= result[i + 1].sent_at).toBe(true);
    }
  });

  it('should apply pagination with limit and offset', async () => {
    const input: GetMessagesInput = {
      conversation_id: testConversationId,
      limit: 2,
      offset: 0
    };

    const result = await getMessages(testUser1Id, input);

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('Another message from user 1');
    expect(result[1].content).toEqual('Reply from user 2');
  });

  it('should apply offset correctly', async () => {
    const input: GetMessagesInput = {
      conversation_id: testConversationId,
      limit: 2,
      offset: 1
    };

    const result = await getMessages(testUser1Id, input);

    expect(result).toHaveLength(2);
    expect(result[0].content).toEqual('Reply from user 2');
    expect(result[1].content).toEqual('Hello from user 1');
  });

  it('should mark unread messages as read for requesting user', async () => {
    const input: GetMessagesInput = {
      conversation_id: testConversationId,
      limit: 50,
      offset: 0
    };

    // Before: Check that some messages are unread
    const messagesBefore = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, testConversationId))
      .execute();

    const unreadBefore = messagesBefore.filter(msg => !msg.is_read);
    expect(unreadBefore.length).toBeGreaterThan(0);

    // Fetch messages as user1
    const result = await getMessages(testUser1Id, input);

    // Check that messages sent by other users are marked as read in response
    const messagesFromOthers = result.filter(msg => msg.sender_id !== testUser1Id);
    messagesFromOthers.forEach(message => {
      expect(message.is_read).toBe(true);
    });

    // Verify database was updated
    const messagesAfter = await db.select()
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.conversation_id, testConversationId),
          eq(messagesTable.is_read, false)
        )
      )
      .execute();

    // Should have fewer unread messages now
    expect(messagesAfter.length).toBeLessThan(unreadBefore.length);
  });

  it('should work for both participants in conversation', async () => {
    const input: GetMessagesInput = {
      conversation_id: testConversationId,
      limit: 50,
      offset: 0
    };

    // Test user1 can access messages
    const result1 = await getMessages(testUser1Id, input);
    expect(result1).toHaveLength(3);

    // Test user2 can access messages
    const result2 = await getMessages(testUser2Id, input);
    expect(result2).toHaveLength(3);

    // Both should get the same messages
    expect(result1.map(m => m.id).sort()).toEqual(result2.map(m => m.id).sort());
  });

  it('should throw error for non-participant user', async () => {
    const input: GetMessagesInput = {
      conversation_id: testConversationId,
      limit: 50,
      offset: 0
    };

    // User3 is not a participant in the conversation
    await expect(getMessages(testUser3Id, input)).rejects.toThrow(/not found or user is not a participant/i);
  });

  it('should throw error for non-existent conversation', async () => {
    const input: GetMessagesInput = {
      conversation_id: 99999, // Non-existent conversation
      limit: 50,
      offset: 0
    };

    await expect(getMessages(testUser1Id, input)).rejects.toThrow(/not found or user is not a participant/i);
  });

  it('should handle empty conversation', async () => {
    // Create empty conversation
    const emptyConversation = await db.insert(conversationsTable)
      .values({
        participant1_id: testUser1Id,
        participant2_id: testUser3Id
      })
      .returning()
      .execute();

    const input: GetMessagesInput = {
      conversation_id: emptyConversation[0].id,
      limit: 50,
      offset: 0
    };

    const result = await getMessages(testUser1Id, input);

    expect(result).toHaveLength(0);
  });

  it('should respect default pagination values from Zod schema', async () => {
    // Create input without explicit limit/offset to test Zod defaults
    const inputWithoutPagination = {
      conversation_id: testConversationId
    };

    // Parse with Zod to apply defaults
    const { getMessagesInputSchema } = await import('../schema');
    const parsedInput = getMessagesInputSchema.parse(inputWithoutPagination);

    expect(parsedInput.limit).toEqual(50);
    expect(parsedInput.offset).toEqual(0);

    const result = await getMessages(testUser1Id, parsedInput);
    expect(result).toHaveLength(3);
  });
});