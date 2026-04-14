export default defineEventHandler(async (event) => {
  const historyId = getRouterParam(event, 'id')

  if (!historyId) {
    throw createError({ statusCode: 400, statusMessage: 'History ID is required' })
  }

  try {
    const history = await prisma.runHistory.findUnique({
      where: { id: historyId },
      include: {
        workflow: true,
        nodeDetails: {
          include: {
            workflowNode: {
              include: {
                apiDefinition: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!history) {
      throw createError({ statusCode: 404, statusMessage: 'History not found' })
    }

    return history
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
