<script setup lang="ts">
import { 
  Plus, Trash2, Key, Sidebar, Terminal, Save, Globe 
} from 'lucide-vue-next'

const { data: settings, refresh } = await useFetch('/api/global-settings')
const toast = useToast()

const globalHeaders = computed(() => {
  const item = settings.value?.find(s => s.configKey === 'GLOBAL_HEADERS')
  return (item?.configValue as any[]) || []
})

const localEnv = useState('currentEnv')

const addHeader = async () => {
  const newList = [...globalHeaders.value, { key: '', value: '' }]
  await saveHeaders(newList)
}

const removeHeader = async (index: number) => {
  const newList = globalHeaders.value.filter((_, i) => i !== index)
  await saveHeaders(newList)
}

const saveHeaders = async (list: any[]) => {
  try {
    await $fetch('/api/global-settings', {
      method: 'POST',
      body: { key: 'GLOBAL_HEADERS', value: list }
    })
    await refresh()
  } catch (err) {
    toast.error('保存失败')
  }
}

const debounceSave = useDebounceFn(async (list: any[]) => {
  await saveHeaders(list)
  toast.success('全局参数已同步')
}, 1000)

const updateHeader = (index: number) => {
  debounceSave(globalHeaders.value)
}

</script>

<template>
  <div class="animate-in space-y-10">
    <header>
      <h1 class="text-4xl font-heading font-bold mb-2">全局配置</h1>
      <p class="text-slate-500 font-medium">设置对全站生效的请求头 (Headers) 与运行时环境参数。</p>
    </header>

    <div class="grid grid-cols-3 gap-10">
      <div class="col-span-2 space-y-8">
        <section class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <header class="p-6 border-b border-slate-100 flex justify-between items-center">
            <div class="flex items-center gap-3">
              <Key :size="20" class="text-blue-600" />
              <h2 class="font-bold text-slate-900">全局请求头 (Global Headers)</h2>
            </div>
            <button class="button px-3 py-1.5 text-xs" @click="addHeader">
              <Plus :size="14" />
              <span>添加参数</span>
            </button>
          </header>
          
          <div class="p-6 space-y-4">
            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest bg-slate-50 p-2 rounded-lg">这些参数将自动注入到任何 API 请求中（如 Token, Version, Platform 等）。</p>
            
            <div v-if="!globalHeaders.length" class="py-10 text-center text-slate-300 italic text-sm">
              暂无全局 Header
            </div>

            <div v-for="(h, i) in globalHeaders" :key="i" class="flex items-center gap-3 group">
              <input 
                v-model="h.key" 
                @input="updateHeader(i)"
                placeholder="Key (如: Authorization)" 
                class="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-4 focus:ring-blue-100 transition-all focus:bg-white"
              />
              <input 
                v-model="h.value" 
                @input="updateHeader(i)"
                placeholder="Value" 
                class="flex-[2] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-4 focus:ring-blue-100 transition-all focus:bg-white"
              />
              <button class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" @click="removeHeader(i)">
                <Trash2 :size="18" />
              </button>
            </div>
          </div>
        </section>

        <section class="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
          <div class="flex items-center gap-3">
            <Terminal :size="20" class="text-blue-400" />
            <h2 class="font-bold text-white uppercase tracking-widest text-sm">运行时信息 (Runtime)</h2>
          </div>
          <div class="grid grid-cols-2 gap-6">
            <div class="p-4 bg-slate-800 rounded-xl space-y-2">
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">当前环境状态</span>
              <p :class="['text-xl font-heading font-black', localEnv === 'TEST' ? 'text-emerald-400' : 'text-red-400']">{{ localEnv }}</p>
            </div>
            <div class="p-4 bg-slate-800 rounded-xl space-y-2 text-slate-400">
              <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">默认状态位</span>
              <p class="text-xl font-heading font-black text-slate-300">AUTO_INJECT</p>
            </div>
          </div>
        </section>
      </div>

      <div class="space-y-6">
        <div class="p-6 bg-blue-50 border border-blue-100 rounded-2xl">
          <h3 class="font-bold text-blue-900 mb-2">使用说明</h3>
          <p class="text-[13px] text-blue-700 leading-relaxed font-medium">配置完成后，系统发出的所有 API 请求都会自动合并这些 Header。如果 API 自身定义了冲突的 Key，API 级别的 Header 优先级更高。</p>
        </div>
      </div>
    </div>
  </div>
</template>
