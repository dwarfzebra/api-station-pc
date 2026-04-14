export default defineEventHandler(async (event) => {
  const apiId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)

  const updated = await prisma.apiDefinition.update({
    where: { id: apiId },
    data: {
      name: body.name,
      method: body.method,
      path: body.path,
      reqHeaders: body.reqHeaders, // 结构化 JSON: [{key, value, description, required}]
      reqQuery: body.reqQuery,
      reqBodyType: body.reqBodyType,
      reqBody: body.reqBody,
      resBody: body.resBody
    }
  })

  return updated
})
