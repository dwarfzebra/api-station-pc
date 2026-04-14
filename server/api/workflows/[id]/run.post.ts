import axios from 'axios'

export default defineEventHandler(async (event) => {
  const workflowId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)
  const env = body.env || 'TEST'

  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      nodes: {
        include: {
          apiDefinition: {
            include: { apiGroup: true }
          }
        }
      }
    }
  })

  if (!workflow) throw createError({ statusCode: 404, message: 'Workflow not found' })

  const globalSettings = await prisma.globalSetting.findMany()
  const globalHeaders = globalSettings.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})

  const results = []
  const context = {} // 用于存放中间变量，后续提取功能使用

  // 核心工具：将扁平的点语法列表转回 JSON 对象
  const reconstructFromList = (list: any[]) => {
    if (!Array.isArray(list)) return {}
    const obj: any = {}
    for (const item of list) {
      if (!item.name) continue
      const keys = item.name.replace(/\[\]/g, '').split('.')
      let current = obj
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        if (i === keys.length - 1) {
          // 尝试对默认值进行类型转换
          let val = item.defaultValue === undefined ? '' : item.defaultValue
          if (item.type === 'Number') val = Number(val)
          if (item.type === 'Boolean') val = val === 'true' || val === true
          current[key] = val
        } else {
          current[key] = current[key] || {}
          current = current[key]
        }
      }
    }
    return obj
  }

  for (const node of workflow.nodes) {
    const api = node.apiDefinition
    if (!api) continue

    const baseUrl = env === 'TEST' ? api.apiGroup.testUrl : api.apiGroup.prodUrl
    if (!baseUrl) {
      results.push({ name: api.name, status: 'ERROR', error: 'Base URL not configured' })
      continue
    }

    // 组装数据
    const queryParams = reconstructFromList(api.reqQuery as any[])
    const requestData = reconstructFromList(api.reqBody as any[])
    const requestHeaders = {
      ...globalHeaders,
      ...reconstructFromList(api.reqHeaders as any[])
    }

    // 处理 Path 参数交换: 将 /users/{id} 替换为真实值
    let finalPath = api.path
    const pathVars = finalPath.match(/\{[^\}]+\}/g) || []
    for (const placeholder of pathVars) {
      const key = placeholder.replace(/\{|\}/g, '')
      if (queryParams[key] !== undefined) {
        finalPath = finalPath.replace(placeholder, encodeURIComponent(String(queryParams[key])))
        delete queryParams[key] // 从 Query String 中移除，因为它已经进了 Path
      }
    }

    try {
      const startTime = Date.now()
      const response = await axios({
        method: api.method,
        url: `${baseUrl}${finalPath}`,
        params: queryParams,
        data: api.method.toLowerCase() !== 'get' ? requestData : undefined,
        headers: requestHeaders,
        timeout: 10000
      })

      results.push({
        name: api.name,
        status: 'SUCCESS',
        time: Date.now() - startTime,
        response: response.data
      })
    } catch (err: any) {
      results.push({
        name: api.name,
        status: 'FAIL',
        error: err.response?.data || err.message
      })
    }
  }

  return { results }
})
