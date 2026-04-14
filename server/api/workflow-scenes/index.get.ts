export default defineEventHandler(async (event) => {
  return prisma.workflowScene.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { workflows: true }
      }
    }
  })
})
