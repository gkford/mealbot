<template>
  <div class="h-screen w-screen bg-black text-white flex">
    <!-- Left Side: Queue and Images -->
    <div class="w-1/2 p-6 flex flex-col">
      <!-- Queue List -->
      <div class="mb-6">
        <h2 class="text-xl font-bold mb-4 text-yellow-400">Processing Queue</h2>
        <div class="space-y-2">
          <div 
            v-for="(item, index) in displayQueue" 
            :key="item.id"
            :class="[
              'p-3 rounded border',
              index === 0 ? 'border-green-400 bg-green-900/30 animate-pulse-slow' : 'border-gray-600 bg-gray-900/50'
            ]"
          >
            <div class="flex justify-between items-center">
              <span class="text-sm">{{ item.email }}</span>
              <span class="text-xs text-gray-400">{{ formatTime(item.receivedAt) }}</span>
            </div>
            <div class="text-xs text-gray-500 mt-1">{{ item.subject }}</div>
          </div>
          <div v-if="displayQueue.length === 0" class="text-gray-500 text-center py-8">
            No submissions in queue
          </div>
        </div>
      </div>

      <!-- Current Submission Images -->
      <div v-if="currentSubmission" class="flex-1 flex flex-col space-y-4">
        <!-- Group Photo -->
        <div class="flex-1 bg-gray-900 rounded p-4">
          <h3 class="text-sm text-gray-400 mb-2">Group Photo</h3>
          <div v-if="groupPhoto" class="h-full flex items-center justify-center">
            <img :src="groupPhoto" alt="Group" class="max-h-full max-w-full object-contain rounded" />
          </div>
          <div v-else class="h-full flex items-center justify-center text-gray-600">
            No group photo provided
          </div>
        </div>

        <!-- Receipt -->
        <div class="flex-1 bg-gray-900 rounded p-4">
          <h3 class="text-sm text-gray-400 mb-2">Receipt</h3>
          <div v-if="receipt" class="h-full flex items-center justify-center">
            <img v-if="isImage(receipt)" :src="receipt" alt="Receipt" class="max-h-full max-w-full object-contain rounded" />
            <iframe v-else :src="receipt" class="w-full h-full rounded" />
          </div>
          <div v-else class="h-full flex items-center justify-center text-gray-600">
            No receipt provided
          </div>
        </div>
      </div>
    </div>

    <!-- Right Side: AI Output -->
    <div class="w-1/2 p-6 flex flex-col">
      <h2 class="text-xl font-bold mb-4 text-yellow-400">AI Processing</h2>
      
      <!-- Processing Output -->
      <div class="flex-1 bg-gray-900 rounded p-4 font-mono text-sm text-green-400 overflow-y-auto">
        <pre class="whitespace-pre-wrap">{{ processingText }}</pre>
        <span class="animate-pulse">{{ cursor }}</span>
      </div>

      <!-- Recent Completions -->
      <div class="mt-6">
        <h3 class="text-sm font-bold mb-2 text-gray-400">Recent Payouts</h3>
        <div class="space-y-1 max-h-32 overflow-y-auto">
          <div 
            v-for="item in recentCompletions" 
            :key="item.id"
            class="flex justify-between text-xs p-2 bg-gray-900/50 rounded"
          >
            <span>{{ item.email }}</span>
            <span class="text-green-400 font-bold">${{ item.payout.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSubmissionStore } from '@/stores/submission';

const store = useSubmissionStore();

const processingText = ref('');
const cursor = ref('█');

const displayQueue = computed(() => {
  return store.submissions
    .filter(s => s.status === 'pending' || s.status === 'processing')
    .slice(0, 4);
});

const currentSubmission = computed(() => {
  return store.submissions.find(s => s.status === 'processing');
});

const groupPhoto = computed(() => {
  if (!currentSubmission.value) return null;
  const photo = currentSubmission.value.attachments.find(a => 
    a.mimeType.startsWith('image/')
  );
  return photo ? `/uploads/${photo.path}` : null;
});

const receipt = computed(() => {
  if (!currentSubmission.value) return null;
  const receiptFile = currentSubmission.value.attachments.find(a => 
    a.mimeType === 'application/pdf' || a.mimeType.startsWith('image/')
  );
  return receiptFile ? `/uploads/${receiptFile.path}` : null;
});

const recentCompletions = computed(() => {
  return store.submissions
    .filter(s => s.status === 'completed')
    .slice(-5)
    .map(s => ({
      id: s.id,
      email: s.email,
      payout: s.processingResult?.finalPayout || 0
    }));
});

const formatTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const isImage = (path: string) => {
  return !path.endsWith('.pdf');
};

let cursorInterval: number;

onMounted(() => {
  store.connectSocket();
  
  cursorInterval = setInterval(() => {
    cursor.value = cursor.value === '█' ? '' : '█';
  }, 500);
  
  store.onProcessingUpdate((text: string) => {
    processingText.value = text;
  });
});

onUnmounted(() => {
  clearInterval(cursorInterval);
  store.disconnectSocket();
});
</script>