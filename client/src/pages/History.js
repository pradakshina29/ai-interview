import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './History.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

const ROLE_ICONS = {
  'Software Engineer': '💻', 'Frontend Developer': '🎨', 'Backend Developer': '⚙️',
  'Data Scientist': '📊', 'DevOps Engineer': '🚀', 'Product Manager': '📋',
  'UI/UX Designer': '✏️', 'Cybersecurity Analyst': '🔐',
};

const DIFF_BADGE = { Easy: 'badge-green', Medium: 'badge-yellow', Hard: 'badge-red' };

export default function History() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [sessions,    setSessions]   = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [deleting,    setDeleting]   = useState(null);
  const [filter,      setFilter]     = useState('all');      // all | completed | in_progress
  const [sortBy,      setSortBy]     = useState('newest');

  useEffect(() => { fetchSessions(); }, []); // eslint-disable-line

  async function fetchSessions() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSessions(data.sessions);
    } catch {
      toast.error('Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sessionId) {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    setDeleting(sessionId);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      toast.success('Session deleted.');
    } catch {
      toast.error('Failed to delete session.');
    } finally {
      setDeleting(null);
    }
  }

  function getScoreColor(score) {
    if (score >= 8) return '#34d399';
    if (score >= 6) return '#fbbf24';
    if (score >= 4) return '#f97316';
    return '#f87171';
  }

  function formatDate(ts) {
    if (!ts?.seconds) return 'Recently';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  // Filter + Sort
  const filtered = sessions
    .filter(s => filter === 'all' || s.status === filter)
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      if (sortBy === 'oldest') return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      if (sortBy === 'score')  return (b.score || 0) - (a.score || 0);
      return 0;
    });

  const completedCount  = sessions.filter(s => s.status === 'completed').length;
  const avgScore        = completedCount > 0
    ? (sessions.filter(s => s.status === 'completed').reduce((a, s) => a + (s.score || 0), 0) / completedCount).toFixed(1)
    : null;

  return (
    <div className="page-wrapper">
      <div className="container">

        {/* ── Header ── */}
        <div className="history-header animate-fade-in-up">
          <div>
            <h1 className="dash-title">📋 Session History</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: '0.9rem' }}>
              {sessions.length} total session{sessions.length !== 1 ? 's' : ''} •{' '}
              {completedCount} completed{avgScore ? ` • Avg score: ${avgScore}/10` : ''}
            </p>
          </div>
          <Link to="/interview" className="btn btn-primary" id="btn-new-session-history">
            🎯 New Session
          </Link>
        </div>

        {/* ── Filters ── */}
        <div className="history-filters animate-fade-in">
          <div className="filter-group">
            {[['all','All'], ['completed','Completed'], ['in_progress','In Progress']].map(([val, label]) => (
              <button
                key={val}
                id={`filter-${val}`}
                className={`filter-btn ${filter === val ? 'filter-btn-active' : ''}`}
                onClick={() => setFilter(val)}
              >
                {label}
                <span className="filter-count">
                  {val === 'all' ? sessions.length : sessions.filter(s => s.status === val).length}
                </span>
              </button>
            ))}
          </div>
          <div className="sort-group">
            <label className="form-label" style={{ margin: 0, fontSize: '0.8rem' }}>Sort:</label>
            <select
              id="sort-select"
              className="form-select"
              style={{ width: 'auto', padding: '8px 14px', fontSize: '0.875rem' }}
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="score">Highest Score</option>
            </select>
          </div>
        </div>

        {/* ── Sessions Grid ── */}
        {loading ? (
          <div className="history-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="session-card skeleton" style={{ minHeight: 180 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="history-empty animate-fade-in">
            <div className="empty-icon">🎯</div>
            <h2>No sessions found</h2>
            <p>
              {sessions.length === 0
                ? "You haven't done any interview sessions yet."
                : "No sessions match your current filter."}
            </p>
            <Link to="/dashboard" className="btn btn-primary" id="btn-start-first">
              Start Your First Interview
            </Link>
          </div>
        ) : (
          <div className="history-grid animate-fade-in">
            {filtered.map((session, idx) => (
              <div
                key={session.sessionId}
                className="session-card"
                style={{ animationDelay: `${idx * 0.04}s` }}
              >
                {/* Card Top */}
                <div className="session-card-top">
                  <div className="session-icon">
                    {ROLE_ICONS[session.role] || '💼'}
                  </div>
                  <div className="session-status-badge">
                    {session.status === 'completed'
                      ? <span className="badge badge-green">✓ Done</span>
                      : <span className="badge badge-yellow">⏳ Ongoing</span>}
                  </div>
                </div>

                {/* Role + Difficulty */}
                <h3 className="session-role">{session.role}</h3>
                <div className="session-meta">
                  <span className={`badge ${DIFF_BADGE[session.difficulty] || 'badge-purple'}`}>
                    {session.difficulty}
                  </span>
                  <span className="session-date">{formatDate(session.createdAt)}</span>
                </div>

                {/* Score */}
                {session.score !== null && session.score !== undefined ? (
                  <div className="session-score-row">
                    <div className="session-score-bar">
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{
                          width: `${session.score * 10}%`,
                          background: `linear-gradient(90deg, ${getScoreColor(session.score)}, ${getScoreColor(session.score)}80)`
                        }} />
                      </div>
                    </div>
                    <span className="session-score-text" style={{ color: getScoreColor(session.score) }}>
                      {session.score}/10
                    </span>
                  </div>
                ) : (
                  <div className="session-score-row">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {session.answeredCount}/{session.numQuestions} answered
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="session-actions">
                  {session.status === 'completed' ? (
                    <Link
                      to={`/results/${session.sessionId}`}
                      className="btn btn-secondary btn-sm btn-full"
                      id={`btn-results-${session.sessionId}`}
                    >
                      View Results →
                    </Link>
                  ) : (
                    <button
                      className="btn btn-primary btn-sm btn-full"
                      onClick={() => navigate('/dashboard')}
                      id={`btn-resume-${session.sessionId}`}
                    >
                      Start New Session
                    </button>
                  )}
                  <button
                    className="btn btn-danger btn-sm"
                    id={`btn-delete-${session.sessionId}`}
                    onClick={() => handleDelete(session.sessionId)}
                    disabled={deleting === session.sessionId}
                    title="Delete session"
                  >
                    {deleting === session.sessionId ? <span className="spinner spinner-sm" /> : '🗑'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
