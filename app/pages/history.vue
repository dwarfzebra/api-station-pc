<script setup lang="ts">
import { 
  History, Eye, Clock, Trash2, Filter, 
  Terminal, Workflow, CheckCircle2, XCircle, Search, ChevronRight
} from 'lucide-vue-next'

const logs = ref<any[]>([])
const filterType = ref('ALL') // ALL, API, WORKFLOW
const filterStatus = ref('ALL') // ALL, SUCCESS, FAIL
const searchQuery = ref('')
const selectedLog = ref<any>(null)
const showDetailModal = ref(false)
const isConfirmingClear = ref(false)
const selectedStepIdx = ref(0)

const loadLogs = () => {
  const saved = localStorage.getItem('api_station_run_logs')
  if (saved) {
    logs.value = JSON.parse(saved)
  }
}

onMounted(() => {
  loadLogs()
})

const filteredLogs = computed(() => {
  return logs.value.filter(log => {
    const matchType = filterType.value === 'ALL' || log.type === filterType.value
    const matchStatus = filterStatus.value === 'ALL' || log.status === filterStatus.value
    const matchSearch = !searchQuery.value || 
      (log.apiName || log.workflowName || '').toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchType && matchStatus && matchSearch
  })
})

const viewDetail = (log: any) => {
  selectedLog.value = log
  selectedStepIdx.value = 0
  showDetailModal.value = true
}

const handleClearLogs = () => {
  localStorage.removeItem('api_station_run_logs')
  logs.value = []
  isConfirmingClear.value = false
  useToast().success('日志已清空')
}

const copyAsCurl = (snapshot: any) => {
  if (!snapshot) return
  let curl = `curl -X ${snapshot.method.toUpperCase()} "${snapshot.url}"`
  
  if (snapshot.headers) {
    Object.entries(snapshot.headers).forEach(([k, v]) => {
      curl += ` \\\n  -H "${k}: ${v}"`
    })
  }
  
  if (snapshot.body) {
    const data = typeof snapshot.body === 'string' ? snapshot.body : JSON.stringify(snapshot.body)
    curl += ` \\\n  -d '${data.replace(/'/g, "'\\''")}'`
  }
  
  navigator.clipboard.writeText(curl)
  toast.success('cURL 命令已复制')
}

const formatTime = (ts: string | number) => {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="animate-in space-y-8 max-w-6xl mx-auto">
    <BaseConfirm 
      :show="isConfirmingClear" 
      title="清空运行日志" 
      message="确认清空所有本地运行日志吗？该操作将物理删除当前浏览器的所有记录，不可撤销。" 
      type="danger"
      @confirm="handleClearLogs"
      @cancel="isConfirmingClear = false"
    />
    <!-- ... header remains same ... -->
    <header class="flex justify-between items-end">
      <div class="space-y-1">
        <h1 class="text-4xl font-heading font-bold tracking-tight text-slate-900 flex items-center gap-4">
          <History :size="40" class="text-blue-600" />
          运行日志
        </h1>
        <p class="text-slate-500 font-medium">查看存储在本地浏览器的 API 与链路运行记录。</p>
      </div>
      <button @click="isConfirmingClear = true" class="button py-2 bg-red-50 text-red-600 border-red-100 hover:bg-red-100">
        <Trash2 :size="16" />
        <span>清空日志</span>
      </button>
    </header>

    <!-- Filters remains same -->

    <!-- Filters -->
    <div class="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-wrap items-center gap-6">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-black uppercase text-slate-400">日志类型</span>
        <div class="flex bg-slate-100 p-1 rounded-xl">
          <button 
            v-for="t in ['ALL', 'API', 'WORKFLOW']" 
            :key="t"
            @click="filterType = t"
            :class="['px-4 py-1.5 text-xs font-bold rounded-lg transition-all', filterType === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900']"
          >
            {{ t === 'ALL' ? '全部' : (t === 'API' ? '接口' : '链路') }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-[10px] font-black uppercase text-slate-400">执行结果</span>
        <div class="flex bg-slate-100 p-1 rounded-xl">
          <button 
            v-for="s in ['ALL', 'SUCCESS', 'FAIL']" 
            :key="s"
            @click="filterStatus = s"
            :class="['px-4 py-1.5 text-xs font-bold rounded-lg transition-all', filterStatus === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900']"
          >
            {{ s === 'ALL' ? '全部' : (s === 'SUCCESS' ? '成功' : '失败') }}
          </button>
        </div>
      </div>

      <div class="relative flex-1 min-w-[300px]">
        <Search :size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="搜索接口或链路名称..." 
          class="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none"
        />
      </div>
    </div>

    <!-- Logs List -->
    <div class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
      <table class="w-full text-left">
        <thead>
          <tr class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50/30">
            <th class="px-8 py-5">执行名称</th>
            <th class="px-6 py-5">类型</th>
            <th class="px-6 py-5">状态</th>
            <th class="px-6 py-5">执行时间</th>
            <th class="px-6 py-5 w-20 text-center">详情</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="!filteredLogs.length">
            <td colspan="5" class="py-24 text-center">
              <div class="flex flex-col items-center justify-center grayscale opacity-30 gap-4">
                <History :size="64" />
                <p class="text-sm font-bold">未找到匹配的本地日志</p>
              </div>
            </td>
          </tr>
          <tr v-for="log in filteredLogs" :key="log.id" class="group hover:bg-slate-50/50 transition-colors">
            <td class="px-8 py-5">
              <div class="flex items-center gap-3">
                <div :class="['w-10 h-10 rounded-xl flex items-center justify-center shrink-0', log.type === 'API' ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600']">
                  <Terminal v-if="log.type === 'API'" :size="18" />
                  <Workflow v-else :size="18" />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-sm font-bold text-slate-900 truncate">{{ log.apiName || log.workflowName || '未命名任务' }}</span>
                  <span class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                    <Clock :size="10" /> {{ formatTime(log.timestamp || log.id) }}
                  </span>
                </div>
              </div>
            </td>
            <td class="px-6 py-5">
              <span :class="['text-[10px] font-black px-2 py-0.5 rounded uppercase', log.type === 'API' ? 'text-blue-500 bg-blue-50' : 'text-indigo-500 bg-indigo-50']">
                {{ log.type }}
              </span>
            </td>
            <td class="px-6 py-5">
              <span :class="['flex items-center gap-1.5 text-xs font-bold leading-none', log.status === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500']">
                <CheckCircle2 v-if="log.status === 'SUCCESS'" :size="14" />
                <XCircle v-else :size="14" />
                {{ log.status }}
              </span>
            </td>
            <td class="px-6 py-5">
              <span class="text-xs font-mono text-slate-500">
                {{ log.type === 'WORKFLOW' ? (log.results?.reduce((acc: any, curr: any) => acc + (curr.duration || 0), 0)) : (log.duration || 0) }}ms
              </span>
            </td>
            <td class="px-6 py-5 text-center">
              <button @click="viewDetail(log)" class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                <Eye :size="18" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <BaseModal :show="showDetailModal" title="执行详情透视" @close="showDetailModal = false" custom-class="max-w-5xl">
      <div v-if="selectedLog" class="space-y-6">
        <!-- Header Info -->
        <div class="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-3xl">
          <div class="flex items-center gap-4">
            <div :class="['w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm', selectedLog.type === 'API' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white']">
               <Terminal v-if="selectedLog.type === 'API'" :size="20" />
               <Workflow v-else :size="20" />
            </div>
            <div>
              <h3 class="font-black text-slate-900 uppercase tracking-tight">{{ selectedLog.apiName || selectedLog.workflowName }}</h3>
              <div class="flex items-center gap-3 mt-1">
                 <span :class="['text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest', selectedLog.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">{{ selectedLog.status }}</span>
                 <span class="text-[9px] text-slate-400 font-mono flex items-center gap-1"><Clock :size="10" /> {{ formatTime(selectedLog.timestamp || selectedLog.id) }}</span>
                 <span class="text-[9px] text-slate-400 font-mono">Total: {{ selectedLog.type === 'WORKFLOW' ? (selectedLog.results?.reduce((acc: any, curr: any) => acc + (curr.duration || 0), 0)) : (selectedLog.duration || 0) }}ms</span>
              </div>
            </div>
          </div>
        </div>

        <!-- content -->
        <div v-if="selectedLog.type === 'API'">
           <ApiLogDetail :log="{
             requestSnapshot: selectedLog.requestSnapshot,
             response: selectedLog.responseData || selectedLog.response,
             status: selectedLog.status,
             duration: selectedLog.duration
           }" />
        </div>
        
        <div v-else class="flex gap-8 h-[600px] overflow-hidden">
           <!-- Steps Sidebar -->
           <div class="w-64 flex flex-col gap-4 shrink-0 border-r border-slate-100 pr-6">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Execution Steps</p>
              <div class="flex-1 overflow-y-auto space-y-2 pr-2">
                 <div 
                   v-for="(res, idx) in selectedLog.results" 
                   :key="idx" 
                   @click="selectedStepIdx = idx"
                   :class="['p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group', 
                            selectedStepIdx === idx ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-50 hover:bg-slate-50 opacity-60']"
                 >
                    <div class="flex items-center gap-3">
                       <span :class="['w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center transition-colors', selectedStepIdx === idx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400']">{{ idx + 1 }}</span>
                       <div class="flex flex-col min-w-0">
                          <span :class="['text-[11px] font-bold truncate w-32', selectedStepIdx === idx ? 'text-indigo-900' : 'text-slate-700']">{{ res.name }}</span>
                          <span class="text-[9px] text-slate-400 font-mono">{{ res.duration }}ms</span>
                       </div>
                    </div>
                    <CheckCircle2 v-if="res.status === 'SUCCESS'" :size="14" class="text-emerald-500" />
                    <XCircle v-else :size="14" class="text-red-500" />
                 </div>
              </div>
           </div>
           <!-- Step Detail -->
           <div class="flex-1 overflow-y-auto pr-2">
              <div v-if="selectedStepIdx !== null && selectedLog.results[selectedStepIdx]" class="space-y-6">
                 <div class="flex items-center justify-between px-1">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step Snapshot: {{ selectedLog.results[selectedStepIdx].name }}</p>
                 </div>
                 <ApiLogDetail :log="{
                   requestSnapshot: selectedLog.results[selectedStepIdx].requestSnapshot,
                   response: selectedLog.results[selectedStepIdx].response,
                   status: selectedLog.results[selectedStepIdx].status,
                   duration: selectedLog.results[selectedStepIdx].duration
                 }" />
              </div>
              <div v-else class="h-full flex flex-col items-center justify-center text-center opacity-20 grayscale grayscale-100">
                 <Terminal :size="48" class="mb-4" />
                 <p class="text-[10px] font-black uppercase tracking-widest">Select a step to explore logs</p>
              </div>
           </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
