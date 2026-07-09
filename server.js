import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import listingsRouter from './routes/listings.js';
import requirementsRouter from './routes/requirements.js';
import messagingRouter from './routes/messaging.js';
import internalRouter from './routes/internal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Log HTTP requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mounting core REST endpoints
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/listings', listingsRouter);
app.use('/api/v1/requirements', requirementsRouter);
app.use('/api/v1/messaging', messagingRouter);
app.use('/api/v1/internal', internalRouter);

// Serve static Single Page Application files
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for client SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized error boundary
app.use((err, req, res, next) => {
  console.error('[CORE GATEWAY EXCEPTION]', err);
  res.status(500).json({
    error: 'Gateway Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  printBanner();
  console.log(` Core Gateway Port: http://localhost:${PORT}`);
  console.log(`==================================================`);
});

function printBanner() {
  console.log(`
  ██████╗ ██╗   ██╗██████╗ ██╗  ██╗████████╗██████╗  █████╗ ██████╗ ███████╗
  ██╔═══██╗██║   ██║██╔══██╗██║  ██║╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗██╔════╝
  ██║   ██║██║   ██║██║  ██║███████║   ██║   ██████╔╝███████║██║  ██║█████╗  
  ██║   ██║██║   ██║██║  ██║██╔══██║   ██║   ██╔══██╗██╔══██║██║  ██║██╔══╝  
  ╚██████╔╝╚██████╔╝██████╔╝██║  ██║   ██║   ██║  ██║██║  ██║██████╔╝███████╗
   ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ ╚══════╝
        OudhTrade — Global Agarwood Listing Platform Gateway
  `);
}
