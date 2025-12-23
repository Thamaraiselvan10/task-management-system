import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateStaffModal from '../components/CreateStaffModal';
import ConfirmModal from '../components/ConfirmModal';
import './Dashboard.css';

export default function AdminDashboard() {
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [activeTab, setActiveTab] = useState('tasks');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, title, type: 'task' | 'staff' }

    // Filter states
    const [filters, setFilters] = useState({
        priority: 'all',
        status: 'all',
        deadline: 'all',
        assignee: 'all'
    });

    useEffect(() => {
        fetchData();
    }, []);

    // Apply filters whenever tasks or filters change
    useEffect(() => {
        applyFilters();
    }, [tasks, filters]);

    const fetchData = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            const [statsRes, tasksRes, staffRes] = await Promise.all([
                fetch(`${API_URL}/api/tasks/stats/overview`, { headers }),
                fetch(`${API_URL}/api/tasks`, { headers }),
                fetch(`${API_URL}/api/users/staff`, { headers })
            ]);

            const parseStep = async (res) => {
                const contentType = res.headers.get('content-type');
                if (res.ok && contentType && contentType.includes('application/json')) {
                    return res.json();
                }
                return null;
            };

            const [statsData, tasksData, staffData] = await Promise.all([
                parseStep(statsRes),
                parseStep(tasksRes),
                parseStep(staffRes)
            ]);

            if (statsData) setStats(statsData.stats);
            if (tasksData) {
                // Sort by deadline (nearest first) by default
                const sortedTasks = tasksData.tasks.sort((a, b) =>
                    new Date(a.deadline) - new Date(b.deadline)
                );
                setTasks(sortedTasks);
            }
            if (staffData) setStaff(staffData.staff);
        } catch (error) {
            console.error('Failed to fetch data:', error);
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

        // Filter by assignee
        if (filters.assignee !== 'all') {
            result = result.filter(task =>
                task.assignees?.some(a => a.id === parseInt(filters.assignee))
            );
        }

        setFilteredTasks(result);
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const clearFilters = () => {
        setFilters({ priority: 'all', status: 'all', deadline: 'all', assignee: 'all' });
    };

    const handleDeleteStaff = (staffId, staffName) => {
        setDeleteConfirm({ id: staffId, title: staffName, type: 'staff' });
    };

    const handleDeleteTask = (taskId, taskTitle) => {
        setDeleteConfirm({ id: taskId, title: taskTitle, type: 'task' });
        setOpenMenuId(null);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;

        try {
            const endpoint = deleteConfirm.type === 'task'
                ? `${API_URL}/api/tasks/${deleteConfirm.id}`
                : `${API_URL}/api/users/${deleteConfirm.id}`;

            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                if (deleteConfirm.type === 'task') {
                    setTasks(prev => prev.filter(t => t.id !== deleteConfirm.id));
                } else {
                    setStaff(prev => prev.filter(s => s.id !== deleteConfirm.id));
                }
            } else {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await res.json();
                    alert(data.error || 'Failed to delete');
                } else {
                    alert('Failed to delete: Server returned unexpected response');
                }
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete');
        } finally {
            setDeleteConfirm(null);
        }
    };

    const handleTaskCreated = () => {
        setShowTaskModal(false);
        fetchData();
    };

    const handleStaffCreated = () => {
        setShowStaffModal(false);
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

    const hasActiveFilters = filters.priority !== 'all' || filters.status !== 'all' || filters.deadline !== 'all' || filters.assignee !== 'all';

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h2>Admin Dashboard</h2>
                <div className="dashboard-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowTaskModal(true)}
                        disabled={staff.length === 0}
                        title={staff.length === 0 ? 'Add staff first before creating tasks' : 'Create a new task'}
                    >
                        + Create Task
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowStaffModal(true)}>
                        + Add Staff
                    </button>
                </div>
            </div>

            {/* Alert when no staff */}
            {staff.length === 0 && (
                <div className="alert alert-warning">
                    ⚠️ Please add staff members first before creating tasks.
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>{stats?.total_tasks || 0}</h3>
                    <p>Total Tasks</p>
                </div>
                <div className="stat-card">
                    <h3>{stats?.pending_tasks || 0}</h3>
                    <p>Pending</p>
                </div>
                <div className="stat-card">
                    <h3>{stats?.in_progress_tasks || 0}</h3>
                    <p>In Progress</p>
                </div>
                <div className="stat-card">
                    <h3>{stats?.completed_tasks || 0}</h3>
                    <p>Completed</p>
                </div>
                <div className="stat-card stat-overdue">
                    <h3>{stats?.overdue_tasks || 0}</h3>
                    <p>Overdue</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tasks')}
                >
                    Tasks ({filteredTasks.length}{hasActiveFilters ? ` of ${tasks.length}` : ''})
                </button>
                <button
                    className={`tab ${activeTab === 'staff' ? 'active' : ''}`}
                    onClick={() => setActiveTab('staff')}
                >
                    Staff ({staff.length})
                </button>
            </div>

            {/* Task Filters */}
            {activeTab === 'tasks' && (
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

                    <div className="filter-group">
                        <label>Staff:</label>
                        <select
                            value={filters.assignee}
                            onChange={(e) => handleFilterChange('assignee', e.target.value)}
                        >
                            <option value="all">All Staff</option>
                            {staff.map(member => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button className="btn btn-secondary clear-filters" onClick={clearFilters}>
                            Clear Filters
                        </button>
                    )}
                </div>
            )}

            {/* Tasks Table */}
            {activeTab === 'tasks' && (
                <div className="card">
                    <table>
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Deadline</th>
                                <th>Assigned To</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                        {hasActiveFilters ? 'No tasks match the filters.' : 'No tasks yet. Create your first task!'}
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
                                            {task.assignees?.map(a => a.name).join(', ') || 'Unassigned'}
                                        </td>
                                        <td>
                                            <button
                                                className="remove-link"
                                                onClick={() => handleDeleteTask(task.id, task.title)}
                                            >
                                                Remove
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
                                {hasActiveFilters ? 'No tasks match the filters.' : 'No tasks yet. Create your first task!'}
                            </div>
                        ) : (
                            filteredTasks.map(task => (
                                <div
                                    key={task.id}
                                    className={`task-card-item ${isOverdue(task.deadline, task.status) ? 'overdue-card' : ''}`}
                                >
                                    <div className="task-card-header">
                                        <span className="task-card-title">{task.title}</span>
                                        <div className="task-card-actions">
                                            <span className={`badge badge-${task.priority.toLowerCase()}`}>
                                                {task.priority}
                                            </span>
                                            <div className="mobile-menu">
                                                <button
                                                    className="mobile-menu-btn"
                                                    onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                                                >
                                                    ⋮
                                                </button>
                                                {openMenuId === task.id && (
                                                    <div className="mobile-menu-dropdown">
                                                        <button
                                                            className="mobile-menu-item delete"
                                                            onClick={() => handleDeleteTask(task.id, task.title)}
                                                        >
                                                            🗑️ Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="task-card-body">
                                        <span className={`badge status-${task.status.toLowerCase().replace(' ', '-')}`}>
                                            {task.status}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            → {task.assignees?.map(a => a.name).join(', ') || 'Unassigned'}
                                        </span>
                                    </div>
                                    <div className="task-card-footer">
                                        <span className={`task-card-deadline ${isOverdue(task.deadline, task.status) ? 'overdue' : ''}`}>
                                            📅 {formatDate(task.deadline)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Staff Table */}
            {activeTab === 'staff' && (
                <div className="card">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Designation</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staff.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                        No staff members yet. Add your first staff member!
                                    </td>
                                </tr>
                            ) : (
                                staff.map(member => (
                                    <tr key={member.id}>
                                        <td><strong>{member.name}</strong></td>
                                        <td>{member.email}</td>
                                        <td>{member.designation || '-'}</td>
                                        <td>{formatDate(member.created_at)}</td>
                                        <td>
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleDeleteStaff(member.id, member.name)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Mobile Staff Cards */}
                    <div className="task-cards">
                        {staff.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                No staff members yet. Add your first staff member!
                            </div>
                        ) : (
                            staff.map(member => (
                                <div key={member.id} className="task-card-item">
                                    <div className="task-card-header">
                                        <span className="task-card-title">{member.name}</span>
                                        {member.designation && (
                                            <span className="badge badge-medium">{member.designation}</span>
                                        )}
                                    </div>
                                    <div className="task-card-body">
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            ✉️ {member.email}
                                        </span>
                                    </div>
                                    <div className="task-card-footer">
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            Joined: {formatDate(member.created_at)}
                                        </span>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() => handleDeleteStaff(member.id, member.name)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            {showTaskModal && (
                <CreateTaskModal
                    staff={staff}
                    onClose={() => setShowTaskModal(false)}
                    onCreated={handleTaskCreated}
                />
            )}

            {showStaffModal && (
                <CreateStaffModal
                    onClose={() => setShowStaffModal(false)}
                    onCreated={handleStaffCreated}
                />
            )}

            {deleteConfirm && (
                <ConfirmModal
                    title={`Delete ${deleteConfirm.type === 'task' ? 'Task' : 'Staff'}`}
                    message={`Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
        </div>
    );
}
