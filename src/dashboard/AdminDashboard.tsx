'use client';
import { useEffect, useState } from 'react';
import { getCurrentUserWithRole, signOut } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css';
import '../styles/components.css';

type Profile = { user_id: string; full_name: string; role_id: number; is_active: boolean; major_id?: number; class_id?: number; year_of_study?: number; };
type Major = { major_id: number; major_name: string; };
type Class = { class_id: number; class_name: string; year_of_study: number; major_id: number; };
type CSVRow = { full_name: string; email: string; password: string; role: string; major?: string; class?: string; year?: string; };

const roleIds: Record<string, number> = { admin: 1, instructor: 2, student: 3 };

export function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'majors'>('users');
  const [modal, setModal] = useState<'single' | 'csv' | 'class' | 'major' | null>(null);
  const [alert, setAlert] = useState<{ msg: string; type: string } | null>(null);
  const [formError, setFormError] = useState('');
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);
  const [csvReady, setCsvReady] = useState(false);
  const [csvTab, setCsvTab] = useState<'upload' | 'format'>('upload');

  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', roleId: 3, majorId: 0, classId: 0, yearOfStudy: 1 });
  const [newClass, setNewClass] = useState({ className: '', yearOfStudy: 1, majorId: 0 });
  const [newMajor, setNewMajor] = useState({ majorName: '' });

  useEffect(() => {
    getCurrentUserWithRole().then(u => {
      if (!u || u.role !== 'Admin') window.location.href = '/';
      else setCurrentUser(u);
    });
    fetchAll();
  }, []);

  async function fetchAll() {
    const [{ data: usersData }, { data: majorsData }, { data: classesData }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, role_id, is_active, major_id, class_id, year_of_study'),
      supabase.from('majors').select('*').order('major_name'),
      supabase.from('classes').select('*').order('class_name'),
    ]);
    setUsers(usersData || []);
    setFiltered(usersData || []);
    setMajors(majorsData || []);
    setClasses(classesData || []);
    setLoading(false);
  }

  function showAlert(msg: string, type: string) {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value.toLowerCase();
    setFiltered(users.filter(u => u.full_name.toLowerCase().includes(q)));
  }

  async function handleUpdateUser(userId: string, roleId: number, isActive: boolean) {
    await fetch('/api/admin/update-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roleId, isActive }),
    });
    fetchAll();
    showAlert('User updated.', 'success');
  }

  async function handleDeleteUser(userId: string, name: string) {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch('/api/admin/delete-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (json.error) { showAlert(json.error, 'danger'); return; }
    fetchAll();
    showAlert(`User "${name}" deleted.`, 'success');
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const res = await fetch('/api/admin/create-user', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    });
    const json = await res.json();
    if (json.error) { setFormError(json.error); return; }
    setModal(null);
    setNewUser({ email: '', password: '', fullName: '', roleId: 3, majorId: 0, classId: 0, yearOfStudy: 1 });
    fetchAll();
    showAlert('User created successfully.', 'success');
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const res = await fetch('/api/admin/create-class', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClass),
    });
    const json = await res.json();
    if (json.error) { setFormError(json.error); return; }
    setModal(null);
    setNewClass({ className: '', yearOfStudy: 1, majorId: 0 });
    fetchAll();
    showAlert('Class created successfully.', 'success');
  }

  async function handleCreateMajor(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const res = await fetch('/api/admin/create-major', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ majorName: newMajor.majorName }),
    });
    const json = await res.json();
    if (json.error) { setFormError(json.error); return; }
    setModal(null);
    setNewMajor({ majorName: '' });
    fetchAll();
    showAlert('Major created successfully.', 'success');
  }

  async function handleDeleteClass(classId: number, name: string) {
    if (!confirm(`Delete class "${name}"?`)) return;
    await supabase.from('classes').delete().eq('class_id', classId);
    fetchAll();
    showAlert(`Class "${name}" deleted.`, 'success');
  }

  async function handleDeleteMajor(majorId: number, name: string) {
    if (!confirm(`Delete major "${name}"?`)) return;
    await supabase.from('majors').delete().eq('major_id', majorId);
    fetchAll();
    showAlert(`Major "${name}" deleted.`, 'success');
  }

  function parseCSV(text: string) {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const required = ['full_name', 'email', 'password', 'role'];
    const missing = required.filter(r => !headers.includes(r));
    if (missing.length) { showAlert(`Missing CSV columns: ${missing.join(', ')}`, 'danger'); return; }
    const rows = lines.slice(1).filter(l => l.trim()).map(line => {
      const v = line.split(',').map(x => x.trim());
      return {
        full_name: v[headers.indexOf('full_name')],
        email: v[headers.indexOf('email')],
        password: v[headers.indexOf('password')],
        role: v[headers.indexOf('role')],
        major: headers.includes('major') ? v[headers.indexOf('major')] : '',
        class: headers.includes('class') ? v[headers.indexOf('class')] : '',
        year: headers.includes('year') ? v[headers.indexOf('year')] : '',
      };
    });
    setCsvRows(rows);
    setCsvReady(true);
  }

  function handleFileInput(file: File) {
    const reader = new FileReader();
    reader.onload = e => parseCSV(e.target?.result as string);
    reader.readAsText(file);
  }

  async function handleBulkUpload() {
    let successCount = 0;
    for (const row of csvRows) {
      const majorObj = majors.find(m => m.major_name.toLowerCase() === row.major?.toLowerCase());
      const classObj = classes.find(c => c.class_name.toLowerCase() === row.class?.toLowerCase());
      const res = await fetch('/api/admin/create-user', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: row.email, password: row.password, fullName: row.full_name,
          roleId: roleIds[row.role.toLowerCase()] || 3,
          majorId: majorObj?.major_id || 0,
          classId: classObj?.class_id || 0,
          yearOfStudy: row.year ? parseInt(row.year) : 1,
        }),
      });
      const json = await res.json();
      if (!json.error) successCount++;
    }
    setModal(null);
    setCsvRows([]); setCsvReady(false);
    fetchAll();
    showAlert(`${successCount} of ${csvRows.length} user(s) imported.`, 'success');
  }

  const filteredClasses = newUser.majorId ? classes.filter(c => c.major_id === newUser.majorId) : classes;
  const roleMap: Record<number, string> = { 1: 'Admin', 2: 'Instructor', 3: 'Student' };

  if (!currentUser) return <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Loading...</div>;

  return (
    <div className="app-wrapper">
      <nav className="navbar">
        <div className="logo-area">
          <div className="icon-layers">
            <div className="layer layer-1 center-align" />
            <div className="layer layer-2 center-align" />
            <div className="layer layer-3 center-align" />
          </div>
          <span className="logo-text">Examinizer</span>
        </div>
        <div className="user-info">
          <span className="role-badge">⚙️ Administrator</span>
          <div className="avatar">{currentUser.fullName[0]}</div>
          <button className="btn btn-danger btn-sm" onClick={signOut}>Logout</button>
        </div>
      </nav>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Users', value: users.length, color: 'var(--primary-blue)' },
          { label: 'Active', value: users.filter(u => u.is_active).length, color: 'var(--success)' },
          { label: 'Instructors', value: users.filter(u => u.role_id === 2 && u.is_active).length, color: 'var(--warning)' },
          { label: 'Students', value: users.filter(u => u.role_id === 3 && u.is_active).length, color: 'var(--gray-600)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 500, marginBottom: '0.4rem' }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1rem' }}>{alert.msg}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users ({users.length})</button>
        <button className={`tab ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>Classes ({classes.length})</button>
        <button className={`tab ${activeTab === 'majors' ? 'active' : ''}`} onClick={() => setActiveTab('majors')}>Majors ({majors.length})</button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <div className="card-header">
            <h3>👥 User Management</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input className="form-input" style={{ width: 220, padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)' }}
                placeholder="Search users..." onChange={handleSearch} />
              <button className="btn btn-outline btn-sm" onClick={() => { setModal('csv'); setCsvRows([]); setCsvReady(false); setCsvTab('upload'); }}>📂 Bulk Upload</button>
              <button className="btn btn-primary btn-sm" onClick={() => setModal('single')}>+ Add User</button>
            </div>
          </div>
          {loading ? <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Loading...</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {['Name', 'Role', 'Major', 'Class', 'Year', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--gray-200)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.user_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{u.full_name}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <select className="form-select" style={{ width: 'auto', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)' }}
                        value={u.role_id} onChange={e => handleUpdateUser(u.user_id, Number(e.target.value), u.is_active)}>
                        <option value={1}>Admin</option>
                        <option value={2}>Instructor</option>
                        <option value={3}>Student</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                      {u.role_id === 1 ? '—' : majors.find(m => m.major_id === u.major_id)?.major_name || '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                      {u.role_id === 3 ? (classes.find(c => c.class_id === u.class_id)?.class_name || '—') : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                      {u.role_id === 3 && u.year_of_study ? `Year ${u.year_of_study}` : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>{u.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className={`btn btn-sm ${u.is_active ? 'btn-outline' : 'btn-primary'}`}
                          onClick={() => handleUpdateUser(u.user_id, u.role_id, !u.is_active)}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {!u.is_active && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u.user_id, u.full_name)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="card">
          <div className="card-header">
            <h3>🏫 Classes</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('class')}>+ New Class</button>
          </div>
          {classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '3rem' }}>🏫</div>
              <p style={{ fontWeight: 600, color: 'var(--gray-600)', marginTop: '1rem' }}>No classes yet</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {['Class Name', 'Major', 'Year', 'Students', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--gray-200)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classes.map(c => (
                  <tr key={c.class_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{c.class_name}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)' }}>{majors.find(m => m.major_id === c.major_id)?.major_name || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)' }}>Year {c.year_of_study}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)' }}>{users.filter(u => u.class_id === c.class_id).length}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClass(c.class_id, c.class_name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Majors Tab */}
      {activeTab === 'majors' && (
        <div className="card">
          <div className="card-header">
            <h3>📚 Majors</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setModal('major')}>+ New Major</button>
          </div>
          {majors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '3rem' }}>📚</div>
              <p style={{ fontWeight: 600, color: 'var(--gray-600)', marginTop: '1rem' }}>No majors yet</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {['Major Name', 'Classes', 'Students', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--gray-200)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {majors.map(m => (
                  <tr key={m.major_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{m.major_name}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)' }}>{classes.filter(c => c.major_id === m.major_id).length}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)' }}>{users.filter(u => u.major_id === m.major_id).length}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeleteMajor(m.major_id, m.major_name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {modal === 'single' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="card" style={{ width: 480, padding: '2rem', borderRadius: 'var(--radius-2xl)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Create New User</h3>
            {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
            <form onSubmit={handleCreateUser}>
              {[
                { label: 'Full Name', key: 'fullName', type: 'text', ph: 'Ahmed Naser' },
                { label: 'Email', key: 'email', type: 'email', ph: 'ahmed@uni.edu' },
                { label: 'Password', key: 'password', type: 'password', ph: '••••••••' },
              ].map(f => (
                <div className="form-group" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input className="form-input" type={f.type} placeholder={f.ph} required
                    value={(newUser as any)[f.key]} onChange={e => setNewUser(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Role</label>
                <select className="form-select" value={newUser.roleId}
                  onChange={e => setNewUser(p => ({ ...p, roleId: Number(e.target.value) }))}>
                  <option value={1}>Admin</option>
                  <option value={2}>Instructor</option>
                  <option value={3}>Student</option>
                </select>
              </div>
              {newUser.roleId === 3 && (
  <>
    <div className="form-group">
      <label className="form-label">Major</label>
      <select className="form-select" value={newUser.majorId}
        onChange={e => setNewUser(p => ({ ...p, majorId: Number(e.target.value), classId: 0 }))}>
        <option value={0}>Select major...</option>
        {majors.map(m => <option key={m.major_id} value={m.major_id}>{m.major_name}</option>)}
      </select>
    </div>
    <div className="form-group">
      <label className="form-label">Class</label>
      <select className="form-select" value={newUser.classId}
        onChange={e => setNewUser(p => ({ ...p, classId: Number(e.target.value) }))}>
        <option value={0}>Select class...</option>
        {filteredClasses.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
      </select>
    </div>
    <div className="form-group">
      <label className="form-label">Year of Study</label>
      <select className="form-select" value={newUser.yearOfStudy}
        onChange={e => setNewUser(p => ({ ...p, yearOfStudy: Number(e.target.value) }))}>
        {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
      </select>
    </div>
  </>
)}

{newUser.roleId === 2 && (
  <div className="form-group">
    <label className="form-label">Assigned Major <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
    <select className="form-select" value={newUser.majorId}
      onChange={e => setNewUser(p => ({ ...p, majorId: Number(e.target.value) }))}>
      <option value={0}>No major assigned</option>
      {majors.map(m => <option key={m.major_id} value={m.major_id}>{m.major_name}</option>)}
    </select>
  </div>
)}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create User</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {modal === 'class' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="card" style={{ width: 420, padding: '2rem', borderRadius: 'var(--radius-2xl)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Create New Class</h3>
            {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
            <form onSubmit={handleCreateClass}>
              <div className="form-group">
                <label className="form-label">Class Name</label>
                <input className="form-input" required placeholder="CS-2024-A"
                  value={newClass.className} onChange={e => setNewClass(p => ({ ...p, className: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Major</label>
                <select className="form-select" value={newClass.majorId}
                  onChange={e => setNewClass(p => ({ ...p, majorId: Number(e.target.value) }))}>
                  <option value={0}>Select major...</option>
                  {majors.map(m => <option key={m.major_id} value={m.major_id}>{m.major_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year of Study</label>
                <select className="form-select" value={newClass.yearOfStudy}
                  onChange={e => setNewClass(p => ({ ...p, yearOfStudy: Number(e.target.value) }))}>
                  {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Class</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Major Modal */}
      {modal === 'major' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="card" style={{ width: 400, padding: '2rem', borderRadius: 'var(--radius-2xl)' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Create New Major</h3>
            {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
            <form onSubmit={handleCreateMajor}>
              <div className="form-group">
                <label className="form-label">Major Name</label>
                <input className="form-input" required placeholder="Computer Science"
                  value={newMajor.majorName} onChange={e => setNewMajor({ majorName: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Major</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Modal */}
      {modal === 'csv' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="card" style={{ width: 500, padding: '2rem', borderRadius: 'var(--radius-2xl)' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Bulk Upload Users via CSV</h3>
            <div className="tabs">
              {(['upload', 'format'] as const).map(t => (
                <button key={t} className={`tab ${csvTab === t ? 'active' : ''}`} onClick={() => setCsvTab(t)}>
                  {t === 'upload' ? 'Upload File' : 'CSV Format'}
                </button>
              ))}
            </div>
            {csvTab === 'upload' && (
              <>
                <div style={{ border: '2px dashed var(--gray-300)', borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'var(--gray-50)' }}
                  onClick={() => document.getElementById('csv-file-input')?.click()}>
                  <div style={{ fontSize: '2rem' }}>📂</div>
                  <strong style={{ color: 'var(--gray-700)' }}>Click to upload or drag & drop</strong>
                  <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Accepts .csv files only</p>
                  <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleFileInput(e.target.files[0]); }} />
                </div>
                {csvRows.length > 0 && (
                  <div style={{ marginTop: '1rem', maxHeight: 160, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                      <thead style={{ background: 'var(--gray-50)' }}>
                        <tr>{['Name', 'Email', 'Role', 'Major', 'Class', 'Year'].map(h => <th key={h} style={{ padding: '0.4rem 0.75rem', textAlign: 'left' }}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {csvRows.map((r, i) => (
                          <tr key={i}>
                            <td style={{ padding: '0.4rem 0.75rem' }}>{r.full_name}</td>
                            <td style={{ padding: '0.4rem 0.75rem' }}>{r.email}</td>
                            <td style={{ padding: '0.4rem 0.75rem' }}>{r.role}</td>
                            <td style={{ padding: '0.4rem 0.75rem' }}>{r.major || '—'}</td>
                            <td style={{ padding: '0.4rem 0.75rem' }}>{r.class || '—'}</td>
                            <td style={{ padding: '0.4rem 0.75rem' }}>{r.year || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {csvReady && <div className="alert alert-success" style={{ marginTop: '0.75rem' }}>{csvRows.length} user(s) ready to import</div>}
              </>
            )}
            {csvTab === 'format' && (
              <>
                <div className="alert alert-info" style={{ marginBottom: '1rem' }}>Required and optional columns:</div>
                <table style={{ width: '100%', fontSize: '0.85rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--gray-50)' }}>
                    <tr>{['Column', 'Required', 'Example'].map(h => <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left' }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {[
                      ['full_name', true, 'Ahmed Naser'],
                      ['email', true, 'ahmed@uni.edu'],
                      ['password', true, 'Pass1234!'],
                      ['role', true, 'Student / Instructor / Admin'],
                      ['major', false, 'Computer Science'],
                      ['class', false, 'CS-2024-A'],
                      ['year', false, '2'],
                    ].map(([col, req, ex]) => (
                      <tr key={col as string}>
                        <td style={{ padding: '0.5rem 1rem' }}><code>{col}</code></td>
                        <td style={{ padding: '0.5rem 1rem' }}><span className={`badge ${req ? 'badge-success' : 'badge-warning'}`}>{req ? 'Yes' : 'Optional'}</span></td>
                        <td style={{ padding: '0.5rem 1rem', color: 'var(--gray-500)' }}>{ex as string}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!csvReady} onClick={handleBulkUpload}>
                Upload {csvRows.length > 0 ? `${csvRows.length} Users` : 'Users'}
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}