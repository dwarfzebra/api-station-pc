export default defineEventHandler(async (event) => {
  const runId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)
  const { status, duration } = body

  if (!runId) throw createError({ statusCode: 400, message: 'Run ID is required' })

  return await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      status,
      duration,
      endTime: new Date()
    }
  })
})
