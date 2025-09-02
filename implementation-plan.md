# Mealbot Implementation Plan - Phase 1 (UI & Email Polling)

## Overview
This plan covers implementing a basic version of the receipt subsidy bot with:
- Email polling from tbaylabs@gmail.com
- Vue frontend with display and admin views
- Mock processing that displays attachments
- Real-time updates via Socket.io
- No AI processing or database yet

## Phase 1: Project Setup & Structure

### 1.1 Initialize Project Structure
- [ ] Create Node.js/TypeScript backend project
  - Express server setup
  - TypeScript configuration
  - Environment variables setup (.env file)
  - Basic folder structure:
    ```
    /backend
      /src
        /services (email, queue)
        /routes (api endpoints)
        /types (TypeScript interfaces)
      server.ts
    /frontend
      /src
        /views (Display, Admin)
        /components
        /stores (Pinia for state)
    /shared
      /types (shared interfaces)
    ```

### 1.2 Install Core Dependencies
- [ ] Backend: express, typescript, socket.io, dotenv, cors
- [ ] Frontend: Vue 3, Vite, Tailwind CSS, socket.io-client, Pinia
- [ ] Dev tools: nodemon, ts-node, concurrently

### 1.3 Basic Express Server
- [ ] Set up Express with TypeScript
- [ ] Configure CORS for frontend
- [ ] Health check endpoint
- [ ] Static file serving for attachments

## Phase 2: Gmail API Configuration

### 2.1 Google Cloud Console Setup (USER ACTION REQUIRED)
**⚠️ REQUIRES USER ACTION - Cannot proceed until confirmed**
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create new project or select existing
- [ ] Enable Gmail API for the project
- [ ] Create OAuth 2.0 credentials:
  - Application type: Web application
  - Authorized redirect URIs: http://localhost:3000/auth/callback
  - Download credentials JSON
- [ ] **USER CONFIRMS: Credentials JSON downloaded and saved**

### 2.2 Gmail Account Configuration (USER ACTION REQUIRED)
**⚠️ REQUIRES USER ACTION - Cannot proceed until confirmed**
- [ ] Sign in to tbaylabs@gmail.com
- [ ] Enable "Less secure app access" OR set up OAuth consent screen
- [ ] If using OAuth:
  - Add test users if in testing mode
  - Configure consent screen with app info
- [ ] **USER CONFIRMS: Gmail account configured for API access**

### 2.3 Local Credentials Setup
- [ ] Create `.env` file with:
  ```
  GMAIL_CLIENT_ID=<from credentials.json>
  GMAIL_CLIENT_SECRET=<from credentials.json>
  GMAIL_REDIRECT_URI=http://localhost:3000/auth/callback
  GMAIL_REFRESH_TOKEN=<to be obtained>
  ```

### 2.4 OAuth Token Generation (USER ACTION REQUIRED)
**⚠️ REQUIRES USER ACTION - Cannot proceed until confirmed**
- [ ] Implement OAuth flow endpoint
- [ ] Start server and navigate to auth URL
- [ ] **USER ACTION: Authorize app in browser**
- [ ] Capture and save refresh token
- [ ] **USER CONFIRMS: Refresh token saved in .env**

## Phase 3: Backend Email Polling Service

### 3.1 Gmail Service Implementation
- [ ] Create GmailService class with googleapis
- [ ] Implement authentication using refresh token
- [ ] Method: listMessages() - get recent emails
- [ ] Method: getMessage() - get full email with attachments
- [ ] Method: getAttachment() - download attachment data
- [ ] Store attachments locally in /uploads folder

### 3.2 Email Polling System
- [ ] Create EmailPoller service
- [ ] Poll Gmail every 30 seconds
- [ ] Track last processed message ID
- [ ] Extract email metadata:
  - Sender email/name
  - Subject
  - Body text
  - Timestamp
- [ ] Download all attachments
- [ ] Emit events when new emails found

### 3.3 Queue Management (In-Memory)
- [ ] Create QueueService class
- [ ] Data structure for submissions:
  ```typescript
  interface Submission {
    id: string;
    email: string;
    subject: string;
    body: string;
    attachments: {
      filename: string;
      mimeType: string;
      path: string;
    }[];
    status: 'pending' | 'processing' | 'completed';
    receivedAt: Date;
    processedAt?: Date;
  }
  ```
- [ ] Methods: add(), getNext(), updateStatus()
- [ ] Auto-process timer (every 30 seconds)

### 3.4 Processing Mock
- [ ] "Process" = move from pending → processing → completed
- [ ] Hold in processing state for 30 seconds
- [ ] Identify first image as "group photo"
- [ ] Identify first PDF/image as "receipt"
- [ ] Generate mock response:
  ```json
  {
    "reasoning": "Processing your submission...",
    "final_payout": 0,
    "status": "completed"
  }
  ```

## Phase 4: Frontend Vue Application

### 4.1 Vue Project Setup
- [ ] Initialize Vue 3 + Vite project
- [ ] Configure Tailwind CSS
- [ ] Set up Vue Router with routes:
  - /display (public projection view)
  - /admin (admin management view)
- [ ] Configure Pinia for state management

### 4.2 Display View (/display)
- [ ] Layout: Two-column split screen
- [ ] Left side:
  - Queue list (3-4 items visible)
  - Current item highlighted
  - Show sender email and time
  - Large image display for "group photo"
  - Smaller image/PDF preview for "receipt"
- [ ] Right side:
  - Monospace font area for "AI thinking"
  - Mock text that appears character by character
  - "FINAL PAYOUT: $0.00" at the end
- [ ] Bottom ticker: Recent completions

### 4.3 Admin View (/admin)
- [ ] List all submissions (newest first)
- [ ] For each submission show:
  - Sender email
  - Thumbnail of attachments
  - Status badge (pending/processing/completed)
  - Mock payout amount ($0.00)
  - "Mark as Paid" button (disabled for now)
- [ ] Summary stats:
  - Total submissions
  - Processing queue length
  - Total "payouts" (all $0 for now)

### 4.4 Shared Components
- [ ] QueueItem component
- [ ] AttachmentViewer component (images/PDFs)
- [ ] StatusBadge component
- [ ] LoadingSpinner component

## Phase 5: Socket.io Real-time Updates

### 5.1 Backend Socket.io Setup
- [ ] Initialize Socket.io server
- [ ] Emit events:
  - 'new-submission' when email received
  - 'processing-started' when processing begins
  - 'processing-update' for fake streaming
  - 'processing-complete' when done
- [ ] Handle client connections/disconnections

### 5.2 Frontend Socket.io Integration
- [ ] Create socket service/composable
- [ ] Subscribe to events in components
- [ ] Update Pinia store on events
- [ ] Real-time queue updates
- [ ] Character-by-character text streaming

### 5.3 Fake Streaming Implementation
- [ ] Backend: Send text in chunks (5-10 chars)
- [ ] Delay between chunks (50-100ms)
- [ ] Frontend: Append text smoothly
- [ ] Add occasional pauses for drama

## Phase 6: Testing & Validation

### 6.1 Email Testing (USER ACTION REQUIRED)
**⚠️ REQUIRES USER ACTION - Cannot proceed until confirmed**
- [ ] **USER ACTION: Send test email to tbaylabs@gmail.com with:**
  - Subject: "Test submission"
  - Body: "Testing the system"
  - Attach: 1 photo (JPEG/PNG)
  - Attach: 1 receipt (PDF or image)
- [ ] Verify email appears in queue
- [ ] Verify attachments download correctly
- [ ] **USER CONFIRMS: Test email processed successfully**

### 6.2 System Integration Test
- [ ] Start backend server
- [ ] Start frontend dev server
- [ ] Open /display in one browser tab
- [ ] Open /admin in another tab
- [ ] Verify real-time updates work
- [ ] Check attachment display
- [ ] Confirm 30-second processing cycle

### 6.3 Multiple Submission Test
- [ ] Send 3-4 test emails rapidly
- [ ] Verify queue ordering (FIFO)
- [ ] Check queue display updates
- [ ] Ensure one-at-a-time processing

## Checkpoints & User Actions Summary

**User actions required at these points:**
1. **Phase 2.1**: Set up Google Cloud Console and download credentials
2. **Phase 2.2**: Configure Gmail account for API access  
3. **Phase 2.4**: Authorize OAuth and obtain refresh token
4. **Phase 6.1**: Send test emails for validation

**Cannot proceed past these points without user confirmation!**

## Success Criteria for Phase 1

✅ Emails are successfully polled from tbaylabs@gmail.com
✅ Attachments are downloaded and stored locally
✅ Queue displays incoming submissions in real-time
✅ Display view shows images/PDFs from emails
✅ Admin view lists all submissions with status
✅ Mock processing cycles every 30 seconds
✅ Both views update in real-time via Socket.io
✅ System handles multiple submissions gracefully

## Next Phases (Not in Current Scope)

- Phase 7: SQLite database integration
- Phase 8: OpenAI API integration
- Phase 9: Actual payout calculation logic
- Phase 10: Admin payout controls
- Phase 11: Production deployment to Codespaces