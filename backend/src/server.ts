import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { google } from 'googleapis';
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

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code as string);

    res.send(`
      <html>
        <body>
          <h1>✅ Authorization Successful!</h1>
          <h2>Your Refresh Token:</h2>
          <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto;">${tokens.refresh_token}</pre>
          <p><strong>Instructions:</strong></p>
          <ol>
            <li>Copy the refresh token above</li>
            <li>Add it to your <code>.env</code> file as <code>GMAIL_REFRESH_TOKEN</code></li>
            <li>Restart the server</li>
          </ol>
          ${tokens.access_token ? `<p><small>Access token also generated (expires in ${tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'unknown'})</small></p>` : ''}
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).send(`
      <html>
        <body>
          <h1>❌ Error</h1>
          <p>Failed to exchange authorization code for tokens.</p>
          <pre>${error}</pre>
        </body>
      </html>
    `);
  }
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

app.post('/api/test/submit-pizza', async (req, res) => {
  try {
    const sampleFilesDir = path.join(__dirname, '../../sample_files');

    // Files to attach
    const testFiles = [
      'Pizza Palace Receipt.pdf',
      'eating_pizza.jpeg'
    ];

    // Copy files to uploads directory and create attachment objects
    const attachments = [];
    for (const filename of testFiles) {
      const sourcePath = path.join(sampleFilesDir, filename);
      const destFilename = `test-${Date.now()}-${filename}`;
      const destPath = path.join(uploadsDir, destFilename);

      // Check if source file exists
      if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({
          error: `Test file not found: ${filename}`,
          path: sourcePath
        });
      }

      // Copy file
      fs.copyFileSync(sourcePath, destPath);

      // Get file stats
      const stats = fs.statSync(destPath);

      // Determine mime type
      const ext = path.extname(filename).toLowerCase();
      const mimeType = ext === '.pdf' ? 'application/pdf' :
                      ext === '.jpeg' || ext === '.jpg' ? 'image/jpeg' :
                      'application/octet-stream';

      attachments.push({
        filename: filename,
        mimeType: mimeType,
        path: destPath,
        size: stats.size
      });
    }

    // Create test submission
    const submission = queueService.addSubmission({
      email: 'test@example.com',
      senderName: 'James (Test User)',
      subject: 'Pizza Receipt - Test Submission',
      body: `hey,

the three of us got pizza

Here's our receipt

We are james, maddy and frank`,
      attachments: attachments
    });

    console.log('🧪 Test submission created:', submission.id);

    res.json({
      success: true,
      message: 'Test email simulated successfully',
      submission: submission
    });
  } catch (error) {
    console.error('Error creating test submission:', error);
    res.status(500).json({
      error: 'Failed to create test submission',
      details: error instanceof Error ? error.message : String(error)
    });
  }
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