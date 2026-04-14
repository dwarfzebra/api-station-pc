export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { ids } = body // Expecting an array of IDs

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'API IDs array is required' })
  }

  try {
    await prisma.apiDefinition.deleteMany({
      where: {
        id: { in: ids.map(id => parseInt(id)) }
      }
    })
    return { success: true, count: ids.length }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
