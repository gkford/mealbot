<template>
  <div class="min-h-screen bg-gray-100 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="bg-white rounded-lg shadow p-6 mb-6">
        <h1 class="text-2xl font-bold mb-4">Admin Dashboard</h1>
        
        <!-- Stats -->
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-blue-50 p-4 rounded">
            <div class="text-sm text-gray-600">Total Submissions</div>
            <div class="text-2xl font-bold">{{ stats.total }}</div>
          </div>
          <div class="bg-yellow-50 p-4 rounded">
            <div class="text-sm text-gray-600">Queue Length</div>
            <div class="text-2xl font-bold">{{ stats.pending }}</div>
          </div>
          <div class="bg-green-50 p-4 rounded">
            <div class="text-sm text-gray-600">Total Payouts</div>
            <div class="text-2xl font-bold">${{ stats.totalPayout.toFixed(2) }}</div>
          </div>
        </div>
      </div>

      <!-- Submissions List -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b">
          <h2 class="text-xl font-bold">Submissions</h2>
        </div>
        
        <div class="divide-y">
          <div 
            v-for="submission in sortedSubmissions" 
            :key="submission.id"
            class="p-6 hover:bg-gray-50 transition"
          >
            <div class="flex items-start justify-between">
              <!-- Left: Submission Info -->
              <div class="flex-1">
                <div class="flex items-center gap-4 mb-2">
                  <span class="font-semibold">{{ submission.email }}</span>
                  <StatusBadge :status="submission.status" />
                  <span class="text-sm text-gray-500">
                    {{ formatDateTime(submission.receivedAt) }}
                  </span>
                </div>
                
                <div class="text-sm text-gray-600 mb-3">
                  Subject: {{ submission.subject }}
                </div>

                <!-- Attachment Thumbnails -->
                <div class="flex gap-2 mb-3">
                  <div 
                    v-for="attachment in submission.attachments" 
                    :key="attachment.filename"
                    class="w-20 h-20 bg-gray-200 rounded overflow-hidden"
                  >
                    <img 
                      v-if="attachment.mimeType.startsWith('image/')"
                      :src="`/uploads/${attachment.path}`" 
                      :alt="attachment.filename"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center text-xs text-gray-500">
                      PDF
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Payout Info -->
              <div class="text-right">
                <div class="text-3xl font-bold text-green-600 mb-2">
                  ${{ (submission.processingResult?.finalPayout || 0).toFixed(2) }}
                </div>
                
                <button 
                  v-if="submission.status === 'completed'"
                  @click="markPaid(submission.id)"
                  :disabled="submission.paid"
                  :class="[
                    'px-4 py-2 rounded text-sm font-semibold transition',
                    submission.paid 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  ]"
                >
                  {{ submission.paid ? 'Paid' : 'Mark Paid' }}
                </button>
                
                <button 
                  v-if="submission.status === 'failed'"
                  @click="retry(submission.id)"
                  class="px-4 py-2 bg-orange-600 text-white rounded text-sm font-semibold hover:bg-orange-700 transition"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="sortedSubmissions.length === 0" class="p-12 text-center text-gray-500">
            No submissions yet
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useSubmissionStore } from '@/stores/submission';
import StatusBadge from '@/components/StatusBadge.vue';

const store = useSubmissionStore();

const sortedSubmissions = computed(() => {
  return [...store.submissions].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });
});

const stats = computed(() => {
  return {
    total: store.submissions.length,
    pending: store.submissions.filter(s => s.status === 'pending').length,
    totalPayout: store.submissions.reduce((sum, s) => 
      sum + (s.processingResult?.finalPayout || 0), 0
    )
  };
});

const formatDateTime = (date: Date | string) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', { 
    month: 'short',
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const markPaid = (id: string) => {
  console.log('Marking as paid:', id);
};

const retry = (id: string) => {
  console.log('Retrying:', id);
};

onMounted(() => {
  store.connectSocket();
});

onUnmounted(() => {
  store.disconnectSocket();
});
</script>