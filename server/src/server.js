import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { closeSocket, initSocket } from './socket/index.js';

async function main() {
  await connectDB();
  const server = http.createServer(createApp());
  initSocket(server);
  server.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));

  const shutdown = async () => {
    await closeSocket();
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
