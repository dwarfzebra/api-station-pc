<script setup lang="ts">
import { 
  Plus, Search, MoreHorizontal, Calendar, Layers, Globe
} from 'lucide-vue-next'

const { data, refresh } = await useFetch('/api/api-groups')
const groups = computed(() => data.value?.groups || [])

const showCreateModal = ref(false)
const isSubmitting = ref(false)
const form = reactive({
  name: '',
  description: '',
  testUrl: '',
  prodUrl: ''
})

const createGroup = async () => {
  if (!form.name) return
  isSubmitting.value = true
  try {
    const toast = useToast()
    await $fetch('/api/api-groups', {
      method: 'POST',
      body: { ...form }
    })
    await refresh()
    showCreateModal.value = false
    // reset form
    form.name = ''
    form.description = ''
    form.testUrl = ''
    form.prodUrl = ''
    toast.success('分组创建成功')
  } catch (err: any) {
    const toast = useToast()
    toast.error(err.data?.message || '创建失败')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="animate-in space-y-10">
    <header class="flex justify-between items-end">
      <div>
        <h1 class="text-4xl font-heading font-bold mb-2">API 分组</h1>
        <p class="text-slate-500 font-medium">按业务属性划分接口集合，为每个分组配置独立的测试与生产域名。</p>
      </div>
      <button class="button button-primary" @click="showCreateModal = true">
        <Plus :size="18" />
        <span>新建分组</span>
      </button>
    </header>

    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div class="p-6 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
        <div class="relative w-full max-w-md">
          <Search :size="18" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜索分组名称..." 
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100/50 transition-all font-medium"
          />
        </div>
      </div>

      <div class="flex flex-col">
        <div v-if="!groups.length" class="py-24 flex flex-col items-center gap-4 text-slate-400">
          <Layers :size="48" class="opacity-10" />
          <p class="text-sm font-bold">暂无 API 分组，请先创建一个</p>
        </div>

        <NuxtLink 
          v-for="g in groups" 
          :key="g.id" 
          :to="`/api-groups/${g.id}`"
          class="grid grid-cols-[1fr_240px_140px_60px] items-center p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all group"
        >
          <div class="flex items-center gap-5">
            <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold font-heading text-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
              {{ g.name.charAt(0).toUpperCase() }}
            </div>
            <div class="space-y-1">
              <h3 class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{{ g.name }}</h3>
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                  <Globe :size="12" />
                  <span>{{ g.testUrl }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <div class="px-3 py-1 bg-slate-100 rounded-lg flex items-center gap-2 text-[11px] font-bold text-slate-500">
              <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              {{ g._count.apis }} APIs
            </div>
          </div>

          <div class="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <Calendar :size="14" />
            <span>{{ new Date(g.updatedAt).toLocaleDateString() }}</span>
          </div>

          <div class="flex justify-end">
            <button class="p-2 text-slate-300 hover:text-slate-900 transition-colors" @click.prevent="">
              <MoreHorizontal :size="18" />
            </button>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Create Modal -->
    <BaseModal :show="showCreateModal" title="新建 API 分组" @close="showCreateModal = false">
      <form class="space-y-6" @submit.prevent="createGroup">
        <div class="space-y-2">
          <label class="text-xs font-black uppercase tracking-widest text-slate-400">分组名称</label>
          <input v-model="form.name" type="text" placeholder="例如：用户中心、电商主站 API" class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 transition-all font-medium" />
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="text-xs font-black uppercase tracking-widest text-emerald-500">测试域名 <span class="text-[10px] opacity-50 font-medium">(可选)</span></label>
            <input v-model="form.testUrl" type="text" placeholder="例如：https://test-api.com" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono focus:ring-4 focus:ring-emerald-100 transition-all" />
          </div>
          <div class="space-y-2">
            <label class="text-xs font-black uppercase tracking-widest text-red-500">生产域名 <span class="text-[10px] opacity-50 font-medium">(可选)</span></label>
            <input v-model="form.prodUrl" type="text" placeholder="例如：https://api.com" class="w-full p-3 border border-slate-200 rounded-xl text-sm font-mono focus:ring-4 focus:ring-red-100 transition-all" />
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-xs font-black uppercase tracking-widest text-slate-400">分组描述 (可选)</label>
          <textarea v-model="form.description" rows="3" placeholder="简述该服务的功能范围..." class="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-100 transition-all"></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <button type="button" class="button" @click="showCreateModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!form.name || isSubmitting">
            {{ isSubmitting ? '正在初始化...' : '确认创建' }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>
