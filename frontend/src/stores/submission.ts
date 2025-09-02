import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io, Socket } from 'socket.io-client';

interface Attachment {
  filename: string;
  mimeType: string;
  path: string;
  size: number;
}

interface ProcessingResult {
  reasoning: string;
  finalPayout: number;
}

interface Submission {
  id: string;
  email: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  receivedAt: Date;
  processedAt?: Date;
  processingResult?: ProcessingResult;
  paid?: boolean;
}

export const useSubmissionStore = defineStore('submission', () => {
  const submissions = ref<Submission[]>([]);
  const socket = ref<Socket | null>(null);
  const processingUpdateCallback = ref<((text: string) => void) | null>(null);

  const connectSocket = () => {
    if (socket.value) return;

    socket.value = io('http://localhost:3001');

    socket.value.on('new-submission', (submission: Submission) => {
      submissions.value.push(submission);
    });

    socket.value.on('processing-started', (data: { id: string }) => {
      const submission = submissions.value.find(s => s.id === data.id);
      if (submission) {
        submission.status = 'processing';
      }
    });

    socket.value.on('processing-update', (data: { id: string; text: string }) => {
      if (processingUpdateCallback.value) {
        processingUpdateCallback.value(data.text);
      }
    });

    socket.value.on('processing-complete', (data: { 
      id: string; 
      result: ProcessingResult 
    }) => {
      const submission = submissions.value.find(s => s.id === data.id);
      if (submission) {
        submission.status = 'completed';
        submission.processingResult = data.result;
        submission.processedAt = new Date();
      }
    });

    socket.value.on('submission-failed', (data: { id: string; error: string }) => {
      const submission = submissions.value.find(s => s.id === data.id);
      if (submission) {
        submission.status = 'failed';
      }
    });

    socket.value.on('initial-data', (data: { submissions: Submission[] }) => {
      submissions.value = data.submissions;
    });
  };

  const disconnectSocket = () => {
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
  };

  const onProcessingUpdate = (callback: (text: string) => void) => {
    processingUpdateCallback.value = callback;
  };

  return {
    submissions,
    connectSocket,
    disconnectSocket,
    onProcessingUpdate
  };
});