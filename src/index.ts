// config.js must be first to ensure .env variables are loaded before anything else
import './config';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import cors from 'cors';
import * as http from 'http';
import serveStatic from 'serve-static';
import { join } from 'path';
import { createTables } from './db';
import { appRouter } from './routers/index';
import { createContext } from './context';
import logger from './logger';
import wsHandler from './websocket';
import { hasRegisteredUsers } from './models/user';
import { decodeAndVerifyJwtToken } from './jwt';

const PORT = process.env.PORT || 3001;

// tRPC
const tRPChandler = createHTTPHandler({
  middleware: cors(), // TODO: configure CORS
  router: appRouter,
  createContext,
});

// serve static content
const isProd = process.env.NODE_ENV === 'production';
const staticRootPath = isProd ? join(__dirname, '..', 'public', 'dist') : join(__dirname, '..', 'public');
const staticHandler = serveStatic(staticRootPath, {
  index: true,
  extensions: ['html'],
});

const corsMiddleware = cors(); // TODO: configure CORS

const server = http.createServer((req, res) => {
  // if an API call, send to tRPC
  if (req.url?.startsWith('/api/v2')) {
    tRPChandler(req, res).catch((err: Error) => {
      logger.error('Failed to handle tRPC request:', { error: err });
      res.statusCode = 500;
      res.end('Failed to handle tRPC request');
    });
    return;
  }
  // if no users, send to signup.html
  if (!hasRegisteredUsers()) {
    res.writeHead(302, { Location: '/signup.html' });
    res.end();
    return;
  }
  // if not logged in, but there is at least one user, send to index.html
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.writeHead(302, { Location: '/index.html' });
    res.end();
    return;
  }
  try {
    decodeAndVerifyJwtToken(token);
  } catch (error) {
    logger.error('Failed to decode and verify JWT token:', { error, token: token ?? 'undefined' });
    res.writeHead(302, { Location: '/index.html' });
    res.end();
    return;
  }
  corsMiddleware(req, res, (err: Error) => {
    logger.debug('Incoming request', { path: req.url, method: req.method });
    if (err) {
      logger.error('Failed to serve static content:', { error: err });
      res.statusCode = 500;
      res.end('Failed to serve static content');
      return;
    }

    staticHandler(req, res, () => {
      res.statusCode = 404;
      res.end('Not found');
    });
  });
});

// set up the database
createTables();

// Start the server
server.listen({ port: PORT, host: '0.0.0.0' }, () => {
  logger.info('Server started', { port: PORT });
});
await wsHandler.listen(server);