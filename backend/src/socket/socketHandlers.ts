import { Server, Socket } from 'socket.io';
import { ChatAgentService } from '../services/chatAgentService';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  message: string;
  timestamp: Date;
  metadata?: any;
}

const activeSessions: Map<string, ChatMessage[]> = new Map();
const chatAgent = new ChatAgentService();

export function setupSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // Join chat session
    socket.on('join_chat', (data: { session_id?: string }) => {
      const sessionId = data.session_id || uuidv4();
      socket.join(sessionId);

      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, []);
      }

      socket.emit('session_created', { session_id: sessionId });
      console.log(`📌 Session ${sessionId} created`);
    });

    // Handle user query
    socket.on(
      'send_query',
      async (data: { session_id: string; customer_id: string; message: string }) => {
        const { session_id, customer_id, message } = data;
        const sessionMessages = activeSessions.get(session_id) || [];

        try {
          // Add user message to history
          const userMsg: ChatMessage = {
            id: uuidv4(),
            role: 'user',
            message,
            timestamp: new Date(),
          };
          sessionMessages.push(userMsg);

          socket.emit('message_received', { message_id: userMsg.id });

          // Process query with streaming
          let fullResponse = '';
          let hasError = false;

          try {
            await chatAgent.processQuery(
              customer_id,
              message,
              (chunk: string) => {
                fullResponse += chunk;
                socket.emit('agent_chunk', { chunk, message_id: userMsg.id });
              }
            );
          } catch (processError: any) {
            hasError = true;
            console.error('Query processing error:', processError.message);
            socket.emit('agent_error', {
              message_id: userMsg.id,
              error: processError.message || 'Failed to process query',
            });
            return; // Stop processing if there was an error
          }

          // Only add agent response if query succeeded
          if (!hasError && fullResponse) {
            // Add agent response to history
            const agentMsg: ChatMessage = {
              id: uuidv4(),
              role: 'agent',
              message: fullResponse,
              timestamp: new Date(),
              metadata: {
                customer_id,
                query: message,
              },
            };
            sessionMessages.push(agentMsg);

            socket.emit('agent_complete', {
              message_id: agentMsg.id,
              message: fullResponse,
              metadata: agentMsg.metadata,
            });

            activeSessions.set(session_id, sessionMessages);
          }
        } catch (error: any) {
          console.error('Error processing query:', error);
          socket.emit('agent_error', {
            error: error.message || 'Failed to process query',
          });
        }
      }
    );

    // Get chat history
    socket.on('get_history', (data: { session_id: string }) => {
      const messages = activeSessions.get(data.session_id) || [];
      socket.emit('history', { messages });
    });

    // Clear chat
    socket.on('clear_chat', (data: { session_id: string }) => {
      activeSessions.delete(data.session_id);
      socket.emit('chat_cleared');
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });
}
