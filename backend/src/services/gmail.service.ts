import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { QueuedEmail } from '../types';

export class GmailService {
  private gmail;
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async listMessages(query: string = 'is:unread'): Promise<string[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
      });

      return response.data.messages?.map(m => m.id!) || [];
    } catch (error) {
      console.error('Error listing messages:', error);
      return [];
    }
  }

  async getMessage(messageId: string): Promise<QueuedEmail | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId
      });

      const message = response.data;
      const headers = message.payload?.headers || [];
      
      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      const body = this.extractBody(message.payload);
      const attachments = this.extractAttachments(message.payload);

      return {
        messageId: message.id!,
        threadId: message.threadId!,
        from,
        subject,
        body,
        attachments,
        receivedAt: new Date(date)
      };
    } catch (error) {
      console.error('Error getting message:', error);
      return null;
    }
  }

  private extractBody(payload: any): string {
    let body = '';

    if (payload.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.parts) {
          body += this.extractBody(part);
        }
      }
    }

    return body;
  }

  private extractAttachments(payload: any): any[] {
    const attachments: any[] = [];

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            attachmentId: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType || 'application/octet-stream',
            size: part.body.size || 0
          });
        }

        if (part.parts) {
          attachments.push(...this.extractAttachments(part));
        }
      }
    }

    return attachments;
  }

  async downloadAttachment(messageId: string, attachmentId: string, filename: string): Promise<string | null> {
    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
      });

      if (response.data.data) {
        const buffer = Buffer.from(response.data.data, 'base64');
        const uniqueFilename = `${uuidv4()}_${filename}`;
        const filepath = path.join(__dirname, '../../../uploads', uniqueFilename);
        
        fs.writeFileSync(filepath, buffer);
        return uniqueFilename;
      }
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
    return null;
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }
}