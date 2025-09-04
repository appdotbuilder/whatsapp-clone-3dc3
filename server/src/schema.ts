import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  last_seen: z.coerce.date().nullable(),
  is_online: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User registration input schema
export const registerUserInputSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().nullable()
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// User login input schema
export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Public user schema (without sensitive data)
export const publicUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  last_seen: z.coerce.date().nullable(),
  is_online: z.boolean()
});

export type PublicUser = z.infer<typeof publicUserSchema>;

// Conversation schema
export const conversationSchema = z.object({
  id: z.number(),
  participant1_id: z.number(),
  participant2_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Conversation = z.infer<typeof conversationSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  conversation_id: z.number(),
  sender_id: z.number(),
  content: z.string(),
  is_read: z.boolean(),
  sent_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Create conversation input schema
export const createConversationInputSchema = z.object({
  participant_id: z.number()
});

export type CreateConversationInput = z.infer<typeof createConversationInputSchema>;

// Send message input schema
export const sendMessageInputSchema = z.object({
  conversation_id: z.number(),
  content: z.string().min(1).max(1000)
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// Get messages input schema
export const getMessagesInputSchema = z.object({
  conversation_id: z.number(),
  limit: z.number().int().positive().optional().default(50),
  offset: z.number().int().nonnegative().optional().default(0)
});

export type GetMessagesInput = z.infer<typeof getMessagesInputSchema>;

// Update user presence input schema
export const updateUserPresenceInputSchema = z.object({
  is_online: z.boolean()
});

export type UpdateUserPresenceInput = z.infer<typeof updateUserPresenceInputSchema>;