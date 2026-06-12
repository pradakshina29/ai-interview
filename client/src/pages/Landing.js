import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const FEATURES = [
  { icon: '🤖', title: 'AI-Powered Evaluations', desc: 'Gemini AI generates realistic, role-specific questions tailored to your resume, track, and experience level.' },
  { icon: '📊', title: 'Deep Analytics', desc: 'Get detailed feedback, structured score sheets, resume relevance metrics, and ideal answers for each question.' },
  { icon: '👥', title: 'IT & Business Tracks', desc: 'Dedicated tracks for Software Engineers, PMs, and non-technical fields like HR Specialists, Marketing, and Sales Managers.' },
  { icon: '🎙️', title: 'Voice & Video Capture', desc: 'Integrated camera detection and browser SpeechRecognition API to capture and parse your spoken responses.' },
  { icon: '🔐', title: 'Secure Encrypted Sessions', desc: 'Secure Firebase-based authentication. Your data, videos, and scores are kept completely private.' },
  { icon: '⚡', title: 'Real-time Analytics', desc: 'No delayed processing. Get instant insights, actionable improvements, and dashboard metric updates immediately.' },
];

const ROLES = [
  'Software Engineer', 'Full Stack Developer', 'Human Resources', 'Marketing Manager', 
  'Data Scientist', 'DevOps Engineer', 'Sales Representative', 'Product Manager', 
  'UI/UX Designer', 'Financial Analyst', 'Content Writer', 'Operations Manager'
];

const TESTIMONIALS = [
  {
    quote: "InterviewAI completely changed my preparation. The instant feedback on my Software Engineer responses helped me fix minor details that make a huge difference!",
    author: "Sarah Chen",
    role: "Frontend Architect",
    avatar: "🎨"
  },
  {
    quote: "I practiced for the HR Specialist interview using the new non-technical tracks, and the Gemini AI generated questions that were identical to my actual interview.",
    author: "Marcus Brody",
    role: "Talent Lead",
    avatar: "💼"
  },
  {
    quote: "The voice recognition and face detection feel incredibly futuristic. It's like having a real panel of interviewers right in front of you.",
    author: "Liam Vance",
    role: "DevOps Specialist",
    avatar: "🚀"
  }
];

const FAQS = [
  {
    q: "How does the AI Career Coach Chatbot work?",
    a: "Our floating AI Chatbot uses the Google Gemini API to analyze your career questions, suggest interview preparation strategies, and guide you through the website's features in real-time."
  },
  {
    q: "Can I practice for non-IT / business roles?",
    a: "Absolutely! We recently introduced dedicated support for Non-IT & Business tracks such as HR Specialists, Marketing Managers, Project Managers, and Sales Representatives, alongside our technical IT tracks."
  },
  {
    q: "Is my interview response evaluation private?",
    a: "Yes, all your responses, audio/video feeds, and generated coaching reports are stored securely under your account and are accessible only to you on your personalized dashboard."
  },
  {
    q: "How do I get detailed feedback?",
    a: "Once you complete a practice session, our system instantly runs deep analytics to evaluate your scores, highlight strengths and areas for improvement, and generate model answers for comparison."
  }
];

// High performance requestAnimationFrame counter hook
function AnimatedCounter({ end, suffix = '', duration = 1500 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressPercent = Math.min(progress / duration, 1);
      
      setCount(Math.floor(progressPercent * end));

      if (progressPercent < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <span className="stat-num">
      {count}
      {suffix}
    </span>
  );
}

export default function Landing() {
  const [activeFaq, setActiveFaq] = useState(null);

  // Generate 20 random particle structures programmatically
  const particles = Array.from({ length: 20 }).map((_, i) => {
    const size = Math.random() * 8 + 3;
    const left = Math.random() * 100;
    const delay = Math.random() * 10;
    const duration = Math.random() * 15 + 10;
    return { i, size, left, delay, duration };
  });

  return (
    <div className="landing">
      {/* ── Floating Particles Background ── */}
      <div className="particles-container">
        {particles.map(p => (
          <div
            key={p.i}
            className="particle"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`
            }}
          />
        ))}
      </div>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid" />
        </div>
        <div className="container hero-content">
          <div className="hero-badge animate-fade-in">
            <span className="badge badge-purple">🚀 Multi-User AI Interview Platform</span>
          </div>
          <h1 className="hero-title animate-fade-in-up">
            Elevate Your Next<br />
            <span className="gradient-text">Interview Prep</span><br />
            with AI Analytics
          </h1>
          <p className="hero-subtitle animate-fade-in-up">
            Practice mock interviews powered by Gemini AI. Get live facial feedback, full voice transcription, and comprehensive score analyses.
          </p>
          
          <div className="hero-cta animate-fade-in-up">
            <Link to="/register" className="btn btn-primary btn-lg animate-pulse-glow" id="btn-hero-start">
              🎯 Start Practicing Free
            </Link>
            <Link to="/login" className="btn btn-secondary btn-lg" id="btn-hero-login">
              Sign In
            </Link>
          </div>

          <div className="hero-stats animate-fade-in">
            <div className="stat">
              <AnimatedCounter end={12} suffix="+" />
              <span className="stat-label">Job Tracks</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <AnimatedCounter end={100} suffix="%" />
              <span className="stat-label">Privacy Guarded</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <AnimatedCounter end={10} suffix="K+" />
              <span className="stat-label">Analyses Run</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tracks Marquee ── */}
      <section className="roles-section">
        <div className="roles-marquee">
          {[...ROLES, ...ROLES].map((role, i) => (
            <span key={i} className="role-chip">{role}</span>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-purple">Core Ecosystem</span>
            <h2 className="section-title">Futuristic Features Built For Success</h2>
            <p className="section-subtitle">Everything you need to master your interview skills in the modern job market.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section testimonials-section">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-cyan">Reviews</span>
            <h2 className="section-title">Approved by Successful Candidates</h2>
            <p className="section-subtitle">Read how our platform helped students and specialists globally land their careers.</p>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <span className="quote-mark">“</span>
                <p className="testimonial-quote">{t.quote}</p>
                <div className="testimonial-profile">
                  <div className="testimonial-avatar">{t.avatar}</div>
                  <div>
                    <h4 className="testimonial-name">{t.author}</h4>
                    <p className="testimonial-role">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Accordion ── */}
      <section className="section faq-section">
        <div className="container">
          <div className="section-header">
            <span className="badge badge-purple">Support</span>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-wrapper">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`faq-item ${activeFaq === i ? 'faq-active' : ''}`}
                onClick={() => setActiveFaq(activeFaq === i ? null : i)}
              >
                <div className="faq-question">
                  <h3>{faq.q}</h3>
                  <span className="faq-toggle">{activeFaq === i ? '−' : '+'}</span>
                </div>
                <div className="faq-answer">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="section cta-section">
        <div className="container">
          <div className="cta-card">
            <div className="cta-orb" />
            <h2 className="cta-title">Ready to Ace Your Next Interview?</h2>
            <p className="cta-subtitle">Register a secure account instantly and practice in minutes.</p>
            <Link to="/register" className="btn btn-primary btn-lg" id="btn-cta-register">
              🚀 Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container footer-grid-container">
          <div className="footer-brand">
            <div className="footer-logo">🤖 InterviewAI</div>
            <p className="footer-brand-text">The premium AI Interview coaching platform.</p>
          </div>
          <div className="footer-links-group">
            <h4>Quick Links</h4>
            <Link to="/login">Sign In</Link>
            <Link to="/register">Create Account</Link>
          </div>
          <div className="footer-links-group">
            <h4>Connect</h4>
            <a href="https://github.com" target="_blank" rel="noreferrer">💻 GitHub</a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer">💼 LinkedIn</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-text">© {new Date().getFullYear()} InterviewAI. Powered by Gemini AI + Firebase.</p>
        </div>
      </footer>
    </div>
  );
}
