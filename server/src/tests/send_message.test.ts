import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, conversationsTable, messagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq, desc } from 'drizzle-orm';

describe('sendMessage', () => {
  let testUser1: any;
  let testUser2: any;
  let testUser3: any;
  let testConversation: any;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'testuser1',
        email: 'test1@example.com',
        password_hash: 'hash1',
        full_name: 'Test User 1',
        is_online: true
      })
      .returning()
      .execute();
    testUser1 = user1Result[0];

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        email: 'test2@example.com',
        password_hash: 'hash2',
        full_name: 'Test User 2',
        is_online: false
      })
      .returning()
      .execute();
    testUser2 = user2Result[0];

    const user3Result = await db.insert(usersTable)
      .values({
        username: 'testuser3',
        email: 'test3@example.com',
        password_hash: 'hash3',
        full_name: 'Test User 3',
        is_online: true
      })
      .returning()
      .execute();
    testUser3 = user3Result[0];

    // Create test conversation between user1 and user2
    const conversationResult = await db.insert(conversationsTable)
      .values({
        participant1_id: testUser1.id,
        participant2_id: testUser2.id
      })
      .returning()
      .execute();
    testConversation = conversationResult[0];
  });

  afterEach(resetDB);

  it('should send a message from participant1', async () => {
    const input: SendMessageInput = {
      conversation_id: testConversation.id,
      content: 'Hello from user 1!'
    };

    const result = await sendMessage(testUser1.id, input);

    // Verify message properties
    expect(result.id).toBeDefined();
    expect(result.conversation_id).toEqual(testConversation.id);
    expect(result.sender_id).toEqual(testUser1.id);
    expect(result.content).toEqual('Hello from user 1!');
    expect(result.is_read).toEqual(false);
    expect(result.sent_at).toBeInstanceOf(Date);
  });

  it('should send a message from participant2', async () => {
    const input: SendMessageInput = {
      conversation_id: testConversation.id,
      content: 'Hello from user 2!'
    };

    const result = await sendMessage(testUser2.id, input);

    // Verify message properties
    expect(result.id).toBeDefined();
    expect(result.conversation_id).toEqual(testConversation.id);
    expect(result.sender_id).toEqual(testUser2.id);
    expect(result.content).toEqual('Hello from user 2!');
    expect(result.is_read).toEqual(false);
    expect(result.sent_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    const input: SendMessageInput = {
      conversation_id: testConversation.id,
      content: 'Test message content'
    };

    const result = await sendMessage(testUser1.id, input);

    // Query database to verify message was saved
    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toEqual('Test message content');
    expect(messages[0].conversation_id).toEqual(testConversation.id);
    expect(messages[0].sender_id).toEqual(testUser1.id);
    expect(messages[0].is_read).toEqual(false);
    expect(messages[0].sent_at).toBeInstanceOf(Date);
  });

  it('should update conversation timestamp', async () => {
    const originalConversation = testConversation;
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: SendMessageInput = {
      conversation_id: testConversation.id,
      content: 'Message to update timestamp'
    };

    await sendMessage(testUser1.id, input);

    // Query updated conversation
    const updatedConversations = await db.select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, testConversation.id))
      .execute();

    const updatedConversation = updatedConversations[0];
    expect(updatedConversation.updated_at).toBeInstanceOf(Date);
    expect(updatedConversation.updated_at.getTime()).toBeGreaterThan(originalConversation.updated_at.getTime());
  });

  it('should reject message from non-participant', async () => {
    const input: SendMessageInput = {
      conversation_id: testConversation.id,
      content: 'Unauthorized message'
    };

    await expect(sendMessage(testUser3.id, input)).rejects.toThrow(/not found or user is not a participant/i);
  });

  it('should reject message to non-existent conversation', async () => {
    const input: SendMessageInput = {
      conversation_id: 99999, // Non-existent conversation ID
      content: 'Message to nowhere'
    };

    await expect(sendMessage(testUser1.id, input)).rejects.toThrow(/not found or user is not a participant/i);
  });

  it('should handle multiple messages in sequence', async () => {
    const messages = [
      { content: 'First message', senderId: testUser1.id },
      { content: 'Second message', senderId: testUser2.id },
      { content: 'Third message', senderId: testUser1.id }
    ];

    // Send messages in sequence
    const results = [];
    for (const msg of messages) {
      const input: SendMessageInput = {
        conversation_id: testConversation.id,
        content: msg.content
      };
      const result = await sendMessage(msg.senderId, input);
      results.push(result);
    }

    // Verify all messages were created
    expect(results).toHaveLength(3);
    results.forEach((result, index) => {
      expect(result.content).toEqual(messages[index].content);
      expect(result.sender_id).toEqual(messages[index].senderId);
      expect(result.conversation_id).toEqual(testConversation.id);
    });

    // Verify order in database
    const savedMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.conversation_id, testConversation.id))
      .orderBy(desc(messagesTable.sent_at))
      .execute();

    expect(savedMessages).toHaveLength(3);
    expect(savedMessages[0].content).toEqual('Third message');
    expect(savedMessages[1].content).toEqual('Second message');
    expect(savedMessages[2].content).toEqual('First message');
  });

  it('should handle long message content', async () => {
    const longContent = 'A'.repeat(1000); // Max length according to schema validation

    const input: SendMessageInput = {
      conversation_id: testConversation.id,
      content: longContent
    };

    const result = await sendMessage(testUser1.id, input);

    expect(result.content).toEqual(longContent);
    expect(result.content.length).toEqual(1000);

    // Verify in database
    const savedMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(savedMessages[0].content).toEqual(longContent);
  });
});