<script setup lang="ts">
import { 
  Plus, Send, LayoutGrid, Workflow, History, Play, Globe
} from 'lucide-vue-next'

const { data: groups } = await useFetch('/api/api-groups')
const { data: scenes } = await useFetch('/api/workflow-scenes')
</script>

<template>
  <div class="animate-in space-y-12">
    <header class="flex justify-between items-end">
      <div class="space-y-2">
        <h1 class="text-5xl font-heading font-black tracking-tight text-slate-900 leading-none">系统概览</h1>
        <p class="text-slate-500 font-semibold uppercase text-xs tracking-[0.2em] opacity-60">API AUTOMATION STATION PLATFORM</p>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="p-8 bg-blue-600 rounded-[32px] text-white space-y-6 shadow-2xl shadow-blue-200">
        <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
          <Globe :size="24" />
        </div>
        <div class="space-y-1">
          <span class="text-white/60 text-xs font-black uppercase tracking-widest leading-none">活跃 API 分组</span>
          <p class="text-5xl font-heading font-black">{{ groups?.groups?.length || 0 }}</p>
        </div>
      </div>

      <div class="p-8 bg-slate-900 rounded-[32px] text-white space-y-6 shadow-2xl shadow-slate-200">
        <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400">
          <Workflow :size="24" />
        </div>
        <div class="space-y-1">
          <span class="text-white/40 text-xs font-black uppercase tracking-widest leading-none">已构建场景</span>
          <p class="text-5xl font-heading font-black">{{ scenes?.length || 0 }}</p>
        </div>
      </div>
      
      <div class="p-8 bg-white border-2 border-slate-100 rounded-[32px] space-y-6">
        <div class="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
          <History :size="24" />
        </div>
        <div class="space-y-1">
          <span class="text-slate-400 text-xs font-black uppercase tracking-widest leading-none">接口库总量</span>
          <p class="text-5xl font-heading font-black text-slate-900">{{ groups?.stats?.apiCount || 0 }}</p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-12">
      <section class="space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 pr-4">
          <h2 class="text-xl font-heading font-bold text-slate-900 uppercase tracking-widest">最新 API 分组</h2>
          <NuxtLink to="/api-groups" class="text-xs font-black text-blue-600 uppercase tracking-widest hover:translate-x-1 transition-all">View All →</NuxtLink>
        </div>
        <div class="space-y-4">
          <NuxtLink v-for="g in groups?.groups?.slice(0, 3)" :key="g.id" :to="`/api-groups/${g.id}`" class="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-blue-400 hover:shadow-lg transition-all group">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center font-black group-hover:bg-blue-600 group-hover:text-white transition-all">{{ g.name.charAt(0) }}</div>
              <span class="font-bold text-slate-700 leading-tight">{{ g.name }}</span>
            </div>
            <div class="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-400 uppercase tracking-tighter">{{ g._count.apis }} APIs</div>
          </NuxtLink>
        </div>
      </section>

      <section class="space-y-6 font-medium">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 pr-4">
          <h2 class="text-xl font-heading font-bold text-slate-900 uppercase tracking-widest">热门业务场景</h2>
          <NuxtLink to="/scenes" class="text-xs font-black text-blue-600 uppercase tracking-widest hover:translate-x-1 transition-all">View All →</NuxtLink>
        </div>
        <div class="space-y-4">
          <NuxtLink v-for="s in scenes?.slice(0, 3)" :key="s.id" :to="`/scenes/${s.id}`" class="flex items-center justify-between p-5 bg-slate-50 border border-transparent border-slate-100 rounded-2xl hover:bg-white hover:border-blue-400 hover:shadow-lg transition-all group">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 bg-white shadow-sm text-slate-400 rounded-xl flex items-center justify-center group-hover:text-blue-600 transition-all font-bold"><Workflow :size="18" /></div>
              <span class="font-bold text-slate-700 leading-tight leading-tight">{{ s.name }}</span>
            </div>
          </NuxtLink>
          <div v-if="!scenes?.length" class="text-center py-10 text-slate-300 font-bold border-2 border-dashed border-slate-100 rounded-3xl">暂无场景，开始编排首个测试链路吧</div>
        </div>
      </section>
    </div>
  </div>
</template>
