export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  const group = await prisma.apiGroup.create({
    data: {
      name: body.name,
      description: body.description || '',
      testUrl: body.testUrl,
      prodUrl: body.prodUrl
    }
  })

  return group
})
