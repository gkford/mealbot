export interface Attachment {
  filename: string;
  mimeType: string;
  path: string;
  size: number;
}

export interface Submission {
  id: string;
  email: string;
  senderName?: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  receivedAt: Date;
  processedAt?: Date;
  processingResult?: ProcessingResult;
}

export interface ProcessingResult {
  reasoning: string;
  peopleCount?: number;
  receiptTotal?: number;
  perPersonCost?: number;
  subsidyPerPerson?: number;
  finalPayout: number;
  confidence?: string;
}

export interface QueuedEmail {
  messageId: string;
  threadId: string;
  from: string;
  subject: string;
  body: string;
  attachments: {
    attachmentId: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
  receivedAt: Date;
}