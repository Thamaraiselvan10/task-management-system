import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Progress.css';

export default function Progress() {
    const { user, token, isAdmin } = useAuth();
    const [staff, setStaff] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState('all');
    const [progressData, setProgressData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [selectedStaff]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Fetch staff list for admin
            if (isAdmin) {
                const staffRes = await fetch('/api/users/staff', { headers });
                if (staffRes.ok) {
                    const staffData = await staffRes.json();
                    setStaff(staffData.staff);
                }
            }

            // Fetch tasks
            const tasksRes = await fetch('/api/tasks', { headers });
            if (tasksRes.ok) {
                const tasksData = await tasksRes.json();
                processProgressData(tasksData.tasks);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const processProgressData = (tasks) => {
        let filteredTasks = tasks;

        // For staff view or when a specific staff is selected
        if (!isAdmin) {
            // Staff sees only their tasks
            filteredTasks = tasks;
        } else if (selectedStaff !== 'all') {
            // Admin filtering by staff
            filteredTasks = tasks.filter(task =>
                task.assignees?.some(a => a.id === parseInt(selectedStaff))
            );
        }

        const total = filteredTasks.length;
        const completed = filteredTasks.filter(t => t.status === 'Completed').length;
        const inProgress = filteredTasks.filter(t => t.status === 'In Progress').length;
        const pending = filteredTasks.filter(t => t.status === 'Pending').length;
        const overdue = filteredTasks.filter(t =>
            new Date(t.deadline) < new Date() && t.status !== 'Completed'
        ).length;

        // Calculate completion rate
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Calculate daily progress (last 7 days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            const completedOnDay = filteredTasks.filter(t => {
                if (t.status !== 'Completed') return false;
                // Check if task was updated on this day (simplified - using deadline as proxy)
                const taskDate = new Date(t.deadline);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate >= date && taskDate < nextDay;
            }).length;

            last7Days.push({
                date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                shortDate: date.toLocaleDateString('en-US', { weekday: 'short' }),
                completed: completedOnDay
            });
        }

        // Priority breakdown
        const byPriority = {
            high: filteredTasks.filter(t => t.priority === 'High').length,
            medium: filteredTasks.filter(t => t.priority === 'Medium').length,
            low: filteredTasks.filter(t => t.priority === 'Low').length
        };

        setProgressData({
            total,
            completed,
            inProgress,
            pending,
            overdue,
            completionRate,
            last7Days,
            byPriority
        });
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading progress data...</p>
            </div>
        );
    }

    // If no data yet, show empty state
    if (!progressData) {
        return (
            <div className="progress-page">
                <div className="progress-header">
                    <h2>📊 Progress Overview</h2>
                </div>
                <div className="chart-section">
                    <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        No progress data available yet. Create some tasks first!
                    </p>
                </div>
            </div>
        );
    }

    const maxDailyValue = Math.max(...(progressData.last7Days.map(d => d.completed) || [1]), 1);

    return (
        <div className="progress-page">
            <div className="progress-header">
                <h2>📊 Progress Overview</h2>
                {isAdmin && (
                    <div className="staff-filter">
                        <label>View:</label>
                        <select value={selectedStaff} onChange={(e) => setSelectedStaff(e.target.value)}>
                            <option value="all">All Staff</option>
                            {staff.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Completion Ring */}
            <div className="progress-ring-section">
                <div className="progress-ring-container">
                    <div className="progress-ring">
                        <svg viewBox="0 0 100 100">
                            <circle className="ring-bg" cx="50" cy="50" r="45" />
                            <circle
                                className="ring-progress"
                                cx="50"
                                cy="50"
                                r="45"
                                style={{
                                    strokeDasharray: `${progressData?.completionRate * 2.83} 283`
                                }}
                            />
                        </svg>
                        <div className="ring-text">
                            <span className="ring-percent">{progressData?.completionRate}%</span>
                            <span className="ring-label">Complete</span>
                        </div>
                    </div>
                </div>
                <div className="completion-stats">
                    <div className="completion-stat">
                        <span className="stat-value completed">{progressData?.completed}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                    <div className="completion-stat">
                        <span className="stat-value in-progress">{progressData?.inProgress}</span>
                        <span className="stat-label">In Progress</span>
                    </div>
                    <div className="completion-stat">
                        <span className="stat-value pending">{progressData?.pending}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                    <div className="completion-stat">
                        <span className="stat-value overdue">{progressData?.overdue}</span>
                        <span className="stat-label">Overdue</span>
                    </div>
                </div>
            </div>

            {/* Daily Activity Chart */}
            <div className="chart-section">
                <h3>Daily Activity (Last 7 Days)</h3>
                <div className="bar-chart">
                    {progressData?.last7Days.map((day, index) => (
                        <div key={index} className="bar-item">
                            <div className="bar-value">{day.completed}</div>
                            <div className="bar-wrapper">
                                <div
                                    className="bar"
                                    style={{
                                        height: `${Math.max((day.completed / maxDailyValue) * 100, 5)}%`
                                    }}
                                />
                            </div>
                            <div className="bar-label">{day.shortDate}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Priority Breakdown */}
            <div className="chart-section">
                <h3>Tasks by Priority</h3>
                <div className="priority-bars">
                    <div className="priority-bar-item">
                        <div className="priority-info">
                            <span className="priority-name high">High</span>
                            <span className="priority-count">{progressData?.byPriority.high}</span>
                        </div>
                        <div className="priority-bar-bg">
                            <div
                                className="priority-bar high"
                                style={{
                                    width: `${progressData?.total ? (progressData.byPriority.high / progressData.total) * 100 : 0}%`
                                }}
                            />
                        </div>
                    </div>
                    <div className="priority-bar-item">
                        <div className="priority-info">
                            <span className="priority-name medium">Medium</span>
                            <span className="priority-count">{progressData?.byPriority.medium}</span>
                        </div>
                        <div className="priority-bar-bg">
                            <div
                                className="priority-bar medium"
                                style={{
                                    width: `${progressData?.total ? (progressData.byPriority.medium / progressData.total) * 100 : 0}%`
                                }}
                            />
                        </div>
                    </div>
                    <div className="priority-bar-item">
                        <div className="priority-info">
                            <span className="priority-name low">Low</span>
                            <span className="priority-count">{progressData?.byPriority.low}</span>
                        </div>
                        <div className="priority-bar-bg">
                            <div
                                className="priority-bar low"
                                style={{
                                    width: `${progressData?.total ? (progressData.byPriority.low / progressData.total) * 100 : 0}%`
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Card */}
            <div className="summary-card">
                <h3>Summary</h3>
                <p>
                    {isAdmin && selectedStaff === 'all' ? 'Your team' : 'You'} {progressData?.completed > 0 ? 'completed' : 'have'}{' '}
                    <strong>{progressData?.completed} task{progressData?.completed !== 1 ? 's' : ''}</strong>
                    {progressData?.total > 0 && (
                        <> out of <strong>{progressData?.total}</strong> total</>
                    )}.
                    {progressData?.overdue > 0 && (
                        <span className="overdue-notice"> ⚠️ {progressData.overdue} task{progressData.overdue !== 1 ? 's are' : ' is'} overdue.</span>
                    )}
                </p>
            </div>
        </div>
    );
}
