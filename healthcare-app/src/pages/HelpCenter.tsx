import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Search, X, ChevronRight, ChevronDown, BookOpen, Plus, Trash2, Edit3, Save,
  ArrowLeft, Tag, Users, ExternalLink, PlayCircle, Sparkles
} from 'lucide-react';
import {
  getArticles, getArticlesByRole, searchArticles, getArticleById,
  saveArticle, deleteArticle, getCategoryArticleCount,
  HELP_CATEGORIES,
  type HelpArticle, type HelpRole,
} from '../data/helpCenterData';

// ─── Admin Article Editor Component ─────────────────────────────────────────

function ArticleEditor({ article, onSave, onCancel }: {
  article: HelpArticle | null;
  onSave: (a: HelpArticle) => void;
  onCancel: () => void;
}) {
  const blank: HelpArticle = {
    id: `art-${Date.now()}`,
    title: '', category: 'appointments', role: ['Patient'],
    description: '', steps: [{ stepNumber: 1, text: '' }],
    tags: [], relatedArticles: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const [form, setForm] = useState<HelpArticle>(article ?? blank);
  const [tagInput, setTagInput] = useState(form.tags.join(', '));

  const updateField = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const toggleRole = (role: HelpRole) => {
    setForm(f => ({
      ...f,
      role: f.role.includes(role) ? f.role.filter(r => r !== role) : [...f.role, role],
    }));
  };

  const updateStep = (idx: number, text: string) => {
    setForm(f => ({
      ...f,
      steps: f.steps.map((s, i) => i === idx ? { ...s, text } : s),
    }));
  };

  const addStep = () => {
    setForm(f => ({
      ...f,
      steps: [...f.steps, { stepNumber: f.steps.length + 1, text: '' }],
    }));
  };

  const removeStep = (idx: number) => {
    setForm(f => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })),
    }));
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.description.trim()) return;
    const tags = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    onSave({ ...form, tags });
  };

  const roles: HelpRole[] = ['Patient', 'Doctor', 'Admin', 'Staff'];

  return (
    <div className="help-admin-form">
      <h3 style={{ marginBottom: 20, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Edit3 size={18} style={{ color: 'var(--accent-primary)' }} />
        {article ? 'Edit Article' : 'New Article'}
      </h3>

      <div className="form-group">
        <label>Title *</label>
        <input className="form-input help-form-input" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Enter article title..." />
      </div>

      <div className="form-group">
        <label>Category *</label>
        <select className="form-input help-form-input" value={form.category} onChange={e => updateField('category', e.target.value)}>
          {HELP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label>Visible to Roles *</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {roles.map(r => (
            <button key={r} onClick={() => toggleRole(r)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                border: form.role.includes(r) ? '2px solid var(--accent-primary)' : '1.5px solid var(--border-color)',
                background: form.role.includes(r) ? 'rgba(8,145,178,0.12)' : 'transparent',
                color: form.role.includes(r) ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}>{r}</button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Description *</label>
        <textarea className="form-input help-form-input" value={form.description} onChange={e => updateField('description', e.target.value)}
          placeholder="Short description of what this article covers..." rows={3}
          style={{ resize: 'vertical', minHeight: 70 }} />
      </div>

      <div className="form-group">
        <label>Steps</label>
        {form.steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            <span style={{ minWidth: 28, height: 28, borderRadius: '50%', background: 'var(--accent-gradient)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, marginTop: 6 }}>{step.stepNumber}</span>
            <textarea className="form-input help-form-input" value={step.text} onChange={e => updateStep(i, e.target.value)}
              placeholder={`Step ${step.stepNumber} instructions...`} rows={2} style={{ flex: 1, resize: 'vertical', minHeight: 44 }} />
            {form.steps.length > 1 && (
              <button onClick={() => removeStep(i)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#ef4444', marginTop: 6 }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button onClick={addStep} className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>
          <Plus size={14} /> Add Step
        </button>
      </div>

      <div className="form-group">
        <label>Tags (comma-separated)</label>
        <input className="form-input help-form-input" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="e.g. appointment, booking, schedule" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button onClick={handleSave} className="btn btn-primary" disabled={!form.title.trim() || !form.description.trim()}>
          <Save size={16} /> Save Article
        </button>
        <button onClick={onCancel} className="btn btn-secondary">Cancel</button>
      </div>
    </div>
  );
}

// ─── Main HelpCenter Page ───────────────────────────────────────────────────

export default function HelpCenter() {
  const { user } = useAuth();
  const role = (user?.role ?? 'Patient') as HelpRole;
  const isAdmin = role === 'Admin';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeArticle, setActiveArticle] = useState<HelpArticle | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [editingArticle, setEditingArticle] = useState<HelpArticle | null | 'new'>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get articles based on role & search
  const articles = useMemo(() => {
    if (search.trim()) return searchArticles(search, isAdmin && adminMode ? undefined : role);
    if (selectedCategory) {
      const all = isAdmin && adminMode ? getArticles() : getArticlesByRole(role);
      return all.filter(a => a.category === selectedCategory);
    }
    return isAdmin && adminMode ? getArticles() : getArticlesByRole(role);
  }, [search, selectedCategory, role, adminMode, refreshKey]);

  // Categories with counts
  const categoriesWithCount = useMemo(() =>
    HELP_CATEGORIES.map(c => ({
      ...c,
      count: getCategoryArticleCount(c.id, isAdmin && adminMode ? undefined : role),
    })).filter(c => c.count > 0 || (isAdmin && adminMode))
  , [role, adminMode, refreshKey]);

  const openArticle = (article: HelpArticle) => {
    setActiveArticle(article);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setTimeout(() => setActiveArticle(null), 300);
  };

  const handleSaveArticle = (article: HelpArticle) => {
    saveArticle(article);
    setEditingArticle(null);
    setRefreshKey(k => k + 1);
  };

  const handleDeleteArticle = (id: string) => {
    if (confirm('Are you sure you want to delete this article?')) {
      deleteArticle(id);
      setRefreshKey(k => k + 1);
      if (activeArticle?.id === id) closePanel();
    }
  };

  const relatedArticles = useMemo(() => {
    if (!activeArticle) return [];
    const related = activeArticle.relatedArticles
      .map(id => getArticleById(id))
      .filter(Boolean) as HelpArticle[];
    // Also add "Users also viewed" — same category, different article
    const sameCat = getArticles()
      .filter(a => a.category === activeArticle.category && a.id !== activeArticle.id && !activeArticle.relatedArticles.includes(a.id))
      .slice(0, 3);
    return { related, alsoViewed: sameCat };
  }, [activeArticle]);

  return (
    <div>
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="page-header">
        <h1>Help Center</h1>
        <p>How can we help you today?</p>
      </div>

      {/* ── Admin Toggle ──────────────────────────────────────────────── */}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button onClick={() => { setAdminMode(false); setEditingArticle(null); }} className={`btn ${!adminMode ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
            <BookOpen size={15} /> Browse Articles
          </button>
          <button onClick={() => setAdminMode(true)} className={`btn ${adminMode ? 'btn-primary' : 'btn-secondary'} btn-sm`}>
            <Edit3 size={15} /> Manage Articles
          </button>
        </div>
      )}

      {/* ── Search Bar ────────────────────────────────────────────────── */}
      <div className="help-search-wrapper glass-card">
        <div className="help-search-bar">
          <Search size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedCategory(null); }}
            placeholder="Search articles, guides, and FAQs..."
            className="help-search-input"
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={16} />
            </button>
          )}
        </div>
        {search && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8 }}>
            {articles.length} {articles.length === 1 ? 'result' : 'results'} found for "{search}"
          </div>
        )}
      </div>

      {/* ── Admin: Article Editor ─────────────────────────────────────── */}
      {isAdmin && adminMode && editingArticle && (
        <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
          <ArticleEditor
            article={editingArticle === 'new' ? null : editingArticle}
            onSave={handleSaveArticle}
            onCancel={() => setEditingArticle(null)}
          />
        </div>
      )}

      {/* ── Admin: Add New Button ─────────────────────────────────────── */}
      {isAdmin && adminMode && !editingArticle && (
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => setEditingArticle('new')} className="btn btn-primary btn-sm">
            <Plus size={16} /> Add New Article
          </button>
        </div>
      )}

      {/* ── Category Cards ────────────────────────────────────────────── */}
      {!search && (
        <div className="help-category-grid">
          {categoriesWithCount.map(cat => (
            <div
              key={cat.id}
              className={`help-category-card glass-card ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(prev => prev === cat.id ? null : cat.id)}
            >
              <div className="help-cat-icon" style={{ background: cat.bg, color: cat.color }}>
                <span style={{ fontSize: '1.4rem' }}>{cat.icon}</span>
              </div>
              <div className="help-cat-info">
                <h3>{cat.label}</h3>
                <p>{cat.description}</p>
                <span className="help-cat-count">{cat.count} {cat.count === 1 ? 'article' : 'articles'}</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* ── FAQ / Article List ─────────────────────────────────────────── */}
      <div className="glass-card" style={{ marginTop: 24, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} style={{ color: 'var(--accent-primary)' }} />
            {selectedCategory
              ? HELP_CATEGORIES.find(c => c.id === selectedCategory)?.label + ' Articles'
              : search ? 'Search Results' : 'Frequently Asked Questions'}
          </h2>
          {selectedCategory && (
            <button onClick={() => setSelectedCategory(null)} className="btn btn-secondary btn-sm">
              <X size={14} /> Clear Filter
            </button>
          )}
        </div>

        {articles.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>No articles found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {search ? 'Try different keywords or clear the search.' : 'No articles available in this category for your role.'}
            </p>
          </div>
        ) : (
          <div className="help-faq-list">
            {articles.map(article => {
              const cat = HELP_CATEGORIES.find(c => c.id === article.category);
              const isExpanded = expandedFaq === article.id;
              return (
                <div key={article.id} className={`help-faq-item ${isExpanded ? 'expanded' : ''}`}>
                  <div className="help-faq-header" onClick={() => setExpandedFaq(prev => prev === article.id ? null : article.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{cat?.icon ?? '📄'}</span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 className="help-faq-title">{article.title}</h4>
                        <p className="help-faq-desc">{article.description}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {isAdmin && adminMode && (
                        <>
                          <button onClick={e => { e.stopPropagation(); setEditingArticle(article); }} className="btn-icon" style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(8,145,178,0.08)', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteArticle(article.id); }} className="btn-icon" style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                      {isExpanded ? <ChevronDown size={18} style={{ color: 'var(--accent-primary)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="help-faq-preview">
                      <div className="help-faq-meta">
                        <span className="help-badge" style={{ background: cat?.bg, color: cat?.color }}>{cat?.icon} {cat?.label}</span>
                        {article.role.map(r => (
                          <span key={r} className="help-badge help-role-badge"><Users size={10} /> {r}</span>
                        ))}
                        <span className="help-badge" style={{ background: 'rgba(8,145,178,0.08)', color: 'var(--accent-primary)' }}>{article.steps.length} steps</span>
                      </div>
                      <div className="help-preview-steps">
                        {article.steps.slice(0, 3).map(s => (
                          <div key={s.stepNumber} className="help-preview-step">
                            <span className="help-step-num">{s.stepNumber}</span>
                            <span>{s.text}</span>
                          </div>
                        ))}
                        {article.steps.length > 3 && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: 36 }}>
                            +{article.steps.length - 3} more steps...
                          </div>
                        )}
                      </div>
                      <button onClick={() => openArticle(article)} className="btn btn-primary btn-sm" style={{ marginTop: 12 }}>
                        <ExternalLink size={14} /> View Full Guide
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Article Side Panel ─────────────────────────────────────────── */}
      {panelOpen && <div className="help-panel-overlay" onClick={closePanel} />}
      <div className={`help-article-panel ${panelOpen ? 'open' : ''}`}>
        {activeArticle && (
          <>
            <div className="help-panel-header">
              <button onClick={closePanel} className="help-panel-back">
                <ArrowLeft size={18} />
              </button>
              <h2 className="help-panel-title">{activeArticle.title}</h2>
            </div>

            <div className="help-panel-body">
              {/* Meta badges */}
              <div className="help-faq-meta" style={{ marginBottom: 16 }}>
                {(() => { const cat = HELP_CATEGORIES.find(c => c.id === activeArticle.category); return cat ? <span className="help-badge" style={{ background: cat.bg, color: cat.color }}>{cat.icon} {cat.label}</span> : null; })()}
                {activeArticle.role.map(r => (
                  <span key={r} className="help-badge help-role-badge"><Users size={10} /> {r}</span>
                ))}
              </div>

              {/* Description */}
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: 24 }}>
                {activeArticle.description}
              </p>

              {/* Steps */}
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} /> Step-by-Step Guide
              </h3>
              <div className="help-steps-list">
                {activeArticle.steps.map(step => (
                  <div key={step.stepNumber} className="help-step-card">
                    <div className="help-step-number">{step.stepNumber}</div>
                    <div className="help-step-content">
                      <p>{step.text}</p>
                      {step.image && (
                        <img src={step.image} alt={`Step ${step.stepNumber}`} className="help-step-image" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Video placeholder */}
              <div className="help-video-placeholder">
                <PlayCircle size={32} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 2 }}>Video Tutorial</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Coming soon — video guides for this topic</p>
                </div>
                <span className="help-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', fontSize: '0.7rem' }}>Coming Soon</span>
              </div>

              {/* Tags */}
              {activeArticle.tags.length > 0 && (
                <div style={{ marginTop: 24 }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={13} /> Tags
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {activeArticle.tags.map(tag => (
                      <span key={tag} className="help-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Articles */}
              {relatedArticles && (
                <>
                  {(relatedArticles as any).related?.length > 0 && (
                    <div className="help-related-section">
                      <h4 className="help-related-title">📎 Related Articles</h4>
                      {(relatedArticles as any).related.map((a: HelpArticle) => (
                        <div key={a.id} className="help-related-item" onClick={() => openArticle(a)}>
                          <span style={{ fontSize: '1rem' }}>{HELP_CATEGORIES.find(c => c.id === a.category)?.icon ?? '📄'}</span>
                          <span>{a.title}</span>
                          <ChevronRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
                        </div>
                      ))}
                    </div>
                  )}

                  {(relatedArticles as any).alsoViewed?.length > 0 && (
                    <div className="help-related-section">
                      <h4 className="help-related-title">👥 Users Also Viewed</h4>
                      {(relatedArticles as any).alsoViewed.map((a: HelpArticle) => (
                        <div key={a.id} className="help-related-item" onClick={() => openArticle(a)}>
                          <span style={{ fontSize: '1rem' }}>{HELP_CATEGORIES.find(c => c.id === a.category)?.icon ?? '📄'}</span>
                          <span>{a.title}</span>
                          <ChevronRight size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
