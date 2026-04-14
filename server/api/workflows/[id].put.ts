export default defineEventHandler(async (event) => {
  const workflowId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { nodes, edges } = body

  if (!workflowId) {
    throw createError({ statusCode: 400, statusMessage: 'Workflow ID is required' })
  }

  const wfId = parseInt(workflowId)

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Delete existing nodes and edges for this workflow
      // Note: Cascade might handle edges if nodes are deleted, 
      // but let's be explicit or rely on schema.
      await tx.workflowEdge.deleteMany({ where: { workflowId: wfId } })
      await tx.workflowNode.deleteMany({ where: { workflowId: wfId } })

      // 2. Create nodes and keep a map of vId -> DB Id
      const vIdToDbId: Record<string, number> = {}
      
      for (const node of nodes) {
        const created = await tx.workflowNode.create({
          data: {
            workflowId: wfId,
            nodeType: 'API', // Default for now
            apiId: node.data?.apiId || null,
            nodeName: node.label || '新节点',
            uiConfig: {
              vId: node.id,
              position: node.position
            },
            mappingConfig: node.data?.mappingConfig || {}
          }
        })
        vIdToDbId[node.id] = created.id
      }

      // 3. Create edges using the map
      for (const edge of edges) {
        const sourceDbId = vIdToDbId[edge.source]
        const targetDbId = vIdToDbId[edge.target]
        
        if (sourceDbId && targetDbId) {
          await tx.workflowEdge.create({
            data: {
              workflowId: wfId,
              sourceNodeId: sourceDbId,
              targetNodeId: targetDbId
            }
          })
        }
      }

      return { success: true }
    })
  } catch (error: any) {
    console.error('Save workflow error:', error)
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})
