export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const projectId = query.projectId as string

  try {
    const workflows = await prisma.workflow.findMany({
      where: projectId ? { projectId: parseInt(projectId) } : {},
      include: {
        _count: {
          select: { nodes: true }
        },
        project: {
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
