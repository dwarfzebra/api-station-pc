export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { projectId, name, description } = body

  if (!projectId || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Project ID and Name are required' })
  }

  try {
    const workflow = await prisma.workflow.create({
      data: {
        projectId: parseInt(projectId),
        name,
        description
      }
    })
    return workflow
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
