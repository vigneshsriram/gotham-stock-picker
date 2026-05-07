import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { listUsersDB, deleteUserDB, type UserProfile } from '../lib/db';

interface Props {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: Props) {
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listUsersDB().then(u => { setUsers(u); setLoading(false); });
  }, []);

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Remove user ${email}? This cannot be undone.`)) return;
    setDeleting(userId);
    setError('');
    const err = await deleteUserDB(userId);
    if (err) {
      setError(err);
    } else {
      setUsers(prev => prev.filter(u => u.id !== userId));
    }
    setDeleting(null);
  }

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2 className="admin-title">User Management</h2>
          <button className="admin-close" onClick={onClose}>×</button>
        </div>

        {loading && <p className="admin-loading">Loading users…</p>}
        {error && <p className="auth-error">{error}</p>}

        {!loading && (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className={u.id === adminUser?.id ? 'admin-row-self' : ''}>
                  <td>{u.email}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    {u.id !== adminUser?.id && (
                      <button
                        className="admin-remove-btn"
                        onClick={() => handleDelete(u.id, u.email)}
                        disabled={deleting === u.id}
                      >
                        {deleting === u.id ? '…' : 'Remove'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
