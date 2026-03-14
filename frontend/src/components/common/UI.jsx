import { X } from 'lucide-react';

// ── Status Badge ──────────────────────────────────────────────
export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = '' }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirm'}>
      <div className="modal-body">
        <p style={{ color: 'var(--gray-600)' }}>{message}</p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
          Confirm
        </button>
      </div>
    </Modal>
  );
}

// ── Loading Spinner ───────────────────────────────────────────
export function Spinner({ center = true }) {
  if (center) return <div className="loading-center"><div className="spinner" /></div>;
  return <div className="spinner" />;
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

// ── Select Filter ─────────────────────────────────────────────
export function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select className="form-select" style={{ width: 'auto' }} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── Line Item Row (for operation forms) ───────────────────────
export function LineItemRow({ item, index, products, onUpdate, onRemove }) {
  return (
    <tr>
      <td>
        <select
          className="form-select"
          value={item.product}
          onChange={e => onUpdate(index, 'product', e.target.value)}
        >
          <option value="">Select product…</option>
          {products.map(p => (
            <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
          ))}
        </select>
      </td>
      <td style={{ width: 120 }}>
        <input
          type="number" min="0" className="form-input"
          value={item.quantity}
          onChange={e => onUpdate(index, 'quantity', +e.target.value)}
        />
      </td>
      <td style={{ width: 90 }}>
        <input className="form-input" value={item.uom} onChange={e => onUpdate(index, 'uom', e.target.value)} />
      </td>
      <td style={{ width: 40 }}>
        <button className="btn-icon" onClick={() => onRemove(index)} title="Remove">
          <X size={14} />
        </button>
      </td>
    </tr>
  );
}
