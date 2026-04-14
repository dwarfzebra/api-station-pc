<script setup lang="ts">
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  ArrowLeft,
  Timer
} from 'lucide-vue-next'

const route = useRoute()
const historyId = route.params.id as string

const { data: history } = await useFetch(`/api/history/${historyId}`)

const selectedNodeId = ref<number | null>(null)
const selectedNode = computed(() => 
  history.value?.nodeDetails.find(d => d.id === selectedNodeId.value)
)

// Select first node by default
watch(history, (val) => {
  if (val?.nodeDetails?.length && !selectedNodeId.value) {
    selectedNodeId.value = val.nodeDetails[0].id
  }
}, { immediate: true })
</script>

<template>
  <div class="animate-in space-y-6">
    <header class="space-y-4">
      <NuxtLink :to="`/workflows/${history?.workflowId}`" class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft :size="16" />
        <span>返回编辑器</span>
      </NuxtLink>
      
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-4">
          <h1 class="text-2xl font-heading font-bold text-slate-900">运行记录: {{ history?.workflow.name }}</h1>
          <span :class="[
            'px-3 py-0.5 rounded-full text-[0.65rem] font-black uppercase tracking-widest leading-none',
            history?.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          ]">
            {{ history?.status === 'SUCCESS' ? 'Passed' : 'Failed' }}
          </span>
        </div>
        <div class="flex gap-6 text-xs font-semibold text-slate-400">
          <div class="flex items-center gap-1.5"><Clock :size="14" class="opacity-70" /> {{ new Date(history?.createdAt).toLocaleString() }}</div>
          <div class="flex items-center gap-1.5"><Timer :size="14" class="opacity-70" /> {{ history?.totalLatencyMs }}ms</div>
        </div>
      </div>
    </header>

    <div class="flex bg-white border border-slate-200 rounded-2xl h-[calc(100vh-280px)] overflow-hidden shadow-sm">
      <!-- Steps Sidebar -->
      <aside class="w-72 border-r border-slate-100 bg-slate-50/30 overflow-y-auto shrink-0">
        <div 
          v-for="(node, index) in history?.nodeDetails" 
          :key="node.id"
          :class="[
            'flex items-center gap-4 p-4 border-b border-slate-50 cursor-pointer transition-all last:border-0',
            selectedNodeId === node.id ? 'bg-white shadow-sm ring-1 ring-inset ring-blue-500/10' : 'hover:bg-white/50'
          ]"
          @click="selectedNodeId = node.id"
        >
          <div class="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[0.65rem] font-bold text-slate-500 shrink-0">
            {{ index + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-xs font-bold text-slate-900 truncate leading-tight">{{ node.workflowNode.nodeName }}</h4>
            <span class="text-[0.6rem] font-semibold text-slate-400 opacity-75 mt-0.5 block">{{ node.latencyMs }}ms</span>
          </div>
          <CheckCircle2 v-if="node.status === 'SUCCESS'" :size="16" class="text-emerald-500" />
          <XCircle v-else :size="16" class="text-red-500" />
        </div>
      </aside>

      <!-- Logs Detail -->
      <main class="flex-1 overflow-y-auto p-10 bg-white" v-if="selectedNode">
        <div class="grid grid-cols-2 gap-10">
          <!-- Request -->
          <section class="space-y-8">
            <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              Request Snapshot
            </h3>
            
            <div class="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span class="text-[0.65rem] font-black px-1.5 py-0.5 bg-slate-200 rounded uppercase leading-none min-w-[36px] text-center">
                {{ selectedNode.workflowNode.apiDefinition?.method }}
              </span>
              <code class="text-xs font-mono text-slate-600 truncate flex-1">{{ selectedNode.snapshotReqUrl }}</code>
            </div>
            
            <div class="space-y-3">
              <label class="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Headers</label>
              <pre class="p-4 bg-slate-900 text-slate-300 rounded-xl text-xs font-mono overflow-auto max-h-48 leading-relaxed">{{ JSON.stringify(selectedNode.snapshotReqHeaders, null, 2) }}</pre>
            </div>
            
            <div class="space-y-3">
              <label class="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Body</label>
              <pre class="p-4 bg-slate-900 text-slate-300 rounded-xl text-xs font-mono overflow-auto max-h-64 leading-relaxed italic opacity-80">{{ selectedNode.snapshotReqBody || '// Empty body' }}</pre>
            </div>
          </section>

          <!-- Response -->
          <section class="space-y-8">
            <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              Response Snapshot
            </h3>

            <div class="flex items-center gap-3">
              <span :class="[
                'px-3 py-1 bg-white border-2 rounded-lg text-xs font-black',
                selectedNode.snapshotResStatus >= 400 ? 'border-red-100 text-red-600' : 'border-emerald-100 text-emerald-600'
              ]">
                Status: {{ selectedNode.snapshotResStatus }}
              </span>
            </div>

            <div class="space-y-3">
              <label class="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">Body</label>
              <pre class="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-auto max-h-[400px] leading-relaxed shadow-inner border border-white/5">{{ selectedNode.snapshotResBody }}</pre>
            </div>

            <div v-if="selectedNode.errorMsg" class="p-4 bg-red-50 border border-red-100 rounded-xl space-y-1">
              <label class="text-[0.65rem] font-bold text-red-400 uppercase tracking-widest">System Error</label>
              <p class="text-xs text-red-600 font-medium leading-relaxed">{{ selectedNode.errorMsg }}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>
