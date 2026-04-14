export default defineEventHandler(async (event) => {
  const workflowId = getRouterParam(event, 'id')

  if (!workflowId) {
    throw createError({ statusCode: 400, statusMessage: 'Workflow ID is required' })
  }

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: parseInt(workflowId) },
      include: {
        nodes: {
          include: {
            apiDefinition: true
          }
        },
        edges: true
      }
    })

    if (!workflow) {
      throw createError({ statusCode: 404, statusMessage: 'Workflow not found' })
    }

    return workflow
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
