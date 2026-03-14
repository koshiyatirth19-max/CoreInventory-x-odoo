import { useState, useEffect, useCallback } from 'react';
import { deliveriesAPI, productsAPI, warehousesAPI } from '../../utils/api';
import { Modal, StatusBadge, Spinner, EmptyState, ConfirmDialog, LineItemRow } from '../../components/common/UI';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, CheckCircle, FileText, Lock, XCircle,
  ChevronLeft, Package, Archive, Truck
} from 'lucide-react';

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:     { label: 'Draft',     bg: 'var(--gray-100)',     color: 'var(--gray-600)' },
  waiting:   { label: 'Waiting',   bg: 'var(--warning-light)',color: 'var(--warning)'  },
  picking:   { label: 'Picking',   bg: '#DBEAFE',             color: '#1D4ED8'         },
  packing:   { label: 'Packing',   bg: '#EDE9FE',             color: '#6D28D9'         },
  ready:     { label: 'Ready',     bg: 'var(--info-light)',   color: 'var(--info)'     },
  done:      { label: 'Done',      bg: 'var(--success-light)',color: 'var(--success)'  },
  cancelled: { label: 'Cancelled', bg: 'var(--gray-100)',     color: 'var(--gray-500)' },
};

function DeliveryStatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600,
      background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap'
    }}>{cfg.label}</span>
  );
}

// ── Step progress bar ─────────────────────────────────────────
const STEPS = [
  { key: 'draft',   label: 'Draft',   icon: FileText },
  { key: 'waiting', label: 'Waiting', icon: Archive  },
  { key: 'picking', label: 'Pick',    icon: Package  },
  { key: 'packing', label: 'Pack',    icon: Archive  },
  { key: 'ready',   label: 'Ready',   icon: Truck    },
  { key: 'done',    label: 'Done',    icon: CheckCircle },
];

const STEP_ORDER = { draft: 0, waiting: 1, picking: 2, packing: 3, ready: 4, done: 5, cancelled: -1 };

function StepProgress({ status }) {
  const current = STEP_ORDER[status] ?? 0;
  if (status === 'cancelled') return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
      {STEPS.map((step, i) => {
        const done    = i < current;
        const active  = i === current;
        const pending = i > current;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#16A34A' : active ? '#1B4FD8' : '#E2E8F0',
                border: `2px solid ${done ? '#16A34A' : active ? '#1B4FD8' : '#CBD5E1'}`,
                transition: 'background .2s, border-color .2s',
                flexShrink: 0,
              }}>
                {done
                  ? <CheckCircle size={16} color="#fff" />
                  : <step.icon size={14} color={active ? '#fff' : '#94A3B8'} />}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 600 : 400, color: active ? '#1B4FD8' : done ? '#16A34A' : '#94A3B8', whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 3, background: done ? '#16A34A' : '#E2E8F0', margin: '0 6px', marginBottom: 28, borderRadius: 2, transition: 'background .3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Line items editor ─────────────────────────────────────────
function LineItemsEditor({ items, setItems, products }) {
  const addRow    = () => setItems(prev => [...prev, { product: '', quantity: 1, uom: 'pcs' }]);
  const updateRow = (i, k, v) => setItems(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const removeRow = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label className="form-label">Items to Deliver</label>
        <button type="button" className="btn btn-sm btn-secondary" onClick={addRow}><Plus size={12} /> Add Item</button>
      </div>
      <table className="line-items-table">
        <thead><tr><th>Product</th><th>Qty</th><th>UoM</th><th></th></tr></thead>
        <tbody>
          {items.map((item, i) => (
            <LineItemRow key={i} item={item} index={i} products={products} onUpdate={updateRow} onRemove={removeRow} />
          ))}
          {items.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-400)', padding: 16, fontSize: 13 }}>No items — click Add Item</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN DELIVERIES PAGE
// ═════════════════════════════════════════════════════════════
export default function DeliveriesPage() {
  const { user } = useAuth();
  const canValidate = user?.role === 'admin' || user?.role === 'manager';
  const canDelete   = user?.role === 'admin' || user?.role === 'manager';

  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts]     = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [cancelId, setCancelId]     = useState(null);
  const [items, setItems]           = useState([]);
  const [form, setForm]             = useState({ customer: '', warehouse: '', scheduledAt: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, p, w] = await Promise.all([
        deliveriesAPI.list({ status: statusFilter }),
        productsAPI.list(),
        warehousesAPI.list(),
      ]);
      setDeliveries(d.data); setProducts(p.data); setWarehouses(w.data);
    } finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Action handlers ─────────────────────────────────────────
  const create = async () => {
    if (items.length === 0) return toast.error('Add at least one item');
    if (!form.customer)  return toast.error('Enter customer name');
    if (!form.warehouse) return toast.error('Select a warehouse');
    try {
      await deliveriesAPI.create({ ...form, items });
      toast.success('Delivery order created as Draft');
      setShowCreate(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const doAction = async (id, action, label) => {
    try {
      await deliveriesAPI[action](id);
      const messages = {
        confirm:  'Confirmed — ready to pick',
        pick:     '✓ Picking started',
        pack:     '✓ Packing complete',
        ready:    '✓ Marked as Ready for dispatch',
        validate: '✅ Validated — stock decreased!',
        revert:   'Reverted one step back',
      };
      toast.success(messages[action] || label);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const cancel = async () => {
    try { await deliveriesAPI.cancel(cancelId); toast.success('Cancelled'); setCancelId(null); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async () => {
    try { await deliveriesAPI.delete(deleteId); toast.success('Deleted'); setDeleteId(null); load(); }
    catch { toast.error('Cannot delete'); }
  };

  const STATUSES = ['draft','waiting','picking','packing','ready','done','cancelled'];

  return (
    <div>
      <div className="page-header">
        <h2>Delivery Orders</h2>
        <button className="btn btn-primary" onClick={() => { setItems([]); setForm({ customer:'', warehouse: warehouses[0]?._id||'', scheduledAt:'', notes:'' }); setShowCreate(true); }}>
          <Plus size={15} /> New Delivery
        </button>
      </div>

      {/* Staff notice */}
      {!canValidate && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, background:'var(--warning-light)', border:'1px solid var(--warning)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--warning)' }}>
          <Lock size={14} />
          You can create orders and run Pick &amp; Pack steps. A manager must do final Validate.
        </div>
      )}

      {/* Flow diagram */}
      <div style={{ background:'#fff', border:'1px solid var(--gray-200)', borderRadius: 10, padding:'16px 24px', marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--gray-500)', marginBottom:12, textTransform:'uppercase', letterSpacing:'.05em' }}>Delivery workflow</div>
        <StepProgress status="draft" />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6, fontSize:11, color:'var(--gray-500)', textAlign:'center', marginTop:-8 }}>
          <div>Any role creates the order</div>
          <div>Manager confirms</div>
          <div>Staff picks items from shelf</div>
          <div>Staff packs into boxes</div>
          <div>Marked ready for dispatch</div>
          <div style={{ color:'var(--success)', fontWeight:600 }}>Manager validates → stock −</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <select className="form-select" style={{ width:'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <span className="text-muted">{deliveries.length} orders</span>
        </div>

        {loading ? <Spinner /> : deliveries.length === 0 ? (
          <EmptyState icon={<Truck size={40}/>} title="No delivery orders"
            action={<button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={15}/> New Delivery</button>} />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr><th>Ref</th><th>Customer</th><th>Warehouse</th><th>Items</th><th>Status</th><th>Picked by</th><th>Packed by</th><th>Date</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d._id}>
                    <td><span className="td-mono">{d.number}</span></td>
                    <td style={{ fontWeight:500 }}>{d.customer}</td>
                    <td className="text-muted">{d.warehouse?.name}</td>
                    <td>{d.items?.length} item{d.items?.length !== 1 ? 's' : ''}</td>
                    <td><DeliveryStatusBadge status={d.status} /></td>
                    <td className="text-muted" style={{ fontSize:12 }}>{d.pickedBy?.name || '—'}</td>
                    <td className="text-muted" style={{ fontSize:12 }}>{d.packedBy?.name || '—'}</td>
                    <td className="text-muted">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>

                        {/* Step 1: Confirm (draft → waiting) — ALL roles */}
                        {d.status === 'draft' && (
                          <button className="btn btn-sm btn-secondary" style={{ fontSize:11 }} onClick={() => doAction(d._id, 'confirm', 'Confirmed')}>
                            Confirm
                          </button>
                        )}

                        {/* Step 2: Pick items (waiting → picking) — ALL roles */}
                        {d.status === 'waiting' && (
                          <button className="btn btn-sm" style={{ fontSize:11, background:'#DBEAFE', color:'#1D4ED8', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:6, fontWeight:500 }}
                            onClick={() => doAction(d._id, 'pick', 'Picking started')}>
                            <Package size={12} /> Pick Items
                          </button>
                        )}

                        {/* Step 3: Pack items (picking → packing) — ALL roles */}
                        {d.status === 'picking' && (
                          <button className="btn btn-sm" style={{ fontSize:11, background:'#EDE9FE', color:'#6D28D9', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:6, fontWeight:500 }}
                            onClick={() => doAction(d._id, 'pack', 'Packing complete')}>
                            <Archive size={12} /> Pack Items
                          </button>
                        )}

                        {/* Step 4: Mark Ready (packing → ready) — ALL roles */}
                        {d.status === 'packing' && (
                          <button className="btn btn-sm" style={{ fontSize:11, background:'var(--info-light)', color:'var(--info)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:4, padding:'5px 10px', borderRadius:6, fontWeight:500 }}
                            onClick={() => doAction(d._id, 'ready', 'Marked ready')}>
                            <Truck size={12} /> Mark Ready
                          </button>
                        )}

                        {/* Step 5: Validate (ready → done) — ADMIN + MANAGER only */}
                        {d.status === 'ready' && canValidate && (
                          <button className="btn btn-sm btn-success" style={{ fontSize:11 }}
                            onClick={() => doAction(d._id, 'validate', 'Validated')}>
                            <CheckCircle size={12} /> Validate & Ship
                          </button>
                        )}

                        {/* Staff lock on ready */}
                        {d.status === 'ready' && !canValidate && (
                          <span title="Awaiting manager validation" style={{ color:'var(--gray-400)', display:'flex', alignItems:'center', gap:4, fontSize:12 }}>
                            <Lock size={13} /> Awaiting manager
                          </span>
                        )}

                        {/* Revert one step — ALL roles */}
                        {['waiting','picking','packing','ready'].includes(d.status) && (
                          <button className="btn-icon" title="Revert one step" onClick={() => doAction(d._id, 'revert', 'Reverted')}>
                            <ChevronLeft size={13} />
                          </button>
                        )}

                        {/* Cancel — ALL roles (not done) */}
                        {!['done','cancelled'].includes(d.status) && (
                          <button className="btn-icon" title="Cancel" onClick={() => setCancelId(d._id)}>
                            <XCircle size={13} color="var(--warning)" />
                          </button>
                        )}

                        {/* Delete draft — ADMIN + MANAGER only */}
                        {canDelete && d.status === 'draft' && (
                          <button className="btn-icon" title="Delete" onClick={() => setDeleteId(d._id)}>
                            <Trash2 size={13} />
                          </button>
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

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Delivery Order" size="modal-lg">
        <div className="modal-body">
          <div style={{ background:'var(--info-light)', border:'1px solid var(--info)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--info)', marginBottom:4 }}>
            <strong>Process:</strong> Create → Confirm → Pick Items → Pack Items → Mark Ready → Validate (stock decreases)
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Customer *</label>
              <input className="form-input" placeholder="e.g. ABC Furniture Co." value={form.customer} onChange={e => setForm(f=>({...f,customer:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Source Warehouse *</label>
              <select className="form-select" value={form.warehouse} onChange={e => setForm(f=>({...f,warehouse:e.target.value}))}>
                <option value="">Select warehouse…</option>
                {warehouses.map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Scheduled Date</label>
              <input type="date" className="form-input" value={form.scheduledAt} onChange={e => setForm(f=>({...f,scheduledAt:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="e.g. Handle with care" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} />
            </div>
          </div>
          <LineItemsEditor items={items} setItems={setItems} products={products} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={create}>Create Delivery Order</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!cancelId} onClose={() => setCancelId(null)} onConfirm={cancel}
        title="Cancel Delivery" message="This delivery will be cancelled. No stock will change." />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del}
        title="Delete Delivery" message="This draft will be permanently deleted." danger />
    </div>
  );
}
