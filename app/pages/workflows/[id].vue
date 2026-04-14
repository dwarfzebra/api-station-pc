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

// Global Execution
const runWorkflow = async () => {
  if (isRunning.value) return
  isRunning.value = true
  executingIdx.value = 0
  stepLogs.value = {}
  
  try {
    // 1. Initial Handshake
    const runInfo = await $fetch(`/api/workflows/${workflowId}/runs`, { method: 'POST' }) as any
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

       const processGroup = (group: any, target: any) => {
          Object.entries(group || {}).forEach(([key, cfg]: [string, any]) => {
             target[key] = cfg.isDynamic ? resolve(cfg.value) : cfg.value
          })
       }

       processGroup(mapping.query, runtimeValues.query)
       processGroup(mapping.body, runtimeValues.body)
       processGroup(mapping.headers, runtimeValues.headers)

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
    await $fetch(`/api/workflows/runs/${runInfo.id}`, {
       method: 'PUT',
       body: { status: 'SUCCESS' }
    })
    toast.success('Sequence Complete')
  } catch (err) {
    toast.error('Pipeline Interrupted')
  } finally {
    isRunning.value = false
    executingIdx.value = null
  }
}

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
  <div class="workflow-editor-wrapper relative h-screen bg-white">
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
        <aside class="w-64 border-r border-slate-100 bg-slate-50/20 flex flex-col shrink-0 px-4 py-6 gap-4">
          <p class="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Asset Library</p>
          <div class="relative">
             <div @click="isDropdownOpen = !isDropdownOpen" class="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-slate-300">
               <span class="text-[10px] font-black text-slate-700 truncate px-1">{{ selectedGroupId ? groups.find((g:any) => g.id === selectedGroupId)?.name : 'Domain Filter' }}</span>
               <ChevronDown :size="12" class="text-slate-400" />
             </div>
             <div v-if="isDropdownOpen" class="absolute top-full left-0 right-0 mt-1 p-2 bg-white border border-slate-200 shadow-2xl z-50 rounded-xl max-h-64 overflow-y-auto">
                <div v-for="g in groups" :key="g.id" @click="selectedGroupId = g.id; isDropdownOpen = false" class="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] font-bold text-slate-600">{{ g.name }}</div>
             </div>
          </div>
          <div class="relative">
            <Search :size="10" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input v-model="apiSearchQuery" placeholder="Filter APIs..." class="w-full h-8 pl-8 bg-white border border-slate-100 rounded-lg text-[10px] font-bold outline-none focus:ring-4 focus:ring-slate-100" />
          </div>
          <div class="flex-1 overflow-y-auto space-y-2">
             <div v-for="api in filteredApis" :key="api.id" @click="addStep(api)" class="p-3 bg-white border border-slate-100 hover:border-indigo-200 rounded-xl cursor-pointer transition-all active:scale-95 group">
               <div class="flex items-center gap-2 mb-1">
                  <span class="text-[7px] font-black px-1 rounded uppercase bg-slate-100 text-slate-500">{{ api.method }}</span>
                  <span class="text-[10px] font-bold text-slate-700 truncate">{{ api.name }}</span>
               </div>
               <code class="text-[8px] text-slate-300 font-mono truncate block">{{ api.path }}</code>
             </div>
          </div>
        </aside>

        <!-- CENTER: EXECUTION PATH -->
        <main class="w-80 border-r border-slate-100 bg-slate-50/50 flex flex-col shrink-0 py-6 px-4 gap-4 relative">
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
        <section class="flex-1 bg-white flex flex-col relative overflow-hidden">
          <div v-if="selectedStepIdx === null" class="h-full flex flex-col items-center justify-center p-12 text-center opacity-30 grayscale">
            <Activity :size="48" class="text-slate-200 mb-6" />
            <p class="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Standby for Command</p>
          </div>
          <template v-else>
             <div class="h-12 px-8 border-b border-slate-50 flex items-center gap-8 shrink-0 bg-white">
                <button @click="configTab = 'config'" :class="['text-[9px] font-black uppercase tracking-widest h-full border-b-2 transition-all', configTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400']">Configuration</button>
                <button v-if="stepLogs[steps[selectedStepIdx].id]" @click="configTab = 'log'" :class="['text-[9px] font-black uppercase tracking-widest h-full border-b-2 transition-all', configTab === 'log' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400']">Logs</button>
             </div>

             <div class="flex-1 overflow-y-auto p-8">
                <!-- CONFIG VIEW -->
                <div v-if="configTab === 'config'" class="animate-fade-in relative">
                   <div class="mb-10 flex items-end justify-between">
                      <div>
                         <h2 class="text-2xl font-black text-slate-900 mb-2 leading-none uppercase">{{ apiDetails?.name }}</h2>
                         <code class="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded font-mono font-bold">{{ apiDetails?.method }} {{ apiDetails?.path }}</code>
                      </div>
                      <button @click="onlyRequired = !onlyRequired" 
                              :class="['px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border', 
                                       onlyRequired ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-400']">
                        Required Only
                      </button>
                   </div>

                   <div v-for="kind in ['query', 'body', 'headers']" :key="kind" class="mb-10">
                      <div v-if="apiDetails?.['req' + kind.charAt(0).toUpperCase() + kind.slice(1)]?.length" class="space-y-4">
                         <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ kind }} Parameters</p>
                         <div v-for="p in apiDetails['req' + kind.charAt(0).toUpperCase() + kind.slice(1)].filter((x: any) => !onlyRequired || x.required)" :key="p.name" class="flex items-center gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                            <div class="w-48 shrink-0">
                               <div class="flex items-center gap-1.5 mb-0.5">
                                  <span class="text-[11px] font-black text-slate-900 truncate">{{ p.name }}</span>
                                  <span v-if="p.required" class="text-red-500 font-black text-xs">*</span>
                               </div>
                               <span class="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">{{ p.type }}</span>
                               <p v-if="p.description" class="text-[10px] text-slate-600 mt-1 leading-tight font-medium">{{ p.description }}</p>
                            </div>
                            <div class="flex-1 flex items-center gap-2">
                               <input :value="getParamConfig(kind, p.name).value" 
                                      @input="(e: any) => updateParamValue(kind, p.name, e.target.value, getParamConfig(kind, p.name).isDynamic)"
                                      class="flex-1 h-10 px-4 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:ring-4 focus:ring-indigo-100 transition-all font-mono" />
                               <button @click="updateParamValue(kind, p.name, '', !getParamConfig(kind, p.name).isDynamic)"
                                       :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm', getParamConfig(kind, p.name).isDynamic ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300 hover:text-indigo-600 border border-slate-200']">
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

                <!-- LOG VIEW -->
                <div v-else-if="stepLogs[steps[selectedStepIdx].id]" class="animate-fade-in grid grid-cols-2 gap-8">
                   <div class="space-y-4">
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Request Snapshot</p>
                      <div class="p-6 bg-slate-50 rounded-3xl space-y-3">
                         <div class="flex justify-between border-b border-slate-100 pb-2"><span class="text-[10px] font-semibold text-slate-400">Target</span><span class="text-[10px] font-bold text-slate-900">{{ stepLogs[steps[selectedStepIdx].id].method }} {{ stepLogs[steps[selectedStepIdx].id].url }}</span></div>
                         <div class="flex justify-between"><span class="text-[10px] font-semibold text-slate-400">Duration</span><span class="text-[10px] font-bold text-slate-900">{{ stepLogs[steps[selectedStepIdx].id].duration }}ms</span></div>
                      </div>
                   </div>
                   <div class="space-y-4">
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Response Body</p>
                      <pre class="p-6 bg-slate-900 text-emerald-400 text-[11px] rounded-3xl overflow-auto max-h-[400px] leading-relaxed font-mono shadow-2xl">{{ JSON.stringify(stepLogs[steps[selectedStepIdx].id].resBody, null, 2) }}</pre>
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
