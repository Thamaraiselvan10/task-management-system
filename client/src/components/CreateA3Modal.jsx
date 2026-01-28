import { useState } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import './CreateTaskModal.css';

export default function CreateA3Modal({ staff, onClose, onCreated }) {
    const { token } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        assignees: []
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleAssignee = (staffId) => {
        setFormData(prev => {
            const isSelected = prev.assignees.includes(staffId);
            if (isSelected) {
                return { ...prev, assignees: prev.assignees.filter(id => id !== staffId) };
            } else {
                return { ...prev, assignees: [...prev.assignees, staffId] };
            }
        });
    };

    const getSelectedNames = () => {
        const selected = staff.filter(s => formData.assignees.includes(s.id));
        if (selected.length === 0) return 'Select staff members...';
        if (selected.length <= 2) return selected.map(s => s.name).join(', ');
        return `${selected.length} members selected`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/a3`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    amount: parseFloat(formData.amount),
                    assignees: formData.assignees
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create A3');
            }

            onCreated();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal create-task-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New A3</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="name">A3 Name *</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter A3 name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="amount">Amount (₹) *</label>
                            <input
                                type="number"
                                id="amount"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="Enter amount"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Assign To *</label>
                            <div className="dropdown-select">
                                <div
                                    className={`dropdown-trigger ${dropdownOpen ? 'open' : ''}`}
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                >
                                    <span className="dropdown-text">{getSelectedNames()}</span>
                                    <span className="dropdown-arrow">▼</span>
                                </div>

                                {dropdownOpen && (
                                    <div className="dropdown-menu">
                                        {staff.length === 0 ? (
                                            <div className="dropdown-empty">
                                                No staff available. Add staff first.
                                            </div>
                                        ) : (
                                            staff.map(member => (
                                                <label key={member.id} className="dropdown-item">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.assignees.includes(member.id)}
                                                        onChange={() => toggleAssignee(member.id)}
                                                    />
                                                    <span className="dropdown-item-name">{member.name}</span>
                                                    <span className="dropdown-item-email">{member.email}</span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                            {formData.assignees.length > 0 && (
                                <div className="selected-chips">
                                    {staff.filter(s => formData.assignees.includes(s.id)).map(member => (
                                        <span key={member.id} className="chip">
                                            {member.name}
                                            <button
                                                type="button"
                                                className="chip-remove"
                                                onClick={() => toggleAssignee(member.id)}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || formData.assignees.length === 0}
                        >
                            {loading ? 'Creating...' : 'Create A3'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
