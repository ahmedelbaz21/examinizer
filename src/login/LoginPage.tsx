import LoginForm from './LoginForm';

export default function LoginPage() {
  return <LoginForm />;
}
/*
  // src/login/LoginPage.tsx
  import React from "react";
  import "../styles/global.css";
  import "../styles/login.css";

  export default function LoginPage() {
    return (
      <div className="app-wrapper">
        {/* ===== Navbar ===== }
        <nav className="navbar" id="mainNavbar">
          <div className="logo-area">
            <div className="icon-layers">
              <div className="layer layer-1 center-align"></div>
              <div className="layer layer-2 center-align"></div>
              <div className="layer layer-3 center-align"></div>
            </div>
            <span className="logo-text">Examinizer</span>
          </div>
          <div id="navbarUserArea" className="user-info">
            <div className="role-badge">
              <i className="fas fa-lock"></i> Not logged in
            </div>
          </div>
        </nav>

        {/* ===== Login Section ===== }
        <div id="loginSection">
          <div className="card login-card">
            <div className="card-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <h3>
                <i className="fas fa-graduation-cap"></i> Sign in to your account
              </h3>
            </div>

            <div id="loginAlert"></div>

            <form id="loginForm">
              <div className="form-group">
                <label className="form-label" htmlFor="email">Email address</label>
                <input
                  type="email"
                  id="email"
                  className="form-input"
                  placeholder="student@example.com"
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="roleSelect">Login as (role)</label>
                <select id="roleSelect" className="form-select">
                  <option value="student">📘 Student</option>
                  <option value="teacher">👩‍🏫 Teacher</option>
                  <option value="admin">⚙️ Administrator</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }}>
                <i className="fas fa-arrow-right-to-bracket"></i> Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  } 
*/                     