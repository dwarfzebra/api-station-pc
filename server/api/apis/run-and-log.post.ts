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
  
  // 1. 处理路径变量 (Path Variables)
  let finalPath = api.path
  const pathVars = finalPath.match(/\{[^\}]+\}/g) || []
  const runtimeQuery = { ...(query || {}) }
  
  for (const placeholder of pathVars) {
    const key = placeholder.replace(/\{|\}/g, '')
    if (runtimeQuery[key] !== undefined) {
      finalPath = finalPath.replace(placeholder, encodeURIComponent(String(runtimeQuery[key])))
      delete runtimeQuery[key] // 从 Query 中移除，防止重复发送
    }
  }

  // 2. 合并 Header
  const mergedHeaders = {
    ...((api.reqHeaders as any) || {}),
    ...(headers || {})
  }

  try {
    const axiosConfig = {
      method: api.method,
      url: `${baseUrl}${finalPath}`,
      params: runtimeQuery,
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

  const log = {
    workflowRunId: workflowRunId || null,
    apiId,
    apiName: api.name,
    method: api.method,
    url: `${baseUrl}${finalPath}${Object.keys(runtimeQuery || {}).length ? '?' + new URLSearchParams(runtimeQuery as any).toString() : ''}`,
    reqHeaders: headers,
    reqQuery: query,
    reqBody: reqBody,
    resStatus,
    resHeaders: resHeaders as any,
    resBody: resBody as any,
    duration,
    error
  }

  return { log }
})
