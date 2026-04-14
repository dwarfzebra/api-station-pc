<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { ArrowLeft, Save, Play, Plus, Search } from 'lucide-vue-next'

// Styles for Vue Flow
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const route = useRoute()
const workflowId = route.params.id as string

const { data: workflow } = await useFetch(`/api/workflows/${workflowId}`)
const { data: groupsData } = await useFetch('/api/api-groups')
const groups = computed(() => groupsData.value?.groups || [])

// 选中的分组（用于过滤接口列表）
const selectedGroupIdForList = ref<number | null>(null)
const { data: apis, refresh: refreshApis } = await useFetch(() => 
  selectedGroupIdForList.value ? `/api/api-groups/${selectedGroupIdForList.value}/apis` : null
)

// 当 workflow 加载后，默认可以设一个分组
watch(groups, (val) => {
  if (val?.length && !selectedGroupIdForList.value) {
    selectedGroupIdForList.value = val[0].id
  }
})

const { onPaneReady, onConnect, addEdges, addNodes, toObject, setNodes, setEdges } = useVueFlow()

const nodes = ref<any[]>([])
const edges = ref<any[]>([])

// Load from DB
watch(workflow, (val) => {
  if (val) {
    const flowNodes = (val.nodes || []).map((n: any) => ({
      id: (n.uiConfig as any)?.vId || `node_${n.id}`,
      label: n.nodeName,
      type: 'default',
      position: (n.uiConfig as any)?.position || { x: 100, y: 100 },
      data: { apiId: n.apiId, path: n.apiDefinition?.path, mappingConfig: n.mappingConfig }
    }))
    
    const flowEdges = (val.edges || []).map((e: any) => {
      const sourceNode = val.nodes.find((n: any) => n.id === e.sourceNodeId)
      const targetNode = val.nodes.find((n: any) => n.id === e.targetNodeId)
      return {
        id: `e_${e.id}`,
        source: (sourceNode?.uiConfig as any)?.vId || `node_${e.sourceNodeId}`,
        target: (targetNode?.uiConfig as any)?.vId || `node_${e.targetNodeId}`
      }
    })

    setNodes(flowNodes)
    setEdges(flowEdges)
  }
}, { immediate: true })

onConnect((params) => {
  addEdges([params])
})

const isSaving = ref(false)
const saveWorkflow = async () => {
  isSaving.value = true
  const state = toObject()
  try {
    await $fetch(`/api/workflows/${workflowId}`, { 
      method: 'PUT', 
      body: state 
    })
    alert('保存成功')
  } catch (err) {
    console.error(err)
    alert('保存失败')
  } finally {
    isSaving.value = false
  }
}

const isRunning = ref(false)
const runWorkflow = async () => {
  await saveWorkflow()
  isRunning.value = true
  try {
    const res: any = await $fetch(`/api/workflows/${workflowId}/run`, {
      method: 'POST'
    })
    navigateTo(`/history/${res.historyId}`)
  } catch (err) {
    console.error(err)
    alert('运行失败')
  } finally {
    isRunning.value = false
  }
}

const addApiNode = (api: any) => {
  const id = `node_${Math.random().toString(36).slice(2, 7)}`
  addNodes([
    {
      id,
      label: api.name,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { apiId: api.id, path: api.path }
    }
  ])
}
</script>

<template>
  <div class="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden">
    <header class="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
      <div class="flex items-center gap-5">
        <NuxtLink to="/workflows" class="w-10 h-10 flex items-center justify-center text-slate-500 rounded-full hover:bg-slate-50 hover:text-slate-900 transition-all">
          <ArrowLeft :size="20" />
        </NuxtLink>
        <div class="flex flex-col">
          <h2 class="text-base font-bold leading-tight text-slate-900">{{ workflow?.name || '加载中...' }}</h2>
          <span class="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">Workflow Editor</span>
        </div>
      </div>

      <div class="flex gap-3">
        <button class="button" :disabled="isSaving" @click="saveWorkflow">
          <Save :size="18" />
          <span>{{ isSaving ? '保存中...' : '保存修改' }}</span>
        </button>
        <button class="button button-primary" :disabled="isRunning" @click="runWorkflow">
          <Play :size="18" />
          <span>{{ isRunning ? '运行中...' : '运行链路' }}</span>
        </button>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar/Drawer -->
      <aside class="w-80 border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div class="p-6 space-y-1">
          <h3 class="text-sm font-bold text-slate-900">可用接口</h3>
          <p class="text-xs text-slate-400 font-medium">点击接口向画布添加节点</p>
        </div>
        
        <div class="px-4 mb-4 space-y-3">
          <div class="space-y-1">
            <label class="text-[10px] font-black uppercase text-slate-400">选择接口分组</label>
            <select v-model="selectedGroupIdForList" class="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100">
              <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div class="relative">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text" 
              placeholder="搜索 API..." 
              class="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
          <div 
            v-for="api in apis" 
            :key="api.id" 
            class="p-3 bg-white border border-slate-200 rounded-lg flex gap-3 cursor-pointer hover:border-blue-400 hover:shadow-sm hover:-translate-y-0.5 transition-all group"
            @click="addApiNode(api)"
          >
            <span :class="[
              'text-[0.6rem] font-black h-fit px-1 py-0.5 rounded uppercase leading-none',
              api.method.toLowerCase() === 'get' ? 'bg-emerald-100 text-emerald-700' : 'bg-teal-100 text-teal-700'
            ]">{{ api.method }}</span>
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{{ api.name }}</span>
              <code class="text-[0.65rem] text-slate-400 font-mono truncate mt-0.5">{{ api.path }}</code>
            </div>
          </div>
        </div>
      </aside>

      <!-- Canvas -->
      <main class="flex-1 bg-slate-50 relative overflow-hidden">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          fit-view-on-init
          class="w-full h-full"
        >
          <Background pattern-color="#cbd5e1" :gap="20" :size="2" />
          <Controls />
        </VueFlow>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Keeping custom Vue Flow styles as they rely on library classes */
:deep(.vue-flow__node-default) {
  @apply !p-4 !rounded-xl !border-slate-200 !bg-white !shadow-sm !w-48 !text-sm !font-bold !text-slate-900 transition-all;
}

:deep(.vue-flow__node-default.selected) {
  @apply !border-blue-500 !ring-2 !ring-blue-500/10 !shadow-md;
}

:deep(.vue-flow__handle) {
  @apply !w-2.5 !h-2.5 !bg-slate-300 !border-2 !border-white !rounded-full hover:!bg-blue-500 transition-colors;
}

:deep(.vue-flow__connection-path) {
  @apply !stroke-blue-400 !stroke-2;
}
</style>
