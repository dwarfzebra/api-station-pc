<script setup lang="ts">
import { 
  ArrowLeft, Plus, Workflow, Play, Clock, Edit2, History
} from 'lucide-vue-next'

const route = useRoute()
const sceneId = route.params.id as string

const { data: scenes } = await useFetch('/api/workflow-scenes')
const { data: workflows, refresh } = await useFetch(`/api/workflow-scenes/${sceneId}/workflows`)

const currentScene = computed(() => 
  scenes.value?.find(s => s.id === parseInt(sceneId))
)

const showCreateModal = ref(false)
const form = reactive({ name: '', description: '' })
const isSubmitting = ref(false)

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
  } catch (err) { }
  finally { isSubmitting.value = false }
}
</script>

<template>
  <div class="animate-in space-y-8">
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

      <NuxtLink 
        v-for="wf in workflows" 
        :key="wf.id" 
        :to="`/workflows/${wf.id}`"
        class="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:border-blue-400 transition-all group"
      >
        <div class="flex items-center gap-4 mb-5">
          <div class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Workflow :size="20" />
          </div>
          <h3 class="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{{ wf.name }}</h3>
        </div>
        
        <p class="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed mb-6">{{ wf.description || '点击开始可视化编排链路流程' }}</p>
        
        <div class="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span class="flex items-center gap-1"><History :size="12" /> Last edited: {{ new Date(wf.updatedAt).toLocaleDateString() }}</span>
          <div class="flex gap-2">
             <button class="p-1.5 hover:text-blue-600 transition-colors"><Edit2 :size="14" /></button>
          </div>
        </div>
      </NuxtLink>
    </div>

    <!-- Create Workflow Modal -->
    <BaseModal :show="showCreateModal" title="新建编排链路" @close="showCreateModal = false">
      <form class="space-y-6" @submit.prevent="createWorkflow">
        <div class="space-y-2">
          <label class="text-xs font-black uppercase tracking-widest text-slate-400">链路名称</label>
          <input v-model="form.name" type="text" placeholder="如：成功下单流程、异常支付退款" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all outline-none" />
        </div>
        <div class="space-y-2">
          <label class="text-xs font-black uppercase tracking-widest text-slate-400">链路描述</label>
          <textarea v-model="form.description" rows="2" placeholder="简述该链路的业务逻辑..." class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 transition-all outline-none"></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <button type="button" class="button" @click="showCreateModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!form.name || isSubmitting">{{ isSubmitting ? '正在构建...' : '确认发布' }}</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
