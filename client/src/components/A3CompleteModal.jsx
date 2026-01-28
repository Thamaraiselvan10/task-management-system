import { useState } from 'react';
import './CreateTaskModal.css';

export default function A3CompleteModal({ a3, onClose, onCompleted }) {
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!comment.trim()) {
            setError('Comment is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await onCompleted(a3.id, comment);
        } catch (err) {
            setError('Failed to update. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Complete A3</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="a3-info" style={{
                            background: 'var(--bg-secondary)',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: '16px'
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                {a3.name}
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>
                                ₹{Number(a3.amount).toLocaleString('en-IN')}
                            </div>
                        </div>

                        {error && (
                            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="comment">Comment *</label>
                            <textarea
                                id="comment"
                                name="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Add a comment about the completion..."
                                rows={4}
                                required
                            />
                            <small style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                This comment will be visible to the admin.
                            </small>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !comment.trim()}
                        >
                            {loading ? 'Submitting...' : 'Mark Complete'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
