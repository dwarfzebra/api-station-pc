<script setup lang="ts">
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-6 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-3 pointer-events-none">
      <TransitionGroup name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id" 
          :class="[
            'min-w-[300px] px-5 py-3 bg-white rounded-full shadow-xl flex items-center gap-3 pointer-events-auto border animate-in transition-all duration-300',
            toast.type === 'success' ? 'text-emerald-500 border-emerald-100' : 
            toast.type === 'error' ? 'text-red-500 border-red-100' : 'text-blue-500 border-slate-200'
          ]"
        >
          <div class="flex items-center">
            <CheckCircle2 v-if="toast.type === 'success'" :size="18" />
            <AlertCircle v-else-if="toast.type === 'error'" :size="18" />
            <Info v-else :size="18" />
          </div>
          <span class="text-sm font-bold text-slate-800">{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.toast-enter-from { opacity: 0; transform: translateY(-20px) scale(0.9); }
.toast-leave-to { opacity: 0; transform: translateY(-20px) scale(0.9); }
</style>
