import { UserRepository } from './user'
import { CognitiveMapRepository } from './cognitive-map'
import { DocumentRepository } from './document'
import { MemoryCardRepository } from './memory-card'
import { ActivityRepository } from './activity'
import { NotificationRepository } from './notification'

// Create singleton instances
export const userRepository = new UserRepository()
export const cognitiveMapRepository = new CognitiveMapRepository()
export const documentRepository = new DocumentRepository()
export const memoryCardRepository = new MemoryCardRepository()
export const activityRepository = new ActivityRepository()
export const notificationRepository = new NotificationRepository()

// Export classes for direct instantiation if needed
export {
  UserRepository,
  CognitiveMapRepository,
  DocumentRepository,
  MemoryCardRepository,
  ActivityRepository,
  NotificationRepository
}