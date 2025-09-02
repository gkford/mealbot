import { GmailService } from './gmail.service';
import { QueueService } from './queue.service';
import { Attachment } from '../types';

export class EmailPollerService {
  private gmailService: GmailService;
  private queueService: QueueService;
  private pollingInterval: NodeJS.Timeout | null = null;
  private processedMessageIds: Set<string> = new Set();

  constructor(queueService: QueueService) {
    this.gmailService = new GmailService();
    this.queueService = queueService;
  }

  startPolling(intervalSeconds: number = 30): void {
    console.log(`📮 Starting email polling (every ${intervalSeconds} seconds)...`);
    
    this.poll();
    
    this.pollingInterval = setInterval(() => {
      this.poll();
    }, intervalSeconds * 1000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('📮 Email polling stopped');
    }
  }

  private async poll(): Promise<void> {
    try {
      console.log('🔍 Checking for new emails...');
      
      const messageIds = await this.gmailService.listMessages('to:' + process.env.GMAIL_ADDRESS);
      
      for (const messageId of messageIds) {
        if (this.processedMessageIds.has(messageId)) {
          continue;
        }

        const email = await this.gmailService.getMessage(messageId);
        if (!email) continue;

        console.log(`📬 New email from: ${email.from}`);

        const attachments: Attachment[] = [];
        
        for (const attachment of email.attachments) {
          const filepath = await this.gmailService.downloadAttachment(
            messageId,
            attachment.attachmentId,
            attachment.filename
          );

          if (filepath) {
            attachments.push({
              filename: attachment.filename,
              mimeType: attachment.mimeType,
              path: filepath,
              size: attachment.size
            });
            console.log(`  📎 Downloaded attachment: ${attachment.filename}`);
          }
        }

        const emailMatch = email.from.match(/<(.+?)>/) || [null, email.from];
        const emailAddress = emailMatch[1] || email.from;
        const senderName = email.from.replace(/<.+?>/, '').trim();

        this.queueService.addSubmission({
          email: emailAddress,
          senderName: senderName || undefined,
          subject: email.subject,
          body: email.body,
          attachments
        });

        // Can't mark as read with readonly scope, just track locally
        // await this.gmailService.markAsRead(messageId);
        this.processedMessageIds.add(messageId);
      }
    } catch (error) {
      console.error('❌ Error polling emails:', error);
    }
  }
}