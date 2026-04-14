<script setup lang="ts">
import { ref } from 'vue'
import { Terminal, Copy, Check } from 'lucide-vue-next'
const props = defineProps<{
  log: {
    requestSnapshot?: {
      method: string
      url: string
      headers?: Record<string, any>
      body?: any
    }
    response?: any
    status?: string
    duration?: number
  }
}>()

const copied = ref(false)
const copyAsCurl = () => {
  const snap = props.log.requestSnapshot
  if (!snap) return
  let curl = `curl -X ${snap.method?.toUpperCase() || 'GET'} "${snap.url}"`
  if (snap.headers) {
    Object.entries(snap.headers).forEach(([k, v]) => {
      curl += ` \\\n  -H "${k}: ${v}"`
    })
  }
  if (snap.body) {
    const data = typeof snap.body === 'string' ? snap.body : JSON.stringify(snap.body)
    curl += ` \\\n  -d '${data.replace(/'/g, "'\\''")}'`
  }
  navigator.clipboard.writeText(curl)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>

<template>
  <div class="log-detail-container space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
     <!-- Request -->
     <section class="space-y-3">
        <div class="flex items-center justify-between">
           <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <div class="w-1 h-1 bg-blue-500 rounded-full"></div>
              Request Snapshot
           </h4>
           <button @click="copyAsCurl" class="flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg text-[9px] font-bold transition-all border border-slate-200">
              <Check v-if="copied" :size="10" />
              <Terminal v-else :size="10" />
              <span>{{ copied ? 'Copied' : 'Copy cURL' }}</span>
           </button>
        </div>
        <div class="bg-slate-900 rounded-2xl p-5 shadow-2xl border border-white/5 overflow-hidden ring-1 ring-inset ring-white/10">
            <div class="flex items-start gap-3 mb-4">
              <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded uppercase border border-blue-500/30 font-mono tracking-tighter shrink-0 mt-0.5">{{ log.requestSnapshot?.method }}</span>
              <code class="text-[10px] text-slate-300 font-mono break-all opacity-90 underline underline-offset-4 decoration-slate-800 leading-relaxed">{{ log.requestSnapshot?.url }}</code>
            </div>
           
           <div class="grid grid-cols-1 gap-4">
              <div v-if="log.requestSnapshot?.headers && Object.keys(log.requestSnapshot.headers).length" class="space-y-2">
                 <p class="text-[8px] font-black text-slate-500 uppercase tracking-widest opacity-50 px-1">Headers</p>
                 <pre class="bg-black/30 p-4 rounded-xl text-[10px] font-mono text-slate-400 overflow-auto max-h-40 leading-relaxed border border-white/5">{{ JSON.stringify(log.requestSnapshot.headers, null, 2) }}</pre>
              </div>
              <div v-if="log.requestSnapshot?.body" class="space-y-2">
                 <p class="text-[8px] font-black text-slate-500 uppercase tracking-widest opacity-50 px-1">Payload</p>
                 <pre class="bg-black/30 p-4 rounded-xl text-[10px] font-mono text-slate-400 overflow-auto max-h-64 leading-relaxed italic border border-white/5">{{ typeof log.requestSnapshot.body === 'string' ? log.requestSnapshot.body : JSON.stringify(log.requestSnapshot.body, null, 2) }}</pre>
              </div>
           </div>
        </div>
     </section>

     <!-- Response -->
     <section class="space-y-3">
        <div class="flex items-center justify-between">
           <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <div class="w-1 h-1 bg-emerald-500 rounded-full"></div>
              Response Snapshot
           </h4>
           <div v-if="log.status" class="flex items-center gap-2 text-[10px] font-bold font-mono">
              <span :class="[log.status === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500']">{{ log.status }}</span>
              <span class="text-slate-200">/</span>
              <span class="text-slate-500">{{ log.duration }}ms</span>
           </div>
        </div>
        <div class="relative group">
           <pre class="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-[11px] font-mono text-slate-700 overflow-auto max-h-[500px] leading-relaxed shadow-sm transition-all focus:ring-4 focus:ring-blue-50">{{ JSON.stringify(log.response, null, 2) }}</pre>
        </div>
     </section>
  </div>
</template>
