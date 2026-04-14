export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (!body.name) throw createError({ statusCode: 400, message: 'Name is required' })

  const scene = await prisma.workflowScene.create({
    data: {
      name: body.name,
      description: body.description || ''
    }
  })

  return scene
})
