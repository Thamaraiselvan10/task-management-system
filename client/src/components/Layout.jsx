import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
    const { user, logout } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    const closeMobileMenu = () => setMobileMenuOpen(false);

    return (
        <div className="layout">
            <header className="header">
                <div className="header-left">
                    <div className="header-logo">
                        <img src="/kiot-logo.png" alt="KIOT Logo" />
                    </div>
                    <div className="header-title-group">
                        <h1>Faculty Task Tracker</h1>
                        <span className="header-subtitle">Kiot - Placement & IR</span>
                    </div>
                </div>

                <div className="header-center-info">
                    <span>📅 {dateString}</span>
                </div>

                {/* Desktop Navigation */}
                <nav className="header-nav desktop-nav">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📋 Dashboard
                    </NavLink>
                    <NavLink to="/progress" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📊 Progress
                    </NavLink>
                </nav>

                <div className="header-right desktop-nav">
                    <div className="user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className={`user-role ${user?.role?.toLowerCase()}`}>
                            {user?.role}
                        </span>
                    </div>
                    <button onClick={logout} className="btn btn-secondary logout-btn">
                        Logout
                    </button>
                </div>

                {/* Hamburger Button - Mobile Only */}
                <button
                    className="hamburger-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
                    <span className={`hamburger-line ${mobileMenuOpen ? 'open' : ''}`}></span>
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && <div className="mobile-overlay" onClick={closeMobileMenu}></div>}

            {/* Mobile Slide-in Menu */}
            <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-header">
                    <div className="user-info">
                        <span className="user-name">{user?.name}</span>
                        <span className={`user-role ${user?.role?.toLowerCase()}`}>
                            {user?.role}
                        </span>
                    </div>
                </div>
                <nav className="mobile-nav">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
                        onClick={closeMobileMenu}
                    >
                        📋 Dashboard
                    </NavLink>
                    <NavLink
                        to="/progress"
                        className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
                        onClick={closeMobileMenu}
                    >
                        📊 Progress
                    </NavLink>
                </nav>
                <div className="mobile-menu-footer">
                    <button onClick={() => { logout(); closeMobileMenu(); }} className="btn btn-secondary mobile-logout-btn">
                        Logout
                    </button>
                </div>
            </div>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
