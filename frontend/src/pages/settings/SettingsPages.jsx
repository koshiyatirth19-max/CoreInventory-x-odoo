import { useState, useEffect } from 'react';
import { warehousesAPI, categoriesAPI, locationsAPI, usersAPI, authAPI } from '../../utils/api';
import { Modal, Spinner, EmptyState, ConfirmDialog } from '../../components/common/UI';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Warehouse as WHIcon, Tag, Lock, MapPin, ChevronDown, ChevronRight } from 'lucide-react';

const COLORS = ['#1B4FD8','#16A34A','#DC2626','#D97706','#0891B2','#7C3AED','#DB2777','#059669','#EA580C','#6366F1'];

function ReadOnlyBanner({ msg }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, background:'var(--warning-light)', border:'1px solid var(--warning)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--warning)' }}>
      <Lock size={14} /> {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WAREHOUSES + LOCATIONS
// ═══════════════════════════════════════════════════════════════
export function WarehousesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [warehouses, setWarehouses]     = useState([]);
  const [locations, setLocations]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expandedWH, setExpandedWH]     = useState(new Set());
  const [showWHModal, setShowWHModal]   = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [editingWH, setEditingWH]       = useState(null);
  const [editingLoc, setEditingLoc]     = useState(null);
  const [deleteWH, setDeleteWH]         = useState(null);
  const [deleteLoc, setDeleteLoc]       = useState(null);
  const [whForm, setWhForm]   = useState({ name:'', code:'', address:'' });
  const [locForm, setLocForm] = useState({ warehouse:'', name:'', code:'', type:'rack' });

  const load = async () => {
    setLoading(true);
    try {
      const [w, l] = await Promise.all([warehousesAPI.list(), locationsAPI.list()]);
      setWarehouses(w.data); setLocations(l.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleWH = (id) => setExpandedWH(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const getLocs = (whId) => locations.filter(l => (l.warehouse?._id || l.warehouse) === whId);

  const saveWH = async () => {
    try {
      editingWH ? await warehousesAPI.update(editingWH._id, whForm) : await warehousesAPI.create(whForm);
      toast.success(editingWH ? 'Updated' : 'Warehouse created'); setShowWHModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const saveLoc = async () => {
    try {
      editingLoc ? await locationsAPI.update(editingLoc._id, locForm) : await locationsAPI.create(locForm);
      toast.success(editingLoc ? 'Updated' : 'Location added'); setShowLocModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Warehouses &amp; Locations</h2>
        {isAdmin && <button className="btn btn-primary" onClick={() => { setEditingWH(null); setWhForm({name:'',code:'',address:''}); setShowWHModal(true); }}><Plus size={15}/> Add Warehouse</button>}
      </div>
      {!isAdmin && <ReadOnlyBanner msg="View only — only admins can manage warehouses and locations." />}
      {loading ? <Spinner /> : warehouses.length === 0 ? (
        <EmptyState icon={<WHIcon size={40}/>} title="No warehouses" />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {warehouses.map(w => {
            const locs = getLocs(w._id);
            const open = expandedWH.has(w._id);
            return (
              <div key={w._id} className="card">
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', cursor:'pointer' }} onClick={() => toggleWH(w._id)}>
                  {open ? <ChevronDown size={16} color="var(--gray-500)"/> : <ChevronRight size={16} color="var(--gray-500)"/>}
                  <WHIcon size={16} color="var(--primary)"/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14 }}>{w.name}</div>
                    <div className="text-muted">{w.code}{w.address ? ` · ${w.address}` : ''}</div>
                  </div>
                  <span style={{ fontSize:12, color:'var(--gray-500)' }}>{locs.length} location{locs.length!==1?'s':''}</span>
                  {isAdmin && (
                    <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                      <button className="btn-icon" onClick={() => { setEditingWH(w); setWhForm({name:w.name,code:w.code,address:w.address}); setShowWHModal(true); }}><Edit2 size={13}/></button>
                      <button className="btn-icon" onClick={() => setDeleteWH(w._id)}><Trash2 size={13}/></button>
                    </div>
                  )}
                </div>
                {open && (
                  <div style={{ borderTop:'1px solid var(--gray-100)', padding:'8px 20px 12px 52px' }}>
                    {locs.length === 0 && <p className="text-muted" style={{ fontSize:13, margin:'6px 0' }}>No sub-locations. {isAdmin && 'Add rack, shelf, or bin below.'}</p>}
                    {locs.map(l => (
                      <div key={l._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--gray-50)', borderRadius:6, marginBottom:6, border:'1px solid var(--gray-200)' }}>
                        <MapPin size={13} color="var(--gray-400)"/>
                        <span style={{ fontWeight:500, fontSize:13 }}>{l.name}</span>
                        <span className="td-mono" style={{ fontSize:12 }}>{l.code}</span>
                        <span style={{ fontSize:11, padding:'1px 8px', borderRadius:99, background:'var(--gray-100)', color:'var(--gray-600)', textTransform:'capitalize' }}>{l.type}</span>
                        {isAdmin && (
                          <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
                            <button className="btn-icon" onClick={() => { setEditingLoc(l); setLocForm({warehouse:w._id,name:l.name,code:l.code,type:l.type}); setShowLocModal(true); }}><Edit2 size={12}/></button>
                            <button className="btn-icon" onClick={() => setDeleteLoc(l._id)}><Trash2 size={12}/></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {isAdmin && <button className="btn btn-sm btn-secondary" style={{ marginTop:4 }} onClick={() => { setEditingLoc(null); setLocForm({warehouse:w._id,name:'',code:'',type:'rack'}); setShowLocModal(true); }}><Plus size={12}/> Add Location (Rack/Shelf/Bin)</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showWHModal} onClose={() => setShowWHModal(false)} title={editingWH ? 'Edit Warehouse' : 'New Warehouse'}>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={whForm.name} onChange={e => setWhForm(f=>({...f,name:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Code *</label><input className="form-input" placeholder="e.g. WH-MAIN" value={whForm.code} onChange={e => setWhForm(f=>({...f,code:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" value={whForm.address} onChange={e => setWhForm(f=>({...f,address:e.target.value}))}/></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowWHModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveWH}>{editingWH ? 'Save' : 'Create'}</button>
        </div>
      </Modal>

      <Modal open={showLocModal} onClose={() => setShowLocModal(false)} title={editingLoc ? 'Edit Location' : 'Add Location'}>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" placeholder="e.g. Rack A" value={locForm.name} onChange={e => setLocForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Code *</label><input className="form-input" placeholder="e.g. RACK-A" value={locForm.code} onChange={e => setLocForm(f=>({...f,code:e.target.value}))}/></div>
          </div>
          <div className="form-group"><label className="form-label">Type</label>
            <select className="form-select" value={locForm.type} onChange={e => setLocForm(f=>({...f,type:e.target.value}))}>
              {['rack','shelf','bin','zone','other'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowLocModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveLoc}>{editingLoc ? 'Save' : 'Add Location'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteWH} onClose={() => setDeleteWH(null)} danger title="Archive Warehouse" message="Warehouse will be archived."
        onConfirm={async () => { await warehousesAPI.delete(deleteWH); toast.success('Archived'); setDeleteWH(null); load(); }}/>
      <ConfirmDialog open={!!deleteLoc} onClose={() => setDeleteLoc(null)} danger title="Archive Location" message="Location will be archived."
        onConfirm={async () => { await locationsAPI.delete(deleteLoc); toast.success('Archived'); setDeleteLoc(null); load(); }}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════
export function CategoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [deleteId, setDeleteId]     = useState(null);
  const [form, setForm]             = useState({ name:'', color:'#1B4FD8' });

  const load = () => { setLoading(true); categoriesAPI.list().then(r => setCategories(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const save = async () => {
    try {
      editing ? await categoriesAPI.update(editing._id, form) : await categoriesAPI.create(form);
      toast.success(editing ? 'Updated' : 'Category created'); setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Product Categories</h2>
        {isAdmin && <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({name:'',color:'#1B4FD8'}); setShowModal(true); }}><Plus size={15}/> Add Category</button>}
      </div>
      {!isAdmin && <ReadOnlyBanner msg="View only — only admins can manage product categories." />}
      {loading ? <Spinner /> : categories.length === 0 ? (
        <EmptyState icon={<Tag size={40}/>} title="No categories" description="Create categories to organise your products." />
      ) : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Category</th><th>Color</th>{isAdmin && <th></th>}</tr></thead>
            <tbody>
              {categories.map(c => (
                <tr key={c._id}>
                  <td><div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:14, height:14, borderRadius:'50%', background:c.color }}/>
                    <span style={{ fontWeight:500 }}>{c.name}</span>
                  </div></td>
                  <td><span className="td-mono" style={{ fontSize:12 }}>{c.color}</span></td>
                  {isAdmin && <td><div style={{ display:'flex', gap:6 }}>
                    <button className="btn-icon" onClick={() => { setEditing(c); setForm({name:c.name,color:c.color}); setShowModal(true); }}><Edit2 size={13}/></button>
                    <button className="btn-icon" onClick={() => setDeleteId(c._id)}><Trash2 size={13}/></button>
                  </div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Name *</label><input className="form-input" placeholder="e.g. Raw Materials" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Color</label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
              {COLORS.map(c => <div key={c} onClick={() => setForm(f=>({...f,color:c}))} style={{ width:28, height:28, borderRadius:'50%', background:c, cursor:'pointer', border: form.color===c ? '3px solid var(--gray-800)' : '3px solid transparent', transition:'border .15s' }}/>)}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{editing ? 'Save' : 'Create'}</button>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} danger title="Delete Category" message="This category will be removed."
        onConfirm={async () => { await categoriesAPI.delete(deleteId); toast.success('Deleted'); setDeleteId(null); load(); }}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// USER MANAGEMENT (Admin only)
// ═══════════════════════════════════════════════════════════════
export function UsersPage() {
  const { user: me } = useAuth();
  const isAdmin = me?.role === 'admin';
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ name:'', email:'', password:'', role:'staff', isActive:true });

  const load = () => { if (!isAdmin) return; setLoading(true); usersAPI.list().then(r => setUsers(r.data)).finally(() => setLoading(false)); };
  useEffect(load, [isAdmin]);

  const save = async () => {
    try {
      if (editing) { await usersAPI.update(editing._id, { name:form.name, role:form.role, isActive:form.isActive }); toast.success('User updated'); }
      else { await usersAPI.create(form); toast.success('User created'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Error'); }
  };

  const RC = { admin:'#EEF2FF', manager:'#DCFCE7', staff:'#F1F5F9' };
  const RT = { admin:'#1B4FD8', manager:'#16A34A', staff:'#475569' };

  if (!isAdmin) return (
    <div><div className="page-header"><h2>User Management</h2></div>
      <ReadOnlyBanner msg="Access denied — only admins can manage users." /></div>
  );

  return (
    <div>
      <div className="page-header">
        <h2>User Management</h2>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({name:'',email:'',password:'',role:'staff',isActive:true}); setShowModal(true); }}><Plus size={15}/> Add User</button>
      </div>
      {loading ? <Spinner /> : (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td><div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:12, fontWeight:600 }}>
                      {u.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <span style={{ fontWeight:500 }}>{u.name} {u._id === me._id && <span style={{ fontSize:11, color:'var(--gray-400)' }}>(you)</span>}</span>
                  </div></td>
                  <td className="text-muted">{u.email}</td>
                  <td><span style={{ padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:600, background:RC[u.role], color:RT[u.role], textTransform:'capitalize' }}>{u.role}</span></td>
                  <td><span style={{ padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:500, background: u.isActive ? 'var(--success-light)' : 'var(--danger-light)', color: u.isActive ? 'var(--success)' : 'var(--danger)' }}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                  <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td><button className="btn-icon" onClick={() => { setEditing(u); setForm({name:u.name, role:u.role, isActive:u.isActive}); setShowModal(true); }}><Edit2 size={13}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'New User'}>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}/></div>
          {!editing && <>
            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))}/></div>
          </>}
          <div className="form-group"><label className="form-label">Role *</label>
            <select className="form-select" value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
              <option value="staff">Staff — create drafts, view only</option>
              <option value="manager">Manager — validate operations</option>
              <option value="admin">Admin — full access</option>
            </select>
          </div>
          {editing && <div className="form-group"><label className="form-label">Status</label>
            <select className="form-select" value={form.isActive ? 'active' : 'inactive'} onChange={e => setForm(f=>({...f,isActive:e.target.value==='active'}))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive (deactivated)</option>
            </select>
          </div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{editing ? 'Save Changes' : 'Create User'}</button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════
export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm]   = useState({ name:user?.name||'', email:user?.email||'' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { const { data } = await authAPI.updateProfile(form); updateUser(data.user); toast.success('Profile updated'); }
    catch { toast.error('Error'); } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth:520 }}>
      <div className="page-header"><h2>My Profile</h2></div>
      <div className="card">
        <div className="card-header"><span className="card-title">Account Details</span></div>
        <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:8 }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--primary)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:20 }}>
              {user?.name?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:16 }}>{user?.name}</div>
              <div className="text-muted" style={{ textTransform:'capitalize' }}>{user?.role}</div>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))}/></div>
          <button className="btn btn-primary" style={{ alignSelf:'flex-start' }} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}
