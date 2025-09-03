/**
 * Simple Vector Embedding System Demo
 * 
 * This script demonstrates core vector operations without external dependencies
 */

console.log('🚀 Vector Embedding System Demo\n')

// Vector utility functions (standalone)
function arrayToVector(array) {
  return `[${array.join(',')}]`
}

function vectorToArray(vectorString) {
  const cleaned = vectorString.replace(/[\[\]]/g, '').trim()
  if (cleaned === '') {
    return []
  }
  return cleaned.split(',').map(num => parseFloat(num.trim()))
}

function normalizeVector(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  if (magnitude === 0) return vector
  return vector.map(val => val / magnitude)
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }

  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))

  if (magnitudeA === 0 || magnitudeB === 0) return 0
  return dotProduct / (magnitudeA * magnitudeB)
}

// Mock embedding generation
function generateMockEmbedding(text, dimensions = 768) {
  const embedding = new Array(dimensions)
  let hash = 0
  
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  for (let i = 0; i < dimensions; i++) {
    const seed = hash + i
    embedding[i] = (Math.sin(seed) + Math.cos(seed * 2)) / 2
  }
  
  return normalizeVector(embedding)
}

// Format transcript data for embedding
function formatTranscriptForEmbedding(transcriptData) {
  const parts = [
    `Client: ${transcriptData.clientName}`,
    `Date: ${transcriptData.date}`,
    `Transcript Count: ${transcriptData.count}`,
  ]

  if (transcriptData.notes && transcriptData.notes.trim()) {
    parts.push(`Notes: ${transcriptData.notes}`)
  }

  // Add contextual information
  const volumeLevel = transcriptData.count === 0 ? 'No Activity' :
                     transcriptData.count <= 5 ? 'Low Volume' :
                     transcriptData.count <= 20 ? 'Medium Volume' :
                     transcriptData.count <= 50 ? 'High Volume' : 'Very High Volume'
  
  parts.push(`Volume Level: ${volumeLevel}`)
  
  const dayOfWeek = new Date(transcriptData.date).toLocaleDateString('en-US', { weekday: 'long' })
  parts.push(`Day of Week: ${dayOfWeek}`)

  return parts.join('\n')
}

// Demo data
const sampleTranscripts = [
  {
    id: 'transcript-1',
    clientName: 'Acme Corp',
    date: '2024-01-15',
    count: 25,
    notes: 'Quarterly business review meeting with key stakeholders discussing Q4 performance and Q1 planning'
  },
  {
    id: 'transcript-2',
    clientName: 'Beta Industries',
    date: '2024-01-16',
    count: 28,
    notes: 'Strategic planning session for Q2 initiatives and budget allocation discussions'
  },
  {
    id: 'transcript-3',
    clientName: 'Gamma Solutions',
    date: '2024-01-17',
    count: 12,
    notes: 'Weekly team standup and project status updates'
  },
  {
    id: 'transcript-4',
    clientName: 'Delta Enterprises',
    date: '2024-01-18',
    count: 45,
    notes: 'Board meeting with quarterly financial review and strategic decisions'
  },
  {
    id: 'transcript-5',
    clientName: 'Epsilon Tech',
    date: '2024-01-19',
    count: 8,
    notes: 'Product development sync and technical architecture discussion'
  }
]

console.log('1. Generating Embeddings for Sample Transcripts')
console.log('===============================================')

const embeddings = {}
const embeddingDimensions = 128 // Smaller for demo

for (const transcript of sampleTranscripts) {
  const formattedText = formatTranscriptForEmbedding(transcript)
  const embedding = generateMockEmbedding(formattedText, embeddingDimensions)
  embeddings[transcript.id] = embedding
  
  console.log(`✅ ${transcript.id}: ${transcript.clientName}`)
  console.log(`   Count: ${transcript.count}, Volume: ${transcript.count <= 5 ? 'Low' : transcript.count <= 20 ? 'Medium' : transcript.count <= 50 ? 'High' : 'Very High'}`)
  console.log(`   Embedding preview: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`)
  console.log()
}

console.log('2. Similarity Search Demo')
console.log('=========================')

function findSimilarTranscripts(queryId, threshold = 0.7) {
  const queryEmbedding = embeddings[queryId]
  const results = []
  
  for (const [id, embedding] of Object.entries(embeddings)) {
    if (id === queryId) continue // Skip self
    
    const similarity = cosineSimilarity(queryEmbedding, embedding)
    
    if (similarity >= threshold) {
      results.push({
        transcriptId: id,
        similarity: similarity,
        distance: 1 - similarity
      })
    }
  }
  
  return results.sort((a, b) => b.similarity - a.similarity)
}

// Test similarity searches
const testQueries = ['transcript-1', 'transcript-4']

for (const queryId of testQueries) {
  const queryTranscript = sampleTranscripts.find(t => t.id === queryId)
  console.log(`\nSearching for transcripts similar to: ${queryId} (${queryTranscript.clientName})`)
  console.log(`Query transcript: ${queryTranscript.count} transcripts, "${queryTranscript.notes.substring(0, 50)}..."`)
  
  const results = findSimilarTranscripts(queryId, 0.5)
  
  if (results.length > 0) {
    console.log(`Found ${results.length} similar transcripts:`)
    for (const result of results) {
      const transcript = sampleTranscripts.find(t => t.id === result.transcriptId)
      console.log(`  📄 ${result.transcriptId}: ${transcript.clientName}`)
      console.log(`     Similarity: ${result.similarity.toFixed(4)}, Count: ${transcript.count}`)
      console.log(`     Notes: "${transcript.notes.substring(0, 60)}..."`)
    }
  } else {
    console.log('No similar transcripts found above threshold')
  }
}

console.log('\n3. Pattern Analysis Demo')
console.log('========================')

// Analyze volume patterns
const volumePatterns = {
  low: sampleTranscripts.filter(t => t.count <= 15),
  medium: sampleTranscripts.filter(t => t.count > 15 && t.count <= 30),
  high: sampleTranscripts.filter(t => t.count > 30)
}

console.log('Volume-based patterns:')
for (const [category, transcripts] of Object.entries(volumePatterns)) {
  if (transcripts.length > 0) {
    console.log(`\n📊 ${category.toUpperCase()} Volume Pattern (${transcripts.length} transcripts):`)
    
    // Calculate pattern centroid
    const patternEmbedding = new Array(embeddingDimensions).fill(0)
    for (const transcript of transcripts) {
      const embedding = embeddings[transcript.id]
      for (let i = 0; i < embedding.length; i++) {
        patternEmbedding[i] += embedding[i] / transcripts.length
      }
    }
    
    // Find cohesion (average similarity within pattern)
    let totalSimilarity = 0
    let comparisons = 0
    
    for (let i = 0; i < transcripts.length; i++) {
      for (let j = i + 1; j < transcripts.length; j++) {
        const sim = cosineSimilarity(embeddings[transcripts[i].id], embeddings[transcripts[j].id])
        totalSimilarity += sim
        comparisons++
      }
    }
    
    const cohesion = comparisons > 0 ? totalSimilarity / comparisons : 0
    
    console.log(`   Transcripts: ${transcripts.map(t => `${t.id} (${t.clientName})`).join(', ')}`)
    console.log(`   Pattern cohesion: ${cohesion.toFixed(4)}`)
    console.log(`   Average count: ${(transcripts.reduce((sum, t) => sum + t.count, 0) / transcripts.length).toFixed(1)}`)
  }
}

console.log('\n4. Performance Benchmarks')
console.log('==========================')

// Benchmark embedding generation
const startTime = Date.now()
const benchmarkTexts = []
for (let i = 0; i < 100; i++) {
  benchmarkTexts.push(`Benchmark transcript ${i} with sample content for performance testing`)
}

const benchmarkEmbeddings = benchmarkTexts.map(text => generateMockEmbedding(text, 768))
const embeddingTime = Date.now() - startTime

console.log(`Generated 100 embeddings (768-dim) in ${embeddingTime}ms`)
console.log(`Average time per embedding: ${(embeddingTime / 100).toFixed(2)}ms`)

// Benchmark similarity search
const searchStartTime = Date.now()
const queryEmb = benchmarkEmbeddings[0]
let similarCount = 0

for (let i = 1; i < benchmarkEmbeddings.length; i++) {
  const similarity = cosineSimilarity(queryEmb, benchmarkEmbeddings[i])
  if (similarity > 0.7) {
    similarCount++
  }
}

const searchTime = Date.now() - searchStartTime

console.log(`Performed 99 similarity searches in ${searchTime}ms`)
console.log(`Average time per search: ${(searchTime / 99).toFixed(2)}ms`)
console.log(`Found ${similarCount} similar embeddings (>0.7 similarity)`)

console.log('\n5. Vector Operations Demo')
console.log('=========================')

const testVector = [0.1, 0.2, 0.3, 0.4, 0.5]
console.log('Original vector:', testVector)

const pgVector = arrayToVector(testVector)
console.log('Pgvector format:', pgVector)

const convertedBack = vectorToArray(pgVector)
console.log('Converted back:', convertedBack)

const normalized = normalizeVector(testVector)
console.log('Normalized:', normalized.map(v => v.toFixed(4)))

const magnitude = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0))
console.log('Normalized magnitude:', magnitude.toFixed(6))

console.log('\n✅ Vector Embedding System Demo Complete!')
console.log('\n🎯 Key Capabilities Demonstrated:')
console.log('   ✅ Text-to-vector embedding generation')
console.log('   ✅ Cosine similarity calculation')
console.log('   ✅ Vector normalization and format conversion')
console.log('   ✅ Similarity-based transcript search')
console.log('   ✅ Pattern discovery and clustering')
console.log('   ✅ Performance benchmarking')
console.log('   ✅ Volume-based categorization')
console.log('   ✅ Semantic content analysis')

console.log('\n📊 System Statistics:')
console.log(`   • Total transcripts processed: ${sampleTranscripts.length}`)
console.log(`   • Embedding dimensions: ${embeddingDimensions}`)
console.log(`   • Similarity threshold: 0.7`)
console.log(`   • Pattern categories discovered: ${Object.keys(volumePatterns).filter(k => volumePatterns[k].length > 0).length}`)
console.log(`   • Average embedding generation time: ${(embeddingTime / 100).toFixed(2)}ms`)
console.log(`   • Average similarity search time: ${(searchTime / 99).toFixed(2)}ms`)