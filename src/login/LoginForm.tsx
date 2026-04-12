'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getCurrentUserWithRole } from '../lib/auth';
import '../styles/global.css';
import '../styles/login.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    const user = await getCurrentUserWithRole();
    if (!user) {
      setError('Could not load user profile. Contact your administrator.');
      setLoading(false);
      return;
    }

    // Route based on role
    if (user.role === 'Admin') window.location.href = '/dashboard/admin';
    else if (user.role === 'Instructor') window.location.href = '/dashboard/instructor';
    else window.location.href = '/dashboard/student';
  }

  return (
    <div className="app-wrapper">
      <nav className="navbar" id="mainNavbar">
        <div className="logo-area">
          <div className="icon-layers">
            <div className="layer layer-1 center-align"></div>
            <div className="layer layer-2 center-align"></div>
            <div className="layer layer-3 center-align"></div>
          </div>
          <span className="logo-text">Examinizer</span>
        </div>
        <div className="user-info">
          <div className="role-badge">
            <i className="fas fa-lock"></i> Not logged in
          </div>
        </div>
      </nav>

      <div id="loginSection">
        <div className="card login-card">
          <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <h3><i className="fas fa-graduation-cap"></i> Sign in to your account</h3>
          </div>

          {error && (
            <div style={{ color: 'red', padding: '0.75rem', marginBottom: '1rem',
              background: '#fff0f0', borderRadius: '6px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="student@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : <><i className="fas fa-arrow-right-to-bracket"></i> Login</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}