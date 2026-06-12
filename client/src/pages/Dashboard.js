import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Dashboard.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

const DIFFICULTY_INFO = {
  Easy:   { color: 'badge-green',  emoji: '🌱', desc: 'Entry level / Fresher' },
  Medium: { color: 'badge-yellow', emoji: '🔥', desc: 'Mid-level (1-3 years)' },
  Hard:   { color: 'badge-red',    emoji: '⚡', desc: 'Senior / Expert level' },
};

const TECH_ROLES = [
  'Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Software Tester / QA', 'Data Scientist', 'Machine Learning Engineer', 'DevOps Engineer', 
  'Cloud Architect', 'Product Manager', 'Business Analyst', 'UI/UX Designer', 'Cybersecurity Analyst',
  'AI Prompt Engineer', 'Blockchain Developer', 'Site Reliability Engineer', 'Game Developer'
];

const NON_TECH_ROLES = [
  'Human Resources Specialist', 'Marketing Manager', 'Sales Representative', 'Financial Analyst',
  'Content Writer', 'Customer Success Manager', 'Operations Manager', 'Project Manager',
  'Office Administrator', 'Recruiter', 'Public Relations Specialist'
];

const ROLE_ICONS = {
  // Tech Roles
  'Software Engineer': '💻', 'Full Stack Developer': '🌐', 'Frontend Developer': '🎨', 'Backend Developer': '⚙️',
  'Software Tester / QA': '🐛', 'Data Scientist': '📊', 'Machine Learning Engineer': '🤖', 'DevOps Engineer': '🚀', 
  'Cloud Architect': '☁️', 'Product Manager': '📋', 'Business Analyst': '📈', 'UI/UX Designer': '✏️', 'Cybersecurity Analyst': '🔐',
  'AI Prompt Engineer': '🧠', 'Blockchain Developer': '⛓️', 'Site Reliability Engineer': '🛡️', 'Game Developer': '🎮',

  // Non-Tech Roles
  'Human Resources Specialist': '👥', 'Marketing Manager': '📢', 'Sales Representative': '💼', 'Financial Analyst': '💵',
  'Content Writer': '✍️', 'Customer Success Manager': '❤️', 'Operations Manager': '📊', 'Project Manager': '📅',
  'Office Administrator': '📂', 'Recruiter': '🔍', 'Public Relations Specialist': '🎙️'
};

export default function Dashboard() {
  const { currentUser, getToken } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [form, setForm] = useState({ role: 'Software Engineer', difficulty: 'Medium', numQuestions: 5, mode: 'technical' });
  const [roleCategory, setRoleCategory] = useState('technical');
  const [starting, setStarting] = useState(false);
  
  const activeRoles = roleCategory === 'technical' ? TECH_ROLES : NON_TECH_ROLES;
  
  // Resume state
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeParsed, setResumeParsed] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => {
    fetchStats();
    fetchRecentSessions();
  }, []); // eslint-disable-line

  async function fetchStats() {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/sessions/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  }

  async function fetchRecentSessions() {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentSessions(data.sessions.slice(0, 3));
      }
    } catch { /* silent */ }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file.');
      return;
    }
    
    setResumeFile(file);
    setUploading(true);
    
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('resume', file);
      
      const res = await fetch(`${API}/api/interview/upload-resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setResumeParsed(data.resumeJSON);
      toast.success('Resume parsed successfully! Questions will be tailored to your experience.');
    } catch (err) {
      toast.error(err.message || 'Failed to parse resume.');
      setResumeFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  }

  async function handleStartInterview(e) {
    e.preventDefault();
    setStarting(true);
    try {
      const token = await getToken();
      console.log(`Starting interview via: ${API}/api/interview/start`);
      
      let res;
      let retries = 2; // Try up to 3 times
      while (retries >= 0) {
        try {
          res = await fetch(`${API}/api/interview/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...form, resumeJSON: resumeParsed }),
          });
          break; // Break if network request succeeds
        } catch (fetchErr) {
          if (retries === 0) throw fetchErr;
          console.warn(`Fetch failed, retrying... (${retries} retries left)`);
          retries--;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      // If server responded with an error status (e.g., 500 or 400)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.details || data.error || `Server error: ${res.status}`);
      }

      const data = await res.json();
      navigate('/interview', { state: { session: data } });
    } catch (err) {
      console.error('Interview Start Error:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        toast.error('Cannot connect to server. Please ensure the backend (port 5000) is running.');
      } else {
        toast.error(err.message || 'Failed to start interview.');
      }
    } finally {
      setStarting(false);
    }
  }

  function getGradeColor(score) {
    if (score >= 8) return '#34d399';
    if (score >= 6) return '#fbbf24';
    if (score >= 4) return '#f97316';
    return '#f87171';
  }

  return (
    <div className="page-wrapper">
      <div className="container">

        {/* ── Header ── */}
        <div className="dash-header animate-fade-in-up">
          <div>
            <p className="dash-greeting">{greeting}, {displayName}! 👋</p>
            <h1 className="dash-title">Your Interview Dashboard</h1>
          </div>
          <Link to="/history" className="btn btn-secondary" id="btn-view-history">📋 View All History</Link>
        </div>

        {/* ── Stats Row ── */}
        <div className="stats-row animate-fade-in-up">
          {loadingStats ? (
            [1,2,3,4].map(i => <div key={i} className="stat-card skeleton" />)
          ) : (
            <>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(124,58,237,0.15)' }}>🎯</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{stats?.total ?? 0}</span>
                  <span className="stat-card-label">Total Sessions</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>✅</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{stats?.completed ?? 0}</span>
                  <span className="stat-card-label">Completed</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>⭐</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{stats?.avgScore ?? '—'}{stats?.avgScore ? '/10' : ''}</span>
                  <span className="stat-card-label">Avg. Score</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>🏆</div>
                <div className="stat-card-info">
                  <span className="stat-card-value" style={{ fontSize: '1rem' }}>{stats?.topRole ?? 'N/A'}</span>
                  <span className="stat-card-label">Top Role</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Main Grid ── */}
        <div className="dash-grid">

          {/* Start Interview Form */}
          <div className="card dash-start-card animate-fade-in-up">
            <div className="dash-start-header">
              <h2 className="card-title">🎯 Start New Interview</h2>
              <p className="card-subtitle">Configure your session and begin practicing</p>
            </div>

            <form onSubmit={handleStartInterview}>
              
              {/* Optional Resume Upload */}
              <div className="form-group" style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Upload Resume (Optional, PDF)</span>
                  {resumeParsed && <span className="badge badge-green">✓ Parsed</span>}
                </label>
                <input 
                  type="file" 
                  accept=".pdf"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  id="resume-upload"
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary btn-full"
                  disabled={uploading}
                >
                  {uploading ? <span className="spinner spinner-sm" /> : (resumeFile ? resumeFile.name : '📄 Choose PDF Resume')}
                </button>
                {resumeParsed && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Identified <strong>{resumeParsed.skills?.languages?.length || 0}</strong> languages and <strong>{resumeParsed.skills?.frameworks?.length || 0}</strong> frameworks. Questions will be personalized!
                  </p>
                )}
              </div>

              {/* Mode Toggle */}
              <div className="form-group">
                <label className="form-label">Interview Mode</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn btn-full ${form.mode === 'technical' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, mode: 'technical' }))}
                  >
                    🛠 Technical
                  </button>
                  <button
                    type="button"
                    className={`btn btn-full ${form.mode === 'behavioural' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm(f => ({ ...f, mode: 'behavioural' }))}
                  >
                    🤝 HR / Behavioural
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Job Role</label>
                  <div className="category-tabs" style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '3px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${roleCategory === 'technical' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px' }}
                      onClick={() => { setRoleCategory('technical'); setForm(f => ({ ...f, role: TECH_ROLES[0] })); }}
                    >
                      💻 Tech / IT
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${roleCategory === 'non-technical' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '4px' }}
                      onClick={() => { setRoleCategory('non-technical'); setForm(f => ({ ...f, role: NON_TECH_ROLES[0] })); }}
                    >
                      👥 Non-IT / Business
                    </button>
                  </div>
                </div>
                <div className="role-grid">
                  {activeRoles.map(role => (
                    <button
                      key={role}
                      type="button"
                      id={`role-${role.replace(/\s+/g, '-').toLowerCase()}`}
                      className={`role-btn ${form.role === role ? 'role-btn-active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, role }))}
                    >
                      <span className="role-btn-icon">{ROLE_ICONS[role]}</span>
                      <span className="role-btn-label">{role}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="form-group">
                <label className="form-label">Difficulty Level</label>
                <div className="difficulty-row">
                  {Object.entries(DIFFICULTY_INFO).map(([level, info]) => (
                    <button
                      key={level}
                      type="button"
                      id={`diff-${level.toLowerCase()}`}
                      className={`diff-btn ${form.difficulty === level ? 'diff-btn-active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, difficulty: level }))}
                    >
                      <span>{info.emoji} {level}</span>
                      <span className="diff-btn-desc">{info.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div className="form-group">
                <label className="form-label">
                  Number of Questions: <strong style={{ color: 'var(--accent-primary)' }}>{form.numQuestions}</strong>
                </label>
                <input
                  type="range" min="3" max="20" step="1"
                  value={form.numQuestions}
                  onChange={e => setForm(f => ({ ...f, numQuestions: parseInt(e.target.value) }))}
                  className="range-slider"
                  id="num-questions-slider"
                />
                <div className="range-labels"><span>3</span><span>20</span></div>
              </div>

              <button
                id="btn-start-interview"
                type="submit"
                className="btn btn-primary btn-full btn-lg"
                disabled={starting}
              >
                {starting
                  ? <><span className="spinner spinner-sm" /> Generating Questions...</>
                  : '🚀 Start Interview Session'}
              </button>
            </form>
          </div>

          {/* Recent Sessions */}
          <div className="dash-recent animate-fade-in-up">
            <h2 className="card-title" style={{ marginBottom: 20 }}>📋 Recent Sessions</h2>
            {recentSessions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎯</div>
                <p>No sessions yet.<br />Start your first interview!</p>
              </div>
            ) : (
              <div className="recent-list">
                {recentSessions.map(session => (
                  <div key={session.sessionId} className="recent-card">
                    <div className="recent-card-top">
                      <div>
                        <div className="recent-role">
                          {ROLE_ICONS[session.role] || '💼'} {session.role}
                        </div>
                        <div className="recent-meta">
                          <span className={`badge ${DIFFICULTY_INFO[session.difficulty]?.color || 'badge-purple'}`}>
                            {session.difficulty}
                          </span>
                          <span className="recent-date">
                            {session.createdAt?.seconds
                              ? new Date(session.createdAt.seconds * 1000).toLocaleDateString()
                              : 'Recent'}
                          </span>
                        </div>
                      </div>
                      {session.score !== null && session.score !== undefined ? (
                        <div className="recent-score" style={{ color: getGradeColor(session.score) }}>
                          {session.score}/10
                        </div>
                      ) : (
                        <span className="badge badge-yellow">In Progress</span>
                      )}
                    </div>
                    {session.status === 'completed' && (
                      <Link
                        to={`/results/${session.sessionId}`}
                        className="btn btn-secondary btn-sm btn-full"
                        id={`btn-view-${session.sessionId}`}
                      >
                        View Results →
                      </Link>
                    )}
                  </div>
                ))}
                <Link to="/history" className="btn btn-secondary btn-full" id="btn-all-sessions">
                  View All Sessions →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
