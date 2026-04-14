export default defineEventHandler(async (event) => {
  const sceneId = parseInt(getRouterParam(event, 'id') || '0')
  const method = event.method

  if (method === 'GET') {
    return prisma.workflow.findMany({
      where: { sceneId },
      orderBy: { updatedAt: 'desc' }
    })
  }

  if (method === 'POST') {
    const body = await readBody(event)
    if (!body.name) throw createError({ statusCode: 400, message: 'Name is required' })

    return prisma.workflow.create({
      data: {
        sceneId,
        name: body.name,
        description: body.description || ''
      }
    })
  }
})
