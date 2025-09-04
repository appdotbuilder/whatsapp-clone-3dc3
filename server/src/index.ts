import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  registerUserInputSchema, 
  loginUserInputSchema,
  createConversationInputSchema,
  sendMessageInputSchema,
  getMessagesInputSchema,
  updateUserPresenceInputSchema
} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { getUsers } from './handlers/get_users';
import { getUserConversations } from './handlers/get_user_conversations';
import { createConversation } from './handlers/create_conversation';
import { sendMessage } from './handlers/send_message';
import { getMessages } from './handlers/get_messages';
import { updateUserPresence } from './handlers/update_user_presence';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// Note: In a real application, you would implement proper authentication middleware
// For now, we'll use a simple userId parameter for authenticated endpoints
const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User authentication
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // User management
  getUsers: publicProcedure
    .query(() => getUsers()),

  updateUserPresence: publicProcedure
    .input(z.object({
      userId: z.number(),
      presence: updateUserPresenceInputSchema
    }))
    .mutation(({ input }) => updateUserPresence(input.userId, input.presence)),

  // Conversation management
  getUserConversations: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserConversations(input.userId)),

  createConversation: publicProcedure
    .input(z.object({
      userId: z.number(),
      conversation: createConversationInputSchema
    }))
    .mutation(({ input }) => createConversation(input.userId, input.conversation)),

  // Messaging
  sendMessage: publicProcedure
    .input(z.object({
      userId: z.number(),
      message: sendMessageInputSchema
    }))
    .mutation(({ input }) => sendMessage(input.userId, input.message)),

  getMessages: publicProcedure
    .input(z.object({
      userId: z.number(),
      query: getMessagesInputSchema
    }))
    .query(({ input }) => getMessages(input.userId, input.query)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();