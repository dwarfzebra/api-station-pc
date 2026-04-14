import SwaggerParser from '@apidevtools/swagger-parser'

export default defineEventHandler(async (event) => {
  const groupId = parseInt(getRouterParam(event, 'id') || '0')
  const body = await readBody(event)
  const content = body.content

  if (!content) throw createError({ statusCode: 400, message: 'Empty content' })

  try {
    const rawSpec = JSON.parse(content)
    const spec: any = await SwaggerParser.dereference(rawSpec)
    const paths = spec.paths
    if (!paths) throw new Error('Invalid Swagger/OpenAPI format')

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
      const properties = schema.properties
      if (properties) {
        for (const [key, prop] of Object.entries(properties as any)) {
          const detail = prop as any
          const fullName = prefix ? `${prefix}.${key}` : key
          list.push({
            name: fullName,
            type: mapType(detail.type || (detail.properties ? 'object' : 'string')),
            required: schema.required?.includes(key) || false,
            defaultValue: detail.default !== undefined ? String(detail.default) : (detail.example !== undefined ? String(detail.example) : ''),
            description: detail.description || detail.title || ''
          })
          if (detail.properties) flattenSchema(detail, fullName, list, depth + 1)
          else if (detail.type === 'array' && detail.items?.properties) {
            flattenSchema(detail.items, `${fullName}[]`, list, depth + 1)
          }
        }
      }
      return list
    }

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, detail] of Object.entries(methods as any)) {
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

        // 2. Body 解析 (增强：同时支持 OAS 3.0 requestBody 和 Swagger 2.0 body parameter)
        const reqBodyList: any[] = []
        let reqBodyType = 'none'

        // 场景 A: OpenAPI 3.0 style
        if (item.requestBody) {
          const jsonContent = item.requestBody.content?.['application/json']
          if (jsonContent?.schema) {
            reqBodyType = 'raw-json'
            flattenSchema(jsonContent.schema, '', reqBodyList, 0)
          }
        } 
        // 场景 B: Swagger 2.0 style (in: body)
        else {
          const bodyParam = parameters.find((p: any) => p.in === 'body')
          if (bodyParam && bodyParam.schema) {
            reqBodyType = 'raw-json'
            flattenSchema(bodyParam.schema, '', reqBodyList, 0)
          }
        }

        // 3. Response 解析
        const resBody: any[] = []
        const successRes = item.responses?.['200'] || item.responses?.['201']
        const resSchema = successRes?.schema || successRes?.content?.['application/json']?.schema
        if (resSchema) {
          flattenSchema(resSchema, '', resBody, 0)
        }

        await prisma.apiDefinition.create({
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
        })
      }
    }
    return { success: true }
  } catch (err: any) {
    throw createError({ statusCode: 500, message: 'Parse failed: ' + err.message })
  }
})
