export default defineEventHandler(async (event) => {
  const method = event.method
  
  // GET: Get all or specific
  if (method === 'GET') {
    return prisma.globalSetting.findMany()
  }

  // POST: Set or update
  if (method === 'POST') {
    const body = await readBody(event)
    const { key, value } = body
    
    if (!key) throw createError({ statusCode: 400, message: 'Key is required' })

    return prisma.globalSetting.upsert({
      where: { configKey: key },
      update: { configValue: value },
      create: { configKey: key, configValue: value }
    })
  }

})
