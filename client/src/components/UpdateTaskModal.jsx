import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function UpdateTaskModal({ task, onClose, onUpdated }) {
    const { token } = useAuth();
    const [status, setStatus] = useState(task.status);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, comment })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update task');
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
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Update Task</h2>
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

                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="status">Update Status *</label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                required
                            >
                                <option value="Pending">Pending</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="comment">Add Comment (Optional)</label>
                            <textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Add a progress note or comment..."
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? 'Updating...' : 'Update Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
