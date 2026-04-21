import axios from 'axios'

export default defineEventHandler(async (event) => {
  const apiId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)
  const env = body.env || 'TEST'
  const customParams = body.params || {} 
  const globalHeaders = body.settings || {} // 从前端 Payload 直接获取

  const api = await prisma.apiDefinition.findUnique({
    where: { id: apiId },
    include: { apiGroup: true }
  })

  if (!api) throw createError({ statusCode: 404, message: 'API not found' })

  const baseUrl = env === 'TEST' ? api.apiGroup.testUrl : api.apiGroup.prodUrl
  if (!baseUrl) throw createError({ statusCode: 400, message: 'Base URL not configured' })

  const setToPath = (obj: any, path: string, value: any) => {
    const keys = path.replace(/\[\]/g, '').split('.')
    let current = obj
    for (let i = 0; i < keys.length; i++) {
      if (i === keys.length - 1) current[keys[i]] = value
      else {
        current[keys[i]] = current[keys[i]] || {}
        current = current[keys[i]]
      }
    }
  }

  // 智能转换：根据 API 定义将字符串转换回正确的类型 (Array/Object)
  const coerceValue = (val: any, fieldName: string, metaList: any[]) => {
    if (typeof val !== 'string') return val
    const meta = metaList?.find(m => m.name === fieldName)
    if (!meta) return val
    
    if (meta.type === 'Array' || meta.type === 'Object') {
      try {
        if (val.trim() === '' && meta.type === 'Array') return []
        if (val.trim() === '' && meta.type === 'Object') return {}
        return JSON.parse(val)
      } catch (e) {
        return meta.type === 'Array' ? [] : {}
      }
    }
    return val
  }

  const query = {}
  const headers = { 
    'Content-Type': 'application/json',
    ...globalHeaders
  }
  const requestBody = {}

  Object.entries(customParams.query || {}).forEach(([k, v]) => {
    const val = coerceValue(v, k, api.reqQuery as any[])
    setToPath(query, k, val)
  })
  Object.entries(customParams.headers || {}).forEach(([k, v]) => {
    setToPath(headers, k, v) // Header 通常保持 String
  })
  Object.entries(customParams.body || {}).forEach(([k, v]) => {
    const val = coerceValue(v, k, api.reqBody as any[])
    setToPath(requestBody, k, val)
  })

  let finalPath = api.path
  const pathVars = finalPath.match(/\{[^\}]+\}/g) || []
  for (const placeholder of pathVars) {
    const key = placeholder.replace(/\{|\}/g, '')
    if (query[key] !== undefined) {
      finalPath = finalPath.replace(placeholder, encodeURIComponent(String(query[key])))
      delete query[key]
    }
  }

  let logStatus = 'SUCCESS'
  let responseData: any = null
  let startTime = Date.now()

  try {
    const response = await axios({
      method: api.method,
      url: `${baseUrl}${finalPath}`,
      params: query,
      data: api.method.toUpperCase() !== 'GET' ? requestBody : undefined,
      headers: headers,
      timeout: 10000
    })
    responseData = response.data
  } catch (err: any) {
    logStatus = 'FAIL'
    responseData = err.response?.data || err.message
  }

  const duration = Date.now() - startTime

  // 已移除：服务端 ApiDebugLog 写入逻辑

  return { 
    status: logStatus, 
    duration, 
    responseData,
    requestSnapshot: { 
      url: `${baseUrl}${finalPath}${Object.keys(query || {}).length ? '?' + new URLSearchParams(query as any).toString() : ''}`, 
      method: api.method, 
      headers, 
      query, 
      body: api.method.toUpperCase() !== 'GET' ? requestBody : null 
    },
    timestamp: new Date().toISOString()
  }
})
