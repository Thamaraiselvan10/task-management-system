import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();

    // Use location state to show messages (like "Session expired")
    const message = location.state?.message;

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(email, password);
            toast.success('Welcome back!');
            navigate('/dashboard');
        } catch (err) {
            setError('Failed to log in. Please check your credentials.');
            toast.error('Login failed. Please check your credentials.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            {/* Left Side: Branding */}
            <div className="login-brand-section">
                <div className="brand-content">
                    <img src="/kiot-logo.png" alt="KIOT Logo" className="brand-logo-img" />
                    <h1 className="brand-logo-text">Placement Task Tracker</h1>
                    <p className="brand-subtitle">
                        Kiot - Placement and Industrial Relations
                    </p>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="login-form-section">
                <div className="login-card">
                    <div className="login-header">
                        <h2>Welcome Back</h2>
                        <p>Please enter your credentials to access the dashboard.</p>
                    </div>

                    {error && <div className="alert alert-danger" style={{
                        color: 'var(--danger)',
                        background: 'rgba(239,68,68,0.1)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                    }}>{error}</div>}

                    {message && <div className="alert alert-info" style={{
                        color: 'var(--primary-light)',
                        background: 'rgba(59,130,246,0.1)',
                        padding: '1rem',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '1rem',
                        fontSize: '0.875rem'
                    }}>{message}</div>}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@kiot.ac.in"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="login-btn"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
