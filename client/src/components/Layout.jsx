import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
    const { user, logout } = useAuth();

    const today = new Date();
    const dateString = today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div className="layout">
            <header className="header">
                <div className="header-left">
                    <div className="header-logo">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <div className="header-title-group">
                        <h1>KIOT Task Manager</h1>
                        <span className="header-date">📅 {dateString}</span>
                    </div>
                </div>

                <nav className="header-nav">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📋 Dashboard
                    </NavLink>
                    <NavLink to="/progress" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        📊 Progress
                    </NavLink>
                </nav>

                <div className="header-right">
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
            </header>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
