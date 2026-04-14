<script setup lang="ts">
import { Plus, Workflow, Calendar, ArrowRight } from 'lucide-vue-next'

const { data: workflows, refresh } = await useFetch('/api/workflows')
const { data: projects } = await useFetch('/api/projects')

const showCreateModal = ref(false)
const form = reactive({
  projectId: null as number | null,
  name: '',
  description: ''
})

const createWorkflow = async () => {
  if (!form.name || !form.projectId) return
  try {
    const res = await $fetch('/api/workflows', {
      method: 'POST',
      body: { ...form }
    })
    showCreateModal.value = false
    navigateTo(`/workflows/${res.id}`)
  } catch (err) {
    console.error(err)
  }
}
</script>

<template>
  <div class="animate-in">
    <header class="page-header">
      <div>
        <h1 class="page-title">链路编排</h1>
        <p class="text-secondary">串联多个接口形成完整业务流，实现自动化测试与联调。</p>
      </div>
      <button class="button button-primary" @click="showCreateModal = true">
        <Plus :size="18" />
        <span>新建链路</span>
      </button>
    </header>

    <div class="workflow-grid">
      <div v-if="!workflows?.length" class="empty-state">
        <Workflow :size="48" class="empty-icon" />
        <p>暂无链路定义，点击新建按钮开始编排</p>
      </div>

      <NuxtLink 
        v-for="wf in workflows" 
        :key="wf.id" 
        :to="`/workflows/${wf.id}`"
        class="card workflow-card clickable"
      >
        <div class="wf-status">
          <div class="status-indicator"></div>
          <span>{{ wf.project.name }}</span>
        </div>
        <h3>{{ wf.name }}</h3>
        <p class="text-secondary">{{ wf.description || '暂无链路描述' }}</p>
        
        <div class="wf-footer">
          <div class="wf-stats">
            <Layers :size="14" />
            <span>{{ wf._count.nodes }} 节点</span>
          </div>
          <div class="wf-date">
            <Calendar :size="14" />
            <span>{{ new Date(wf.updatedAt).toLocaleDateString() }}</span>
          </div>
          <ArrowRight :size="16" class="arrow" />
        </div>
      </NuxtLink>
    </div>

    <!-- Create Modal -->
    <BaseModal :show="showCreateModal" title="新建自动化链路" @close="showCreateModal = false">
      <form class="create-form" @submit.prevent="createWorkflow">
        <div class="form-group">
          <label>所属项目</label>
          <select v-model="form.projectId" class="select-input">
            <option :value="null" disabled>请选择项目</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>链路名称</label>
          <input v-model="form.name" type="text" placeholder="如：用户注册与登录完整流" />
        </div>
        <div class="form-group">
          <label>描述</label>
          <textarea v-model="form.description" rows="3" placeholder="描述该链路的业务场景..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="button" @click="showCreateModal = false">取消</button>
          <button type="submit" class="button button-primary" :disabled="!form.name || !form.projectId">
            确认并去编排
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 40px;
}

.page-title {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.workflow-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.workflow-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.wf-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.status-indicator {
  width: 6px;
  height: 6px;
  background: var(--accent-primary);
  border-radius: 50%;
}

.wf-footer {
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.wf-stats, .wf-date {
  display: flex;
  align-items: center;
  gap: 4px;
}

.arrow {
  margin-left: auto;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s;
}

.workflow-card:hover .arrow {
  opacity: 1;
  transform: translateX(0);
}

.select-input {
  padding: 12px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: 0.9375rem;
  background: white;
}

.empty-state {
  grid-column: 1 / -1;
  height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-light);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  gap: 16px;
}

.empty-icon {
  opacity: 0.2;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
}

.form-group input, .form-group textarea {
  padding: 10px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}
</style>
