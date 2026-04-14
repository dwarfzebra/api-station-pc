<script setup lang="ts">
import { 
  BarChart3, 
  FolderRoot, 
  Workflow, 
  History, 
  Layers,
  Settings,
  ChevronDown
} from 'lucide-vue-next'

const currentEnv = useState('currentEnv', () => 'TEST')
const showEnvMenu = ref(false)

const toggleEnv = () => {
  currentEnv.value = currentEnv.value === 'TEST' ? 'PROD' : 'TEST'
  showEnvMenu.value = false
}
</script>

<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-64 bg-slate-50 border-r border-slate-200 sticky top-0 h-screen p-8 flex flex-col shrink-0">
      <NuxtLink to="/" class="flex items-center gap-3 px-3 mb-12">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Layers :size="18" class="text-white" />
        </div>
        <span class="font-heading text-xl font-bold tracking-tight">API Station</span>
      </NuxtLink>
      
      <nav class="flex-1 flex flex-col gap-1">
        <NuxtLink to="/" class="nav-link" active-class="active">
          <BarChart3 :size="18" />
          <span>概览</span>
        </NuxtLink>
        <NuxtLink to="/api-groups" class="nav-link" :class="{ active: $route.path.startsWith('/api-groups') }">
          <FolderRoot :size="18" />
          <span>API 分组</span>
        </NuxtLink>
        <NuxtLink to="/scenes" class="nav-link" :class="{ active: $route.path.startsWith('/scenes') }">
          <Workflow :size="18" />
          <span>自动化场景</span>
        </NuxtLink>
        <NuxtLink to="/history" class="nav-link" active-class="active">
          <History :size="18" />
          <span>运行日志</span>
        </NuxtLink>
        <NuxtLink to="/settings" class="nav-link" active-class="active">
          <Settings :size="18" />
          <span>全局配置</span>
        </NuxtLink>
      </nav>

      <div class="mt-auto relative">
        <button 
          @click="showEnvMenu = !showEnvMenu"
          class="w-full flex items-center justify-between gap-2 p-3 bg-white border border-slate-200 rounded-lg text-xs font-bold shadow-sm hover:shadow-md transition-all"
        >
          <div class="flex items-center gap-2">
            <div :class="['w-2 h-2 rounded-full animate-pulse', currentEnv === 'TEST' ? 'bg-emerald-500' : 'bg-red-500']"></div>
            <span>{{ currentEnv === 'TEST' ? '测试环境 (Default)' : '生产环境 (PROD)' }}</span>
          </div>
          <ChevronDown :size="14" class="text-slate-400" />
        </button>

        <Transition name="fade">
          <div v-if="showEnvMenu" class="absolute bottom-full mb-2 left-0 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden py-1 z-50">
            <button @click="currentEnv = 'TEST'; showEnvMenu = false" class="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 transition-colors flex items-center justify-between">
              <span>测试环境</span>
              <div v-if="currentEnv === 'TEST'" class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            </button>
            <button @click="currentEnv = 'PROD'; showEnvMenu = false" class="w-full px-4 py-2 text-left text-xs hover:bg-slate-50 transition-colors flex items-center justify-between">
              <span>生产环境</span>
              <div v-if="currentEnv === 'PROD'" class="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
            </button>
          </div>
        </Transition>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 bg-white flex flex-col min-w-0">
      <header class="h-16 border-b border-slate-200 flex items-center justify-between px-10 shrink-0">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-slate-400">Workspace</span>
          <span class="text-slate-200">/</span>
          <span class="font-medium text-slate-600">
            {{ $route.path.split('/')[1] || 'Overview' }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter shadow-sm border border-blue-100">
            ST
          </div>
        </div>
      </header>
      
      <div class="p-10 max-w-6xl w-full mx-auto flex-1 overflow-auto">
        <slot />
      </div>
    </main>
    
    <BaseToast />
  </div>
</template>

<style scoped>
.nav-link {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-500 font-semibold text-[13px] transition-all hover:bg-blue-50 hover:text-slate-900;
}

.nav-link.active {
  @apply bg-white text-slate-900 shadow-sm border border-slate-200;
}

.nav-link svg {
  @apply opacity-60 transition-opacity;
}

.nav-link.active svg {
  @apply opacity-100 text-blue-600;
}

.fade-enter-active, .fade-leave-active { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>
