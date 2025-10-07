import { CognitiveMapRepository } from '../src/lib/repositories/cognitive-map.ts'

async function main() {
  const repo = new CognitiveMapRepository()

  // Create a map
  const map = await repo.create({
    title: 'Test In-Memory Map',
    description: 'Created via ts-node script',
    isPublic: false,
    userId: 'demo-user',
  })

  // Add nodes
  const nodeA = await repo.addNode(map.id, {
    type: 'concept',
    title: 'Node A',
    positionX: 100,
    positionY: 150,
  })

  const nodeB = await repo.addNode(map.id, {
    type: 'concept',
    title: 'Node B',
    positionX: 300,
    positionY: 150,
  })

  // Add a connection
  const connection = await repo.addConnection({
    sourceNodeId: nodeA.id,
    targetNodeId: nodeB.id,
    relationshipType: 'relates_to',
    label: 'A -> B',
    strength: 0.8,
  })

  // Fetch composed map
  const found = await repo.findById(map.id)

  console.log(JSON.stringify({ map, nodeA, nodeB, connection, found }, null, 2))
}

main().catch(err => {
  console.error('Test script failed:', err)
  process.exit(1)
})