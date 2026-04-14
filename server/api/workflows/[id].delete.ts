export default defineEventHandler(async (event) => {
  const id = event.context.params?.id
  if (!id) throw createError({ statusCode: 400, message: 'Missing ID' })

  try {
    await prisma.workflow.delete({
      where: { id: parseInt(id) }
    })
    return { message: 'Workflow deleted successfully' }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
