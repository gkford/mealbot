import { v4 as uuidv4 } from 'uuid';
import { Submission, ProcessingResult } from '../types';
import { EventEmitter } from 'events';

export class QueueService extends EventEmitter {
  private submissions: Submission[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  addSubmission(data: Omit<Submission, 'id' | 'status' | 'receivedAt'>): Submission {
    const submission: Submission = {
      ...data,
      id: uuidv4(),
      status: 'pending',
      receivedAt: new Date()
    };

    this.submissions.push(submission);
    this.emit('new-submission', submission);
    
    console.log(`📧 New submission added: ${submission.email} - ${submission.subject}`);
    
    return submission;
  }

  getSubmissions(): Submission[] {
    return this.submissions;
  }

  getNextPending(): Submission | null {
    return this.submissions.find(s => s.status === 'pending') || null;
  }

  updateStatus(id: string, status: Submission['status']): void {
    const submission = this.submissions.find(s => s.id === id);
    if (submission) {
      submission.status = status;
      
      if (status === 'processing') {
        this.emit('processing-started', { id });
      } else if (status === 'completed') {
        submission.processedAt = new Date();
      }
    }
  }

  setProcessingResult(id: string, result: ProcessingResult): void {
    const submission = this.submissions.find(s => s.id === id);
    if (submission) {
      submission.processingResult = result;
      submission.status = 'completed';
      submission.processedAt = new Date();
      this.emit('processing-complete', { id, result });
    }
  }

  startProcessing(processingDelay: number = 30000): void {
    if (this.processingInterval) return;

    console.log('🔄 Starting queue processor...');
    
    this.processingInterval = setInterval(() => {
      this.processNext(processingDelay);
    }, 5000);

    this.processNext(processingDelay);
  }

  private async processNext(processingDelay: number): Promise<void> {
    if (this.isProcessing) return;

    const next = this.getNextPending();
    if (!next) return;

    this.isProcessing = true;
    this.updateStatus(next.id, 'processing');
    
    console.log(`⚙️  Processing submission: ${next.id}`);

    const mockReasoning = `Analyzing submission from ${next.email}...
Checking receipt image...
Identifying number of people in photo...
Calculating subsidy...

Receipt total: $0.00
People count: Unable to determine
Per person cost: $0.00
Subsidy (50%): $0.00

FINAL PAYOUT: $0.00`;

    let currentText = '';
    const words = mockReasoning.split(' ');
    let wordIndex = 0;

    const streamInterval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
        this.emit('processing-update', { id: next.id, text: currentText });
        wordIndex++;
      } else {
        clearInterval(streamInterval);
        
        const result: ProcessingResult = {
          reasoning: mockReasoning,
          finalPayout: 0
        };

        this.setProcessingResult(next.id, result);
        this.isProcessing = false;
        
        console.log(`✅ Completed processing: ${next.id}`);
      }
    }, 200);
  }

  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('🛑 Queue processor stopped');
    }
  }
}