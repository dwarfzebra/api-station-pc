export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const sceneId = query.sceneId as string

  try {
    const workflows = await prisma.workflow.findMany({
      where: sceneId ? { sceneId: parseInt(sceneId) } : {},
      include: {
        scene: {
          select: { name: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
    return workflows
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
