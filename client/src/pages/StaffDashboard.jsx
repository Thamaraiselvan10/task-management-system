import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import DailyReportModal from '../components/DailyReportModal';
import UpdateTaskModal from '../components/UpdateTaskModal';
import './Dashboard.css';

export default function StaffDashboard() {
    const { user, token } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportSubmitted, setReportSubmitted] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);

    // Filter states
    const [filters, setFilters] = useState({
        priority: 'all',
        status: 'all',
        deadline: 'all'
    });

    useEffect(() => {
        fetchData();
        checkTodayReport();
    }, []);

    // Apply filters whenever tasks or filters change
    useEffect(() => {
        applyFilters();
    }, [tasks, filters]);

    const fetchData = async () => {
        try {
            const res = await apiFetch('/api/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                // Sort by deadline (nearest first) by default
                const sortedTasks = data.tasks.sort((a, b) =>
                    new Date(a.deadline) - new Date(b.deadline)
                );
                setTasks(sortedTasks);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...tasks];

        // Filter by priority
        if (filters.priority !== 'all') {
            result = result.filter(task => task.priority === filters.priority);
        }

        // Filter by status
        if (filters.status !== 'all') {
            result = result.filter(task => task.status === filters.status);
        }

        // Filter by deadline
        if (filters.deadline !== 'all') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (filters.deadline === 'overdue') {
                result = result.filter(task =>
                    new Date(task.deadline) < today && task.status !== 'Completed'
                );
            } else if (filters.deadline === 'today') {
                result = result.filter(task => {
                    const deadline = new Date(task.deadline);
                    deadline.setHours(0, 0, 0, 0);
                    return deadline.getTime() === today.getTime();
                });
            } else if (filters.deadline === 'week') {
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                result = result.filter(task => {
                    const deadline = new Date(task.deadline);
                    return deadline >= today && deadline <= nextWeek;
                });
            }
        }

        setFilteredTasks(result);
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const clearFilters = () => {
        setFilters({ priority: 'all', status: 'all', deadline: 'all' });
    };

    const checkTodayReport = async () => {
        try {
            const res = await fetch('/api/reports/check-today', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setReportSubmitted(data.submitted);
            }
        } catch (error) {
            console.error('Failed to check report:', error);
        }
    };

    const handleReportSubmitted = () => {
        setShowReportModal(false);
        setReportSubmitted(true);
    };

    const handleTaskUpdated = () => {
        setSelectedTask(null);
        fetchData();
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const isOverdue = (deadline, status) => {
        return new Date(deadline) < new Date() && status !== 'Completed';
    };

    const getTaskStats = () => {
        const pending = tasks.filter(t => t.status === 'Pending').length;
        const inProgress = tasks.filter(t => t.status === 'In Progress').length;
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const overdue = tasks.filter(t => isOverdue(t.deadline, t.status)).length;
        return { pending, inProgress, completed, overdue };
    };

    const hasActiveFilters = filters.priority !== 'all' || filters.status !== 'all' || filters.deadline !== 'all';

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const stats = getTaskStats();

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Welcome, {user?.name}!</h2>
                <div className="dashboard-actions">
                    <button
                        className={`btn ${reportSubmitted ? 'btn-success' : 'btn-primary'}`}
                        onClick={() => setShowReportModal(true)}
                    >
                        {reportSubmitted ? '✓ Report Submitted' : 'Submit Daily Report'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>{tasks.length}</h3>
                    <p>Total Tasks</p>
                </div>
                <div className="stat-card">
                    <h3>{stats.pending}</h3>
                    <p>Pending</p>
                </div>
                <div className="stat-card">
                    <h3>{stats.inProgress}</h3>
                    <p>In Progress</p>
                </div>
                <div className="stat-card">
                    <h3>{stats.completed}</h3>
                    <p>Completed</p>
                </div>
                {stats.overdue > 0 && (
                    <div className="stat-card stat-overdue">
                        <h3>{stats.overdue}</h3>
                        <p>Overdue</p>
                    </div>
                )}
            </div>

            {/* Section Header */}
            <div className="section-header">
                <h3>My Tasks</h3>
            </div>

            {/* Task Filters */}
            <div className="filters-bar">
                <div className="filter-group">
                    <label>Priority:</label>
                    <select
                        value={filters.priority}
                        onChange={(e) => handleFilterChange('priority', e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Status:</label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Deadline:</label>
                    <select
                        value={filters.deadline}
                        onChange={(e) => handleFilterChange('deadline', e.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="overdue">Overdue</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                    </select>
                </div>

                {hasActiveFilters && (
                    <button className="btn btn-secondary clear-filters" onClick={clearFilters}>
                        Clear Filters
                    </button>
                )}
            </div>

            <div className="card">
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Priority</th>
                            <th>Status</th>
                            <th>Deadline</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                    {hasActiveFilters ? 'No tasks match the filters.' : 'No tasks assigned to you yet.'}
                                </td>
                            </tr>
                        ) : (
                            filteredTasks.map(task => (
                                <tr key={task.id} className={isOverdue(task.deadline, task.status) ? 'overdue-row' : ''}>
                                    <td>
                                        <strong>{task.title}</strong>
                                        {task.description && (
                                            <p className="task-desc">{task.description.substring(0, 60)}...</p>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge badge-${task.priority.toLowerCase()}`}>
                                            {task.priority}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge status-${task.status.toLowerCase().replace(' ', '-')}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className={isOverdue(task.deadline, task.status) ? 'overdue' : ''}>
                                        {formatDate(task.deadline)}
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            Update
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Mobile Task Cards */}
                <div className="task-cards">
                    {filteredTasks.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            {hasActiveFilters ? 'No tasks match the filters.' : 'No tasks assigned to you yet.'}
                        </div>
                    ) : (
                        filteredTasks.map(task => (
                            <div
                                key={task.id}
                                className={`task-card-item ${isOverdue(task.deadline, task.status) ? 'overdue-card' : ''}`}
                            >
                                <div className="task-card-header">
                                    <span className="task-card-title">{task.title}</span>
                                    <span className={`badge badge-${task.priority.toLowerCase()}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="task-card-body">
                                    <span className={`badge status-${task.status.toLowerCase().replace(' ', '-')}`}>
                                        {task.status}
                                    </span>
                                </div>
                                <div className="task-card-footer">
                                    <span className={`task-card-deadline ${isOverdue(task.deadline, task.status) ? 'overdue' : ''}`}>
                                        📅 {formatDate(task.deadline)}
                                    </span>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        Update
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            {showReportModal && (
                <DailyReportModal
                    onClose={() => setShowReportModal(false)}
                    onSubmitted={handleReportSubmitted}
                />
            )}

            {selectedTask && (
                <UpdateTaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdated={handleTaskUpdated}
                />
            )}
        </div>
    );
}
