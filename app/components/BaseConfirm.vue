<script setup lang="ts">
import { AlertCircle, HelpCircle } from 'lucide-vue-next'

defineProps<{
  show: boolean
  title: string
  message: string
  type?: 'danger' | 'warning' | 'info'
}>()

defineEmits(['confirm', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="show" class="fixed inset-0 bg-slate-900/30 backdrop-blur-[4px] flex items-center justify-center z-[2000] p-4" @click.self="$emit('cancel')">
        <div class="bg-white w-full max-w-[400px] rounded-[24px] shadow-2xl overflow-hidden animate-in">
          <div class="p-8 pb-6 flex gap-5">
            <div :class="[
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              type === 'danger' ? 'bg-red-100 text-red-600' : 
              type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-blue-600'
            ]">
              <AlertCircle v-if="type === 'danger' || type === 'warning'" :size="24" />
              <HelpCircle v-else :size="24" />
            </div>
            <div class="space-y-2">
              <h3 class="text-lg font-bold text-slate-900 leading-tight">{{ title }}</h3>
              <p class="text-sm text-slate-500 leading-relaxed">{{ message }}</p>
            </div>
          </div>
          <div class="p-8 pt-0 flex justify-end gap-3">
            <button class="button" @click="$emit('cancel')">取消</button>
            <button 
              :class="[
                'button', 
                type === 'danger' ? 'bg-red-600 border-red-600 text-white hover:bg-red-700' : 'button-primary'
              ]" 
              @click="$emit('confirm')"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-enter-active, .confirm-leave-active { transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1); }
.confirm-enter-from, .confirm-leave-to { opacity: 0; transform: scale(0.95); }
</style>
