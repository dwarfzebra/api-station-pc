export default defineEventHandler(async (event) => {
  const workflowId = parseInt(getRouterParam(event, 'id') || '0')
  if (!workflowId) throw createError({ statusCode: 400, message: 'Workflow ID is required' })

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId }
  })

  if (!workflow) throw createError({ statusCode: 404, message: 'Workflow not found' })

  // 聚合查询 API 定义
  const steps = (workflow.steps as any[]) || []
  if (steps.length > 0) {
    const apiIds = [...new Set(steps.map(s => s.apiId))].filter(id => !!id)
    const apis = await prisma.apiDefinition.findMany({
      where: { id: { in: apiIds } }
    })

    // 将最新的定义合并回 steps
    workflow.steps = steps.map(step => {
      const detail = apis.find(a => a.id === step.apiId)
      return {
        ...step,
        apiDefinition: detail || null
      }
    })
  }

  return workflow
})
