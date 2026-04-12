'use client';
import { useEffect, useState } from 'react';
import { getCurrentUserWithRole, signOut } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css';
import '../styles/components.css';

type Exam = {
  exam_id: number;
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
  question_count?: number;
  student_count?: number;
};

function getExamStatus(start: string, end: string): { label: string; className: string } {
  const now = new Date();
  if (new Date(start) > now) return { label: 'Upcoming', className: 'badge-blue' };
  if (new Date(end) > now) return { label: 'Active', className: 'badge-success' };
  return { label: 'Ended', className: 'badge-danger' };
}

export function InstructorDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ msg: string; type: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [newExam, setNewExam] = useState({
    title: '', description: '', duration_minutes: 60,
    start_time: '', end_time: '',
  });

  useEffect(() => {
    getCurrentUserWithRole().then(u => {
      if (!u || u.role !== 'Instructor') window.location.href = '/';
      else setCurrentUser(u);
    });
  }, []);

  useEffect(() => {
    if (currentUser) fetchExams();
  }, [currentUser]);

 async function fetchExams() {
  console.log('Fetching exams for user:', currentUser.userId);
  const { data, error } = await supabase
    .from('exams')
    .select('exam_id, title, description, duration_minutes, start_time, end_time')
    .eq('created_by', currentUser.userId)
    .order('created_at', { ascending: false });

  console.log('Exams data:', data);
  console.log('Exams error:', error);
      

    if (!data) { setLoading(false); return; }

    // Enrich with counts
    const enriched = await Promise.all(data.map(async exam => {
      const [{ count: qCount }, { count: sCount }] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('exam_id', exam.exam_id),
        supabase.from('exam_assignments').select('*', { count: 'exact', head: true }).eq('exam_id', exam.exam_id),
      ]);
      return { ...exam, question_count: qCount || 0, student_count: sCount || 0 };
    }));

    setExams(enriched);
    setLoading(false);
    
  }

  function showAlert(msg: string, type: string) {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  }

  async function handleCreateExam(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!newExam.start_time || !newExam.end_time) { setFormError('Start and end time are required.'); return; }
    if (new Date(newExam.end_time) <= new Date(newExam.start_time)) { setFormError('End time must be after start time.'); return; }
    setCreating(true);

    const { error } = await supabase.from('exams').insert({
      ...newExam,
      created_by: currentUser.userId,
    });

    setCreating(false);
    if (error) { setFormError(error.message); return; }
    setShowCreate(false);
    setNewExam({ title: '', description: '', duration_minutes: 60, start_time: '', end_time: '' });
    fetchExams();
    showAlert('Exam created successfully.', 'success');
  }

  async function handleDeleteExam(examId: number, title: string) {
    if (!confirm(`Delete "${title}"? This will remove all questions and assignments.`)) return;
    await supabase.from('exams').delete().eq('exam_id', examId);
    fetchExams();
    showAlert(`Exam "${title}" deleted.`, 'success');
  }

  if (!currentUser) return <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Loading...</div>;

  return (
    <div className="app-wrapper">
      {/* Navbar */}
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
          <span className="role-badge">👩‍🏫 Instructor</span>
          <div className="avatar">{currentUser.fullName[0]}</div>
          <button className="btn btn-danger btn-sm" onClick={signOut}>Logout</button>
        </div>
      </nav>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Exams', value: exams.length, color: 'var(--primary-blue)' },
          { label: 'Active Now', value: exams.filter(e => getExamStatus(e.start_time, e.end_time).label === 'Active').length, color: 'var(--success)' },
          { label: 'Upcoming', value: exams.filter(e => getExamStatus(e.start_time, e.end_time).label === 'Upcoming').length, color: 'var(--warning)' },
          { label: 'Ended', value: exams.filter(e => getExamStatus(e.start_time, e.end_time).label === 'Ended').length, color: 'var(--gray-500)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 500, marginBottom: '0.4rem' }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1rem' }}>{alert.msg}</div>}

      {/* Exam List */}
      <div className="card">
        <div className="card-header">
          <h3>📋 My Exams</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ New Exam</button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Loading exams...</p>
        ) : exams.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <p style={{ fontWeight: 600, color: 'var(--gray-600)' }}>No exams yet</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Create your first exam to get started.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {['Exam', 'Status', 'Duration', 'Questions', 'Students', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--gray-200)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => {
                const status = getExamStatus(exam.start_time, exam.end_time);
                return (
                  <tr key={exam.exam_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{exam.title}</div>
                      {exam.description && <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>{exam.description}</div>}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-600)' }}>{exam.duration_minutes} min</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-600)' }}>{exam.question_count}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-600)' }}>{exam.student_count}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-primary"
                          onClick={() => window.location.href = `/dashboard/instructor/exam/${exam.exam_id}`}>
                          Manage
                        </button>
                        <button className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteExam(exam.exam_id, exam.title)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Exam Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}>
          <div className="card" style={{ width: 500, padding: '2rem', borderRadius: 'var(--radius-2xl)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Create New Exam</h3>
            {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
            <form onSubmit={handleCreateExam}>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" required placeholder="Midterm Exam - Chapter 1-5"
                  value={newExam.title} onChange={e => setNewExam(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="form-input" rows={3} placeholder="Covers topics from weeks 1 to 5..."
                  style={{ resize: 'vertical' }}
                  value={newExam.description} onChange={e => setNewExam(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min={5} max={300} required
                  value={newExam.duration_minutes} onChange={e => setNewExam(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input className="form-input" type="datetime-local" required
                  value={newExam.start_time} onChange={e => setNewExam(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End Time</label>
                <input className="form-input" type="datetime-local" required
                  value={newExam.end_time} onChange={e => setNewExam(p => ({ ...p, end_time: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Exam'}
                </button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}