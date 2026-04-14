export default defineEventHandler(async (event) => {
  const groups = await prisma.apiGroup.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { apis: true }
      }
    }
  })

  // 获取一些全局统计
  const totalApis = await prisma.apiDefinition.count()
  const totalScenes = await prisma.workflowScene.count()
  
  return {
    groups,
    stats: {
      apiCount: totalApis,
      sceneCount: totalScenes
    }
  }
})
