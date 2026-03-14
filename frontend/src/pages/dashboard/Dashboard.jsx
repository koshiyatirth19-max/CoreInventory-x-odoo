import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, warehousesAPI, categoriesAPI } from '../../utils/api';
import { Spinner } from '../../components/common/UI';
import {
  Package, TrendingDown, AlertTriangle, ArrowDownToLine,
  ArrowUpFromLine, ArrowLeftRight, Clock, Filter, ClipboardList,
  ChevronRight, X, Warehouse, MapPin
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';

// ── All colours as hex (CSS vars unreliable in inline styles) ─
const C = {
  blue:       '#1B4FD8', blueBg:   '#EEF2FF', blueBorder: '#BFDBFE',
  green:      '#16A34A', greenBg:  '#DCFCE7', greenBorder:'#86EFAC',
  red:        '#DC2626', redBg:    '#FEE2E2', redBorder:  '#FCA5A5',
  amber:      '#D97706', amberBg:  '#FEF3C7', amberBorder:'#FCD34D',
  teal:       '#0891B2', tealBg:   '#CFFAFE', tealBorder: '#67E8F9',
  purple:     '#7C3AED', purpleBg: '#EDE9FE', purpleBorder:'#C4B5FD',
  gray50:     '#F8FAFC', gray100:  '#F1F5F9', gray200:    '#E2E8F0',
  gray400:    '#94A3B8', gray500:  '#64748B', gray600:    '#475569',
  gray700:    '#334155', gray800:  '#1E293B', gray900:    '#0F172A',
  white:      '#ffffff',
};

const TYPE_COLORS = {
  receipt:    C.green,
  delivery:   C.red,
  transfer:   C.teal,
  adjustment: C.amber,
};

const TYPE_BG = {
  receipt:    C.greenBg,
  delivery:   C.redBg,
  transfer:   C.tealBg,
  adjustment: C.amberBg,
};

const DOC_TYPES = [
  { value: '',           label: 'All Types' },
  { value: 'receipt',    label: 'Receipts' },
  { value: 'delivery',   label: 'Deliveries' },
  { value: 'transfer',   label: 'Transfers' },
  { value: 'adjustment', label: 'Adjustments' },
];

const STATUSES = [
  { value: '',          label: 'All Statuses' },
  { value: 'draft',     label: 'Draft' },
  { value: 'waiting',   label: 'Waiting' },
  { value: 'picking',   label: 'Picking' },
  { value: 'packing',   label: 'Packing' },
  { value: 'ready',     label: 'Ready' },
  { value: 'done',      label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ── Active filter chip ────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
      background: C.blueBg, color: C.blue, border: `1px solid ${C.blueBorder}`,
    }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.blue, padding: 0, display: 'flex', lineHeight: 1 }}>
        <X size={12} />
      </button>
    </span>
  );
}

// ── KPI card ─────────────────────────────────────────────────
function KpiCard({ label, value, icon, bg, border, textColor, onClick, filtered }) {
  return (
    <div onClick={onClick} style={{
      background: C.white, border: `1px solid ${filtered ? border : C.gray200}`,
      borderRadius: 12, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 14,
      cursor: 'pointer', transition: 'box-shadow .15s, transform .15s',
      boxShadow: filtered ? `0 0 0 3px ${border}` : '0 1px 3px rgba(0,0,0,.06)',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,.1)`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = filtered ? `0 0 0 3px ${border}` : '0 1px 3px rgba(0,0,0,.06)'; e.currentTarget.style.transform = 'none'; }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: value > 0 ? textColor : C.gray400 }}>{value ?? 0}</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.gray500, marginTop: 4 }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.blue }}>
        <span>View</span><ChevronRight size={11} />
      </div>
    </div>
  );
}

// ── Custom tooltip for chart ──────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: C.gray700 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: C.gray600, textTransform: 'capitalize' }}>{p.dataKey}</span>
          <span style={{ fontWeight: 600, color: C.gray800, marginLeft: 'auto' }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [categories, setCategories] = useState([]);

  const [docType,   setDocType]   = useState('');
  const [status,    setStatus]    = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [category,  setCategory]  = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    warehousesAPI.list().then(r => setWarehouses(r.data)).catch(() => {});
    categoriesAPI.list().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    dashboardAPI.get({ docType, status, warehouse, category })
      .then(r => setData(r.data))
      .catch(err => console.error('Dashboard load error:', err))
      .finally(() => setLoading(false));
  }, [docType, status, warehouse, category]);

  useEffect(() => { load(); }, [load]);

  // Build chart data from trend
  const chartData = (() => {
    if (!data?.moveTrend) return [];
    const map = {};
    data.moveTrend.forEach(({ _id, count }) => {
      if (!map[_id.date]) map[_id.date] = { date: _id.date };
      map[_id.date][_id.type] = count;
    });
    // Fill last 7 days even if no data
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push(map[key] || { date: key });
    }
    return days;
  })();

  const kpis = data?.kpis || {};
  const hasFilters = docType || status || warehouse || category;
  const selectedWH  = warehouse ? warehouses.find(w => w._id === warehouse) : null;
  const selectedCat = category  ? categories.find(c => c._id === category)  : null;

  const activeDocTypes = docType ? [docType] : ['receipt', 'delivery', 'transfer', 'adjustment'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ═══════════════════════════════════════════════════════
          FILTER BAR
      ════════════════════════════════════════════════════════ */}
      <div style={{
        background: C.white, border: `1px solid ${C.gray200}`,
        borderRadius: 12, padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.gray500, fontSize: 13, fontWeight: 600, marginRight: 4 }}>
            <Filter size={14} color={C.blue} />
            <span style={{ color: C.gray700 }}>Filter dashboard</span>
          </div>

          {/* Doc Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '.06em' }}>Type</label>
            <select style={{
              padding: '7px 10px', borderRadius: 6, fontSize: 13,
              border: `1px solid ${docType ? C.blue : C.gray200}`,
              background: docType ? C.blueBg : C.white,
              color: docType ? C.blue : C.gray700,
              fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }} value={docType} onChange={e => setDocType(e.target.value)}>
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>

          {/* Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '.06em' }}>Status</label>
            <select style={{
              padding: '7px 10px', borderRadius: 6, fontSize: 13,
              border: `1px solid ${status ? C.amber : C.gray200}`,
              background: status ? C.amberBg : C.white,
              color: status ? C.amber : C.gray700,
              fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }} value={status} onChange={e => setStatus(e.target.value)}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Warehouse */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '.06em' }}>Warehouse</label>
            <select style={{
              padding: '7px 10px', borderRadius: 6, fontSize: 13,
              border: `1px solid ${warehouse ? C.teal : C.gray200}`,
              background: warehouse ? C.tealBg : C.white,
              color: warehouse ? C.teal : C.gray700,
              fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }} value={warehouse} onChange={e => setWarehouse(e.target.value)}>
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}
            </select>
          </div>

          {/* Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.gray400, textTransform: 'uppercase', letterSpacing: '.06em' }}>Category</label>
            <select style={{
              padding: '7px 10px', borderRadius: 6, fontSize: 13,
              border: `1px solid ${category ? C.purple : C.gray200}`,
              background: category ? C.purpleBg : C.white,
              color: category ? C.purple : C.gray700,
              fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
            }} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          {hasFilters && (
            <button onClick={() => { setDocType(''); setStatus(''); setWarehouse(''); setCategory(''); }}
              style={{
                marginLeft: 4, padding: '7px 14px', borderRadius: 6, fontSize: 12,
                background: C.gray100, color: C.gray600, border: `1px solid ${C.gray200}`,
                cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
                alignSelf: 'flex-end',
              }}>
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: C.gray400, fontWeight: 500 }}>Active:</span>
            {docType    && <FilterChip label={`Type: ${docType}`}           onRemove={() => setDocType('')} />}
            {status     && <FilterChip label={`Status: ${status}`}          onRemove={() => setStatus('')} />}
            {selectedWH && <FilterChip label={`Warehouse: ${selectedWH.name}`} onRemove={() => setWarehouse('')} />}
            {selectedCat && <FilterChip label={`Category: ${selectedCat.name}`} onRemove={() => setCategory('')} />}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          LOADING / CONTENT
      ════════════════════════════════════════════════════════ */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Spinner />
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14 }}>
            <KpiCard label="Products in Stock"   value={kpis.totalInStock}       icon={<Package size={18} color={C.blue} />}         bg={C.blueBg}   border={C.blueBorder}  textColor={C.blue}   onClick={() => navigate('/products')}    filtered={!!category || !!warehouse} />
            <KpiCard label="Low Stock Items"     value={kpis.lowStock}            icon={<TrendingDown size={18} color={C.amber} />}   bg={C.amberBg}  border={C.amberBorder} textColor={C.amber}  onClick={() => navigate('/products')}    filtered={false} />
            <KpiCard label="Out of Stock"        value={kpis.outOfStock}          icon={<AlertTriangle size={18} color={C.red} />}    bg={C.redBg}    border={C.redBorder}   textColor={C.red}    onClick={() => navigate('/products')}    filtered={false} />
            <KpiCard label="Pending Receipts"    value={kpis.pendingReceipts}     icon={<ArrowDownToLine size={18} color={C.green} />} bg={C.greenBg}  border={C.greenBorder} textColor={C.green}  onClick={() => navigate('/receipts')}    filtered={!!(docType === 'receipt'  || status || warehouse)} />
            <KpiCard label="Pending Deliveries"  value={kpis.pendingDeliveries}   icon={<ArrowUpFromLine size={18} color={C.red} />}  bg={C.redBg}    border={C.redBorder}   textColor={C.red}    onClick={() => navigate('/deliveries')}  filtered={!!(docType === 'delivery' || status || warehouse)} />
            <KpiCard label="Pending Transfers"   value={kpis.pendingTransfers}    icon={<ArrowLeftRight size={18} color={C.teal} />}  bg={C.tealBg}   border={C.tealBorder}  textColor={C.teal}   onClick={() => navigate('/transfers')}   filtered={!!(docType === 'transfer' || status)} />
            <KpiCard label="Pending Adjustments" value={kpis.pendingAdjustments} icon={<ClipboardList size={18} color={C.amber} />}  bg={C.amberBg}  border={C.amberBorder} textColor={C.amber}  onClick={() => navigate('/adjustments')} filtered={!!(docType === 'adjustment'|| status || warehouse)} />
          </div>

          {/* ── Charts + Activity ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

            {/* Area chart */}
            <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.gray100}` }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: C.gray800 }}>Stock Activity</div>
                  <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>
                    Last 7 days{docType ? ` · ${docType} only` : ''}{selectedWH ? ` · ${selectedWH.name}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {activeDocTypes.map(t => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_COLORS[t] }} />
                      <span style={{ color: C.gray500, textTransform: 'capitalize' }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: '16px 8px 8px' }}>
                {chartData.every(d => activeDocTypes.every(t => !d[t])) ? (
                  <div style={{ textAlign: 'center', padding: '50px 0', color: C.gray400, fontSize: 13 }}>
                    No activity in the last 7 days
                    {hasFilters && <div style={{ fontSize: 11, marginTop: 4 }}>Try clearing some filters</div>}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={chartData} barSize={12} barGap={3} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke={C.gray100} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.gray400 }} tickLine={false} axisLine={false}
                        tickFormatter={d => { const [,m,day] = d.split('-'); return `${day}/${m}`; }} />
                      <YAxis tick={{ fontSize: 10, fill: C.gray400 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: C.gray50 }} />
                      {activeDocTypes.map(t => (
                        <Bar key={t} dataKey={t} fill={TYPE_COLORS[t]} radius={[3, 3, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Recent moves */}
            <div style={{ background: C.white, border: `1px solid ${C.gray200}`, borderRadius: 12, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.gray100}` }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: C.gray800 }}>Recent Moves</div>
                <button onClick={() => navigate('/moves')} style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  background: C.gray100, color: C.gray600, border: `1px solid ${C.gray200}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>View All</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {!data?.recentMoves?.length ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: C.gray400, fontSize: 13 }}>
                    No moves yet{hasFilters ? ' with these filters' : ''}
                  </div>
                ) : data.recentMoves.map(m => (
                  <div key={m._id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 16px', borderBottom: `1px solid ${C.gray100}`,
                  }}>
                    {/* Type dot */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: TYPE_BG[m.type] || C.gray100,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_COLORS[m.type] || C.gray400 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: C.gray800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.product?.name}
                      </div>
                      <div style={{ fontSize: 11, color: C.gray400, marginTop: 1 }}>
                        <span style={{
                          display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                          background: TYPE_BG[m.type], color: TYPE_COLORS[m.type],
                          fontWeight: 600, textTransform: 'capitalize', marginRight: 4
                        }}>{m.type}</span>
                        {m.quantity} {m.product?.uom || 'units'}
                      </div>
                      <div style={{ fontSize: 11, color: C.gray500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
                        {m.fromWarehouse && (
                          <><Warehouse size={9} color={C.gray400} />
                          <span>{m.fromWarehouse.name}</span>
                          {m.fromLocation && <><MapPin size={9} color={C.blue} /><span style={{ color: C.blue }}>{m.fromLocation.name}</span></>}
                          <span>→</span></>
                        )}
                        {m.toWarehouse && (
                          <><Warehouse size={9} color={C.gray400} />
                          <span>{m.toWarehouse.name}</span>
                          {m.toLocation && <><MapPin size={9} color={C.blue} /><span style={{ color: C.blue }}>{m.toLocation.name}</span></>}
                          </>
                        )}
                      </div>
                    </div>
                    <Clock size={10} color={C.gray300} style={{ marginTop: 4, flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Low Stock Alerts ── */}
          {data?.lowStockProducts?.length > 0 && (
            <div style={{ background: C.white, border: `1px solid ${C.amberBorder}`, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: `1px solid ${C.gray100}` }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: C.amberBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={14} color={C.amber} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 14, color: C.gray800 }}>Low Stock Alerts</span>
                <span style={{ fontSize: 12, color: C.gray400 }}>— these products need restocking</span>
                <button onClick={() => navigate('/products')} style={{
                  marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, fontSize: 12,
                  background: C.amberBg, color: C.amber, border: `1px solid ${C.amberBorder}`,
                  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
                }}>View All</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, padding: 16 }}>
                {data.lowStockProducts.map(p => (
                  <div key={p._id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 8,
                    background: p.qty === 0 ? C.redBg : C.amberBg,
                    border: `1px solid ${p.qty === 0 ? C.redBorder : C.amberBorder}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.gray800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.gray500 }}>Reorder at: {p.reorderPoint}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: p.qty === 0 ? C.red : C.amber, lineHeight: 1 }}>{p.qty}</div>
                      <div style={{ fontSize: 10, color: C.gray400 }}>in stock</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
