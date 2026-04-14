export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  const api = await prisma.apiDefinition.findUnique({
    where: { id }
  })
  if (!api) {
    throw createError({ statusCode: 404, statusMessage: 'API not found' })
  }
  return api
})
