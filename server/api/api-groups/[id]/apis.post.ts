export default defineEventHandler(async (event) => {
  const groupId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)

  if (!body.name || !body.method || !body.path) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  const newApi = await prisma.apiDefinition.create({
    data: {
      groupId,
      name: body.name,
      method: body.method.toUpperCase(),
      path: body.path,
      reqHeaders: [],
      reqQuery: [],
      reqBody: [],
      resBody: [],
      reqBodyType: 'none'
    }
  })

  return newApi
})
