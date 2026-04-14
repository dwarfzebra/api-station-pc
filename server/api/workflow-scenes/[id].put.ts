export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)

  try {
    const scene = await prisma.workflowScene.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description
      }
    })
    return scene
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      message: '更新场景失败: ' + err.message
    })
  }
})
