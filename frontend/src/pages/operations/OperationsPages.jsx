import { useState, useEffect, useCallback } from 'react';
import { Modal, StatusBadge, Spinner, EmptyState, ConfirmDialog, LineItemRow } from '../../components/common/UI';
import toast from 'react-hot-toast';
import { Plus, Trash2, CheckCircle, FileText, Lock, ChevronRight, ChevronLeft, XCircle, Package, Truck, PackageCheck } from 'lucide-react';
import { productsAPI, warehousesAPI, locationsAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

// ── Status colour config ──────────────────────────────────────
const STATUS_CONFIG = {
  draft:     { bg: '#F8FAFC', border: '#CBD5E1', dot: '#94A3B8',  label: 'Draft'     },
  waiting:   { bg: '#FFFBEB', border: '#FCD34D', dot: '#D97706',  label: 'Waiting'   },
  ready:     { bg: '#EFF6FF', border: '#93C5FD', dot: '#1B4FD8',  label: 'Ready'     },
  done:      { bg: '#F0FDF4', border: '#86EFAC', dot: '#16A34A',  label: 'Done'      },
  cancelled: { bg: '#FFF1F2', border: '#FDA4AF', dot: '#DC2626',  label: 'Cancelled' },
};

// ── Delivery-specific step labels (Pick → Pack → Ship) ────────
const DELIVERY_STEPS = [
  { status: 'draft',   icon: FileText,    label: 'Draft',   sub: 'Order created'   },
  { status: 'waiting', icon: Package,     label: 'Pick',    sub: 'Items picked'    },
  { status: 'ready',   icon: PackageCheck,label: 'Pack',    sub: 'Items packed'    },
  { status: 'done',    icon: Truck,       label: 'Shipped', sub: 'Validated & out' },
];

// Generic steps for receipts/transfers
const GENERIC_STEPS = [
  { status: 'draft',   label: 'Draft'   },
  { status: 'waiting', label: 'Waiting' },
  { status: 'ready',   label: 'Ready'   },
  { status: 'done',    label: 'Done'    },
];

// ── Status stepper shown per row on expand ────────────────────
function StatusStepper({ currentStatus, type }) {
  const steps = type === 'delivery' ? DELIVERY_STEPS : GENERIC_STEPS;
  const currentIdx = steps.findIndex(s => s.status === currentStatus);
  if (currentStatus === 'cancelled') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0' }}>
      <XCircle size={14} color="#DC2626" />
      <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 500 }}>Cancelled</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((step, i) => {
        const isDone    = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isPending = i > currentIdx;
        const Icon = step.icon;
        return (
          <div key={step.status} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {/* Circle */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isDone ? '#16A34A' : isCurrent ? '#1B4FD8' : '#E2E8F0',
                border: `2px solid ${isDone ? '#16A34A' : isCurrent ? '#1B4FD8' : '#CBD5E1'}`,
                transition: 'all .2s',
                flexShrink: 0,
              }}>
                {isDone
                  ? <CheckCircle size={14} color="#fff" />
                  : Icon
                    ? <Icon size={13} color={isCurrent ? '#fff' : '#94A3B8'} />
                    : <span style={{ width: 8, height: 8, borderRadius: '50%', background: isCurrent ? '#fff' : '#94A3B8' }} />
                }
              </div>
              {/* Label */}
              <span style={{
                fontSize: 10, fontWeight: isCurrent ? 600 : 400,
                color: isDone ? '#16A34A' : isCurrent ? '#1B4FD8' : '#94A3B8',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
              {type === 'delivery' && step.sub && (
                <span style={{ fontSize: 9, color: '#94A3B8', whiteSpace: 'nowrap' }}>{step.sub}</span>
              )}
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{
                width: type === 'delivery' ? 44 : 36,
                height: 2,
                background: i < currentIdx ? '#16A34A' : '#E2E8F0',
                marginBottom: type === 'delivery' ? 24 : 16,
                flexShrink: 0,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Advance label per type ────────────────────────────────────
const getAdvanceLabel = (status, type) => {
  if (type === 'delivery') {
    const map = { draft: '→ Mark as Picked', waiting: '→ Mark as Packed' };
    return map[status];
  }
  const map = { draft: '→ Mark as Waiting', waiting: '→ Mark as Ready' };
  return map[status];
};

const getRevertLabel = (status, type) => {
  if (type === 'delivery') {
    const map = { waiting: '← Back to Draft', ready: '← Back to Picked' };
    return map[status];
  }
  const map = { waiting: '← Back to Draft', ready: '← Back to Waiting' };
  return map[status];
};

// ── Line items editor ─────────────────────────────────────────
function LineItemsEditor({ items, setItems, products }) {
  const addRow    = () => setItems(prev => [...prev, { product: '', quantity: 1, uom: 'pcs' }]);
  const updateRow = (i, k, v) => setItems(prev => prev.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  const removeRow = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label className="form-label">Line Items</label>
        <button type="button" className="btn btn-sm btn-secondary" onClick={addRow}><Plus size={12} /> Add Item</button>
      </div>
      <table className="line-items-table">
        <thead><tr><th>Product</th><th>Quantity</th><th>UoM</th><th></th></tr></thead>
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

// ── Exports ───────────────────────────────────────────────────
export function ReceiptsPage()   { return <OperationsPage type="receipt" />; }
export function DeliveriesPage() { return <OperationsPage type="delivery" />; }
export function TransfersPage()  { return <OperationsPage type="transfer" />; }

// ═══════════════════════════════════════════════════════════════
// MAIN OPERATIONS PAGE
// ═══════════════════════════════════════════════════════════════
function OperationsPage({ type }) {
  const { user }    = useAuth();
  const canValidate = user?.role === 'admin' || user?.role === 'manager';
  const canDelete   = user?.role === 'admin' || user?.role === 'manager';

  const [records, setRecords]         = useState([]);
  const [products, setProducts]       = useState([]);
  const [warehouses, setWarehouses]   = useState([]);
  const [locations, setLocations]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [deleteId, setDeleteId]       = useState(null);
  const [cancelId, setCancelId]       = useState(null);
  const [expandedRow, setExpandedRow] = useState(null); // row showing stepper
  const [items, setItems]             = useState([]);

  const isTransfer = type === 'transfer';
  const isReceipt  = type === 'receipt';
  const isDelivery = type === 'delivery';
  const label = isReceipt ? 'Receipt' : isDelivery ? 'Delivery' : 'Transfer';

  const [form, setForm] = useState({
    supplier: '', customer: '', warehouse: '',
    fromWarehouse: '', toWarehouse: '',
    fromLocation: '', toLocation: '',
    transferType: 'warehouse',
    scheduledAt: '', notes: ''
  });

  const getAPI = useCallback(async () => {
    const { receiptsAPI, deliveriesAPI, transfersAPI } = await import('../../utils/api');
    if (isReceipt)  return receiptsAPI;
    if (isDelivery) return deliveriesAPI;
    return transfersAPI;
  }, [isReceipt, isDelivery]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const api = await getAPI();
      const [r, p, w, l] = await Promise.all([
        api.list({ status: statusFilter }),
        productsAPI.list(),
        warehousesAPI.list(),
        locationsAPI.list(),
      ]);
      setRecords(r.data); setProducts(p.data); setWarehouses(w.data); setLocations(l.data);
    } finally { setLoading(false); }
  }, [getAPI, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setItems([]);
    setForm({ supplier: '', customer: '', warehouse: warehouses[0]?._id || '', fromWarehouse: '', toWarehouse: '', fromLocation: '', toLocation: '', transferType: 'warehouse', scheduledAt: '', notes: '' });
    setShowModal(true);
  };

  const save = async () => {
    if (items.length === 0) return toast.error('Add at least one item');
    try {
      const api = await getAPI();
      const payload = { ...form, items };
      if (!payload.fromLocation) delete payload.fromLocation;
      if (!payload.toLocation)   delete payload.toLocation;
      await api.create({ ...payload });
      toast.success(`${label} created as Draft`);
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const advance = async (id, currentStatus) => {
    try {
      const api = await getAPI();
      await api.advance(id);
      const nextLabel = isDelivery
        ? (currentStatus === 'draft' ? 'Picked' : 'Packed')
        : (currentStatus === 'draft' ? 'Waiting' : 'Ready');
      toast.success(`Moved to ${nextLabel}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const revert = async (id, currentStatus) => {
    try {
      const api = await getAPI();
      await api.revert(id);
      const prevLabel = isDelivery
        ? (currentStatus === 'ready' ? 'Picked' : 'Draft')
        : (currentStatus === 'ready' ? 'Waiting' : 'Draft');
      toast(`Reverted to ${prevLabel}`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const validate = async (id) => {
    try {
      const api = await getAPI();
      await api.validate(id);
      toast.success(isDelivery ? 'Shipped! Stock decreased.' : 'Validated — stock updated!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const cancel = async () => {
    try {
      const api = await getAPI();
      await api.cancel(cancelId);
      toast.success('Cancelled'); setCancelId(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async () => {
    try {
      const api = await getAPI();
      await api.delete(deleteId);
      toast.success('Deleted'); setDeleteId(null); load();
    } catch { toast.error('Cannot delete'); }
  };

  const statuses = ['draft', 'waiting', 'ready', 'done', 'cancelled'];

  return (
    <div>
      <div className="page-header">
        <h2>{label}s</h2>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New {label}</button>
      </div>

      {/* Staff notice */}
      {!canValidate && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, background:'var(--warning-light)', border:'1px solid var(--warning)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--warning)' }}>
          <Lock size={14} />
          You can create drafts and advance status. A manager or admin must do final validation.
        </div>
      )}

      {/* ── Global status legend ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:'var(--gray-500)', fontWeight:500 }}>Status flow:</span>
        {(isDelivery ? DELIVERY_STEPS : GENERIC_STEPS).map((s, i, arr) => (
          <div key={s.status} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{
              display:'inline-flex', alignItems:'center', gap:4,
              padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:500,
              background: STATUS_CONFIG[s.status]?.bg,
              border: `1px solid ${STATUS_CONFIG[s.status]?.border}`,
              color: STATUS_CONFIG[s.status]?.dot,
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background: STATUS_CONFIG[s.status]?.dot, flexShrink:0 }} />
              {s.label}
            </span>
            {i < arr.length - 1 && <ChevronRight size={11} color="var(--gray-300)" />}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filters-bar" style={{ padding: 0 }}>
            <select className="form-select" style={{ width:'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <span className="text-muted">{records.length} records</span>
        </div>

        {loading ? <Spinner /> : records.length === 0 ? (
          <EmptyState icon={<FileText size={40} />} title={`No ${label.toLowerCase()}s yet`}
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New {label}</button>} />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width:6, padding:0 }}></th>
                  <th>Reference</th>
                  {isReceipt  && <th>Supplier</th>}
                  {isDelivery && <th>Customer</th>}
                  {isTransfer ? <><th>From</th><th>To</th></> : <th>Warehouse</th>}
                  <th>Items</th>
                  <th>Status &amp; Progress</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.draft;
                  const isExpanded = expandedRow === r._id;
                  const advLabel = getAdvanceLabel(r.status, type);
                  const revLabel = getRevertLabel(r.status, type);

                  return (
                    <>
                      {/* ── Main row — coloured left border + tinted bg ── */}
                      <tr key={r._id} style={{ background: cfg.bg, cursor: 'pointer' }}
                        onClick={() => setExpandedRow(isExpanded ? null : r._id)}>

                        {/* Status colour strip on the left */}
                        <td style={{ padding: 0, width: 4 }}>
                          <div style={{ width: 4, height: '100%', minHeight: 48, background: cfg.dot, borderRadius: '4px 0 0 4px' }} />
                        </td>

                        <td>
                          <span className="td-mono" style={{ fontWeight: 600 }}>{r.number}</span>
                        </td>
                        {isReceipt  && <td style={{ fontWeight:500 }}>{r.supplier}</td>}
                        {isDelivery && <td style={{ fontWeight:500 }}>{r.customer}</td>}
                        {isTransfer
                          ? <>
                              <td className="text-muted">
                                <div>{r.fromWarehouse?.name}</div>
                                {r.fromLocation && <div style={{fontSize:11,color:'var(--primary)',fontWeight:500}}>📍 {r.fromLocation?.name || r.fromLocation?.code}</div>}
                              </td>
                              <td className="text-muted">
                                <div>{r.toWarehouse?.name}</div>
                                {r.toLocation && <div style={{fontSize:11,color:'var(--primary)',fontWeight:500}}>📍 {r.toLocation?.name || r.toLocation?.code}</div>}
                              </td>
                            </>
                          : <td className="text-muted">{r.warehouse?.name}</td>}
                        <td>{r.items?.length} item{r.items?.length !== 1 ? 's' : ''}</td>

                        {/* Status badge + mini progress dots */}
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                            <StatusBadge status={r.status} />
                            {/* Mini dot progress */}
                            {r.status !== 'cancelled' && (
                              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                                {(isDelivery ? DELIVERY_STEPS : GENERIC_STEPS).map((step, si) => {
                                  const stepIdx = (isDelivery ? DELIVERY_STEPS : GENERIC_STEPS).findIndex(s => s.status === r.status);
                                  const done    = si < stepIdx;
                                  const current = si === stepIdx;
                                  return (
                                    <div key={step.status} style={{
                                      width: current ? 10 : 6,
                                      height: current ? 10 : 6,
                                      borderRadius: '50%',
                                      background: done ? '#16A34A' : current ? cfg.dot : '#E2E8F0',
                                      transition: 'all .2s',
                                      flexShrink: 0,
                                    }} />
                                  );
                                })}
                                <span style={{ fontSize:10, color:'var(--gray-400)', marginLeft:3 }}>
                                  {isDelivery
                                    ? DELIVERY_STEPS.find(s=>s.status===r.status)?.label || r.status
                                    : r.status}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>

                        {/* Actions */}
                        <td onClick={e => e.stopPropagation()}>
                          <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>

                            {/* Advance button */}
                            {advLabel && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  fontSize:11, background: cfg.bg,
                                  border: `1px solid ${cfg.border}`,
                                  color: cfg.dot, fontWeight:600,
                                }}
                                onClick={() => advance(r._id, r.status)}>
                                {advLabel} <ChevronRight size={10} />
                              </button>
                            )}

                            {/* Revert button */}
                            {revLabel && (
                              <button className="btn btn-sm btn-outline" style={{ fontSize:11 }}
                                onClick={() => revert(r._id, r.status)}>
                                <ChevronLeft size={10} /> {revLabel}
                              </button>
                            )}

                            {/* Validate — manager/admin, ready only */}
                            {canValidate && r.status === 'ready' && (
                              <button className="btn btn-sm btn-success"
                                style={{ fontSize:11 }}
                                onClick={() => validate(r._id)}>
                                <CheckCircle size={11} />
                                {isDelivery ? 'Ship' : 'Validate'}
                              </button>
                            )}

                            {/* Lock for staff when ready */}
                            {!canValidate && r.status === 'ready' && (
                              <span title="Awaiting manager validation" style={{ color:'var(--gray-400)', display:'flex', alignItems:'center', gap:4, fontSize:11 }}>
                                <Lock size={12} /> Awaiting approval
                              </span>
                            )}

                            {/* Cancel */}
                            {r.status !== 'done' && r.status !== 'cancelled' && (
                              <button className="btn-icon" title="Cancel" onClick={() => setCancelId(r._id)}>
                                <XCircle size={13} color="var(--warning)" />
                              </button>
                            )}

                            {/* Delete draft */}
                            {canDelete && r.status === 'draft' && (
                              <button className="btn-icon" title="Delete" onClick={() => setDeleteId(r._id)}>
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded stepper row ── */}
                      {isExpanded && (
                        <tr key={r._id + '-exp'} style={{ background: cfg.bg }}>
                          <td style={{ padding:0 }}>
                            <div style={{ width:4, background: cfg.dot }} />
                          </td>
                          <td colSpan={isTransfer ? 9 : 8} style={{ padding:'12px 20px 16px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                              <span style={{ fontSize:11, fontWeight:500, color:'var(--gray-500)', whiteSpace:'nowrap' }}>
                                {isDelivery ? 'Delivery flow:' : 'Status flow:'}
                              </span>
                              <StatusStepper currentStatus={r.status} type={type} />
                            </div>
                            {isDelivery && r.status !== 'cancelled' && r.status !== 'done' && (
                              <div style={{ marginTop:10, fontSize:12, color:'var(--gray-500)', padding:'8px 12px', background:'rgba(255,255,255,.7)', borderRadius:6, border:`1px solid ${cfg.border}` }}>
                                {r.status === 'draft' && '📋 Staff: verify order details and click "Mark as Picked" once items are physically picked from shelves.'}
                                {r.status === 'waiting' && '📦 Staff: pack the items securely. Click "Mark as Packed" when ready for dispatch.'}
                                {r.status === 'ready' && '🚚 Manager: review packed shipment. Click "Ship" to validate — stock will decrease automatically.'}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Modal ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`New ${label}`} size="modal-lg">
        <div className="modal-body">
          {isReceipt && (
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Supplier *</label>
                <input className="form-input" value={form.supplier} onChange={e => setForm(f=>({...f,supplier:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Destination Warehouse *</label>
                <select className="form-select" value={form.warehouse} onChange={e => setForm(f=>({...f,warehouse:e.target.value}))}>
                  <option value="">Select…</option>
                  {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select></div>
            </div>
          )}
          {isDelivery && (
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Customer *</label>
                <input className="form-input" value={form.customer} onChange={e => setForm(f=>({...f,customer:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Source Warehouse *</label>
                <select className="form-select" value={form.warehouse} onChange={e => setForm(f=>({...f,warehouse:e.target.value}))}>
                  <option value="">Select…</option>
                  {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select></div>
            </div>
          )}
          {isTransfer && (
            <>
              {/* Transfer type selector */}
              <div style={{ display:'flex', gap:10, marginBottom:4 }}>
                {[
                  { val:'warehouse', label:'🏭  Warehouse → Warehouse', sub:'Move between different warehouses' },
                  { val:'location',  label:'📍  Location → Location',   sub:'Move between racks/shelves within same warehouse' },
                ].map(opt => (
                  <div key={opt.val} onClick={() => setForm(f=>({...f, transferType: opt.val, fromLocation:'', toLocation:''}))}
                    style={{
                      flex:1, padding:'10px 14px', borderRadius:8, cursor:'pointer',
                      border: `2px solid ${(form.transferType||'warehouse')===opt.val ? '#1B4FD8' : 'var(--gray-200)'}`,
                      background: (form.transferType||'warehouse')===opt.val ? '#EEF2FF' : '#fff',
                      transition: 'all .15s',
                    }}>
                    <div style={{ fontWeight:600, fontSize:13, color:(form.transferType||'warehouse')===opt.val ? '#1B4FD8' : 'var(--gray-700)' }}>{opt.label}</div>
                    <div style={{ fontSize:11, color:'var(--gray-500)', marginTop:2 }}>{opt.sub}</div>
                  </div>
                ))}
              </div>

              {/* Warehouse → Warehouse */}
              {(form.transferType||'warehouse') === 'warehouse' && (
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">From Warehouse *</label>
                    <select className="form-select" value={form.fromWarehouse} onChange={e => setForm(f=>({...f,fromWarehouse:e.target.value,fromLocation:''}))}>
                      <option value="">Select source warehouse…</option>
                      {warehouses.map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
                    </select></div>
                  <div className="form-group"><label className="form-label">To Warehouse *</label>
                    <select className="form-select" value={form.toWarehouse} onChange={e => setForm(f=>({...f,toWarehouse:e.target.value,toLocation:''}))}>
                      <option value="">Select destination warehouse…</option>
                      {warehouses.filter(w=>w._id!==form.fromWarehouse).map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
                    </select></div>
                </div>
              )}

              {/* Location → Location (Rack A → Rack B) */}
              {(form.transferType||'warehouse') === 'location' && (
                <>
                  <div className="form-group" style={{ marginBottom:8 }}>
                    <label className="form-label">Warehouse (same for both locations)</label>
                    <select className="form-select" value={form.fromWarehouse}
                      onChange={e => setForm(f=>({...f, fromWarehouse:e.target.value, toWarehouse:e.target.value, fromLocation:'', toLocation:''}))}>
                      <option value="">Select warehouse…</option>
                      {warehouses.map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
                    </select>
                  </div>
                  <div className="form-grid">
                    <div className="form-group"><label className="form-label">From Location (Rack/Shelf) *</label>
                      <select className="form-select" value={form.fromLocation} onChange={e => setForm(f=>({...f,fromLocation:e.target.value}))}>
                        <option value="">Select source location…</option>
                        {locations.filter(l=>(l.warehouse?._id||l.warehouse)===form.fromWarehouse).map(l => (
                          <option key={l._id} value={l._id}>{l.name} ({l.code}) — {l.type}</option>
                        ))}
                      </select></div>
                    <div className="form-group"><label className="form-label">To Location (Rack/Shelf) *</label>
                      <select className="form-select" value={form.toLocation} onChange={e => setForm(f=>({...f,toLocation:e.target.value}))}>
                        <option value="">Select destination location…</option>
                        {locations.filter(l=>(l.warehouse?._id||l.warehouse)===form.fromWarehouse && l._id!==form.fromLocation).map(l => (
                          <option key={l._id} value={l._id}>{l.name} ({l.code}) — {l.type}</option>
                        ))}
                      </select></div>
                  </div>
                </>
              )}
            </>
          )}
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Scheduled Date</label>
              <input type="date" className="form-input" value={form.scheduledAt} onChange={e => setForm(f=>({...f,scheduledAt:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Notes</label>
              <input className="form-input" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}/></div>
          </div>
          <LineItemsEditor items={items} setItems={setItems} products={products} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Create {label}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!cancelId} onClose={() => setCancelId(null)} onConfirm={cancel}
        title={`Cancel ${label}`} message="Document will be marked cancelled. No stock changes." />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del}
        title={`Delete ${label}`} message="This draft will be permanently deleted." danger />
    </div>
  );
}
