export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { sceneId, name, description } = body

  if (!sceneId || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Scene ID and Name are required' })
  }

  try {
    const workflow = await prisma.workflow.create({
      data: {
        sceneId: parseInt(sceneId),
        name,
        description
      }
    })
    return workflow
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
