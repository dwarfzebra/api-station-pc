<script setup lang="ts">
import { 
  ArrowLeft, Plus, Terminal, Search, MoreVertical, 
  Layers, Settings, Edit2, Trash2, Globe, CheckSquare, Square, X, Info, Play
} from 'lucide-vue-next'

const route = useRoute()
const groupId = route.params.id as string
const currentEnv = useState('currentEnv')
const toast = useToast()

const { data: groups, refresh: refreshGroups } = await useFetch('/api/api-groups')
const { data: apis, refresh: refreshApis } = await useFetch(`/api/api-groups/${groupId}/apis`)

const currentGroup = computed(() => 
  groups.value?.groups?.find(g => g.id === parseInt(groupId))
)

const currentDomain = computed(() => 
  currentEnv.value === 'TEST' ? currentGroup.value?.testUrl : currentGroup.value?.prodUrl
)

// Search & Filter Logic
const searchQuery = ref('')
const filteredApis = computed(() => {
  if (!searchQuery.value) return apis.value
  const q = searchQuery.value.toLowerCase()
  return apis.value.filter((api: any) => 
    api.name.toLowerCase().includes(q) || api.path.toLowerCase().includes(q)
  )
})

const getIndentLevel = (name: string) => {
  return (name.match(/\./g) || []).length
}

// Selection & Manage Mode Logic
const isManageMode = ref(false)
const selectedApiIds = ref<number[]>([])

const toggleManageMode = () => {
  isManageMode.value = !isManageMode.value
  if (!isManageMode.value) {
    selectedApiIds.value = [] // 退出管理模式时清除勾选
  }
}

const isAllSelected = computed(() => apis.value?.length > 0 && selectedApiIds.value.length === apis.value?.length)

const toggleSelectAll = () => {
  if (isAllSelected.value) selectedApiIds.value = []
  else selectedApiIds.value = apis.value?.map((api: any) => api.id) || []
}

const toggleApiSelection = (id: number) => {
  if (selectedApiIds.value.includes(id)) selectedApiIds.value = selectedApiIds.value.filter(i => i !== id)
  else selectedApiIds.value.push(id)
}

// Batch Delete Logic
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

const batchDeleteApis = async () => {
  if (!selectedApiIds.value.length) return
  isDeleting.value = true
  try {
    await $fetch('/api/apis/batch', {
      method: 'DELETE',
      body: { ids: selectedApiIds.value }
    })
    await refreshApis()
    selectedApiIds.value = []
    showDeleteConfirm.value = false
    toast.success('选中的接口已删除')
  } catch (err) {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

// Global API Detail Modal Logic
const showDetailModal = ref(false)
const activeTab = ref('params') // params, headers, body, response
const editingApi = ref<any>(null)
const isSavingApi = ref(false)

const openApiDetail = (api: any) => {
  // 深拷贝，防止直接修改原始数据
  editingApi.value = JSON.parse(JSON.stringify(api))
  if (!editingApi.value.reqQuery) editingApi.value.reqQuery = []
  if (!editingApi.value.reqHeaders) editingApi.value.reqHeaders = []
  if (!editingApi.value.reqBody) editingApi.value.reqBody = []
  if (!editingApi.value.resBody) editingApi.value.resBody = []
  
  // 如果是 GET 请求且当前在 Body 标签，强制切回 Params
  if (editingApi.value.method.toUpperCase() === 'GET' && activeTab.value === 'body') {
    activeTab.value = 'params'
  }
  
  showDetailModal.value = true
}

const saveApiChanges = async () => {
  isSavingApi.value = true
  try {
    await $fetch(`/api/apis/${editingApi.value.id}`, {
      method: 'PUT',
      body: editingApi.value
    })
    await refreshApis()
    showDetailModal.value = false
    toast.success('接口定义已保存')
  } catch (err) {
    toast.error('保存失败')
  } finally {
    isSavingApi.value = false
  }
}

const addRow = (list: any[]) => {
  list.push({ name: '', type: 'String', required: true, defaultValue: '', description: '' })
}

const removeRow = (list: any[], index: number) => {
  list.splice(index, 1)
}

// Import logic...
const showImportModal = ref(false)
const importContent = ref('')
const isImporting = ref(false)

const importApi = async () => {
  if (!importContent.value) return
  isImporting.value = true
  try {
    await $fetch(`/api/api-groups/${groupId}/import`, {
      method: 'POST',
      body: { content: importContent.value }
    })
    await refreshApis()
    showImportModal.value = false
    importContent.value = ''
    toast.success('接口导入成功')
  } catch (err) {
    toast.error('导入失败')
  } finally { isImporting.value = false }
}

// Edit Group Logic
const showEditModal = ref(false)
const isUpdating = ref(false)
const editForm = reactive({ name: '', description: '', testUrl: '', prodUrl: '' })

const openEditModal = () => {
  if (!currentGroup.value) return
  editForm.name = currentGroup.value.name
  editForm.description = currentGroup.value.description || ''
  editForm.testUrl = currentGroup.value.testUrl || ''
  editForm.prodUrl = currentGroup.value.prodUrl || ''
  showEditModal.value = true
}

const updateGroup = async () => {
  isUpdating.value = true
  try {
    await $fetch(`/api/api-groups/${groupId}`, {
      method: 'PUT',
      body: { ...editForm }
    })
    await refreshGroups()
    showEditModal.value = false
    toast.success('配置已更新')
  } catch (err) { toast.error('更新失败') }
  finally { isUpdating.value = false }
}

// Run API Debug Logic
const showRunModal = ref(false)
const isRunningApi = ref(false)
const showOnlyRequired = ref(false) // 默认关闭，展示全量参数
const runningApiData = ref<any>(null)
const runResult = ref<any>(null)
const rightTab = ref('current') // current, history
const debugForm = reactive({
  query: {} as any,
  headers: {} as any,
  body: {} as any
})

const openRunModal = (api: any) => {
  runningApiData.value = api
  runResult.value = null
  rightTab.value = 'current'
  debugForm.query = {}
  debugForm.headers = {}
  debugForm.body = {}
  api.reqQuery?.forEach((p: any) => { debugForm.query[p.name] = p.defaultValue || '' })
  api.reqHeaders?.forEach((p: any) => { debugForm.headers[p.name] = p.defaultValue || '' })
  api.reqBody?.forEach((p: any) => { debugForm.body[p.name] = p.defaultValue || '' })
  
  loadLocalLogs() // 加载本地日志
  showRunModal.value = true
}

const getLocalSettings = () => {
  const saved = localStorage.getItem('api_station_global_settings')
  if (!saved) return {}
  try {
    const data = JSON.parse(saved)
    return (data.list || []).reduce((acc: any, curr: any) => {
      if (curr.key) acc[curr.key] = curr.value
      return acc
    }, {})
  } catch { return {} }
}

const debugLogs = ref<any[]>([])

const saveApiLog = (log: any) => {
  const STORAGE_KEY = 'api_station_run_logs'
  const saved = localStorage.getItem(STORAGE_KEY)
  let logs = saved ? JSON.parse(saved) : []
  
  // 封装日志对象
  const logEntry = {
    id: Date.now(),
    type: 'API',
    apiId: runningApiData.value?.id,
    apiName: runningApiData.value?.name,
    ...log
  }
  
  logs.unshift(logEntry) // 新日志放最前面
  logs = logs.slice(0, 50) // 只保留最近 50 条
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  // 更新当前查看的 API 日志列表
  loadLocalLogs()
}

const loadLocalLogs = () => {
  const saved = localStorage.getItem('api_station_run_logs')
  if (saved && runningApiData.value) {
    const allLogs = JSON.parse(saved)
    debugLogs.value = allLogs.filter((l: any) => l.apiId === runningApiData.value.id)
  }
}

const runApiTest = async () => {
  if (!runningApiData.value) return
  isRunningApi.value = true
  try {
    const res = await $fetch(`/api/apis/${runningApiData.value.id}/run`, {
      method: 'POST',
      body: { 
        env: currentEnv.value, 
        params: debugForm,
        settings: getLocalSettings()
      }
    })
    runResult.value = res
    saveApiLog(res) // 保存日志到本地
  } catch (err) { toast.error('运行失败') }
  finally { isRunningApi.value = false }
}

// Manual Create API Logic
const showCreateApiModal = ref(false)
const isCreatingApi = ref(false)
const createForm = reactive({
  name: '',
  method: 'GET',
  path: ''
})

const createManualApi = async () => {
  if (!createForm.name || !createForm.path) return
  isCreatingApi.value = true
  try {
    await $fetch(`/api/api-groups/${groupId}/apis`, {
      method: 'POST',
      body: createForm
    })
    await refreshApis()
    showCreateApiModal.value = false
    createForm.name = ''
    createForm.path = ''
    toast.success('接口已手动创建')
  } catch (err) {
    toast.error('创建失败')
  } finally {
    isCreatingApi.value = false
  }
}
</script>

<template>
  <div class="animate-in space-y-6 max-w-7xl mx-auto">
    <header class="space-y-4">
      <NuxtLink to="/api-groups" class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft :size="16" />
        <span>返回分组列表</span>
      </NuxtLink>
      
      <div class="flex justify-between items-start">
        <div class="space-y-1">
          <div class="flex items-center gap-3">
            <h1 class="text-3xl font-heading font-bold tracking-tight text-slate-900">{{ currentGroup?.name || '加载中...' }}</h1>
            <div :class="[
              'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest',
              currentEnv === 'TEST' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
            ]">{{ currentEnv }} 环境已激活</div>
          </div>
          <p class="text-slate-500 text-sm font-medium">{{ currentGroup?.description || '暂无分组描述' }}</p>
        </div>
        
        <button class="button border-slate-200 hover:bg-slate-50" @click="openEditModal">
          <Settings :size="18" class="text-slate-400" />
          <span>分组设置</span>
        </button>
      </div>

      <div class="flex items-center gap-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
        <div class="flex items-center gap-3">
          <div :class="['w-10 h-10 rounded-xl flex items-center justify-center', currentEnv === 'TEST' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600']">
            <Globe :size="20" />
          </div>
          <div class="flex flex-col">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base URL</span>
            <code class="text-xs font-bold font-mono text-slate-900">{{ currentDomain || '未配置' }}</code>
          </div>
        </div>
      </div>
    </header>

    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <button @click="toggleManageMode" :class="[
            'button transition-all', 
            isManageMode ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white shadow-lg shadow-blue-100' : 'hover:bg-slate-50'
          ]">
            <CheckSquare :size="18" />
            <span>{{ isManageMode ? '退出管理' : '管理接口' }}</span>
          </button>

          <transition name="fade">
            <div v-if="isManageMode" class="flex items-center gap-2">
              <button @click="toggleSelectAll" class="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                <CheckSquare v-if="isAllSelected" :size="18" class="text-blue-600" />
                <Square v-else :size="18" />
                <span>全选</span>
              </button>
            </div>
          </transition>

          <div class="relative w-64 group">
            <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索 API 名称或路径..." 
              class="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100/50 transition-all font-medium" 
            />
          </div>
        </div>
        
        <div class="flex gap-3">
          <button v-if="isManageMode && selectedApiIds.length" @click="showDeleteConfirm = true" class="button border-red-200 text-red-600 hover:bg-red-50">
            <Trash2 :size="18" />
            <span>批量删除 ({{ selectedApiIds.length }})</span>
          </button>
          <button v-if="!isManageMode" class="button" @click="showImportModal = true"><Terminal :size="18" /><span>批量导入</span></button>
          <button v-if="!isManageMode" class="button button-primary" @click="showCreateApiModal = true"><Plus :size="18" /><span>手动新增</span></button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div v-if="!filteredApis?.length" class="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 opacity-60">
          <p class="font-bold">未找到匹配的 API</p>
        </div>

        <div 
          v-for="api in filteredApis" 
          :key="api.id" 
          @click="isManageMode ? toggleApiSelection(api.id) : openApiDetail(api)"
          :class="[
            'bg-white border p-6 rounded-2xl shadow-sm space-y-4 relative cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg group',
            selectedApiIds.includes(api.id) ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500' : 'border-slate-100'
          ]"
        >
          <div v-if="isManageMode" class="absolute top-5 right-5" @click.stop="toggleApiSelection(api.id)">
            <CheckSquare v-if="selectedApiIds.includes(api.id)" :size="20" class="text-blue-600" />
            <Square v-else :size="20" class="text-slate-200 group-hover:text-slate-300" />
          </div>

          <div class="flex items-center justify-between pr-10 mb-4">
            <div class="flex items-center gap-3">
              <span :class="[
                'text-[10px] font-black px-1.5 py-0.5 rounded uppercase min-w-[44px] text-center',
                api.method.toLowerCase() === 'get' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
              ]">{{ api.method }}</span>
              <span class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">{{ api.name }}</span>
            </div>
            <button 
              v-if="!isManageMode"
              @click.stop="openRunModal(api)"
              class="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
              title="运行调试"
            >
              <Play :size="14" fill="currentColor" />
            </button>
          </div>
          
          <div class="bg-slate-50 p-3 rounded-xl text-[10px] font-mono break-all text-slate-500 border border-slate-100">
            {{ api.path }}
          </div>
        </div>
      </div>
    </div>

    <!-- API Detail Modal (Fullscreen style) -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDetailModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-10">
          <div class="bg-white w-full max-w-6xl h-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in">
            <header class="px-10 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div class="flex items-center gap-4">
                <span :class="[
                  'px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest',
                  editingApi.method.toLowerCase() === 'get' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                ]">{{ editingApi.method }}</span>
                <input v-model="editingApi.name" class="text-xl font-bold text-slate-900 focus:outline-none focus:bg-slate-50 px-2 py-1 rounded-lg transition-all" />
              </div>
              <div class="flex items-center gap-3">
                <button class="button bg-slate-100 text-slate-600 border-transparent" @click="showDetailModal = false">关闭</button>
                <button class="button button-primary px-8" @click="saveApiChanges" :disabled="isSavingApi">
                  {{ isSavingApi ? '保存中...' : '提交修改' }}
                </button>
              </div>
            </header>

            <div class="flex-1 flex overflow-hidden">
              <!-- Sidebar Tabs -->
              <aside class="w-64 border-r border-slate-100 bg-slate-50/50 p-6 flex flex-col gap-1 shrink-0">
                <button @click="activeTab = 'params'" :class="['tab-btn', activeTab === 'params' ? 'active' : '']">请求参数 (Query)</button>
                <button @click="activeTab = 'headers'" :class="['tab-btn', activeTab === 'headers' ? 'active' : '']">请求头 (Headers)</button>
                <button v-if="editingApi.method.toUpperCase() !== 'GET'" @click="activeTab = 'body'" :class="['tab-btn', activeTab === 'body' ? 'active' : '']">请求体 (Body)</button>
                <button @click="activeTab = 'response'" :class="['tab-btn', activeTab === 'response' ? 'active' : '']">响应体 (Response)</button>
              </aside>

              <!-- Main Editor Content -->
              <main class="flex-1 overflow-y-auto p-10">
                <!-- Params / Headers / Body / Response Table Editor -->
                <div v-if="['params', 'headers', 'body', 'response'].includes(activeTab)" class="space-y-6">
                  <div class="flex justify-between items-center mb-4">
                    <h3 class="text-sm font-black uppercase tracking-widest text-slate-400">
                      {{ activeTab === 'params' ? 'Query 参数定义' : activeTab === 'headers' ? 'Header 字段定义' : activeTab === 'body' ? 'JSON 字段定义' : 'Response 结构定义' }}
                    </h3>
                    <button class="button py-1 text-xs" @click="addRow(editingApi[activeTab === 'params' ? 'reqQuery' : activeTab === 'headers' ? 'reqHeaders' : activeTab === 'body' ? 'reqBody' : 'resBody'])">
                      <Plus :size="14" /> <span>添加字段</span>
                    </button>
                  </div>
                  
                  <table class="w-full text-left">
                    <thead>
                      <tr class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        <th class="pb-3 pr-4">字段名</th>
                        <th class="pb-3 pr-4 w-28">类型</th>
                        <th class="pb-3 pr-4 w-20">必填</th>
                        <th class="pb-3 pr-4">默认值</th>
                        <th class="pb-3 pr-4">注释信息</th>
                        <th class="pb-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, idx) in editingApi[activeTab === 'params' ? 'reqQuery' : activeTab === 'headers' ? 'reqHeaders' : activeTab === 'body' ? 'reqBody' : 'resBody']" :key="idx" class="border-b border-slate-50 group/row">
                        <td class="py-3 pr-4" :style="{ paddingLeft: `${getIndentLevel(row.name) * 20}px` }">
                          <div class="flex items-center gap-2">
                             <div v-if="getIndentLevel(row.name) > 0" class="w-4 h-px bg-slate-200"></div>
                             <input 
                               :value="row.name.includes('.') ? row.name.split('.').pop() : row.name" 
                               @input="(e) => {
                                 const parts = row.name.split('.');
                                 parts[parts.length - 1] = (e.target as HTMLInputElement).value;
                                 row.name = parts.join('.');
                               }"
                               class="editor-input font-bold" 
                               placeholder="field_name" 
                             />
                          </div>
                        </td>
                        <td class="py-3 pr-4">
                          <select v-model="row.type" class="editor-input">
                            <option>String</option><option>Number</option><option>Boolean</option><option>Object</option><option>Array</option>
                          </select>
                        </td>
                        <td class="py-3 pr-4"><input type="checkbox" v-model="row.required" class="w-4 h-4 rounded text-blue-600" /></td>
                        <td class="py-3 pr-4"><input v-model="row.defaultValue" class="editor-input" placeholder="Value" /></td>
                        <td class="py-3 pr-4"><input v-model="row.description" class="editor-input italic text-slate-500" placeholder="点击添加注释..." /></td>
                        <td class="py-3 text-right">
                          <button @click="removeRow(editingApi[activeTab === 'params' ? 'reqQuery' : activeTab === 'headers' ? 'reqHeaders' : activeTab === 'body' ? 'reqBody' : 'resBody'], idx)" class="text-slate-300 hover:text-red-500"><X :size="16" /></button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </main>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create Manual API Modal -->
    <BaseModal :show="showCreateApiModal" title="手动新增接口" @close="showCreateApiModal = false">
      <form class="space-y-6" @submit.prevent="createManualApi">
        <div class="space-y-2">
          <label class="text-xs font-black uppercase tracking-widest text-slate-400">接口名称</label>
          <input v-model="createForm.name" type="text" placeholder="例如：获取用户信息" class="w-full p-3 border border-slate-200 rounded-xl text-sm" />
        </div>

        <div class="grid grid-cols-[120px_1fr] gap-4">
          <div class="space-y-2">
            <label class="text-xs font-black uppercase tracking-widest text-slate-400">请求方法</label>
            <select v-model="createForm.method" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold bg-white">
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="text-xs font-black uppercase tracking-widest text-slate-400">接口路径 (Path)</label>
            <input v-model="createForm.path" type="text" placeholder="/api/v1/users/{id}" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono" />
          </div>
        </div>

        <div class="bg-amber-50 p-4 rounded-xl flex gap-3 border border-amber-100">
          <Info :size="18" class="text-amber-600 shrink-0" />
          <p class="text-xs text-amber-700 leading-relaxed font-medium">使用 <code class="bg-white px-1 rounded border border-amber-200">{name}</code> 形式定义路径变量，系统在运行时会自动替换。</p>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button type="button" class="button" @click="showCreateApiModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!createForm.name || !createForm.path || isCreatingApi">
            {{ isCreatingApi ? '正在创建...' : '提交创建' }}
          </button>
        </div>
      </form>
    </BaseModal>

    <!-- Edit Group Modal -->
    <BaseModal :show="showEditModal" title="编辑分组信息" @close="showEditModal = false">
      <form class="space-y-6" @submit.prevent="updateGroup">
        <label class="block space-y-2"><span class="text-xs font-black uppercase text-slate-400">分组名称</span><input v-model="editForm.name" class="w-full p-3 border border-slate-200 rounded-xl text-sm" /></label>
        <div class="grid grid-cols-2 gap-4">
          <label class="space-y-2"><span class="text-xs font-black text-emerald-500">测试域名</span><input v-model="editForm.testUrl" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono" /></label>
          <label class="space-y-2"><span class="text-xs font-black text-red-500">生产域名</span><input v-model="editForm.prodUrl" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono" /></label>
        </div>
        <div class="flex justify-end gap-3 pt-4"><button type="button" class="button" @click="showEditModal = false">取消</button><button type="submit" class="button button-primary">保存修改</button></div>
      </form>
    </BaseModal>

    <!-- Run Debug Modal -->
    <BaseModal :show="showRunModal" :title="`运行调试: ${runningApiData?.name}`" @close="showRunModal = false" custom-class="max-w-6xl">
      <div class="grid grid-cols-[1fr_400px] gap-8 h-[600px]">
        <!-- Left: Params Config -->
        <div class="flex flex-col gap-6 overflow-y-auto pr-4">
          <div class="flex items-center justify-between sticky top-0 bg-white py-2 z-10 border-b border-slate-50">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-500">环境:</span>
              <span :class="['px-2 py-0.5 rounded text-[10px] font-black', currentEnv === 'TEST' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600']">{{ currentEnv }}</span>
            </div>
            <label class="flex items-center gap-2 cursor-pointer group">
              <div @click="showOnlyRequired = !showOnlyRequired" :class="['w-8 h-4 rounded-full transition-all relative', showOnlyRequired ? 'bg-blue-600' : 'bg-slate-200']">
                <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', showOnlyRequired ? 'left-4.5' : 'left-0.5']"></div>
              </div>
              <span class="text-xs font-bold text-slate-500 group-hover:text-blue-600">只看必填参数</span>
            </label>
          </div>

          <!-- Section: Query -->
          <div class="space-y-4">
            <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Query Parameters</h4>
            <div v-if="runningApiData?.reqQuery?.some(p => !showOnlyRequired || p.required)" class="space-y-5">
              <div v-for="p in runningApiData.reqQuery.filter(p => !showOnlyRequired || p.required)" :key="p.name" class="space-y-1.5">
                <div class="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label class="text-xs font-bold text-slate-600 truncate flex items-center gap-1.5" :title="p.name">
                    <span v-if="p.required" class="text-red-500">*</span>
                    {{ p.name }}
                  </label>
                  <input v-model="debugForm.query[p.name]" class="editor-input bg-slate-50 border-slate-100 focus:bg-white" />
                </div>
                <p v-if="p.description" class="pl-[156px] text-[10px] text-slate-400 italic">{{ p.description }}</p>
              </div>
            </div>
            <p v-else class="text-[10px] italic text-slate-400">暂无对应参数</p>
          </div>

          <!-- Section: Body -->
          <div v-if="runningApiData?.method !== 'GET'" class="space-y-4 border-t border-slate-50 pt-6">
            <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Request Body (JSON)</h4>
            <div v-if="runningApiData?.reqBody?.some(p => !showOnlyRequired || p.required)" class="space-y-5">
              <div v-for="p in runningApiData.reqBody.filter(p => !showOnlyRequired || p.required)" :key="p.name" class="space-y-1.5">
                <div class="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label class="text-xs font-bold text-slate-600 truncate flex items-center gap-1.5" :title="p.name" :style="{ paddingLeft: `${getIndentLevel(p.name) * 12}px` }">
                    <span v-if="p.required" class="text-red-500">*</span>
                    {{ p.name.split('.').pop() }}
                  </label>
                  <input v-model="debugForm.body[p.name]" class="editor-input bg-slate-50 border-slate-100 focus:bg-white" />
                </div>
                <p v-if="p.description" class="pl-[156px] text-[10px] text-slate-400 italic">{{ p.description }}</p>
              </div>
            </div>
            <p v-else class="text-[10px] italic text-slate-400">暂无对应参数</p>
          </div>

          <!-- Section: Headers -->
          <div class="space-y-4 border-t border-slate-50 pt-6">
            <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Custom Headers</h4>
            <div v-if="runningApiData?.reqHeaders?.some(p => !showOnlyRequired || p.required)" class="space-y-5">
              <div v-for="p in runningApiData.reqHeaders.filter(p => !showOnlyRequired || p.required)" :key="p.name" class="space-y-1.5">
                <div class="grid grid-cols-[140px_1fr] items-center gap-4">
                  <label class="text-xs font-bold text-slate-600 truncate flex items-center gap-1.5">
                    <span v-if="p.required" class="text-red-500">*</span>
                    {{ p.name }}
                  </label>
                  <input v-model="debugForm.headers[p.name]" class="editor-input bg-slate-50 border-slate-100 focus:bg-white" />
                </div>
                <p v-if="p.description" class="pl-[156px] text-[10px] text-slate-400 italic">{{ p.description }}</p>
              </div>
            </div>
            <p v-else class="text-[10px] italic text-slate-400">暂无对应参数</p>
          </div>
        </div>

        <!-- Right: Result -->
        <div class="bg-slate-900 rounded-3xl p-6 flex flex-col overflow-hidden shadow-2xl">
          <div class="flex items-center justify-between mb-4">
            <h4 class="text-xs font-black text-slate-500 uppercase tracking-widest">Execute Result</h4>
            <div v-if="runResult" class="flex items-center gap-3">
              <span :class="['text-[10px] font-black px-2 py-0.5 rounded', runResult.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400']">
                {{ runResult.status }}
              </span>
              <span class="text-[10px] font-mono text-slate-500">{{ runResult.duration }}ms</span>
            </div>
          </div>

          <div v-if="!runResult && !isRunningApi" class="flex-1 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-40">
            <Play :size="48" />
            <p class="text-sm font-bold">准备就绪，点击下方按钮开始任务</p>
          </div>

          <div v-else-if="isRunningApi" class="flex-1 flex flex-col items-center justify-center text-blue-400 gap-4">
            <div class="w-8 h-8 border-4 border-blue-400/20 border-t-blue-400 rounded-full animate-spin"></div>
            <p class="text-xs font-bold animate-pulse">正在发送请求...</p>
          </div>

          <div v-else class="flex-1 overflow-y-auto space-y-4">
            <div class="space-y-2">
               <p class="text-[10px] font-black text-slate-500 uppercase">Response Body</p>
               <pre class="bg-black/20 p-4 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto">{{ JSON.stringify(runResult.responseData, null, 2) }}</pre>
            </div>
            <div class="space-y-2">
               <p class="text-[10px] font-black text-slate-500 uppercase">Request Snapshot</p>
               <div class="bg-black/20 p-4 rounded-xl text-[10px] font-mono text-slate-400 space-y-1">
                 <p><span class="text-blue-400">{{ runResult.requestSnapshot.method }}</span> {{ runResult.requestSnapshot.url }}</p>
               </div>
            </div>
          </div>

          <button 
            @click="runApiTest" 
            :disabled="isRunningApi"
            class="mt-6 w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40 disabled:opacity-50"
          >
            <Play v-if="!isRunningApi" :size="18" fill="currentColor" />
            <span>{{ isRunningApi ? 'Executing...' : 'Run Test' }}</span>
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal :show="showImportModal" title="批量导入接口" @close="showImportModal = false">
      <div class="space-y-6">
        <p class="text-sm font-medium text-slate-500">粘贴 OpenAPI JSON 或标准 curl 命令。</p>
        <textarea v-model="importContent" rows="12" class="w-full p-4 border border-slate-200 rounded-2xl font-mono text-xs bg-slate-50 outline-none"></textarea>
        <div class="flex justify-end gap-3">
          <button class="button" @click="showImportModal = false">取消</button>
          <button class="button button-primary" @click="importApi" :disabled="isImporting">
            {{ isImporting ? '正在解析并导入...' : '开始导入' }}
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal :show="showEditModal" title="编辑分组信息" @close="showEditModal = false">
      <form class="space-y-6" @submit.prevent="updateGroup">
        <label class="block space-y-2"><span class="text-xs font-black uppercase text-slate-400">分组名称</span><input v-model="editForm.name" class="w-full p-3 border border-slate-200 rounded-xl text-sm" /></label>
        <div class="grid grid-cols-2 gap-4">
          <label class="space-y-2"><span class="text-xs font-black text-emerald-500">测试域名</span><input v-model="editForm.testUrl" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono" /></label>
          <label class="space-y-2"><span class="text-xs font-black text-red-500">生产域名</span><input v-model="editForm.prodUrl" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono" /></label>
        </div>
        <div class="flex justify-end gap-3 pt-4"><button type="button" class="button" @click="showEditModal = false">取消</button><button type="submit" class="button button-primary">保存修改</button></div>
      </form>
    </BaseModal>

    <BaseConfirm 
      :show="showDeleteConfirm" 
      title="确认批量删除" 
      :message="`确定要删除选中的 ${selectedApiIds.length} 个接口吗？该操作无法撤销。`"
      type="danger"
      @confirm="batchDeleteApis"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<style scoped>
.tab-btn {
  @apply w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-slate-500 transition-all hover:bg-white hover:text-slate-900;
}
.tab-btn.active {
  @apply bg-white text-blue-600 shadow-sm border border-slate-100;
}
.editor-input {
  @apply w-full bg-white border border-slate-200 rounded-xl text-sm px-3 py-2 transition-all outline-none placeholder:italic placeholder:text-slate-300;
}
.editor-input:focus {
  @apply border-blue-400 ring-4 ring-blue-50;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
