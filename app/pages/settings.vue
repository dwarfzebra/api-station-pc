<script setup lang="ts">
import { 
  Plus, Save, Trash2, ShieldCheck, Globe, Info, Clock, Terminal
} from 'lucide-vue-next'

const toast = useToast()
const settingsList = ref<any[]>([])
const lastUpdated = ref('从未更新')

// 初始化：从 LocalStorage 加载
onMounted(() => {
  const saved = localStorage.getItem('api_station_global_settings')
  if (saved) {
    const data = JSON.parse(saved)
    settingsList.value = data.list || []
    lastUpdated.value = data.updatedAt || '从未更新'
  }
})

const addRow = () => {
  settingsList.value.push({ key: '', value: '' })
}

const removeRow = (index: number) => {
  settingsList.value.splice(index, 1)
}

const saveAll = () => {
  const now = new Date().toLocaleString()
  const data = {
    list: settingsList.value.filter(s => s.key), // 过滤掉空 Key
    updatedAt: now
  }
  localStorage.setItem('api_station_global_settings', JSON.stringify(data))
  lastUpdated.value = now
  toast.success('配置已保存至本地浏览器')
}
</script>

<template>
  <div class="animate-in space-y-8 max-w-5xl">
    <header class="flex justify-between items-end">
      <div class="space-y-1">
        <h1 class="text-4xl font-heading font-bold tracking-tight text-slate-900 flex items-center gap-4">
          <ShieldCheck :size="40" class="text-blue-600" />
          全配置 (本地)
        </h1>
        <p class="text-slate-500 font-medium">配置受浏览器沙盒保护，不会持久化到服务器。请求时通过客户端动态注入。</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="text-right mr-4 hidden md:block">
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Local Saved</p>
          <p class="text-xs font-bold text-slate-600 flex items-center justify-end gap-1.5">
            <Clock :size="12" /> {{ lastUpdated }}
          </p>
        </div>
        <button 
          @click="saveAll" 
          class="button button-primary px-8 shadow-xl shadow-blue-200"
        >
          <Save :size="18" />
          <span>保存修改</span>
        </button>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-8">
      <section class="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <div class="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Terminal :size="20" />
            </div>
            <div>
              <h2 class="font-bold text-slate-900">公共请求头 (Shared Headers)</h2>
              <p class="text-xs text-slate-500">这些配置存储在你的浏览器 LocalStorage 中。</p>
            </div>
          </div>
          <button @click="addRow" class="button py-2 bg-white hover:bg-slate-50 border-slate-200">
            <Plus :size="16" />
            <span>添加配置项</span>
          </button>
        </div>

        <div class="p-8">
          <div v-if="!settingsList.length" class="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 gap-3 grayscale opacity-50">
            <Globe :size="48" />
            <p class="text-sm font-bold tracking-tight">目前暂无本地配置</p>
          </div>

          <table v-else class="w-full text-left">
            <thead>
              <tr class="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th class="pb-4 pr-6">Config Key</th>
                <th class="pb-4 pr-6">Config Value</th>
                <th class="pb-4 w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr v-for="(item, idx) in settingsList" :key="idx" class="group">
                <td class="py-4 pr-6">
                  <input v-model="item.key" placeholder="例如: Authorization" class="w-full bg-slate-50/0 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-blue-200 p-3 rounded-xl text-sm font-bold transition-all outline-none" />
                </td>
                <td class="py-4 pr-6">
                  <input v-model="item.value" placeholder="例如: Bearer token..." class="w-full bg-slate-50/0 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-blue-200 p-3 rounded-xl text-sm font-mono transition-all outline-none" />
                </td>
                <td class="py-4 text-right">
                  <button @click="removeRow(idx)" class="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 :size="18" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
        <div class="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-600 shrink-0">
          <Info :size="20" />
        </div>
        <div class="space-y-1">
          <h4 class="text-sm font-bold text-slate-900">本地化存储安全提示</h4>
          <p class="text-xs text-slate-500 leading-relaxed font-medium">
            此处保存的信息仅在当前域名的浏览器 LocalStorage 中存储，清理浏览器缓存或在其他设备登录时将无法找回。
            这种方式能有效防止敏感 Token 泄露到服务器数据库中。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
