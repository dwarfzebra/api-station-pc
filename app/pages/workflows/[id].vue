<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ArrowLeft, Plus, X, ChevronRight, ChevronDown, Terminal, Database, Check, Trash2, Link2, Inbox, GripVertical, FileText, Variable, Layers, Search, MousePointer2, Loader2, Play, History, Activity } from 'lucide-vue-next'
import { useToast } from '~/composables/useToast'

const toast = useToast()
const route = useRoute()
// Nuxt 4 route params
const workflowId = route.params.id as string

// Data Fetching: Using lazy fetch to optimize navigation
const { data: workflow, pending: wfPending, refresh: refreshWf } = useFetch(`/api/workflows/${workflowId}`, { lazy: true })
const { data: groupsData } = useFetch('/api/api-groups', { lazy: true })
const groups = computed(() => groupsData.value?.groups || [])

// UI States
const selectedGroupId = ref<number | null>(null)
const isDropdownOpen = ref(false)
const apiSearchQuery = ref('')
const selectedStepIdx = ref<number | null>(null)
const configTab = ref('config') // config | log
const onlyRequired = ref(false)

// Sequencer Engine State
const steps = ref<any[]>([])
const isRunning = ref(false)
const executingIdx = ref<number | null>(null)
const stepLogs = ref<Record<string, any>>({})
const workflowHistories = ref<any[]>([])
const selectedHistoryId = ref<string | null>(null)
const selectedHistoryStepId = ref<string | null>(null)

// Asset Filtering
const { data: apis } = useFetch(() => 
  selectedGroupId.value ? `/api/api-groups/${selectedGroupId.value}/apis` : null
, { refreshDeps: [selectedGroupId] })

const filteredApis = computed(() => {
  const list = (apis.value as any)
  if (!Array.isArray(list)) return []
  return list.filter((a: any) => 
    !apiSearchQuery.value || 
    a.name.toLowerCase().includes(apiSearchQuery.value.toLowerCase()) || 
    a.path.toLowerCase().includes(apiSearchQuery.value.toLowerCase())
  )
})

// Current Focused API
const apiDetails = computed(() => {
  if (selectedStepIdx.value === null) return null
  return steps.value[selectedStepIdx.value]?.apiDefinition
})

// Picker Popover State
const pickerActive = ref<{ type: string, name: string } | null>(null)
const pickerStage = ref<'node' | 'field'>('node')
const pickerSelectedNode = ref<any>(null)

// Param Management
const getParamConfig = (type: string, name: string) => {
  if (selectedStepIdx.value === null) return { value: '', isDynamic: false }
  const config = steps.value[selectedStepIdx.value].mappingConfig[type] || {}
  return config[name] || { value: '', isDynamic: false }
}

const updateParamValue = (type: string, name: string, value: any, isDynamic: boolean) => {
  if (selectedStepIdx.value === null) return
  const step = steps.value[selectedStepIdx.value]
  if (!step.mappingConfig[type]) step.mappingConfig[type] = {}
  step.mappingConfig[type][name] = { value, isDynamic }
  if (isDynamic && !pickerActive.value) {
     pickerActive.value = { type, name }
     pickerStage.value = 'node'
  }
}

// 参数类型修正：将字符串值按声明类型转换为正确的 JS 类型
// 核心场景：array 类型参数不能以空字符串或字符串形式发给后端
const coerceParamValue = (val: any, type?: string): any => {
  if (type?.toLowerCase() === 'array') {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      if (val.trim() === '' || val.trim() === '[]') return []
      try { return JSON.parse(val) } catch { return [] }
    }
    return []
  }
  return val
}

// Global Execution
const runWorkflow = async () => {

  if (isRunning.value) return
  isRunning.value = true
  executingIdx.value = 0
  stepLogs.value = {}
  
  try {
    // 1. Initial Handshake (Client-side Only)
    const runInfo = { id: `local_run_${Date.now()}` }
    const contextStore: Record<string, any> = {}

    // 2. Linear Execution Loop
    for (let i = 0; i < steps.value.length; i++) {
       executingIdx.value = i
       const step = steps.value[i]
       step.status = 'running'

       // Resolution Logic
       const resolve = (val: any): any => {
          if (typeof val === 'string') {
             return val.replace(/\{\{(.+?)\}\}/g, (_, path) => {
                const [targetNodeId, ...fieldParts] = path.split('.')
                const sourceData = contextStore[targetNodeId]
                return fieldParts.reduce((o: any, key: string) => (o ? o[key] : undefined), sourceData) || ''
             })
          }
          return val
       }

       const mapping = step.mappingConfig || {}
       const runtimeValues = { query: {}, body: {}, headers: {} } as any

       const processGroup = (kind: string, target: any) => {
          const apiMeta = step.apiDefinition?.['req' + kind.charAt(0).toUpperCase() + kind.slice(1)] || []
          const mappingGroup = mapping[kind] || {}
          
          // Apply defaults first
          apiMeta.forEach((p: any) => {
             if (p.defaultValue !== undefined && p.defaultValue !== '') {
               target[p.name] = coerceParamValue(p.defaultValue, p.type)
             }
          })
          
          // Override with user config
          Object.entries(mappingGroup).forEach(([key, cfg]: [string, any]) => {
             const val = cfg.isDynamic ? resolve(cfg.value) : cfg.value
             if (val !== undefined && val !== '') {
               // 找到该参数的类型定义
               const paramMeta = apiMeta.find((p: any) => p.name === key)
               target[key] = coerceParamValue(val, paramMeta?.type)
             }
          })
       }


       processGroup('query', runtimeValues.query)
       processGroup('body', runtimeValues.body)
       processGroup('headers', runtimeValues.headers)

       // 3. 读取本地持久化存储的全局配置 (Shared Headers)
       const savedSettings = JSON.parse(localStorage.getItem('api_station_global_settings') || '{"list":[]}')
       const globalHeaders: Record<string, string> = {}
       if (Array.isArray(savedSettings.list)) {
          savedSettings.list.forEach((item: { key: string, value: string }) => {
             if (item.key) globalHeaders[item.key] = item.value
          })
       }

       // Physical Call
       const res = await $fetch('/api/apis/run-and-log', {
          method: 'POST',
          body: {
             apiId: step.apiId,
             workflowRunId: runInfo.id,
             query: runtimeValues.query,
             body: runtimeValues.body,
             headers: {
                ...globalHeaders, // 本地存储的公共请求头
                ...runtimeValues.headers // 链路编排的覆盖 Header
             },
             env: 'TEST'
          }
       }) as any
       
       contextStore[step.id] = res.log.resBody
       stepLogs.value[step.id] = res.log
       step.status = (res.log.resStatus && res.log.resStatus < 400) ? 'success' : 'error'
    }

    // 3. Status Finalizer
    const finalStatus = (steps.value.every(s => s.status === 'success')) ? 'SUCCESS' : 'FAILED'
    
    // 4. Save to Local Storage
    saveWorkflowLog(finalStatus)
    
    toast.success('Sequence Complete')
  } catch (err) {
    saveWorkflowLog('FAILED')
    toast.error('Pipeline Interrupted')
  } finally {
    isRunning.value = false
    executingIdx.value = null
  }
}

const saveWorkflowLog = (status: string) => {
  const STORAGE_KEY = 'api_station_run_logs'
  const saved = localStorage.getItem(STORAGE_KEY)
  let logs = saved ? JSON.parse(saved) : []
  
  const logEntry = {
    id: `wf_run_${Date.now()}`,
    type: 'WORKFLOW',
    workflowId: workflowId,
    workflowName: workflow.value?.name || 'Untitled Workflow',
    status: status,
    createdAt: new Date().toISOString(),
    results: steps.value.map(s => {
       const stepLog = stepLogs.value[s.id]
       return {
          name: s.apiDefinition?.name || s.name,
          status: s.status === 'success' ? 'SUCCESS' : 'FAIL',
          duration: stepLog?.duration || 0,
          requestSnapshot: {
             method: stepLog?.method,
             url: stepLog?.url,
             headers: stepLog?.reqHeaders,
             body: stepLog?.reqBody
          },
          response: stepLog?.resBody
       }
    })
  }
  
  logs.unshift(logEntry)
  logs = logs.slice(0, 50)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  loadLocalHistories()
}

const loadLocalHistories = () => {
  const saved = localStorage.getItem('api_station_run_logs')
  if (saved) {
    const allLogs = JSON.parse(saved)
    workflowHistories.value = allLogs.filter((l: any) => l.type === 'WORKFLOW' && l.workflowId === workflowId)
  }
}

onMounted(() => {
  loadLocalHistories()
})

const saveWorkflow = async () => {
  const payload = steps.value.map(s => ({
    id: s.id,
    apiId: s.apiId,
    mappingConfig: s.mappingConfig
  }))
  await $fetch(`/api/workflows/${workflowId}`, { method: 'PUT', body: { steps: payload } })
  toast.success('Sync Successful')
}

// Reactive Sync
watch(workflow, (val) => {
  if (val?.steps) {
    steps.value = (val.steps as any[]).map(s => ({
      ...s,
      status: 'idle'
    }))
  }
}, { immediate: true })

// List Operations
const addStep = (api: any) => {
  steps.value.push({
    id: `step_${Math.random().toString(36).slice(2, 7)}`,
    apiId: api.id,
    name: api.name,
    apiDefinition: api,
    status: 'idle',
    mappingConfig: { query: {}, body: {}, headers: {} }
  })
}

const removeStep = (idx: number) => {
  steps.value.splice(idx, 1)
  if (selectedStepIdx.value === idx) selectedStepIdx.value = null
}

const selectUpstreamNode = (step: any) => {
  pickerSelectedNode.value = step
  pickerStage.value = 'field'
}

// Recursive Flatten for Picker
const flattenedFields = computed(() => {
  if (!pickerSelectedNode.value?.apiDefinition?.resBody) return ['id', 'msg', 'code', 'data']
  const fields: string[] = []
  const traverse = (obj: any, prefix = '') => {
    if (Array.isArray(obj)) {
      obj.forEach(item => {
        const path = prefix ? `${prefix}.${item.name}` : item.name
        fields.push(path)
        if (item.children?.length) traverse(item.children, path)
      })
    }
  }
  traverse(pickerSelectedNode.value.apiDefinition.resBody)
  return fields.length > 0 ? fields : ['id', 'msg', 'data']
})

const selectField = (f: string) => {
  if (!pickerActive.value || !pickerSelectedNode.value) return
  const { type, name } = pickerActive.value
  const exp = `{{${pickerSelectedNode.value.id}.${f}}}`
  updateParamValue(type, name, exp, true)
  pickerActive.value = null
}
</script>

<template>
  <div class="workflow-editor-wrapper relative h-screen bg-slate-50">
    <!-- FULL LOADING OVERLAY -->
    <Transition name="fade">
      <div v-if="wfPending" class="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center gap-6">
        <div class="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
        <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Intelligence...</p>
      </div>
    </Transition>

    <div class="h-full flex flex-col overflow-hidden font-sans">
      <!-- HEADER -->
      <header class="h-14 border-b border-slate-100 bg-white flex items-center justify-between px-6 shrink-0 z-20">
        <div class="flex items-center gap-4">
          <button @click="$router.push('/workflows')" class="text-slate-400 hover:text-slate-900 transition-colors"><ArrowLeft :size="18" /></button>
          <div class="flex flex-col">
            <span class="text-[11px] font-black text-slate-900 uppercase tracking-tighter">{{ workflow?.name || 'Untitled Workflow' }}</span>
            <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Linear Logic Engine</span>
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="saveWorkflow" class="h-8 px-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">Save</button>
          <button @click="runWorkflow" :disabled="isRunning" class="h-8 px-5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2">
            <Play v-if="!isRunning" :size="10" />
            <Loader2 v-else :size="10" class="animate-spin" />
            {{ isRunning ? 'Dispatching' : 'Dispatch' }}
          </button>
        </div>
      </header>

      <div class="flex-1 flex overflow-hidden">
        <!-- LEFT: ASSETS -->
        <aside class="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 px-4 py-6 gap-6">
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] px-1">Asset Library</p>
          <div class="space-y-4">
            <div class="relative">
               <div @click="isDropdownOpen = !isDropdownOpen" class="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-slate-300 transition-all">
                 <span class="text-[10px] font-black text-slate-700 truncate px-1">{{ selectedGroupId ? groups.find((g:any) => g.id === selectedGroupId)?.name : 'Domain Filter' }}</span>
                 <ChevronDown :size="12" class="text-slate-400" />
               </div>
               <div v-if="isDropdownOpen" class="absolute top-full left-0 right-0 mt-1 p-2 bg-white border border-slate-200 shadow-2xl z-50 rounded-xl max-h-64 overflow-y-auto">
                  <div v-for="g in groups" :key="g.id" @click="selectedGroupId = g.id; isDropdownOpen = false" class="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600">{{ g.name }}</div>
               </div>
            </div>
            <div class="relative">
              <Search :size="12" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input v-model="apiSearchQuery" placeholder="Filter APIs..." class="w-full h-10 pl-9 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" />
            </div>
          </div>
          <div class="flex-1 overflow-y-auto space-y-3 pb-4">
             <div v-for="api in filteredApis" :key="api.id" @click="addStep(api)" class="p-4 bg-white border border-slate-100 hover:border-indigo-300 hover:shadow-md rounded-2xl cursor-pointer transition-all active:scale-[0.98] group">
               <div class="flex items-center gap-2 mb-2">
                  <span class="text-[8px] font-black px-1.5 py-0.5 rounded uppercase bg-slate-100 text-slate-600 border border-slate-200">{{ api.method }}</span>
                  <span class="text-[11px] font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{{ api.name }}</span>
               </div>
               <code class="text-[9px] text-slate-500 font-mono truncate block bg-slate-50 px-2 py-1 rounded border border-slate-100">{{ api.path }}</code>
             </div>
          </div>
        </aside>

        <!-- CENTER: EXECUTION PATH -->
        <main class="w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 py-6 px-4 gap-4 relative">
          <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-2">Path Sequencer</p>
          <div class="flex-1 overflow-y-auto space-y-3 relative px-2 py-2">
            <!-- Timeline rail -->
            <div class="absolute left-6 top-6 bottom-6 w-[1px] bg-slate-200 z-0"></div>

            <div v-for="(step, idx) in steps" :key="step.id" @click="selectedStepIdx = idx"
                 :class="['group relative flex items-center p-3 bg-white border rounded-2xl cursor-pointer transition-all z-10', 
                          selectedStepIdx === idx ? 'border-indigo-600 shadow-xl ring-4 ring-indigo-50' : 'border-slate-100 hover:border-slate-300']">
               
               <div :class="['w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-4 transition-colors', 
                            step.status === 'idle' ? 'bg-white border-slate-50 text-slate-400' : 
                            step.status === 'running' ? 'bg-white border-indigo-100 text-indigo-600 animate-pulse' :
                            step.status === 'success' ? 'bg-emerald-500 border-emerald-50 text-white' : 'bg-red-500 border-red-50 text-white']">
                  <Loader2 v-if="step.status === 'running'" :size="12" class="animate-spin" />
                  <Check v-else-if="step.status === 'success'" :size="12" />
                  <X v-else-if="step.status === 'error'" :size="12" />
                  <span v-else class="text-[10px] font-black">{{ idx + 1 }}</span>
               </div>

               <div class="ml-4 flex-1 min-w-0">
                  <h3 class="text-[10px] font-black text-slate-800 truncate">{{ step.apiDefinition?.name || 'Step' }}</h3>
                  <code class="text-[7px] text-slate-400 uppercase font-mono">{{ step.apiDefinition?.method }}</code>
               </div>

               <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                  <button @click.stop="removeStep(idx)" class="p-1.5 text-slate-300 hover:text-red-500"><Trash2 :size="12" /></button>
               </div>
            </div>
          </div>
        </main>

        <!-- RIGHT: COMMAND CENTER -->
        <section class="flex-1 bg-slate-100/30 flex flex-col relative overflow-hidden">
          <div v-if="selectedStepIdx === null" class="h-full flex flex-col items-center justify-center p-12 text-center opacity-30 grayscale">
            <Activity :size="48" class="text-slate-200 mb-6" />
            <p class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Standby for Command</p>
          </div>
          <template v-else>
             <div class="h-14 px-8 border-b border-slate-200 flex items-center gap-8 shrink-0 bg-white">
                <button @click="configTab = 'config'" :class="['text-[10px] font-black uppercase tracking-widest h-full border-b-2 transition-all', configTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600']">Configuration</button>
                <button v-if="stepLogs[steps[selectedStepIdx].id] || Object.keys(stepLogs).length > 0" @click="configTab = 'log'" :class="['text-[10px] font-black uppercase tracking-widest h-full border-b-2 transition-all', configTab === 'log' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600']">Execution</button>
                <button @click="configTab = 'history'" :class="['text-[10px] font-black uppercase tracking-widest h-full border-b-2 transition-all', configTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600']">History</button>
             </div>

             <div class="flex-1 overflow-y-auto p-8">
                <!-- CONFIG VIEW -->
                <div v-if="configTab === 'config'" class="animate-fade-in relative">
                   <div class="mb-10 flex items-end justify-between">
                      <div>
                         <h2 class="text-2xl font-black text-slate-900 mb-2 leading-none uppercase">{{ apiDetails?.name }}</h2>
                         <code class="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded font-mono font-bold break-all leading-relaxed">{{ apiDetails?.method }} {{ apiDetails?.path }}</code>
                      </div>
                      <button @click="onlyRequired = !onlyRequired" 
                              :class="['px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border', 
                                       onlyRequired ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400']">
                        Required Only
                      </button>
                   </div>

                   <div v-for="kind in ['query', 'body', 'headers']" :key="kind" class="mb-10">
                      <div v-if="apiDetails?.['req' + kind.charAt(0).toUpperCase() + kind.slice(1)]?.length" class="space-y-3">
                          <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ kind }} Parameters</p>
                          <div
                            v-for="p in apiDetails['req' + kind.charAt(0).toUpperCase() + kind.slice(1)].filter((x: any) => !onlyRequired || x.required)"
                            :key="p.name"
                            class="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3"
                          >
                            <!-- Meta row: name + type badge + required + description -->
                            <div class="flex items-start gap-2 flex-wrap">
                              <span class="text-[11px] font-black text-slate-900">{{ p.name }}</span>
                              <span v-if="p.required" class="text-red-500 font-black text-xs">*</span>
                              <span class="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{{ p.type || 'String' }}</span>
                              <span v-if="p.description" class="w-full text-[10px] text-slate-400 italic leading-tight font-medium">{{ p.description }}</span>
                            </div>
                            <!-- Input + Variable toggle -->
                            <div class="flex items-center gap-2">
                               <input
                                 :value="getParamConfig(kind, p.name).value || p.defaultValue || ''"
                                 @input="(e: any) => updateParamValue(kind, p.name, e.target.value, getParamConfig(kind, p.name).isDynamic)"
                                 :class="[
                                   'flex-1 h-10 px-4 border rounded-xl text-[10px] font-bold outline-none transition-all font-mono',
                                   getParamConfig(kind, p.name).isDynamic
                                     ? 'bg-indigo-950 border-indigo-700 text-indigo-300 focus:ring-4 focus:ring-indigo-900'
                                     : 'bg-white border-slate-200 text-slate-800 focus:ring-4 focus:ring-indigo-100'
                                 ]"
                               />
                               <button
                                 @click="updateParamValue(kind, p.name, '', !getParamConfig(kind, p.name).isDynamic)"
                                 :title="getParamConfig(kind, p.name).isDynamic ? '切换为静态值' : '绑定上游数据'"
                                 :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm shrink-0', getParamConfig(kind, p.name).isDynamic ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300 hover:text-indigo-600 border border-slate-200']"
                               >
                                  <Variable :size="14" />
                               </button>
                            </div>
                            <!-- Picker -->
                            <div v-if="pickerActive?.name === p.name && pickerActive?.type === kind"
                                 class="fixed w-72 bg-white border border-slate-200 shadow-2xl z-[100] rounded-2xl overflow-hidden mt-12 animate-in">
                               <div class="p-3 bg-slate-900 text-white flex justify-between items-center">
                                  <span class="text-[9px] font-black uppercase tracking-widest">Connect Source</span>
                                  <button @click="pickerActive = null"><X :size="12" /></button>
                               </div>
                               <div v-if="pickerStage === 'node'" class="p-2 space-y-1 max-h-48 overflow-y-auto">
                                  <div v-for="(us, idx) in steps.slice(0, selectedStepIdx!)" :key="us.id" @click="selectUpstreamNode(us)" class="p-3 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between group">
                                     <span class="text-[10px] font-black text-slate-700">Step {{ idx+1 }}: {{ us.name }}</span>
                                     <ChevronRight :size="12" class="text-slate-300" />
                                  </div>
                               </div>
                               <div v-else class="p-2 space-y-1 max-h-48 overflow-y-auto">
                                  <div @click="pickerStage = 'node'" class="p-2 text-indigo-500 text-[10px] font-black mb-1 cursor-pointer">← Back to steps</div>
                                  <div v-for="f in flattenedFields" :key="f" @click="selectField(f)" class="p-3 hover:bg-emerald-50 rounded-xl cursor-pointer text-[10px] font-mono text-slate-600 flex justify-between items-center">
                                     <span>{{ f }}</span>
                                     <Plus :size="10" />
                                  </div>
                               </div>
                            </div>
                          </div>
                       </div>
                   </div>
                </div>

                 <!-- LOG VIEW (CURRENT RUN) -->
                 <div v-else-if="configTab === 'log'" class="animate-fade-in flex gap-8 h-full overflow-hidden">
                    <div class="w-64 flex flex-col gap-4 shrink-0 border-r border-slate-100 pr-6">
                       <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Path</p>
                       <div class="flex-1 overflow-y-auto space-y-2">
                          <div v-for="(s, sIdx) in steps" :key="s.id" @click="selectedStepIdx = sIdx"
                               :class="['p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center', 
                                        selectedStepIdx === sIdx ? 'bg-white border-indigo-200 shadow-sm ring-4 ring-indigo-50' : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-100']">
                             <div class="flex items-center gap-3">
                                <span class="text-[10px] font-black text-slate-400 w-4">{{ sIdx + 1 }}</span>
                                <span class="text-[10px] font-bold text-slate-700 truncate w-32">{{ s.name }}</span>
                             </div>
                             <Check v-if="s.status === 'success'" :size="12" class="text-emerald-500" />
                             <X v-else-if="s.status === 'error'" :size="12" class="text-red-500" />
                          </div>
                       </div>
                    </div>
                    <div class="flex-1 flex flex-col gap-4 overflow-hidden pr-2">
                       <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step Snapshot: {{ steps[selectedStepIdx!]?.name }}</p>
                       <div v-if="selectedStepIdx !== null && stepLogs[steps[selectedStepIdx].id]" class="flex-1 overflow-y-auto pt-2">
                          <ApiLogDetail :log="{
                            requestSnapshot: {
                              method: stepLogs[steps[selectedStepIdx].id].method,
                              url: stepLogs[steps[selectedStepIdx].id].url,
                              headers: stepLogs[steps[selectedStepIdx].id].reqHeaders,
                              body: stepLogs[steps[selectedStepIdx].id].reqBody
                            },
                            response: stepLogs[steps[selectedStepIdx].id].resBody,
                            status: (stepLogs[steps[selectedStepIdx].id].resStatus < 400) ? 'SUCCESS' : 'FAIL',
                            duration: stepLogs[steps[selectedStepIdx].id].duration
                          }" />
                       </div>
                    </div>
                 </div>

                 <!-- HISTORY VIEW (PERSISTED LOGS) -->
                 <div v-else-if="configTab === 'history'" class="animate-fade-in flex h-full gap-8 overflow-hidden">
                    <div class="w-64 flex flex-col gap-4 shrink-0 border-r border-slate-100 pr-6">
                       <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local History</p>
                       <div class="flex-1 overflow-y-auto space-y-2 pr-1">
                          <div v-if="workflowHistories.length === 0" class="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl opacity-40 italic text-[10px] font-bold">
                             No local logs yet.
                          </div>
                          <div v-for="h in workflowHistories" :key="h.id" @click="selectedHistoryId = h.id; selectedHistoryStepId = '0'"
                               :class="['p-4 rounded-2xl border transition-all cursor-pointer space-y-2', 
                                        selectedHistoryId === h.id ? 'bg-white border-indigo-300 shadow-md ring-4 ring-indigo-50' : 'bg-slate-50/50 border-slate-100 hover:bg-white']">
                             <div class="flex justify-between items-center">
                                <span :class="['text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter', h.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">{{ h.status }}</span>
                                <span class="text-[9px] font-black text-slate-400 font-mono">{{ new Date(h.createdAt).toLocaleTimeString() }}</span>
                             </div>
                             <p class="text-[10px] font-bold text-slate-700 truncate leading-tight">{{ new Date(h.createdAt).toLocaleDateString() }} Run</p>
                          </div>
                       </div>
                    </div>

                    <div class="w-48 flex flex-col gap-4 shrink-0 border-r border-slate-100 pr-6" v-if="selectedHistoryId">
                       <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Steps</p>
                       <div class="flex-1 overflow-y-auto space-y-1.5 pr-1">
                          <div v-for="(s, sIdx) in workflowHistories.find(h => h.id === selectedHistoryId)?.results" :key="sIdx" @click="selectedHistoryStepId = sIdx.toString()"
                               :class="['p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center', 
                                        selectedHistoryStepId === sIdx.toString() ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-50']">
                             <div class="flex items-center gap-2">
                                <span class="text-[10px] font-bold opacity-40">{{ sIdx + 1 }}</span>
                                <span class="text-[10px] font-bold truncate w-24">{{ s.name }}</span>
                             </div>
                             <Check v-if="s.status === 'SUCCESS'" :size="10" class="text-emerald-500" />
                             <X v-else :size="10" class="text-red-500" />
                          </div>
                       </div>
                    </div>

                    <div class="flex-1 flex flex-col gap-4 overflow-hidden pr-2" v-if="selectedHistoryId && selectedHistoryStepId !== null">
                       <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Snapshot</p>
                       <div class="flex-1 overflow-y-auto pt-2">
                          <ApiLogDetail :log="workflowHistories.find(h => h.id === selectedHistoryId)?.results[parseInt(selectedHistoryStepId)]" />
                       </div>
                    </div>
                 </div>
             </div>
          </template>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
