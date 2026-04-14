export default defineEventHandler(async (event) => {
  try {
    const histories = await prisma.runHistory.findMany({
      include: {
        workflow: {
          include: {
            project: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return histories
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
