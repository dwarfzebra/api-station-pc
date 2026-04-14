export default defineEventHandler(async (event) => {
  const groupId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Name is required' })
  }

  const updated = await prisma.apiGroup.update({
    where: { id: groupId },
    data: {
      name: body.name,
      description: body.description,
      testUrl: body.testUrl,
      prodUrl: body.prodUrl
    }
  })

  return updated
})
