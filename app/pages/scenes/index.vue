<script setup lang="ts">
import { 
  Plus, Search, MoreHorizontal, Calendar, Workflow, Play, Edit3, Trash2
} from 'lucide-vue-next'

const { data, refresh } = await useFetch('/api/workflow-scenes')
const scenes = computed(() => data.value || [])

const showCreateModal = ref(false)
const showEditModal = ref(false)
const isSubmitting = ref(false)
const isUpdating = ref(false)

const form = reactive({ name: '', description: '' })
const editForm = reactive({ id: 0, name: '', description: '' })

const showDeleteConfirm = ref(false)
const targetDeleteId = ref<number | null>(null)
const isDeleting = ref(false)

const confirmDelete = (id: number) => {
  targetDeleteId.value = id
  showDeleteConfirm.value = true
}

const deleteScene = async () => {
  if (!targetDeleteId.value) return
  isDeleting.value = true
  try {
    await $fetch(`/api/workflow-scenes/${targetDeleteId.value}`, { method: 'DELETE' })
    await refresh()
    useToast().success('场景已成功移除')
    showDeleteConfirm.value = false
  } catch (err) {
    useToast().error('删除失败')
  } finally {
    isDeleting.value = false
    targetDeleteId.value = null
  }
}

const createScene = async () => {
  if (!form.name) return
  isSubmitting.value = true
  try {
    await $fetch('/api/workflow-scenes', {
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

const openEditModal = (scene: any) => {
  editForm.id = scene.id
  editForm.name = scene.name
  editForm.description = scene.description
  showEditModal.value = true
}

const updateScene = async () => {
  if (!editForm.name) return
  isUpdating.value = true
  try {
    await $fetch(`/api/workflow-scenes/${editForm.id}`, {
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
  <div class="animate-in space-y-10">
    <BaseConfirm 
      :show="showDeleteConfirm" 
      title="移除自动化场景" 
      message="确认删除该业务场景吗？此操作将永久移除该场景下的所有测试链路及运行历史，且无法找回。" 
      type="danger"
      @confirm="deleteScene"
      @cancel="showDeleteConfirm = false"
    />
    <header class="flex justify-between items-end">
      <div>
        <h1 class="text-4xl font-heading font-bold mb-2">自动化场景</h1>
        <p class="text-slate-500 font-medium">按业务流程组织您的测试链路，覆盖跨服务的核心全链路场景。</p>
      </div>
      <button class="button button-primary" @click="showCreateModal = true">
        <Plus :size="18" />
        <span>新建场景</span>
      </button>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-if="!scenes.length" class="col-span-full py-20 flex flex-col items-center gap-4 text-slate-300">
        <Workflow :size="64" class="opacity-10" />
        <p class="text-sm font-bold">暂无自动化场景</p>
      </div>

      <div 
        v-for="s in scenes" 
        :key="s.id" 
        class="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-400 hover:-translate-y-2 transition-all group relative overflow-hidden"
      >
        <div class="flex justify-between items-start mb-6">
          <div class="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
            <Workflow :size="28" />
          </div>
          <div class="flex flex-col items-end gap-1 px-1">
             <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{{ s._count?.workflows || 0 }} Workflows</span>
             <div class="flex items-center">
                <button 
                  @click.stop="openEditModal(s)"
                  class="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  title="编辑场景"
                >
                  <Edit3 :size="16" />
                </button>
                <button 
                  @click.stop="confirmDelete(s.id)"
                  class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  title="删除场景"
                >
                  <Trash2 :size="16" />
                </button>
             </div>
          </div>
        </div>
        
        <NuxtLink :to="`/scenes/${s.id}`">
          <h3 class="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{{ s.name }}</h3>
          <p class="text-sm text-slate-500 font-medium mt-3 line-clamp-2 h-10">{{ s.description || '暂无业务描述' }}</p>
        </NuxtLink>
        
        <div class="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-400">
          <div class="flex items-center gap-2"><Calendar :size="14" /> {{ new Date(s.updatedAt).toISOString().split('T')[0] }}</div>
          <NuxtLink :to="`/scenes/${s.id}`" class="p-2 bg-slate-50 text-slate-400 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all"><Play :size="14" /></NuxtLink>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <BaseModal :show="showCreateModal" title="创建业务场景" @close="showCreateModal = false">
      <form class="space-y-6" @submit.prevent="createScene">
        <label class="block space-y-2">
          <span class="text-xs font-black uppercase tracking-widest text-slate-400 leading-none">场景名称</span>
          <input v-model="form.name" type="text" placeholder="如：下单链路" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </label>
        <label class="block space-y-2">
          <span class="text-xs font-black uppercase tracking-widest text-slate-400 leading-none">场景描述</span>
          <textarea v-model="form.description" rows="3" class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 transition-all outline-none"></textarea>
        </label>
        <div class="flex justify-end gap-3 pt-4">
          <button type="button" class="button" @click="showCreateModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!form.name || isSubmitting">{{ isSubmitting ? '正在构建...' : '确认发布' }}</button>
        </div>
      </form>
    </BaseModal>

    <!-- Edit Modal -->
    <BaseModal :show="showEditModal" title="编辑场景信息" @close="showEditModal = false">
      <form class="space-y-6" @submit.prevent="updateScene">
        <label class="block space-y-2">
          <span class="text-xs font-black uppercase tracking-widest text-slate-400 leading-none">场景名称</span>
          <input v-model="editForm.name" type="text" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </label>
        <label class="block space-y-2">
          <span class="text-xs font-black uppercase tracking-widest text-slate-400 leading-none">场景描述</span>
          <textarea v-model="editForm.description" rows="3" class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 transition-all outline-none"></textarea>
        </label>
        <div class="flex justify-end gap-3 pt-4">
          <button type="button" class="button" @click="showEditModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!editForm.name || isUpdating">{{ isUpdating ? '正在保存...' : '保存修改' }}</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
