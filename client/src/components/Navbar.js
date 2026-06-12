import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Navbar.css';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Theme handling
  const [theme, setTheme] = useState(localStorage.getItem('app-theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'pastel', 'cyberpunk'];
    const nextIndex = (themes.indexOf(theme) + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme);
    toast.success(`Switched to ${nextTheme} mode`);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMenuOpen(false), [location]);

  async function handleLogout() {
    try {
      await logout();
      toast.success('Logged out successfully!');
      navigate('/');
    } catch {
      toast.error('Failed to log out.');
    }
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : currentUser?.email?.[0]?.toUpperCase() || '?';

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🤖</span>
          <span className="logo-text">InterviewAI</span>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          {currentUser ? (
            <>
              <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
              <Link to="/interview" className={`nav-link ${location.pathname === '/interview' ? 'active' : ''}`}>Practice</Link>
              <Link to="/history"   className={`nav-link ${location.pathname === '/history' ? 'active' : ''}`}>History</Link>
              <div className="nav-user">
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={cycleTheme} 
                  title="Toggle Theme"
                  style={{ padding: '8px', fontSize: '1.2rem', borderRadius: '50%' }}
                >
                  {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : theme === 'cyberpunk' ? '⚡' : '🌸'}
                </button>
                <div className="user-avatar">{initials}</div>
                <span className="user-name">{currentUser.displayName || currentUser.email?.split('@')[0]}</span>
                <button className="btn btn-secondary btn-sm" onClick={handleLogout} id="btn-logout">Logout</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login"    className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}>Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm" id="btn-get-started">Get Started</Link>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={cycleTheme} 
                title="Toggle Theme"
                style={{ padding: '8px', fontSize: '1.2rem', borderRadius: '50%', marginLeft: '8px' }}
              >
                {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : theme === 'cyberpunk' ? '⚡' : '🌸'}
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button className={`hamburger ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(!menuOpen)} id="btn-hamburger" aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {currentUser ? (
            <>
              <div className="mobile-user-info">
                <div className="user-avatar">{initials}</div>
                <span>{currentUser.displayName || currentUser.email}</span>
              </div>
              <Link to="/dashboard" className="mobile-link">📊 Dashboard</Link>
              <Link to="/interview" className="mobile-link">🎯 Practice Now</Link>
              <Link to="/history"   className="mobile-link">📋 History</Link>
              <button className="btn btn-danger btn-full" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="mobile-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-full">Get Started Free</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
