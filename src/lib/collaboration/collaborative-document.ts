interface TextOperation {
  type: 'insert' | 'delete' | 'retain'
  position?: number
  length?: number
  text?: string
  attributes?: Record<string, any>
}

interface Operation {
  id: string
  clientId: string
  operations: TextOperation[]
  version: number
  timestamp: Date
}

interface DocumentState {
  content: string
  version: number
  operations: Operation[]
}

export class CollaborativeDocument {
  private documentId: string
  private content: string
  private version: number
  private operations: Operation[] = []
  private pendingOperations: Map<string, Operation[]> = new Map()
  public saveTimeout?: NodeJS.Timeout

  constructor(documentId: string, initialContent: string = '') {
    this.documentId = documentId
    this.content = initialContent
    this.version = 0
  }

  public applyOperation(operation: Operation, clientId: string): Operation {
    // Validate operation
    if (!this.isValidOperation(operation)) {
      throw new Error('Invalid operation')
    }

    // Transform operation against concurrent operations
    const transformedOperation = this.transformOperation(operation, clientId)

    // Apply operation to content
    this.content = this.applyOperationToContent(this.content, transformedOperation)
    
    // Update version and store operation
    this.version++
    transformedOperation.version = this.version
    transformedOperation.timestamp = new Date()
    this.operations.push(transformedOperation)

    // Clean up old operations (keep last 1000)
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000)
    }

    return transformedOperation
  }

  private isValidOperation(operation: Operation): boolean {
    if (!operation.id || !operation.clientId || !Array.isArray(operation.operations)) {
      return false
    }

    // Validate each text operation
    for (const op of operation.operations) {
      if (!['insert', 'delete', 'retain'].includes(op.type)) {
        return false
      }

      switch (op.type) {
        case 'insert':
          if (typeof op.position !== 'number' || typeof op.text !== 'string') {
            return false
          }
          break
        case 'delete':
          if (typeof op.position !== 'number' || typeof op.length !== 'number') {
            return false
          }
          break
        case 'retain':
          if (typeof op.length !== 'number') {
            return false
          }
          break
      }
    }

    return true
  }

  private transformOperation(operation: Operation, clientId: string): Operation {
    // Get concurrent operations (operations from other clients at the same version)
    const concurrentOps = this.operations.filter(op => 
      op.version >= operation.version && op.clientId !== clientId
    )

    if (concurrentOps.length === 0) {
      return operation
    }

    // Transform operation against each concurrent operation
    let transformedOps = [...operation.operations]
    
    for (const concurrentOp of concurrentOps) {
      transformedOps = this.transformOperations(transformedOps, concurrentOp.operations)
    }

    return {
      ...operation,
      operations: transformedOps
    }
  }

  private transformOperations(ops1: TextOperation[], ops2: TextOperation[]): TextOperation[] {
    // Simplified operational transformation
    // In a production system, you'd want a more sophisticated OT algorithm
    
    const result: TextOperation[] = []
    let offset = 0

    for (const op1 of ops1) {
      let transformedOp = { ...op1 }

      // Transform against each operation in ops2
      for (const op2 of ops2) {
        transformedOp = this.transformSingleOperation(transformedOp, op2, offset)
      }

      result.push(transformedOp)
    }

    return result
  }

  private transformSingleOperation(op1: TextOperation, op2: TextOperation, offset: number): TextOperation {
    // Transform op1 against op2
    const result = { ...op1 }

    if (op1.type === 'insert' && op2.type === 'insert') {
      // Both insertions - adjust position if op2 comes before op1
      if (op2.position! <= op1.position!) {
        result.position = op1.position! + (op2.text?.length || 0)
      }
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      // Insert vs delete - adjust position if delete comes before insert
      if (op2.position! <= op1.position!) {
        result.position = Math.max(op2.position!, op1.position! - op2.length!)
      }
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      // Delete vs insert - adjust position if insert comes before delete
      if (op2.position! <= op1.position!) {
        result.position = op1.position! + (op2.text?.length || 0)
      }
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      // Both deletions - handle overlapping deletes
      if (op2.position! <= op1.position!) {
        if (op2.position! + op2.length! <= op1.position!) {
          // op2 comes completely before op1
          result.position = op1.position! - op2.length!
        } else {
          // Overlapping deletes - adjust length and position
          const overlap = Math.min(op2.position! + op2.length!, op1.position! + op1.length!) - 
                         Math.max(op2.position!, op1.position!)
          result.position = op2.position!
          result.length = Math.max(0, op1.length! - overlap)
        }
      }
    }

    return result
  }

  private applyOperationToContent(content: string, operation: Operation): string {
    let result = content
    
    // Sort operations by position (descending) to avoid position shifts
    const sortedOps = [...operation.operations].sort((a, b) => {
      const posA = a.position || 0
      const posB = b.position || 0
      return posB - posA
    })

    for (const op of sortedOps) {
      switch (op.type) {
        case 'insert':
          result = result.slice(0, op.position!) + 
                  op.text + 
                  result.slice(op.position!)
          break
        case 'delete':
          result = result.slice(0, op.position!) + 
                  result.slice(op.position! + op.length!)
          break
        case 'retain':
          // Retain operations don't change content, just formatting
          break
      }
    }

    return result
  }

  public getContent(): string {
    return this.content
  }

  public getVersion(): number {
    return this.version
  }

  public getOperations(fromVersion?: number): Operation[] {
    if (fromVersion === undefined) {
      return [...this.operations]
    }
    return this.operations.filter(op => op.version > fromVersion)
  }

  public getState(): DocumentState {
    return {
      content: this.content,
      version: this.version,
      operations: [...this.operations]
    }
  }

  // Utility methods for creating operations
  public static createInsertOperation(
    clientId: string, 
    position: number, 
    text: string,
    attributes?: Record<string, any>
  ): Operation {
    return {
      id: `${clientId}-${Date.now()}-${Math.random()}`,
      clientId,
      operations: [{
        type: 'insert',
        position,
        text,
        attributes
      }],
      version: 0,
      timestamp: new Date()
    }
  }

  public static createDeleteOperation(
    clientId: string, 
    position: number, 
    length: number
  ): Operation {
    return {
      id: `${clientId}-${Date.now()}-${Math.random()}`,
      clientId,
      operations: [{
        type: 'delete',
        position,
        length
      }],
      version: 0,
      timestamp: new Date()
    }
  }

  public static createRetainOperation(
    clientId: string, 
    length: number,
    attributes?: Record<string, any>
  ): Operation {
    return {
      id: `${clientId}-${Date.now()}-${Math.random()}`,
      clientId,
      operations: [{
        type: 'retain',
        length,
        attributes
      }],
      version: 0,
      timestamp: new Date()
    }
  }

  // Conflict resolution utilities
  public resolveConflicts(): void {
    // Remove duplicate operations
    const seen = new Set<string>()
    this.operations = this.operations.filter(op => {
      if (seen.has(op.id)) {
        return false
      }
      seen.add(op.id)
      return true
    })

    // Sort operations by timestamp to ensure consistent ordering
    this.operations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  // Snapshot creation for efficient synchronization
  public createSnapshot(): {
    content: string
    version: number
    timestamp: Date
  } {
    return {
      content: this.content,
      version: this.version,
      timestamp: new Date()
    }
  }

  // Apply snapshot (for new clients joining)
  public applySnapshot(snapshot: {
    content: string
    version: number
    timestamp: Date
  }): void {
    this.content = snapshot.content
    this.version = snapshot.version
    // Clear operations older than snapshot
    this.operations = this.operations.filter(op => 
      op.timestamp > snapshot.timestamp
    )
  }
}