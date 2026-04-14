<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  show: boolean
  title: string
}>()

defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[1000]" @click.self="$emit('close')">
        <div class="bg-white w-full max-w-[500px] rounded-[24px] shadow-2xl overflow-hidden animate-in">
          <header class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h3 class="text-xl font-heading font-bold text-slate-900">{{ title }}</h3>
            <button class="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" @click="$emit('close')">
              <X :size="20" />
            </button>
          </header>
          <div class="p-8">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
