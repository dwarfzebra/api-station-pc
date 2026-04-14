export default defineEventHandler(async (event) => {
  const workflowId = parseInt(getRouterParam(event, 'id') || '0')
  if (!workflowId) throw createError({ statusCode: 400, message: 'Workflow ID is required' })

  // 创建一条处于 RUNNING 状态的链路运行记录
  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      status: 'RUNNING',
      startTime: new Date()
    }
  })

  return run
})
