import axios from 'axios'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { apiId, workflowRunId, query, headers, body: reqBody, env } = body

  const api = await prisma.apiDefinition.findUnique({
    where: { id: apiId },
    include: { apiGroup: true }
  })
  if (!api) throw createError({ statusCode: 404, message: 'API definition not found' })

  const baseUrl = env === 'PROD' ? api.apiGroup.prodUrl : api.apiGroup.testUrl
  const startTime = Date.now()
  let resStatus, resHeaders, resBody, error
  
  // 合并 Header：接口定义的默认 Header + 链路配置的覆盖 Header
  const mergedHeaders = {
    ...((api.reqHeaders as any) || {}),
    ...(headers || {})
  }

  try {
    const axiosConfig = {
      method: api.method,
      url: `${baseUrl}${api.path}`,
      params: query,
      data: reqBody,
      headers: mergedHeaders,
      timeout: 15000
    }
    const response = await axios(axiosConfig)
    resStatus = response.status
    resHeaders = response.headers
    resBody = response.data
  } catch (err: any) {
    resStatus = err.response?.status
    resBody = err.response?.data
    error = err.message
  }

  const duration = Date.now() - startTime

  // 写入持久化日志
  const log = await prisma.apiRunLog.create({
    data: {
      workflowRunId: workflowRunId || null,
      apiId,
      apiName: api.name,
      method: api.method,
      url: `${baseUrl}${api.path}`,
      reqHeaders: headers,
      reqQuery: query,
      reqBody: reqBody,
      resStatus,
      resHeaders: resHeaders as any,
      resBody: resBody as any,
      duration,
      error
    }
  })

  return { log }
})
