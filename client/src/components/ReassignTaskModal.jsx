import { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';

export default function ReassignTaskModal({ task, staff, onClose, onUpdated }) {
    const { token } = useAuth();
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Pre-select current assignees
        if (task.assignees) {
            setSelectedAssignees(task.assignees.map(a => a.id));
        }
    }, [task]);

    const handleToggleAssignee = (staffId) => {
        setSelectedAssignees(prev => {
            if (prev.includes(staffId)) {
                return prev.filter(id => id !== staffId);
            } else {
                return [...prev, staffId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (selectedAssignees.length === 0) {
            setError('Please select at least one staff member');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ assignees: selectedAssignees })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to reassign task');
            }

            onUpdated();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Reassign Task</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                            <h3 style={{ marginBottom: '8px' }}>{task.title}</h3>
                            {task.description && (
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px' }}>
                                    {task.description}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                                <span><strong>Priority:</strong> {task.priority}</span>
                                <span><strong>Deadline:</strong> {formatDate(task.deadline)}</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                <strong>Current Assignees:</strong> {task.assignees?.map(a => a.name).join(', ') || 'None'}
                            </p>
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label>Select New Assignees *</label>
                            <div className="assignee-list" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                padding: '8px',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                {staff.map(member => (
                                    <label
                                        key={member.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px',
                                            borderRadius: 'var(--radius-sm)',
                                            background: selectedAssignees.includes(member.id) ? 'var(--accent-light)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedAssignees.includes(member.id)}
                                            onChange={() => handleToggleAssignee(member.id)}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <div>
                                            <strong>{member.name}</strong>
                                            {member.designation && (
                                                <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '12px' }}>
                                                    ({member.designation})
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || selectedAssignees.length === 0}
                        >
                            {loading ? 'Reassigning...' : 'Reassign Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
