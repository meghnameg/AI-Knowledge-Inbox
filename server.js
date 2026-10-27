import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenAI } from '@google/genai';

// 1. Load Environment Variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// 2. Initialize Gemini AI Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 3. Initialize SQLite Database with embedding storage
let db;
async function initDatabase() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      source_type TEXT,
      embedding TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database connected & vector schema initialized.');
}
initDatabase();

// Helper: Split long text into ~600-character chunks
function chunkText(text, maxChunkSize = 600) {
  const paragraphs = text.split(/\n+/);
  const chunks = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    if ((currentChunk + '\n' + p).length > maxChunkSize) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = p;
    } else {
      currentChunk += (currentChunk ? '\n' : '') + p;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks.length > 0 ? chunks : [text];
}

// Helper: Calculate Cosine Similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ------------------------------------------------------------------
// API ENDPOINTS
// ------------------------------------------------------------------

// GET /api/items - Fetch all knowledge items
app.get('/api/items', async (req, res) => {
  try {
    const items = await db.all('SELECT id, title, content, source_type, created_at FROM knowledge_chunks ORDER BY created_at DESC');
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// DELETE /api/items/:id - Delete an inbox item
app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM knowledge_chunks WHERE id = ?', [id]);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// POST /api/ingest - Ingest with Smart Chunking & Embedding Vector Generation
app.post('/api/ingest', async (req, res) => {
  const { sourceType, title, content, url } = req.body;

  try {
    let finalTitle = title || 'Untitled';
    let finalContent = content || '';

    if (sourceType === 'URL') {
      if (!url) return res.status(400).json({ error: 'URL is required' });

      const { data } = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
      const $= cheerio.load(data);$('script, style, nav, footer, iframe, header, aside').remove();
      
      const extractedText = [];
      $('p, h1, h2, h3, article').each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) extractedText.push(text);
      });

      finalContent = extractedText.join('\n\n');
      finalTitle = title || $('title').text().trim() || url;
    }

    if (!finalContent) {
      return res.status(400).json({ error: 'Content cannot be empty or unscrapeable' });
    }

    const textChunks = chunkText(finalContent);
    let lastInsertedItem = null;

    for (const chunk of textChunks) {
      // Generate embedding vector using Gemini text-embedding-004
      const embeddingResponse = await ai.models.embedContent({
        model: 'text-embedding-004',
        contents: chunk,
      });
      const vectorValues = embeddingResponse.embeddings[0].values;

      const result = await db.run(
        `INSERT INTO knowledge_chunks (title, content, source_type, embedding) VALUES (?, ?, ?, ?)`,
        [finalTitle, chunk, sourceType || 'Note', JSON.stringify(vectorValues)]
      );
      lastInsertedItem = await db.get('SELECT id, title, content, source_type, created_at FROM knowledge_chunks WHERE id = ?', [result.lastID]);
    }

    res.json({ message: `Successfully ingested into ${textChunks.length} vector chunks!`, item: lastInsertedItem });
  } catch (err) {
    console.error('Ingestion error:', err);
    res.status(500).json({ error: 'Failed to ingest content: ' + err.message });
  }
});

// POST /api/query - Semantic Vector Search RAG Query
app.post('/api/query', async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  try {
    const allChunks = await db.all('SELECT * FROM knowledge_chunks');

    if (allChunks.length === 0) {
      return res.json({
        answer: 'No knowledge items available in your inbox yet. Please add a note or URL first!',
        sources: [],
      });
    }

    // 1. Embed the user question
    const questionEmbeddingRes = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: question,
    });
    const questionVector = questionEmbeddingRes.embeddings[0].values;

    // 2. Compute similarity scores for all chunks
    const scoredChunks = allChunks.map((chunk) => {
      const chunkVector = JSON.parse(chunk.embedding || '[]');
      const score = cosineSimilarity(questionVector, chunkVector);
      return { ...chunk, score };
    });

    // 3. Sort by similarity and pick top 3 most relevant chunks
    scoredChunks.sort((a, b) => b.score - a.score);
    const topChunks = scoredChunks.slice(0, 3);

    // 4. Build Context Window from top semantic matches
    const context = topChunks
      .map((item, index) => `[Source ${index + 1}: ${item.title}]\n${item.content}`)
      .join('\n\n---\n\n');

    const prompt = `You are an AI Knowledge Assistant. Answer the user's question accurately using ONLY the context provided below. If the context does not contain enough information, state that clearly.

CONTEXT:
${context}

USER QUESTION:
${question}`;

    // 5. Generate answer with Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      answer: response.text || 'No response generated.',
      sources: [...new Set(topChunks.map((c) => c.title))],
    });
  } catch (err) {
    console.error('Query error:', err);
    res.status(500).json({ error: err.message || 'AI Query failed' });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Advanced vector backend running on http://localhost:${PORT}`);
});