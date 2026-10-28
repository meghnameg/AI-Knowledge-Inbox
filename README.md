# 🧠 AI Knowledge Inbox

A production-style full-stack Retrieval-Augmented Generation (RAG) web application that enables users to ingest unstructured text notes and web content, generate vector embeddings, and perform semantic search queries powered by Google Gemini AI.

---

## 🚀 Features

- **Multi-Source Ingestion**: Ingest plain text notes or fetch web content via URL.
- **Server-Side Scraping & Cleaning**: Automatically extracts main content while stripping unnecessary layout noise (`nav`, `footer`, `script`, `style`).
- **Smart Text Chunking**: Splits large documents into paragraph-aware chunks (~600 chars) for precise context retrieval.
- **Semantic Vector Search**: Generates embedding vectors using `text-embedding-004` and ranks context chunks via cosine similarity.
- **AI Answer Synthesis**: Answers questions with precise citations using `gemini-3.8-flash`[cite: 2].
- **Item Management**: Full CRUD support including deleting stored knowledge chunks.

---

## 🛠️ Architecture & System Design

### Tech Stack
- **Frontend**: React (Vite), Axios, Custom Responsive CSS (Dark Theme)[cite: 2]
- **Backend**: Node.js, Express.js REST API[cite: 2]
- **Database**: SQLite3 (`sqlite` async wrapper) storing raw content, metadata, and JSON-encoded vector embeddings[cite: 2]
- **AI / Embeddings**: `@google/genai` SDK (`gemini-3.8-flash` for synthesis, `text-embedding-004` for vector generation)[cite: 2]

---

## ⚖️ Design Decisions & Tradeoffs

1. **SQLite as a Vector Store**:
   - *Decision*: Stored embedding arrays as JSON strings in SQLite and computed cosine similarity in-memory upon query execution[cite: 2].
   - *Tradeoff*: Eliminates complex vector database infrastructure (e.g., Pinecone/Milvus) for local workloads[cite: 2]. 
   - *Scale Limit*: As stored chunks grow into tens of thousands, full-table scanning will bottleneck CPU performance. Scaling out would require migrating to PostgreSQL with `pgvector`[cite: 2].

2. **Smart Paragraph Chunking**:
   - *Decision*: Paragraph-aware text sliding window (~600 characters).
   - *Tradeoff*: Preserves semantic boundary better than arbitrary character boundaries while avoiding context window overflow during LLM synthesis.

3. **Single-User Architecture**:
   - *Decision*: Omitted complex authentication systems to keep local setup friction-free[cite: 2].

---

## 📦 Prerequisites

- **Node.js**: `v18.0.0` or higher
- **Gemini API Key**: Obtain a free key from [Google AI Studio](https://aistudio.google.com/)

---

## ⚙️ Local Installation & Setup

### 1. Clone the Repository
```bash
git clone [https://github.com/](https://github.com/)<your-username>/ai-knowledge-inbox.git
cd ai-knowledge-inbox
