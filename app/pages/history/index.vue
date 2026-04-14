<script setup lang="ts">
import { History, PlayCircle, Clock, CheckCircle, XCircle } from 'lucide-vue-next'

const { data: histories } = await useFetch('/api/history')
</script>

<template>
  <div class="animate-in space-y-10">
    <header>
      <h1 class="text-4xl font-heading font-bold mb-2">运行日志</h1>
      <p class="text-slate-500">追踪每一次自动化链路的执行细节与出入快照。</p>
    </header>

    <div class="space-y-4">
      <div v-if="!histories?.length" class="h-80 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-400 gap-4">
        <History :size="48" class="opacity-20" />
        <p>暂无历史记录，去链路编排中运行一次吧</p>
      </div>

      <NuxtLink 
        v-for="log in histories" 
        :key="log.id" 
        :to="`/history/${log.id}`"
        class="card p-5 flex justify-between items-center hover:translate-x-1 hover:border-blue-400 group"
      >
        <div class="flex items-center gap-5">
          <div :class="[
            'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
            log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          ]">
            <CheckCircle v-if="log.status === 'SUCCESS'" :size="24" />
            <XCircle v-else :size="24" />
          </div>
          <div class="space-y-1">
            <h3 class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{{ log.workflow.name }}</h3>
            <div class="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span>{{ log.workflow.project.name }}</span>
              <span class="opacity-50">•</span>
              <span class="flex items-center gap-1"><Clock :size="12" /> {{ new Date(log.createdAt).toLocaleString() }}</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-8 text-right">
          <div>
            <span class="block font-heading text-xl font-bold leading-none">{{ log.totalLatencyMs }}</span>
            <span class="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider">ms</span>
          </div>
          <div class="text-slate-200 group-hover:text-blue-400 transition-colors text-2xl font-light">→</div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
