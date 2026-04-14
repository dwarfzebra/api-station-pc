export default defineEventHandler(async (event) => {
  const workflowId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)
  const { steps, name, description } = body

  if (!workflowId) throw createError({ statusCode: 400, message: 'Workflow ID is required' })

  try {
    const updated = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: name || undefined,
        description: description || undefined,
        steps: steps || [] // [ { id, apiId, mappingConfig } ]
      }
    })
    return { success: true, workflow: updated }
  } catch (error: any) {
    throw createError({ statusCode: 500, message: error.message })
  }
})
