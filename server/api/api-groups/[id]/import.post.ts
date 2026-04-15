import SwaggerParser from '@apidevtools/swagger-parser'

export default defineEventHandler(async (event) => {
  const groupId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)
  const content = body.content

  if (!content) throw createError({ statusCode: 400, message: 'Empty content' })

  try {
    let rawSpec: any
    try {
      rawSpec = JSON.parse(content)
    } catch (e) {
      // 如果不是有效的 JSON，尝试直接交给 Parser（它支持直接传入字符串并自动识别 YAML）
      rawSpec = content
    }

    // 1. 尝试深度解析 (Dereference)
    let spec: any
    try {
      spec = await SwaggerParser.dereference(rawSpec, {
        dereference: {
          circular: 'ignore' // 允许循环引用
        }
      })
    } catch (err: any) {
      // 降级策略：如果解引用失败（通常是因为 $ref 找不到定义），回退到基础解析 (Parse)
      // 这样至少能导入路径和基本参数，虽然缺失引用的 Schema 会被跳过，但不至于整个导入失败
      console.warn('Swagger Dereference failed, using lenient fallback:', err.message)
      spec = await SwaggerParser.parse(rawSpec)
    }

    const paths = spec.paths
    if (!paths) throw new Error('解析失败：未在文件中找到有效的 API 路径定义 (paths)。')

    const mapType = (t: string) => {
      if (!t) return 'String'
      const typeMap: Record<string, string> = {
        'string': 'String',
        'integer': 'Number',
        'number': 'Number',
        'boolean': 'Boolean',
        'object': 'Object',
        'array': 'Array'
      }
      return typeMap[t.toLowerCase()] || 'String'
    }

    const flattenSchema = (schema: any, prefix = '', list: any[] = [], depth = 0) => {
      if (!schema || depth > 8) return list
      
      // 处理单值 (如果 schema 直接是类型定义而非对象)
      if (schema.type && !schema.properties && prefix) {
        list.push({
          name: prefix,
          type: mapType(schema.type),
          required: false,
          defaultValue: schema.default !== undefined ? String(schema.default) : '',
          description: schema.description || ''
        })
        return list
      }

      const properties = schema.properties
      if (properties) {
        for (const [key, prop] of Object.entries(properties as any)) {
          const detail = prop as any
          const fullName = prefix ? `${prefix}.${key}` : key
          
          // 如果是一个引用但解引用失败了（理论上不会走到这，除非 dereference 配置了不按预期工作）
          if (detail.$ref) continue 

          list.push({
            name: fullName,
            type: mapType(detail.type || (detail.properties ? 'object' : 'string')),
            required: schema.required?.includes(key) || false,
            defaultValue: detail.default !== undefined ? String(detail.default) : (detail.example !== undefined ? String(detail.example) : ''),
            description: detail.description || detail.title || ''
          })
          
          if (detail.properties) {
            flattenSchema(detail, fullName, list, depth + 1)
          } else if (detail.type === 'array' && (detail.items?.properties || detail.items?.type)) {
            flattenSchema(detail.items, `${fullName}[]`, list, depth + 1)
          }
        }
      }
      return list
    }

    // 批量收集任务，提高一点效率
    const importTasks = []

    for (const [path, methods] of Object.entries(paths)) {
      if (!methods) continue
      for (const [method, detail] of Object.entries(methods as any)) {
        if (['parameters', 'summary', 'description'].includes(method)) continue // 跳过非方法键
        
        const item = detail as any
        const parameters = item.parameters || []
        
        // 1. Parameters (Query, Header, Path)
        const reqQuery = parameters
          .filter((p: any) => p.in === 'query' || p.in === 'path')
          .map((p: any) => ({
            name: p.name,
            type: mapType(p.type || p.schema?.type || 'string'),
            required: !!p.required,
            defaultValue: p.default !== undefined ? String(p.default) : '',
            description: p.description || ''
          }))

        const reqHeaders = parameters
          .filter((p: any) => p.in === 'header')
          .map((p: any) => ({
            name: p.name,
            type: 'String',
            required: !!p.required,
            defaultValue: p.default !== undefined ? String(p.default) : '',
            description: p.description || ''
          }))

        // 2. Body 解析
        const reqBodyList: any[] = []
        let reqBodyType = 'none'

        if (item.requestBody) {
          const jsonContent = item.requestBody.content?.['application/json']
          if (jsonContent?.schema) {
            reqBodyType = 'raw-json'
            flattenSchema(jsonContent.schema, '', reqBodyList, 0)
          }
        } else {
          const bodyParam = parameters.find((p: any) => p.in === 'body')
          if (bodyParam && bodyParam.schema) {
            reqBodyType = 'raw-json'
            flattenSchema(bodyParam.schema, '', reqBodyList, 0)
          }
        }

        // 3. Response 解析
        const resBody: any[] = []
        const successRes = item.responses?.['200'] || item.responses?.['201'] || item.responses?.default
        const resSchema = successRes?.schema || successRes?.content?.['application/json']?.schema
        if (resSchema) {
          flattenSchema(resSchema, '', resBody, 0)
        }

        importTasks.push(prisma.apiDefinition.create({
          data: {
            groupId,
            name: item.summary || item.operationId || `${method.toUpperCase()} ${path}`,
            method: method.toUpperCase(),
            path: path,
            reqQuery,
            reqHeaders,
            reqBodyType,
            reqBody: reqBodyList,
            resBody
          }
        }))
      }
    }
    
    await Promise.all(importTasks)
    return { success: true, count: importTasks.length }
  } catch (err: any) {
    if (err.statusCode) throw err
    throw createError({ statusCode: 500, message: '解析或导入失败：' + (err.message || '未知错误') })
  }
})
