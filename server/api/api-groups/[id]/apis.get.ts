export default defineEventHandler(async (event) => {
  const groupId = parseInt(getRouterParam(event, 'id') || '0')
  return prisma.apiDefinition.findMany({
    where: { groupId },
    orderBy: { updatedAt: 'desc' }
  })
})
