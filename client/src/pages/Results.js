import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Results.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

const GRADE_CONFIG = {
  Excellent: { color: '#34d399', emoji: '🏆', message: 'Outstanding performance!' },
  Good:      { color: '#fbbf24', emoji: '👍', message: 'Great job! Keep it up.' },
  Average:   { color: '#f97316', emoji: '📈', message: 'Good effort. Room to grow!' },
  Poor:      { color: '#f87171', emoji: '💪', message: 'Keep practicing — you\'ll get there!' },
};

export default function Results() {
  const { sessionId } = useParams();
  const { state } = useLocation();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [session,   setSession]   = useState(state?.session   || null);
  const [answers,   setAnswers]   = useState(state?.answers   || []);
  const [summary,   setSummary]   = useState(state?.summary   || null);
  const [loading,   setLoading]   = useState(!state?.answers);
  const [expanded,  setExpanded]  = useState(null);

  useEffect(() => {
    if (!state?.answers) fetchSession();
  }, [sessionId]); // eslint-disable-line

  async function fetchSession() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Session not found');
      const data = await res.json();
      setSession(data.session);
      setAnswers(data.session.answers || []);
      setSummary({ overallScore: data.session.score, overallGrade: data.session.grade, report: data.session.report });
    } catch {
      navigate('/history');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading results...</p>
      </div>
    </div>
  );

  const score     = summary?.overallScore ?? session?.score ?? 0;
  const grade     = summary?.overallGrade ?? session?.grade ?? 'Average';
  const report    = summary?.report ?? session?.report;
  const gradeConf = GRADE_CONFIG[grade] || GRADE_CONFIG.Average;

  function getScoreColor(s) {
    if (s >= 8) return '#34d399';
    if (s >= 6) return '#fbbf24';
    if (s >= 4) return '#f97316';
    return '#f87171';
  }

  return (
    <div className="page-wrapper">
      <div className="container results-container">

        {/* ── Results Hero ── */}
        <div className="results-hero card animate-fade-in-up">
          <div className="results-hero-bg" />
          <div className="results-hero-content">
            <div className="results-score-ring" style={{ borderColor: gradeConf.color, boxShadow: `0 0 30px ${gradeConf.color}40` }}>
              <span className="results-score-num" style={{ color: gradeConf.color }}>{score}</span>
              <span className="results-score-denom">/10</span>
            </div>
            <div className="results-info">
              <div className="results-grade" style={{ color: gradeConf.color }}>
                {gradeConf.emoji} {grade}
              </div>
              <p className="results-message">{gradeConf.message}</p>
              <div className="results-meta-chips">
                <span className="badge badge-purple">🎯 {session?.role}</span>
                <span className="badge badge-cyan">📊 {session?.difficulty}</span>
                <span className="badge badge-green">✅ {answers.length} Questions</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── AI Report ── */}
        {report && (
          <div className="card report-card animate-fade-in-up">
            <h2 className="card-title" style={{ marginBottom: 20 }}>🤖 AI Performance Report</h2>

            <div className="report-summary">
              <p className="report-summary-text">{report.summary}</p>
            </div>

            <div className="report-grid">
              {report.topSkills?.length > 0 && (
                <div className="report-section">
                  <h3 className="report-section-title" style={{ color: '#34d399' }}>💪 Top Strengths</h3>
                  <ul className="report-list report-list-green">
                    {report.topSkills.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {report.areasToImprove?.length > 0 && (
                <div className="report-section">
                  <h3 className="report-section-title" style={{ color: '#fbbf24' }}>📈 Focus Areas</h3>
                  <ul className="report-list report-list-yellow">
                    {report.areasToImprove.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {report.recommendation && (
              <div className="report-recommendation">
                <span className="report-rec-label">🎯 Next Step:</span>
                <span className="report-rec-text">{report.recommendation}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Resume Weightage ── */}
        {report?.resumeWeightage && (
          <div className="card report-card animate-fade-in-up">
            <h2 className="card-title" style={{ marginBottom: 20 }}>📄 Resume Fit & Weightage</h2>
            
            <div className="report-grid">
              <div className="report-section">
                <h3 className="report-section-title" style={{ color: '#06b6d4' }}>Interview Score (80%)</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#06b6d4' }}>{report.resumeWeightage.interviewScore} / 10</p>
              </div>
              <div className="report-section">
                <h3 className="report-section-title" style={{ color: '#8b5cf6' }}>Resume Score (20%)</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#8b5cf6' }}>{report.resumeWeightage.score} / 10</p>
              </div>
            </div>

            <div className="report-summary" style={{ marginTop: '20px', backgroundColor: 'rgba(139, 92, 246, 0.05)', borderLeft: '4px solid #8b5cf6' }}>
              <p className="report-summary-text"><strong>Remarks:</strong> {report.resumeWeightage.remarks}</p>
            </div>
          </div>
        )}

        {/* ── Score Breakdown ── */}
        <div className="card animate-fade-in-up">
          <h2 className="card-title" style={{ marginBottom: 24 }}>📊 Question-by-Question Breakdown</h2>
          <div className="breakdown-list">
            {answers.map((item, i) => {
              const isOpen   = expanded === i;
              const s        = item.evaluation?.score ?? 0;
              const g        = item.evaluation?.grade ?? 'Average';
              const gConf    = GRADE_CONFIG[g] || GRADE_CONFIG.Average;

              return (
                <div key={i} className={`breakdown-item ${isOpen ? 'breakdown-item-open' : ''}`}>
                  <button
                    id={`breakdown-toggle-${i}`}
                    className="breakdown-header"
                    onClick={() => setExpanded(isOpen ? null : i)}
                  >
                    <div className="breakdown-left">
                      <div className="breakdown-q-num" style={{ background: `${gConf.color}20`, color: gConf.color }}>
                        Q{i + 1}
                      </div>
                      <div className="breakdown-q-text">{item.question}</div>
                    </div>
                    <div className="breakdown-right">
                      <div className="breakdown-score" style={{ color: getScoreColor(s) }}>{s}/10</div>
                      <span className={`badge ${s >= 8 ? 'badge-green' : s >= 6 ? 'badge-yellow' : s >= 4 ? 'badge-yellow' : 'badge-red'}`}>
                        {g}
                      </span>
                      <span className="breakdown-chevron">{isOpen ? '▲' : '▽'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="breakdown-body animate-fade-in">
                      <div className="breakdown-score-bar">
                        <div className="progress-bar-wrap">
                          <div className="progress-bar-fill" style={{
                            width: `${s * 10}%`,
                            background: `linear-gradient(90deg, ${gConf.color}, ${gConf.color}80)`
                          }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: gConf.color }}>{s * 10}%</span>
                      </div>

                      <div className="breakdown-answer-section">
                        <p className="breakdown-label">📝 Your Answer:</p>
                        <p className="breakdown-answer-text">{item.answer}</p>
                      </div>

                      {item.videoUrl && (
                        <div className="breakdown-video-section" style={{ marginTop: '16px' }}>
                          <p className="breakdown-label">🎥 Recorded Answer:</p>
                          <video 
                            src={item.videoUrl} 
                            controls 
                            className="interview-playback-video" 
                            style={{ width: '100%', maxWidth: '400px', borderRadius: '8px', border: '1px solid var(--border-color)' }} 
                          />
                        </div>
                      )}

                      {item.evaluation?.feedback && (
                        <div className="breakdown-feedback">
                          <p className="breakdown-label">🤖 AI Feedback:</p>
                          <p className="breakdown-feedback-text">{item.evaluation.feedback}</p>
                        </div>
                      )}

                      {item.evaluation?.modelAnswer && (
                        <div className="breakdown-model">
                          <p className="breakdown-label">🎯 Model Answer:</p>
                          <p className="breakdown-model-text">{item.evaluation.modelAnswer}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CTA Buttons ── */}
        <div className="results-cta animate-fade-in-up">
          <Link to="/interview" className="btn btn-primary btn-lg" id="btn-practice-again">
            🔄 Practice Again
          </Link>
          <Link to="/history" className="btn btn-secondary btn-lg" id="btn-view-history-results">
            📋 All Sessions
          </Link>
          <Link to="/dashboard" className="btn btn-secondary btn-lg" id="btn-dashboard-results">
            📊 Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
