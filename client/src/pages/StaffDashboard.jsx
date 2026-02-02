import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { useToast } from '../context/ToastContext';
import UpdateTaskModal from '../components/UpdateTaskModal';
import A3CompleteModal from '../components/A3CompleteModal';
import './Dashboard.css';

export default function StaffDashboard() {
    const { user, token } = useAuth();
    const toast = useToast();
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskView, setTaskView] = useState('active'); // 'active' or 'completed'
    const [activeSection, setActiveSection] = useState('tasks'); // 'tasks' or 'a3'

    // A3 states
    const [a3Items, setA3Items] = useState([]);
    const [selectedA3, setSelectedA3] = useState(null);

    // Filter states
    const [filters, setFilters] = useState({
        priority: 'all',
        status: 'all',
        deadline: 'all'
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Apply filters whenever tasks, filters, or taskView change
    useEffect(() => {
        applyFilters();
    }, [tasks, filters, taskView]);

    const fetchData = async () => {
        try {
            const [tasksRes, a3Res] = await Promise.all([
                apiFetch('/api/tasks', {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                apiFetch('/api/a3', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (tasksRes.ok) {
                const data = await tasksRes.json();
                // Sort by deadline (nearest first) by default
                const sortedTasks = data.tasks.sort((a, b) =>
                    new Date(a.deadline) - new Date(b.deadline)
                );
                setTasks(sortedTasks);
            }

            if (a3Res.ok) {
                const a3Data = await a3Res.json();
                setA3Items(a3Data.a3_items || []);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...tasks];

        // Filter by taskView first
        if (taskView === 'active') {
            result = result.filter(task => task.status !== 'Completed');
        } else {
            result = result.filter(task => task.status === 'Completed');
        }

        // Filter by priority
        if (filters.priority !== 'all') {
            result = result.filter(task => task.priority === filters.priority);
        }

        // Filter by status (only apply if not in completed view)
        if (filters.status !== 'all' && taskView === 'active') {
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

        const high = tasks.filter(t => t.priority === 'High').length;
        const medium = tasks.filter(t => t.priority === 'Medium').length;
        const low = tasks.filter(t => t.priority === 'Low').length;

        return { pending, inProgress, completed, overdue, high, medium, low };
    };

    const getActiveTaskCount = () => {
        return tasks.filter(t => t.status !== 'Completed').length;
    };

    const getCompletedTaskCount = () => {
        return tasks.filter(t => t.status === 'Completed').length;
    };

    const hasActiveFilters = filters.priority !== 'all' || filters.status !== 'all' || filters.deadline !== 'all';

    const handleA3Complete = async (a3Id, comment) => {
        if (!a3Id) {
            toast.error('Error: Invalid A3 ID');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/a3/${a3Id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'Completed', comment })
            });

            if (res.ok) {
                setA3Items(prev => prev.map(a =>
                    a.id === a3Id ? { ...a, status: 'Completed', comment } : a
                ));
                setSelectedA3(null);
                toast.success('A3 marked as completed');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update A3 status');
            }
        } catch (error) {
            console.error('Error updating A3:', error);
            toast.error('Failed to update A3 status');
        }
    };

    const getPendingA3Count = () => a3Items.filter(a => a.status === 'Pending').length;
    const getCompletedA3Count = () => a3Items.filter(a => a.status === 'Completed').length;

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
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>{tasks.length}</h3>
                    <p>Total Tasks</p>
                </div>
                <div className="stat-card hide-mobile">
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
                <div className="stat-card stat-overdue">
                    <h3>{stats.overdue}</h3>
                    <p>Overdue</p>
                </div>
            </div>

            {/* Priority Stats */}
            <h4 style={{ margin: '20px 0 10px', color: 'var(--text-secondary)' }}>By Priority</h4>
            <div className="priority-strip">
                <div className="priority-item high">
                    <span className="priority-dot"></span>
                    <span>High Priority: <strong>{stats.high}</strong></span>
                </div>
                <div className="priority-item medium">
                    <span className="priority-dot"></span>
                    <span>Medium Priority: <strong>{stats.medium}</strong></span>
                </div>
                <div className="priority-item low">
                    <span className="priority-dot"></span>
                    <span>Low Priority: <strong>{stats.low}</strong></span>
                </div>
            </div>

            {/* Main Section Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeSection === 'tasks' ? 'active' : ''}`}
                    onClick={() => setActiveSection('tasks')}
                >
                    Tasks ({tasks.length})
                </button>
                <button
                    className={`tab ${activeSection === 'a3' ? 'active' : ''}`}
                    onClick={() => setActiveSection('a3')}
                >
                    A3 ({a3Items.length})
                </button>
            </div>

            {/* Tasks Section */}
            {activeSection === 'tasks' && (
                <>
                    {/* Section Header with Subtabs */}
                    <div className="section-header" style={{ marginBottom: '0' }}>
                        <h3>My Tasks</h3>
                    </div>

                    <div className="task-view-tabs" style={{
                        display: 'flex',
                        gap: '0',
                        marginBottom: '16px',
                        borderBottom: '2px solid var(--border-color)'
                    }}>
                        <button
                            className={`task-view-tab ${taskView === 'active' ? 'active' : ''}`}
                            onClick={() => setTaskView('active')}
                            style={{
                                padding: '12px 20px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: taskView === 'active' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                marginBottom: '-2px',
                                color: taskView === 'active' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontWeight: taskView === 'active' ? '600' : '400',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Tasks ({getActiveTaskCount()})
                        </button>
                        <button
                            className={`task-view-tab ${taskView === 'completed' ? 'active' : ''}`}
                            onClick={() => setTaskView('completed')}
                            style={{
                                padding: '12px 20px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: taskView === 'completed' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                marginBottom: '-2px',
                                color: taskView === 'completed' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontWeight: taskView === 'completed' ? '600' : '400',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Completed ({getCompletedTaskCount()})
                        </button>
                    </div>

                    {/* Task Filters - only show for active view */}
                    {taskView === 'active' && (
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
                    )}

                    <div className="card">
                        <table>
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Deadline</th>
                                    <th>Comment</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
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
                                            <td style={{ maxWidth: '200px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {task.latest_comment || '-'}
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
                </>
            )}

            {/* A3 Section */}
            {activeSection === 'a3' && (
                <div className="card">
                    <div className="section-header" style={{ marginBottom: '16px' }}>
                        <h3>My A3 Items</h3>
                    </div>

                    {/* A3 Table */}
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {a3Items.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>
                                        No A3 items assigned to you yet.
                                    </td>
                                </tr>
                            ) : (
                                a3Items.map(a3 => (
                                    <tr key={a3.id}>
                                        <td><strong>{a3.name}</strong></td>
                                        <td style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                            ₹{Number(a3.amount).toLocaleString('en-IN')}
                                        </td>
                                        <td>
                                            <span className={`badge status-${a3.status.toLowerCase()}`}>
                                                {a3.status}
                                            </span>
                                        </td>
                                        <td>
                                            {a3.status === 'Pending' ? (
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => setSelectedA3(a3)}
                                                >
                                                    Mark Complete
                                                </button>
                                            ) : (
                                                <span style={{ color: 'var(--success)', fontSize: '12px' }}>✓ Done</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Mobile A3 Cards */}
                    <div className="task-cards">
                        {a3Items.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                No A3 items assigned to you yet.
                            </div>
                        ) : (
                            a3Items.map(a3 => (
                                <div key={a3.id} className="task-card-item">
                                    <div className="task-card-header">
                                        <span className="task-card-title">{a3.name}</span>
                                        <span className={`badge status-${a3.status.toLowerCase()}`}>
                                            {a3.status}
                                        </span>
                                    </div>
                                    <div className="task-card-body" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--primary)' }}>
                                            ₹{Number(a3.amount).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    <div className="task-card-footer">
                                        {a3.status === 'Pending' ? (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => setSelectedA3(a3)}
                                            >
                                                Mark Complete
                                            </button>
                                        ) : (
                                            <span style={{ color: 'var(--success)', fontSize: '12px' }}>✓ Completed</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            {selectedTask && (
                <UpdateTaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdated={handleTaskUpdated}
                />
            )}

            {selectedA3 && (
                <A3CompleteModal
                    a3={selectedA3}
                    onClose={() => setSelectedA3(null)}
                    onCompleted={handleA3Complete}
                />
            )}
        </div>
    );
}
