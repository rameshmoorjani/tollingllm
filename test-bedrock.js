const io = require('socket.io-client');

const socket = io('http://localhost:5000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 3
});

socket.on('connect', () => {
  console.log('✅ Connected to backend');
  
  // Join chat
  socket.emit('join_chat', { session_id: 'test-session' });
});

socket.on('session_created', (data) => {
  console.log('📌 Session created:', data.session_id);
  
  // Send test query
  console.log('📤 Sending query...');
  socket.emit('send_query', {
    session_id: data.session_id,
    customer_id: 'ALL',
    message: 'What is the total toll amount I paid last month?'
  });
});

socket.on('agent_chunk', (data) => {
  console.log('📨 Chunk:', data.chunk);
});

socket.on('agent_complete', (data) => {
  console.log('✅ Agent response complete');
  console.log('   Message:', data.message);
  console.log('   Length:', data.message ? data.message.length : 0);
  process.exit(0);
});

socket.on('error', (data) => {
  console.error('❌ Socket error:', data);
  process.exit(1);
});

socket.on('disconnect', () => {
  console.log('Disconnected');
  process.exit(0);
});

socket.on('message_received', (data) => {
  console.log('✅ Server received message:', data);
});

setTimeout(() => {
  console.error('⏱️ Test timeout');
  process.exit(1);
}, 30000);
