<template>
  <span 
    :class="[
      'px-2 py-1 text-xs font-semibold rounded-full',
      statusClass
    ]"
  >
    {{ displayText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
}>();

const statusClass = computed(() => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800 animate-pulse',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800'
  };
  return classes[props.status];
});

const displayText = computed(() => {
  return props.status.charAt(0).toUpperCase() + props.status.slice(1);
});
</script>