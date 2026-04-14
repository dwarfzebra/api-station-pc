export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const ids = body.ids

  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, message: 'Invalid IDs' })
  }

  const deleted = await prisma.apiDefinition.deleteMany({
    where: {
      id: { in: ids }
    }
  })

  return { deletedCount: deleted.count }
})
