/**
 * Test Script for Vector Embedding System
 * 
 * This script demonstrates the vector embedding system functionality:
 * - Text embedding generation
 * - Vector similarity calculations
 * - Database operations simulation
 */

const { VectorDatabaseUtils } = require('../src/lib/database/vector-utils')

console.log('🚀 Testing Vector Embedding System\n')

// Test 1: Vector Utility Functions
console.log('1. Testing Vector Utility Functions')
console.log('=====================================')

const testVector1 = [0.1, 0.2, 0.3, 0.4, 0.5]
const testVector2 = [0.2, 0.3, 0.4, 0.5, 0.6]

console.log('Original vectors:')
console.log('Vector 1:', testVector1)
console.log('Vector 2:', testVector2)

// Convert to pgvector format
const pgVector1 = VectorDatabaseUtils.arrayToVector(testVector1)
const pgVector2 = VectorDatabaseUtils.arrayToVector(testVector2)

console.log('\nPgvector format:')
console.log('Vector 1:', pgVector1)
console.log('Vector 2:', pgVector2)

// Convert back to arrays
const convertedBack1 = VectorDatabaseUtils.vectorToArray(pgVector1)
const convertedBack2 = VectorDatabaseUtils.vectorToArray(pgVector2)

console.log('\nConverted back:')
console.log('Vector 1:', convertedBack1)
console.log('Vector 2:', convertedBack2)

// Calculate cosine similarity
const similarity = VectorDatabaseUtils.cosineSimilarity(testVector1, testVector2)
console.log('\nCosine similarity:', similarity.toFixed(4))

// Normalize vectors
const normalized1 = VectorDatabaseUtils.normalizeVector(testVector1)
const normalized2 = VectorDatabaseUtils.normalizeVector(testVector2)

console.log('\nNormalized vectors:')
console.log('Vector 1:', normalized1.map(v => v.toFixed(4)))
console.log('Vector 2:', normalized2.map(v => v.toFixed(4)))

// Test 2: Mock Embedding Generation
console.log('\n\n2. Testing Mock Embedding Generation')
console.log('=====================================')

function generateMockEmbedding(text, dimensions = 768) {
  console.log(`Generating ${dimensions}-dimensional embedding for: "${text}"`)
  
  // Generate deterministic mock embedding based on text content
  const embedding = new Array(dimensions)
  let hash = 0
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Generate embedding values
  for (let i = 0; i < dimensions; i++) {
    const seed = hash + i
    embedding[i] = (Math.sin(seed) + Math.cos(seed * 2)) / 2
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  for (let i = 0; i < dimensions; i++) {
    embedding[i] = embedding[i] / magnitude
  }
  
  return embedding
}

// Generate embeddings for sample transcript data
const sampleTranscripts = [
  {
    id: 'transcript-1',
    clientName: 'Acme Corp',
    date: '2024-01-15',
    count: 25,
    notes: 'Quarterly business review meeting with key stakeholders'
  },
  {
    id: 'transcript-2',
    clientName: 'Beta Inc',
    date: '2024-01-16',
    count: 28,
    notes: 'Strategic planning session for Q2 initiatives'
  },
  {
    id: 'transcript-3',
    clientName: 'Gamma LLC',
    date: '2024-01-17',
    count: 12,
    notes: 'Weekly team standup and project updates'
  }
]

const embeddings = {}

for (const transcript of sampleTranscripts) {
  const text = `Client: ${transcript.clientName}\nDate: ${transcript.date}\nCount: ${transcript.count}\nNotes: ${transcript.notes}`
  const embedding = generateMockEmbedding(text, 128) // Smaller for demo
  embeddings[transcript.id] = embedding
  
  console.log(`✅ Generated embedding for ${transcript.id} (${transcript.clientName})`)
  console.log(`   First 5 dimensions: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
}

// Test 3: Similarity Search Simulation
console.log('\n\n3. Testing Similarity Search')
console.log('=============================')

function findSimilarTranscripts(queryEmbedding, candidateEmbeddings, threshold = 0.7) {
  const results = []
  
  for (const [id, embedding] of Object.entries(candidateEmbeddings)) {
    const similarity = VectorDatabaseUtils.cosineSimilarity(queryEmbedding, embedding)
    
    if (similarity >= threshold) {
      results.push({
        transcriptId: id,
        similarity: similarity,
        distance: 1 - similarity
      })
    }
  }
  
  // Sort by similarity (highest first)
  return results.sort((a, b) => b.similarity - a.similarity)
}

// Test similarity search
const queryTranscript = sampleTranscripts[0]
const queryEmbedding = embeddings[queryTranscript.id]

console.log(`Searching for transcripts similar to: ${queryTranscript.id} (${queryTranscript.clientName})`)

const similarResults = findSimilarTranscripts(queryEmbedding, embeddings, 0.5)

console.log(`\nFound ${similarResults.length} similar transcripts:`)
for (const result of similarResults) {
  const transcript = sampleTranscripts.find(t => t.id === result.transcriptId)
  console.log(`  ${result.transcriptId}: ${transcript.clientName} (similarity: ${result.similarity.toFixed(4)})`)
}

// Test 4: Pattern Analysis Simulation
console.log('\n\n4. Testing Pattern Analysis')
console.log('============================')

function analyzePatterns(embeddings, transcripts) {
  const patterns = []
  
  // Group by volume categories
  const volumeGroups = {
    low: transcripts.filter(t => t.count <= 15),
    medium: transcripts.filter(t => t.count > 15 && t.count <= 30),
    high: transcripts.filter(t => t.count > 30)
  }
  
  for (const [category, group] of Object.entries(volumeGroups)) {
    if (group.length > 0) {
      // Calculate average embedding for this pattern
      const avgEmbedding = new Array(128).fill(0)
      
      for (const transcript of group) {
        const embedding = embeddings[transcript.id]
        for (let i = 0; i < embedding.length; i++) {
          avgEmbedding[i] += embedding[i] / group.length
        }
      }
      
      patterns.push({
        type: `${category}_volume`,
        transcripts: group.map(t => t.id),
        avgEmbedding: avgEmbedding,
        strength: group.length / transcripts.length
      })
    }
  }
  
  return patterns
}

const patterns = analyzePatterns(embeddings, sampleTranscripts)

console.log('Discovered patterns:')
for (const pattern of patterns) {
  console.log(`  ${pattern.type}: ${pattern.transcripts.length} transcripts (strength: ${pattern.strength.toFixed(2)})`)
  console.log(`    Transcripts: ${pattern.transcripts.join(', ')}`)
}

// Test 5: Performance Metrics
console.log('\n\n5. Performance Metrics')
console.log('======================')

const startTime = Date.now()

// Simulate batch operations
const batchSize = 1000
const mockEmbeddings = []

for (let i = 0; i < batchSize; i++) {
  const mockText = `Mock transcript ${i} with some content`
  const embedding = generateMockEmbedding(mockText, 768)
  mockEmbeddings.push(embedding)
}

const embeddingTime = Date.now() - startTime

// Simulate similarity searches
const searchStartTime = Date.now()
const queryEmb = mockEmbeddings[0]
let similarityCount = 0

for (let i = 1; i < Math.min(100, mockEmbeddings.length); i++) {
  const similarity = VectorDatabaseUtils.cosineSimilarity(queryEmb, mockEmbeddings[i])
  if (similarity > 0.5) {
    similarityCount++
  }
}

const searchTime = Date.now() - searchStartTime

console.log(`Generated ${batchSize} embeddings in ${embeddingTime}ms`)
console.log(`Average time per embedding: ${(embeddingTime / batchSize).toFixed(2)}ms`)
console.log(`Performed 99 similarity searches in ${searchTime}ms`)
console.log(`Average time per search: ${(searchTime / 99).toFixed(2)}ms`)
console.log(`Found ${similarityCount} similar embeddings`)

console.log('\n✅ Vector Embedding System Test Complete!')
console.log('\nKey Features Demonstrated:')
console.log('- ✅ Vector format conversion (array ↔ pgvector)')
console.log('- ✅ Cosine similarity calculation')
console.log('- ✅ Vector normalization')
console.log('- ✅ Mock embedding generation')
console.log('- ✅ Similarity search')
console.log('- ✅ Pattern analysis')
console.log('- ✅ Performance benchmarking')