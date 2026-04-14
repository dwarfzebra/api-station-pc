<script setup lang="ts">
import { 
  ArrowLeft, Plus, Workflow, Play, Clock, Edit2, History, Trash2
} from 'lucide-vue-next'

const route = useRoute()
const sceneId = route.params.id as string

const { data: scenes } = await useFetch('/api/workflow-scenes')
const { data: workflows, refresh } = await useFetch(`/api/workflow-scenes/${sceneId}/workflows`)

const currentScene = computed(() => 
  scenes.value?.find(s => s.id === parseInt(sceneId))
)

const showCreateModal = ref(false)
const showEditModal = ref(false)
const form = reactive({ name: '', description: '' })
const editForm = reactive({ id: 0, name: '', description: '' })
const isSubmitting = ref(false)
const isUpdating = ref(false)

const showDeleteConfirm = ref(false)
const targetDeleteId = ref<number | null>(null)
const isDeleting = ref(false)

const confirmDelete = (id: number) => {
  targetDeleteId.value = id
  showDeleteConfirm.value = true
}

const deleteWorkflow = async () => {
  if (!targetDeleteId.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/workflows/${targetDeleteId.value}`, { method: 'DELETE' })
    await refresh()
    useToast().success('链路已成功删除')
    showDeleteConfirm.value = false
  } catch (err) {
    useToast().error('删除失败')
  } finally {
    isDeleting.value = false
    targetDeleteId.value = null
  }
}

const createWorkflow = async () => {
  if (!form.name) return
  isSubmitting.value = true
  try {
    await $fetch(`/api/workflow-scenes/${sceneId}/workflows`, {
      method: 'POST',
      body: { ...form }
    })
    await refresh()
    showCreateModal.value = false
    form.name = ''
    form.description = ''
  } catch (err) { }
  finally { isSubmitting.value = false }
}

const openEditModal = (wf: any) => {
  editForm.id = wf.id
  editForm.name = wf.name
  editForm.description = wf.description
  showEditModal.value = true
}

const updateWorkflow = async () => {
  if (!editForm.name) return
  isUpdating.value = true
  try {
    await $fetch(`/api/workflows/${editForm.id}`, {
      method: 'PUT',
      body: { name: editForm.name, description: editForm.description }
    })
    await refresh()
    showEditModal.value = false
  } catch (err) { }
  finally { isUpdating.value = false }
}
</script>

<template>
  <div class="animate-in space-y-8">
    <BaseConfirm 
      :show="showDeleteConfirm" 
      title="删除编排链路" 
      message="确认删除该链路吗？此操作将永久抹除所有步骤配置及本地调试日志，不可恢复。" 
      type="danger"
      @confirm="deleteWorkflow"
      @cancel="showDeleteConfirm = false"
    />
    <header class="space-y-4">
      <NuxtLink to="/scenes" class="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft :size="16" />
        <span>返回场景列表</span>
      </NuxtLink>
      
      <div class="flex justify-between items-end">
        <div>
          <h1 class="text-3xl font-heading font-bold text-slate-900">{{ currentScene?.name || '加载中...' }}</h1>
          <p class="text-slate-500 font-medium">{{ currentScene?.description || '暂无场景描述' }}</p>
        </div>
        <button class="button button-primary" @click="showCreateModal = true">
          <Plus :size="18" />
          <span>添加链路</span>
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-if="!workflows?.length" class="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-3xl text-slate-400 opacity-60">
        <p class="font-bold">该场景下暂未创建任何编排链路</p>
      </div>

      <div 
        v-for="wf in workflows" 
        :key="wf.id" 
        class="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-400 transition-all group relative overflow-hidden flex flex-col cursor-pointer"
        @click="$router.push(`/workflows/${wf.id}`)"
      >
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Workflow :size="20" />
            </div>
            <h3 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{{ wf.name }}</h3>
          </div>
          <div class="flex items-center gap-1">
            <button 
              @click.stop="openEditModal(wf)"
              class="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="编辑名称描述"
            >
              <Edit2 :size="14" />
            </button>
            <button 
              @click.stop="confirmDelete(wf.id)"
              class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="删除链路"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
        
        <p class="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed mb-6">{{ wf.description || '点击开始可视化编排链路流程' }}</p>
        
        <div class="mt-auto flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span class="flex items-center gap-1"><History :size="12" /> Updated: {{ new Date(wf.updatedAt).toISOString().split('T')[0] }}</span>
          <div class="p-1 px-2 bg-slate-50 rounded text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">Go to Editor</div>
        </div>
      </div>
    </div>

    <!-- Create Workflow Modal -->
    <BaseModal :show="showCreateModal" title="新建编排链路" @close="showCreateModal = false">
      <form class="space-y-6" @submit.prevent="createWorkflow">
        <label class="block space-y-2">
          <span class="text-xs font-black uppercase tracking-widest text-slate-400">链路名称</span>
          <input v-model="form.name" type="text" placeholder="如：成功下单流程" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </label>
        <label class="block space-y-2">
          <span class="text-xs font-black uppercase tracking-widest text-slate-400">链路描述</span>
          <textarea v-model="form.description" rows="2" placeholder="简述业务逻辑" class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 transition-all outline-none"></textarea>
        </label>
        <div class="flex justify-end gap-3 pt-4">
          <button type="button" class="button" @click="showCreateModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!form.name || isSubmitting">{{ isSubmitting ? '正在构建...' : '确认发布' }}</button>
        </div>
      </form>
    </BaseModal>

    <!-- Edit Workflow Modal -->
    <BaseModal :show="showEditModal" title="编辑链路信息" @close="showEditModal = false">
      <form class="space-y-6" @submit.prevent="updateWorkflow">
        <label class="block space-y-2">
          <span class="text-xs font-black uppercase tracking-widest text-slate-400">链路名称</span>
          <input v-model="editForm.name" type="text" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </label>
        <label class="block space-y-2">
          <span class="text-xs font-black uppercase tracking-widest text-slate-400">链路描述</span>
          <textarea v-model="editForm.description" rows="2" class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 transition-all outline-none"></textarea>
        </label>
        <div class="flex justify-end gap-3 pt-4">
          <button type="button" class="button" @click="showEditModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!editForm.name || isUpdating">{{ isUpdating ? '保存中...' : '保存修改' }}</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
