import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adjustmentsAPI, productsAPI, warehousesAPI } from '../../utils/api';
import { Modal, StatusBadge, Spinner, EmptyState, ConfirmDialog } from '../../components/common/UI';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, ClipboardList, Trash2 } from 'lucide-react';

export default function Adjustments() {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [warehouse, setWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [adjItems, setAdjItems] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p, w] = await Promise.all([adjustmentsAPI.list(), productsAPI.list(), warehousesAPI.list()]);
      setRecords(a.data); setProducts(p.data); setWarehouses(w.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = () => setAdjItems(prev => [...prev, { product: '', systemQty: 0, countedQty: 0, uom: 'pcs' }]);
  const updateItem = (i, k, v) => setAdjItems(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const removeItem = (i) => setAdjItems(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!warehouse) return toast.error('Select a warehouse');
    if (adjItems.length === 0) return toast.error('Add at least one item');
    try {
      await adjustmentsAPI.create({ warehouse, notes, items: adjItems });
      toast.success('Adjustment created'); setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const validate = async (id) => {
    try {
      await adjustmentsAPI.validate(id);
      toast.success('Adjustment applied — stock updated!'); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async () => {
    try { await adjustmentsAPI.delete(deleteId); toast.success('Deleted'); setDeleteId(null); load(); }
    catch { toast.error('Cannot delete'); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Stock Adjustments</h2>
        {canManage && (<button className="btn btn-primary" onClick={() => { setAdjItems([]); setWarehouse(''); setNotes(''); setShowModal(true); }}>
          <Plus size={15} /> New Adjustment
        </button>)}
      </div>

      <div className="card">
        {loading ? <Spinner /> : records.length === 0 ? (
          <EmptyState icon={<ClipboardList size={40} />} title="No adjustments yet"
            description="Create an adjustment to fix stock discrepancies." />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Reference</th><th>Warehouse</th><th>Products</th><th>Status</th><th>Date</th><th></th></tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r._id}>
                    <td><span className="td-mono">{r.number}</span></td>
                    <td>{r.warehouse?.name}</td>
                    <td>{r.items?.length} items</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canManage && r.status !== 'done' && (
                          <button className="btn btn-sm btn-success" onClick={() => validate(r._id)}>
                            <CheckCircle size={12} /> Apply
                          </button>
                        )}
                        {canManage && r.status === 'draft' && (
                          <button className="btn-icon" onClick={() => setDeleteId(r._id)}><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Stock Adjustment" size="modal-lg">
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Warehouse *</label>
              <select className="form-select" value={warehouse} onChange={e => setWarehouse(e.target.value)}>
                <option value="">Select warehouse…</option>
                {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Annual count" />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="form-label">Products to Adjust</label>
              <button type="button" className="btn btn-sm btn-secondary" onClick={addItem}><Plus size={12} /> Add</button>
            </div>
            <table className="line-items-table">
              <thead>
                <tr><th>Product</th><th>System Qty</th><th>Counted Qty</th><th>Diff</th><th></th></tr>
              </thead>
              <tbody>
                {adjItems.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <select className="form-select" value={item.product} onChange={e => updateItem(i, 'product', e.target.value)}>
                        <option value="">Select…</option>
                        {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </td>
                    <td style={{ width: 110 }}>
                      <input type="number" className="form-input" value={item.systemQty} onChange={e => updateItem(i, 'systemQty', +e.target.value)} />
                    </td>
                    <td style={{ width: 110 }}>
                      <input type="number" className="form-input" value={item.countedQty} onChange={e => updateItem(i, 'countedQty', +e.target.value)} />
                    </td>
                    <td style={{ width: 80 }}>
                      <span style={{ fontWeight: 600, color: item.countedQty - item.systemQty < 0 ? 'var(--danger)' : 'var(--success)' }}>
                        {item.countedQty - item.systemQty > 0 ? '+' : ''}{item.countedQty - item.systemQty}
                      </span>
                    </td>
                    <td style={{ width: 40 }}>
                      <button className="btn-icon" onClick={() => removeItem(i)}>✕</button>
                    </td>
                  </tr>
                ))}
                {adjItems.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 16 }}>Add items to adjust</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Create Adjustment</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del}
        title="Delete Adjustment" message="This draft adjustment will be deleted." danger />
    </div>
  );
}
