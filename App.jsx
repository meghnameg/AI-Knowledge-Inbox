import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export default function App() {
  const [sourceType, setSourceType] = useState('Note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);

  const [items, setItems] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [isQuerying, setIsQuerying] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/items`);
      setItems(res.data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/items/${id}`);
      await fetchItems();
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  const handleIngest = async (e) => {
    e.preventDefault();
    setIsIngesting(true);

    try {
      const payload = { sourceType, title, content, url };
      await axios.post(`${API_BASE_URL}/ingest`, payload);
      setTitle('');
      setContent('');
      setUrl('');
      await fetchItems();
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert(`Ingest Error: ${msg}`);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsQuerying(true);
    setAnswer('');
    setSources([]);

    try {
      const res = await axios.post(`${API_BASE_URL}/query`, { question });
      setAnswer(res.data.answer);
      setSources(res.data.sources || []);
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      alert(`Query Error: ${msg}`);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.appTitle}>🧠 AI Knowledge Inbox</h1>
        <span style={styles.badge}>Vector RAG Pipeline Active</span>
      </header>

      <main style={styles.mainGrid}>
        <div style={styles.leftColumn}>
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>➕ Ingest Content</h2>
            
            <div style={styles.tabGroup}>
              <button
                type="button"
                style={{ ...styles.tabBtn, ...(sourceType === 'Note' ? styles.activeTab : {}) }}
                onClick={() => setSourceType('Note')}
              >
                📄 Note
              </button>
              <button
                type="button"
                style={{ ...styles.tabBtn, ...(sourceType === 'URL' ? styles.activeTab : {}) }}
                onClick={() => setSourceType('URL')}
              >
                🌐 URL
              </button>
            </div>

            <form onSubmit={handleIngest} style={styles.form}>
              <label style={styles.label}>Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g., System Architecture"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
              />

              {sourceType === 'Note' ? (
                <>
                  <label style={styles.label}>Note Content</label>
                  <textarea
                    placeholder="Paste your text notes here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    style={styles.textarea}
                    required
                  />
                </>
              ) : (
                <>
                  <label style={styles.label}>Web URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/article"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    style={styles.input}
                    required
                  />
                </>
              )}

              <button type="submit" style={styles.submitBtn} disabled={isIngesting}>
                {isIngesting ? 'Embedding & Saving...' : 'Save with Vectors'}
              </button>
            </form>
          </section>

          <section style={styles.card}>
            <div style={styles.inboxHeader}>
              <h2 style={styles.cardTitle}>Inbox Items</h2>
              <span style={styles.itemCount}>{items.length}</span>
            </div>

            <div style={styles.itemList}>
              {items.length === 0 ? (
                <p style={styles.emptyText}>No items saved yet.</p>
              ) : (
                items.map((item) => (
                  <div key={item.id} style={styles.itemCard}>
                    <div style={styles.itemCardHeader}>
                      <h3 style={styles.itemTitle}>
                        {item.source_type === 'URL' ? '🌐' : '📄'} {item.title}
                      </h3>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={styles.deleteBtn}
                        title="Delete item"
                      >
                        ✕
                      </button>
                    </div>
                    <p style={styles.itemSnippet}>{item.content}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div style={styles.rightColumn}>
          <section style={styles.cardFullHeight}>
            <h2 style={styles.cardTitle}>✨ Semantic Vector Search</h2>

            <form onSubmit={handleQuery} style={styles.queryForm}>
              <input
                type="text"
                placeholder="Ask a question—retrieves top semantic vector matches..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                style={styles.queryInput}
              />
              <button type="submit" style={styles.askBtn} disabled={isQuerying}>
                {isQuerying ? 'Searching Vectors...' : 'Ask 🚀'}
              </button>
            </form>

            <div style={styles.responseContainer}>
              <h3 style={styles.responseTitle}>AI RESPONSE & SEMANTIC CITATIONS</h3>

              {isQuerying && <p style={styles.placeholderText}>Embedding question & computing cosine similarity...</p>}

              {!isQuerying && !answer && (
                <p style={styles.placeholderText}>
                  Type a question above to perform vector similarity search across your knowledge base.
                </p>
              )}

              {answer && (
                <div style={styles.answerBox}>
                  <p style={styles.answerText}>{answer}</p>

                  {sources.length > 0 && (
                    <div style={styles.sourcesBox}>
                      <strong>Top Semantic Sources:</strong>
                      <ul style={styles.sourceList}>
                        {sources.map((src, idx) => (
                          <li key={idx}>{src}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#0b0f19',
    color: '#e2e8f0',
    minHeight: '100vh',
    padding: '24px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  appTitle: { fontSize: '24px', fontWeight: '700', margin: 0 },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: '600',
  },
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' },
  leftColumn: { display: 'flex', flexDirection: 'column', gap: '24px' },
  rightColumn: { display: 'flex', flexDirection: 'column' },
  card: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '12px',
    padding: '20px',
  },
  cardFullHeight: {
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '12px',
    padding: '20px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: { fontSize: '18px', fontWeight: '600', margin: 0 },
  tabGroup: { display: 'flex', gap: '8px', marginTop: '16px', marginBottom: '16px' },
  tabBtn: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#1f2937',
    color: '#9ca3af',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  activeTab: { backgroundColor: '#4f46e5', color: '#fff', fontWeight: '600' },
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { fontSize: '12px', color: '#9ca3af', marginBottom: '-6px' },
  input: {
    padding: '10px 12px',
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '6px',
    color: '#fff',
  },
  textarea: {
    padding: '10px 12px',
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '6px',
    color: '#fff',
    resize: 'vertical',
  },
  submitBtn: {
    padding: '12px',
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  inboxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  itemCount: { backgroundColor: '#1f2937', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' },
  itemList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' },
  emptyText: { color: '#6b7280', fontSize: '14px' },
  itemCard: { backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px' },
  itemCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  itemTitle: { fontSize: '14px', fontWeight: '600', margin: 0 },
  deleteBtn: { backgroundColor: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  itemSnippet: { fontSize: '12px', color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  queryForm: { display: 'flex', gap: '8px', marginTop: '16px', marginBottom: '20px' },
  queryInput: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#1f2937',
    border: '1px solid #374151',
    borderRadius: '6px',
    color: '#fff',
  },
  askBtn: {
    padding: '12px 20px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  responseContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '16px',
  },
  responseTitle: { fontSize: '12px', color: '#64748b', marginBottom: '16px' },
  placeholderText: { color: '#475569', fontSize: '14px', textAlign: 'center', marginTop: '40px' },
  answerBox: { lineHeight: '1.6' },
  answerText: { fontSize: '15px', color: '#e2e8f0' },
  sourcesBox: { marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #334155', fontSize: '13px' },
  sourceList: { paddingLeft: '20px', margin: '8px 0 0 0', color: '#94a3b8' },
};