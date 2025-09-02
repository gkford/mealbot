import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { QueueService } from './services/queue.service';
import { EmailPollerService } from './services/email-poller.service';

dotenv.config();

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

const queueService = new QueueService();
const emailPoller = new EmailPollerService(queueService);

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

app.get('/auth/google', (req, res) => {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return res.status(500).json({ error: 'Gmail API not configured' });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${redirectUri}&` +
    `response_type=code&` +
    `scope=https://www.googleapis.com/auth/gmail.readonly&` +
    `access_type=offline&` +
    `prompt=consent`;

  res.redirect(authUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  res.send(`
    <html>
      <body>
        <h1>Authorization Code Received</h1>
        <p>Code: ${code}</p>
        <p>Please exchange this code for a refresh token using the Google OAuth2 API.</p>
        <p>Add the refresh token to your .env file as GMAIL_REFRESH_TOKEN</p>
      </body>
    </html>
  `);
});

queueService.on('new-submission', (submission) => {
  io.emit('new-submission', submission);
});

queueService.on('processing-started', (data) => {
  io.emit('processing-started', data);
});

queueService.on('processing-update', (data) => {
  io.emit('processing-update', data);
});

queueService.on('processing-complete', (data) => {
  io.emit('processing-complete', data);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.emit('initial-data', {
    submissions: queueService.getSubmissions()
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('/api/submissions', (req, res) => {
  res.json(queueService.getSubmissions());
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Gmail account: ${process.env.GMAIL_ADDRESS || 'Not configured'}`);
  console.log(`🔄 Poll interval: ${process.env.POLL_INTERVAL || 30} seconds`);
  
  if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
    console.warn('⚠️  Gmail API credentials not configured. Please set up .env file.');
  } else {
    const pollInterval = parseInt(process.env.POLL_INTERVAL || '30');
    emailPoller.startPolling(pollInterval);
    
    const processingDelay = parseInt(process.env.PROCESSING_DELAY || '30') * 1000;
    queueService.startProcessing(processingDelay);
  }
});