// MoveHistory.jsx
import { useState, useEffect } from 'react';
import { movesAPI } from '../../utils/api';
import { Spinner, EmptyState } from '../../components/common/UI';
import { History, ArrowRight } from 'lucide-react';

const TYPE_COLORS = { receipt: '#16A34A', delivery: '#DC2626', transfer: '#0891B2', adjustment: '#D97706' };

export function MoveHistory() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    movesAPI.list({ type: typeFilter }).then(r => setMoves(r.data)).finally(() => setLoading(false));
  }, [typeFilter]);

  return (
    <div>
      <div className="page-header"><h2>Move History</h2></div>
      <div className="card">
        <div className="card-header">
          <select className="form-select" style={{ width: 'auto' }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {['receipt','delivery','transfer','adjustment'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
          <span className="text-muted">{moves.length} moves</span>
        </div>
        {loading ? <Spinner /> : moves.length === 0 ? (
          <EmptyState icon={<History size={40} />} title="No moves found" />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>Product</th><th>Type</th><th>From</th><th></th><th>To</th><th>Qty</th><th>Reference</th><th>By</th><th>Date</th></tr></thead>
              <tbody>
                {moves.map(m => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.product?.name}</div>
                      <div className="text-muted font-mono" style={{ fontSize: 11 }}>{m.product?.sku}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: TYPE_COLORS[m.type] + '20', color: TYPE_COLORS[m.type] }}>
                        {m.type}
                      </span>
                    </td>
                    <td className="text-muted">{m.fromWarehouse?.name || '—'}</td>
                    <td><ArrowRight size={12} color="var(--gray-400)" /></td>
                    <td className="text-muted">{m.toWarehouse?.name || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{m.quantity}</td>
                    <td><span className="td-mono">{m.reference}</span></td>
                    <td className="text-muted">{m.createdBy?.name || '—'}</td>
                    <td className="text-muted">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Warehouses ─────────────────────────────────────────────────────────────
import { Modal, ConfirmDialog } from '../../components/common/UI';
import { warehousesAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Warehouse as WHIcon, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../utils/api';

export function WarehousesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', address: '' });

  const load = () => {
    setLoading(true);
    warehousesAPI.list().then(r => setWarehouses(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', code: '', address: '' }); setShowModal(true); };
  const openEdit = w => { setEditing(w); setForm({ name: w.name, code: w.code, address: w.address }); setShowModal(true); };

  const save = async () => {
    try {
      editing ? await warehousesAPI.update(editing._id, form) : await warehousesAPI.create(form);
      toast.success(editing ? 'Updated' : 'Warehouse created'); setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async () => {
    try { await warehousesAPI.delete(deleteId); toast.success('Archived'); setDeleteId(null); load(); }
    catch { toast.error('Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Warehouses</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> Add Warehouse</button>
        )}
      </div>

      {/* Role notice for non-admin */}
      {!isAdmin && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--warning-light)', border: '1px solid var(--warning)',
          borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: 'var(--warning)'
        }}>
          <Lock size={14} />
          View only — only admins can create or edit warehouses.
        </div>
      )}

      <div className="card">
        {loading ? <Spinner /> : warehouses.length === 0 ? (
          <EmptyState icon={<WHIcon size={40} />} title="No warehouses" description="An admin needs to create warehouse locations." />
        ) : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Code</th><th>Address</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {warehouses.map(w => (
                <tr key={w._id}>
                  <td style={{ fontWeight: 500 }}>{w.name}</td>
                  <td><span className="td-mono">{w.code}</span></td>
                  <td className="text-muted">{w.address || '—'}</td>
                  {isAdmin && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon" onClick={() => openEdit(w)}><Edit2 size={13} /></button>
                        <button className="btn-icon" onClick={() => setDeleteId(w._id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isAdmin && (
        <>
          <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Warehouse' : 'New Warehouse'}>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Code *</label>
                <input className="form-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. WH-MAIN" /></div>
              <div className="form-group"><label className="form-label">Address</label>
                <textarea className="form-textarea" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>{editing ? 'Save' : 'Create'}</button>
            </div>
          </Modal>
          <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del} title="Archive Warehouse" message="Warehouse will be archived." danger />
        </>
      )}
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile(form);
      updateUser(data.user);
      toast.success('Profile updated');
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="page-header"><h2>My Profile</h2></div>
      <div className="card">
        <div className="card-header"><span className="card-title">Account Details</span></div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 20
            }}>
              {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.name}</div>
              <div className="text-muted" style={{ textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Full Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Email</label>
            <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
