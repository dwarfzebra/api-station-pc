<script setup lang="ts">
import { 
  Plus, Search, MoreHorizontal, Calendar, Workflow, Play
} from 'lucide-vue-next'

const { data, refresh } = await useFetch('/api/workflow-scenes')
const scenes = computed(() => data.value || [])

const showCreateModal = ref(false)
const isSubmitting = ref(false)
const form = reactive({ name: '', description: '' })

const createScene = async () => {
  if (!form.name) return
  isSubmitting.value = true
  try {
    const res: any = await $fetch('/api/workflow-scenes', {
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
</script>

<template>
  <div class="animate-in space-y-10">
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

      <NuxtLink 
        v-for="s in scenes" 
        :key="s.id" 
        :to="`/scenes/${s.id}`"
        class="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm hover:shadow-xl hover:border-blue-400 hover:-translate-y-2 transition-all group"
      >
        <div class="flex justify-between items-start mb-6">
          <div class="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
            <Workflow :size="28" />
          </div>
          <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest">{{ s._count.workflows }} Workflows</span>
        </div>
        
        <h3 class="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{{ s.name }}</h3>
        <p class="text-sm text-slate-500 font-medium mt-3 line-clamp-2 h-10">{{ s.description || '暂无业务描述' }}</p>
        
        <div class="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-400">
          <div class="flex items-center gap-2"><Calendar :size="14" /> {{ new Date(s.updatedAt).toLocaleDateString() }}</div>
          <div class="p-2 bg-slate-50 text-slate-400 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all"><Play :size="14" /></div>
        </div>
      </NuxtLink>
    </div>

    <!-- Create Modal -->
    <BaseModal :show="showCreateModal" title="创建业务场景" @close="showCreateModal = false">
      <form class="space-y-6" @submit.prevent="createScene">
        <div class="space-y-2">
          <label class="text-xs font-black uppercase tracking-widest text-slate-400 leading-none">场景名称</label>
          <input v-model="form.name" type="text" placeholder="如：下单链路、用户入驻流程" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all shadow-sm" />
        </div>
        <div class="space-y-2">
          <label class="text-xs font-black uppercase tracking-widest text-slate-400 leading-none">场景描述</label>
          <textarea v-model="form.description" rows="3" placeholder="简要描述本场景的测试覆盖范围..." class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"></textarea>
        </div>
        <div class="flex justify-end gap-3 pt-4">
          <button type="button" class="button" @click="showCreateModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!form.name || isSubmitting">{{ isSubmitting ? '正在构建...' : '确认发布' }}</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
