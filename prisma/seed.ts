import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@mindmesh.com' },
    update: {},
    create: {
      email: 'demo@mindmesh.com',
      name: 'Demo User',
      preferences: JSON.stringify({
        theme: 'light',
        aiMode: 'scholar',
        notifications: {
          memoryReviews: true,
          collaborationUpdates: true,
          inspirationStream: false,
        },
        wellness: {
          pomodoroLength: 25,
          breakReminders: true,
          dailyGoals: 5,
        },
      }),
    },
  })

  console.log('👤 Created demo user:', demoUser.email)

  // Create a sample cognitive map with specific ID
  const cognitiveMap = await prisma.cognitiveMap.upsert({
    where: { id: 'demo-map-1' },
    update: {},
    create: {
      id: 'demo-map-1',
      userId: demoUser.id,
      title: 'Machine Learning Fundamentals',
      description: 'Core concepts and algorithms in machine learning',
      isPublic: false,
    },
  })

  console.log('🗺️ Created cognitive map:', cognitiveMap.title)

  // Create sample nodes
  const nodes = await Promise.all([
    prisma.cognitiveNode.create({
      data: {
        mapId: cognitiveMap.id,
        type: 'concept',
        title: 'Supervised Learning',
        content: 'Learning with labeled training data',
        positionX: 100,
        positionY: 100,
        metadata: JSON.stringify({ color: '#3B82F6' }),
      },
    }),
    prisma.cognitiveNode.create({
      data: {
        mapId: cognitiveMap.id,
        type: 'concept',
        title: 'Unsupervised Learning',
        content: 'Learning patterns from unlabeled data',
        positionX: 300,
        positionY: 100,
        metadata: JSON.stringify({ color: '#10B981' }),
      },
    }),
    prisma.cognitiveNode.create({
      data: {
        mapId: cognitiveMap.id,
        type: 'concept',
        title: 'Neural Networks',
        content: 'Networks of interconnected nodes inspired by biological neurons',
        positionX: 200,
        positionY: 250,
        metadata: JSON.stringify({ color: '#F59E0B' }),
      },
    }),
  ])

  console.log('🔗 Created nodes:', nodes.length)

  // Create connections between nodes
  await prisma.nodeConnection.create({
    data: {
      sourceNodeId: nodes[0].id,
      targetNodeId: nodes[2].id,
      relationshipType: 'implements',
      label: 'can use',
      strength: 0.8,
    },
  })

  await prisma.nodeConnection.create({
    data: {
      sourceNodeId: nodes[1].id,
      targetNodeId: nodes[2].id,
      relationshipType: 'implements',
      label: 'can use',
      strength: 0.7,
    },
  })

  console.log('🔗 Created node connections')

  // Create sample documents
  const documents = await Promise.all([
    prisma.document.create({
      data: {
        userId: demoUser.id,
        title: 'Introduction to Machine Learning',
        content: 'Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn and make decisions from data...',
        type: 'note',
        embeddings: JSON.stringify([0.1, 0.2, 0.3]), // Simplified embeddings
        metadata: JSON.stringify({
          tags: JSON.stringify(['machine-learning', 'ai', 'introduction']),
          source: 'personal-notes',
        }),
      },
    }),
    prisma.document.create({
      data: {
        userId: demoUser.id,
        title: 'Deep Learning Research Paper',
        content: 'Abstract: This paper presents a comprehensive study of deep neural networks...',
        type: 'pdf',
        fileUrl: '/documents/deep-learning-paper.pdf',
        embeddings: JSON.stringify([0.4, 0.5, 0.6]),
        metadata: JSON.stringify({
          tags: JSON.stringify(['deep-learning', 'research', 'neural-networks']),
          author: 'Dr. Jane Smith',
          year: 2023,
        }),
      },
    }),
  ])

  console.log('📄 Created documents:', documents.length)

  // Create sample memory cards
  const memoryCards = await Promise.all([
    prisma.memoryCard.create({
      data: {
        userId: demoUser.id,
        front: 'What is supervised learning?',
        back: 'A type of machine learning where the algorithm learns from labeled training data to make predictions on new, unseen data.',
        difficulty: 1,
        nextReview: new Date(),
        tags: JSON.stringify(['machine-learning', 'supervised-learning']),
      },
    }),
    prisma.memoryCard.create({
      data: {
        userId: demoUser.id,
        front: 'What is the difference between classification and regression?',
        back: 'Classification predicts discrete categories or classes, while regression predicts continuous numerical values.',
        difficulty: 2,
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        tags: JSON.stringify(['machine-learning', 'classification', 'regression']),
      },
    }),
  ])

  console.log('🃏 Created memory cards:', memoryCards.length)

  // Create a sample collaborative project
  const project = await prisma.collaborativeProject.create({
    data: {
      title: 'AI Research Project',
      description: 'Collaborative research on the latest AI developments',
      ownerId: demoUser.id,
      isPublic: false,
    },
  })

  // Create a shared document in the project
  await prisma.sharedDocument.create({
    data: {
      projectId: project.id,
      title: 'Project Overview',
      content: '# AI Research Project\n\nThis project aims to explore the latest developments in artificial intelligence...',
      version: 1,
    },
  })

  console.log('🤝 Created collaborative project:', project.title)

  // Create sample user activities
  const activities = await Promise.all([
    prisma.userActivity.create({
      data: {
        userId: demoUser.id,
        activityType: 'login',
        metadata: JSON.stringify({ source: 'web' }),
      },
    }),
    prisma.userActivity.create({
      data: {
        userId: demoUser.id,
        activityType: 'map_created',
        entityType: 'cognitive_map',
        entityId: cognitiveMap.id,
        metadata: JSON.stringify({ mapTitle: cognitiveMap.title }),
      },
    }),
    prisma.userActivity.create({
      data: {
        userId: demoUser.id,
        activityType: 'card_reviewed',
        entityType: 'memory_card',
        entityId: memoryCards[0].id,
        metadata: JSON.stringify({ performance: 'good' }),
      },
    }),
  ])

  console.log('📊 Created user activities:', activities.length)

  // Create sample notifications
  const notifications = await Promise.all([
    prisma.notification.create({
      data: {
        userId: demoUser.id,
        type: 'review_reminder',
        title: 'Memory Cards Due for Review',
        message: 'You have 2 memory cards ready for review to strengthen your learning.',
        priority: 'normal',
        metadata: JSON.stringify({ cardCount: 2 }),
      },
    }),
    prisma.notification.create({
      data: {
        userId: demoUser.id,
        type: 'reflection_prompt',
        title: 'Daily Reflection',
        message: 'Take a moment to reflect on what you learned today.',
        priority: 'low',
        isRead: true,
        readAt: new Date(),
        metadata: JSON.stringify({ promptType: 'daily' }),
      },
    }),
  ])

  console.log('🔔 Created notifications:', notifications.length)

  // Create sample content feed items
  const contentFeed = await Promise.all([
    prisma.contentFeed.create({
      data: {
        userId: demoUser.id,
        title: 'Latest Advances in Transformer Architecture',
        description: 'A comprehensive overview of recent improvements to transformer models in natural language processing.',
        sourceUrl: 'https://example.com/transformer-advances',
        contentType: 'article',
        relevanceScore: 0.9,
        qualityScore: 0.85,
        tags: JSON.stringify(['transformers', 'nlp', 'deep-learning']),
        readingTime: 12,
        metadata: JSON.stringify({
          author: 'Dr. Alex Chen',
          publishedDate: '2024-01-15',
          difficulty: 'intermediate',
        }),
      },
    }),
    prisma.contentFeed.create({
      data: {
        userId: demoUser.id,
        title: 'Introduction to Reinforcement Learning',
        description: 'A beginner-friendly video series explaining the fundamentals of reinforcement learning.',
        sourceUrl: 'https://example.com/rl-intro',
        contentType: 'video',
        relevanceScore: 0.8,
        qualityScore: 0.9,
        tags: JSON.stringify(['reinforcement-learning', 'beginner', 'tutorial']),
        readingTime: 45,
        isBookmarked: true,
        metadata: JSON.stringify({
          duration: '45 minutes',
          difficulty: 'beginner',
          series: 'ML Fundamentals',
        }),
      },
    }),
  ])

  console.log('📰 Created content feed items:', contentFeed.length)

  // Create sample wellness data
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const wellnessData = await Promise.all([
    prisma.wellnessData.create({
      data: {
        userId: demoUser.id,
        date: yesterday,
        stressLevel: 3,
        energyLevel: 7,
        focusQuality: 8,
        sleepHours: 7.5,
        exerciseMinutes: 30,
        meditationMinutes: 10,
        notes: 'Good productive day with morning exercise',
      },
    }),
    prisma.wellnessData.create({
      data: {
        userId: demoUser.id,
        date: today,
        stressLevel: 4,
        energyLevel: 6,
        focusQuality: 7,
        sleepHours: 6.5,
        exerciseMinutes: 0,
        meditationMinutes: 5,
        notes: 'Feeling a bit tired, need more sleep',
      },
    }),
  ])

  console.log('🧘 Created wellness data entries:', wellnessData.length)

  // Create sample focus sessions
  const focusSessions = await Promise.all([
    prisma.focusSession.create({
      data: {
        userId: demoUser.id,
        sessionType: 'pomodoro',
        plannedDuration: 25,
        actualDuration: 25,
        isCompleted: true,
        productivity: 8,
        distractions: 1,
        notes: 'Great focus session working on ML concepts',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 25 * 60 * 1000), // 25 minutes later
      },
    }),
    prisma.focusSession.create({
      data: {
        userId: demoUser.id,
        sessionType: 'deep_work',
        plannedDuration: 90,
        actualDuration: 75,
        isCompleted: true,
        productivity: 7,
        distractions: 3,
        notes: 'Deep work session on research paper, had some interruptions',
        startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000 + 75 * 60 * 1000), // 75 minutes later
      },
    }),
  ])

  console.log('⏱️ Created focus sessions:', focusSessions.length)

  // Create sample chat session
  const chatSession = await prisma.chatSession.create({
    data: {
      userId: demoUser.id,
      mode: 'scholar',
      title: 'Machine Learning Questions',
      metadata: JSON.stringify({
        topic: 'machine-learning',
        context: 'learning-session',
      }),
    },
  })

  // Create sample chat messages
  const chatMessages = await Promise.all([
    prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: 'user',
        content: 'Can you explain the difference between supervised and unsupervised learning?',
        metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
      },
    }),
    prisma.chatMessage.create({
      data: {
        sessionId: chatSession.id,
        role: 'assistant',
        content: 'Supervised learning uses labeled training data to learn patterns and make predictions, while unsupervised learning finds hidden patterns in unlabeled data.',
        citations: JSON.stringify([
          {
            source: 'Introduction to Machine Learning',
            confidence: 0.95,
            relevance: 0.9,
          },
        ]),
        confidence: 0.92,
        metadata: JSON.stringify({
          mode: 'scholar',
          sources_used: 1,
        }),
      },
    }),
  ])

  console.log('💬 Created chat session with messages:', chatMessages.length)

  // Create sample generated media
  const generatedMedia = await Promise.all([
    prisma.generatedMedia.create({
      data: {
        userId: demoUser.id,
        mediaType: 'infographic',
        title: 'Machine Learning Types Overview',
        description: 'Visual overview of supervised, unsupervised, and reinforcement learning',
        fileUrl: '/generated/ml-overview-infographic.png',
        thumbnailUrl: '/generated/thumbnails/ml-overview-thumb.png',
        format: 'png',
        fileSize: 1024000, // 1MB
        metadata: JSON.stringify({
          dimensions: { width: 1200, height: 800 },
          style: 'modern',
          colorScheme: 'blue',
        }),
      },
    }),
    prisma.generatedMedia.create({
      data: {
        userId: demoUser.id,
        mediaType: 'audio',
        title: 'Neural Networks Explained',
        description: 'Audio explanation of how neural networks work',
        fileUrl: '/generated/neural-networks-audio.mp3',
        duration: 180, // 3 minutes
        format: 'mp3',
        fileSize: 2048000, // 2MB
        metadata: JSON.stringify({
          voice: 'natural-female',
          speed: 'normal',
          language: 'en-US',
        }),
      },
    }),
  ])

  console.log('🎨 Created generated media:', generatedMedia.length)

  // Create system configuration
  const systemConfigs = await Promise.all([
    prisma.systemConfig.upsert({
      where: { key: 'ai_models' },
      update: {},
      create: {
        key: 'ai_models',
        value: JSON.stringify({
          default_model: 'gpt-4',
          scholar_model: 'gpt-4',
          explorer_model: 'gpt-3.5-turbo',
          embedding_model: 'text-embedding-ada-002',
        }),
        category: 'ai',
      },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'spaced_repetition' },
      update: {},
      create: {
        key: 'spaced_repetition',
        value: JSON.stringify({
          algorithm: 'sm2',
          initial_interval: 1,
          ease_factor: 2.5,
          minimum_ease: 1.3,
        }),
        category: 'learning',
      },
    }),
    prisma.systemConfig.upsert({
      where: { key: 'wellness_defaults' },
      update: {},
      create: {
        key: 'wellness_defaults',
        value: JSON.stringify({
          pomodoro_duration: 25,
          break_duration: 5,
          long_break_duration: 15,
          daily_meditation_goal: 10,
        }),
        category: 'wellness',
      },
    }),
  ])

  console.log('⚙️ Created system configurations:', systemConfigs.length)

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })