import { useState, useEffect, useCallback } from 'react';
import { productsAPI, categoriesAPI, warehousesAPI, locationsAPI } from '../../utils/api';
import { Modal, Spinner, EmptyState, ConfirmDialog } from '../../components/common/UI';
import toast from 'react-hot-toast';
import {
  Plus, Search, Edit2, Trash2, Package,
  AlertTriangle, ChevronDown, ChevronUp, Warehouse, MapPin
} from 'lucide-react';

// ── Colour helpers (hex so inline styles always work) ─────────
const C = {
  success:  '#16A34A',
  danger:   '#DC2626',
  warning:  '#D97706',
  blue:     '#1B4FD8',
  blueBg:   '#EEF2FF',
  gray400:  '#94A3B8',
  gray500:  '#64748B',
  gray600:  '#475569',
  gray700:  '#334155',
  gray800:  '#1E293B',
  gray100:  '#F1F5F9',
  gray200:  '#E2E8F0',
  gray50:   '#F8FAFC',
  successBg:'#DCFCE7',
  dangerBg: '#FEE2E2',
  warningBg:'#FEF3C7',
};

// ── Stock breakdown per warehouse + location ──────────────────
function StockLocations({ locs, uom }) {
  if (!locs || locs.length === 0)
    return <p style={{ color: C.gray400, fontSize: 12, margin: 0 }}>No stock recorded anywhere</p>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
      {locs.map((loc, i) => {
        const qty = loc.qty ?? 0;
        const borderColor = qty === 0 ? C.danger : qty <= 5 ? C.warning : C.success;
        const qtyColor    = qty === 0 ? C.danger : qty <= 5 ? C.warning : C.success;

        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'stretch', gap: 0,
            background: '#fff',
            border: `1px solid ${C.gray200}`,
            borderLeft: `4px solid ${borderColor}`,
            borderRadius: 8, overflow: 'hidden',
          }}>
            {/* Icon side */}
            <div style={{
              width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: C.gray50, borderRight: `1px solid ${C.gray200}`, flexShrink: 0
            }}>
              {loc.location ? <MapPin size={16} color={C.blue} /> : <Warehouse size={16} color={C.gray400} />}
            </div>

            {/* Info */}
            <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.gray800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {loc.warehouse?.name || 'Unknown warehouse'}
              </div>
              {loc.location ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <MapPin size={10} color={C.blue} />
                  <span style={{ fontSize: 11, color: C.blue, fontWeight: 500 }}>
                    {loc.location?.name || loc.location?.code}
                  </span>
                  <span style={{ fontSize: 10, color: C.gray400, background: C.gray100, padding: '0 5px', borderRadius: 4, textTransform: 'capitalize' }}>
                    {loc.location?.type || 'rack'}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>{loc.warehouse?.code}</div>
              )}
            </div>

            {/* Qty */}
            <div style={{
              padding: '10px 14px', display: 'flex', flexDirection: 'column',
              alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: qtyColor }}>{qty}</div>
              <div style={{ fontSize: 10, color: C.gray400 }}>{uom}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Stock status badge ────────────────────────────────────────
function StockBadge({ qty, reorderPoint }) {
  if (qty === 0)            return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background: C.dangerBg,  color: C.danger  }}><AlertTriangle size={10}/> Out of stock</span>;
  if (qty <= reorderPoint)  return <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background: C.warningBg, color: C.warning }}><AlertTriangle size={10}/> Low stock</span>;
  return                           <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background: C.successBg, color: C.success }}>In stock</span>;
}

// ═══════════════════════════════════════════════════════════════
export default function Products() {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [locations, setLocations]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [whFilter, setWhFilter]     = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [deleteId, setDeleteId]     = useState(null);

  const emptyForm = {
    name: '', sku: '', category: '', uom: 'pcs',
    description: '', reorderPoint: 0,
    initialStock: 0, warehouse: '', location: '',
  };
  const [form, setForm] = useState(emptyForm);

  const toggleRow = (id) => setExpandedRows(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, w, l] = await Promise.all([
        productsAPI.list({ search, category: catFilter, warehouse: whFilter }),
        categoriesAPI.list(),
        warehousesAPI.list(),
        locationsAPI.list(),
      ]);
      setProducts(p.data); setCategories(c.data);
      setWarehouses(w.data); setLocations(l.data);
    } finally { setLoading(false); }
  }, [search, catFilter, whFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, warehouse: warehouses[0]?._id || '' });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku,
      category: p.category?._id || '',
      uom: p.uom,
      description: p.description || '',
      reorderPoint: p.reorderPoint,
      initialStock: 0, warehouse: '', location: '',
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name) return toast.error('Product name is required');
    if (!form.sku)  return toast.error('SKU is required');
    try {
      const payload = { ...form };
      if (!payload.location)     delete payload.location;
      if (!payload.warehouse && !payload.initialStock) delete payload.warehouse;
      editing
        ? await productsAPI.update(editing._id, payload)
        : await productsAPI.create(payload);
      toast.success(editing ? 'Product updated' : 'Product created');
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const del = async () => {
    try { await productsAPI.delete(deleteId); toast.success('Archived'); setDeleteId(null); load(); }
    catch { toast.error('Error'); }
  };

  // Qty for display — filtered warehouse or total
  const getDisplayQty = (p) => {
    if (!whFilter) return p.stock?.total || 0;
    const loc = p.stock?.locations?.find(l => (l.warehouse?._id || l.warehouse) === whFilter);
    return loc?.qty ?? 0;
  };

  const selectedWH = whFilter ? warehouses.find(w => w._id === whFilter) : null;

  // Locations filtered to selected warehouse in form
  const formLocations = locations.filter(l => (l.warehouse?._id || l.warehouse) === form.warehouse);

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="page-header">
        <h2>Products</h2>
        <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Product</button>
      </div>

      {/* ── Filters ── */}
      <div className="card">
        <div className="card-header">
          <div className="filters-bar" style={{ padding: 0 }}>
            <div className="search-box">
              <Search size={15} />
              <input className="form-input" placeholder="Search name or SKU…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-select" style={{ width: 'auto' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select className="form-select" style={{ width: 'auto' }} value={whFilter}
              onChange={e => { setWhFilter(e.target.value); setExpandedRows(new Set()); }}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
            </select>
          </div>
          <span style={{ fontSize: 12, color: C.gray500 }}>{products.length} products</span>
        </div>

        {/* Active warehouse banner */}
        {selectedWH && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 20px',
            background: C.blueBg, borderBottom: `1px solid ${C.gray200}`,
          }}>
            <Warehouse size={14} color={C.blue} />
            <span style={{ fontSize: 13, fontWeight: 500, color: C.blue }}>
              Showing stock for: <strong>{selectedWH.name}</strong> ({selectedWH.code})
            </span>
            <button className="btn btn-sm btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setWhFilter('')}>
              Clear filter
            </button>
          </div>
        )}

        {/* ── Table ── */}
        {loading ? <Spinner /> : products.length === 0 ? (
          <EmptyState icon={<Package size={40} />} title="No products found"
            description="Create your first product to start tracking inventory."
            action={<button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Product</button>} />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>UoM</th>
                  <th>{selectedWH ? `Stock — ${selectedWH.name}` : 'Total Stock'}</th>
                  <th>Locations</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const displayQty  = getDisplayQty(p);
                  const totalQty    = p.stock?.total || 0;
                  const locs        = p.stock?.locations || [];
                  const isExpanded  = expandedRows.has(p._id);
                  const multiLoc    = locs.length > 1;
                  const rowBg       = totalQty === 0 ? '#FFF8F8' : totalQty <= p.reorderPoint ? '#FFFBEB' : '#fff';

                  return (
                    <>
                      <tr key={p._id} style={{ background: rowBg }}>
                        {/* Expand toggle */}
                        <td style={{ paddingRight: 0 }}>
                          {multiLoc && (
                            <button className="btn-icon" onClick={() => toggleRow(p._id)}>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          )}
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: C.gray800 }}>{p.name}</div>
                          {p.description && <div style={{ fontSize: 12, color: C.gray500 }}>{p.description}</div>}
                        </td>

                        <td><span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12.5, color: C.gray600 }}>{p.sku}</span></td>

                        <td>
                          {p.category
                            ? <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: p.category.color + '22', color: p.category.color }}>{p.category.name}</span>
                            : <span style={{ color: C.gray400 }}>—</span>}
                        </td>

                        <td style={{ color: C.gray600 }}>{p.uom}</td>

                        {/* Stock qty */}
                        <td>
                          <div style={{
                            fontSize: 18, fontWeight: 700,
                            color: displayQty === 0 ? C.danger : displayQty <= p.reorderPoint ? C.warning : C.gray800
                          }}>
                            {displayQty}
                          </div>
                          {whFilter && totalQty !== displayQty && (
                            <div style={{ fontSize: 11, color: C.gray400 }}>Total: {totalQty}</div>
                          )}
                        </td>

                        {/* Locations summary */}
                        <td style={{ minWidth: 160 }}>
                          {locs.length === 0 && <span style={{ color: C.gray400, fontSize: 12 }}>No stock</span>}
                          {locs.length === 1 && (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Warehouse size={11} color={C.gray400} />
                                <span style={{ fontSize: 12, color: C.gray600 }}>{locs[0].warehouse?.name}</span>
                              </div>
                              {locs[0].location && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                  <MapPin size={10} color={C.blue} />
                                  <span style={{ fontSize: 11, color: C.blue, fontWeight: 500 }}>{locs[0].location?.name || locs[0].location?.code}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {multiLoc && !isExpanded && (
                            <span style={{ fontSize: 12, color: C.blue, fontWeight: 500, cursor: 'pointer' }}
                              onClick={() => toggleRow(p._id)}>
                              {locs.length} locations ▼
                            </span>
                          )}
                          {multiLoc && isExpanded && (
                            <span style={{ fontSize: 12, color: C.gray500 }}>{locs.length} locations (expanded)</span>
                          )}
                        </td>

                        <td><StockBadge qty={totalQty} reorderPoint={p.reorderPoint} /></td>

                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-icon" onClick={() => openEdit(p)}><Edit2 size={13} /></button>
                            <button className="btn-icon" onClick={() => setDeleteId(p._id)}><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded location breakdown ── */}
                      {isExpanded && (
                        <tr key={p._id + '-loc'}>
                          <td colSpan={9} style={{ padding: '0 20px 14px 52px', background: C.gray50 }}>
                            <StockLocations locs={locs} uom={p.uom} />
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

      {/* ══ Create / Edit Modal ══════════════════════════════════ */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'New Product'}>
        <div className="modal-body">

          {/* Basic info */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-input" placeholder="e.g. Steel Rods 12mm"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">SKU / Code *</label>
              <input className="form-input" placeholder="e.g. STL-ROD-12"
                value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value.toUpperCase() }))} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">— None —</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Unit of Measure</label>
              <input className="form-input" placeholder="e.g. pcs, kg, litre"
                value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={2}
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Reorder Point</label>
            <input type="number" min="0" className="form-input" style={{ maxWidth: 160 }}
              value={form.reorderPoint}
              onChange={e => setForm(f => ({ ...f, reorderPoint: +e.target.value }))} />
            <div style={{ fontSize: 11, color: C.gray400, marginTop: 3 }}>Alert will show when stock falls to or below this quantity</div>
          </div>

          {/* ── Initial Stock section (create only) ── */}
          {!editing && (
            <div style={{ background: C.gray50, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: C.gray700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={14} color={C.blue} />
                Initial Stock (optional)
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input type="number" min="0" className="form-input"
                    value={form.initialStock}
                    onChange={e => setForm(f => ({ ...f, initialStock: +e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Warehouse *
                    {form.initialStock > 0 && <span style={{ color: C.danger }}> (required)</span>}
                  </label>
                  <select className="form-select" value={form.warehouse}
                    onChange={e => setForm(f => ({ ...f, warehouse: e.target.value, location: '' }))}>
                    <option value="">Select warehouse…</option>
                    {warehouses.map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location dropdown — only shows if warehouse is selected */}
              {form.warehouse && (
                <div className="form-group" style={{ marginTop: 4 }}>
                  <label className="form-label">
                    Location / Rack / Shelf
                    <span style={{ color: C.gray400, fontWeight: 400 }}> — optional</span>
                  </label>
                  <select className="form-select" value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}>
                    <option value="">Entire warehouse (no specific location)</option>
                    {formLocations.length === 0
                      ? null
                      : formLocations.map(l => (
                          <option key={l._id} value={l._id}>
                            {l.name} ({l.code}) — {l.type}
                          </option>
                        ))
                    }
                  </select>
                  {formLocations.length === 0 && form.warehouse && (
                    <div style={{ fontSize: 11, color: C.gray400, marginTop: 3 }}>
                      No locations set up for this warehouse. Go to Settings → Warehouses to add racks/shelves.
                    </div>
                  )}
                  {form.location && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
                      padding: '6px 10px', background: C.blueBg, borderRadius: 6, fontSize: 12
                    }}>
                      <MapPin size={12} color={C.blue} />
                      <span style={{ color: C.blue, fontWeight: 500 }}>
                        Stock will be placed at: {formLocations.find(l => l._id === form.location)?.name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Summary line */}
              {form.initialStock > 0 && form.warehouse && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', background: '#fff',
                  border: `1px solid ${C.gray200}`, borderRadius: 6, fontSize: 12,
                  color: C.gray600, display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ fontSize: 16 }}>📦</span>
                  <span>
                    Will add <strong>{form.initialStock} {form.uom || 'units'}</strong> to{' '}
                    <strong>{warehouses.find(w => w._id === form.warehouse)?.name}</strong>
                    {form.location && <> → <strong style={{ color: C.blue }}>{formLocations.find(l => l._id === form.location)?.name}</strong></>}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>
            {editing ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={del}
        title="Archive Product"
        message="This product will be archived. All existing stock records are preserved."
        danger />
    </div>
  );
}
