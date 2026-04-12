'use client';
import { useEffect, useState } from 'react';
import { getCurrentUserWithRole } from '../lib/auth';
import { signOut } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css';
import '../styles/components.css';

type Question = {
  question_id: number;
  question_text: string;
  question_type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
  marks: number;
  choices?: Choice[];
};

type Choice = {
  choice_id: number;
  choice_text: string;
  is_correct: boolean;
};

type Student = {
  user_id: string;
  full_name: string;
  assigned: boolean;
};

type Exam = {
  exam_id: number;
  title: string;
  description: string;
  duration_minutes: number;
  start_time: string;
  end_time: string;
};

export function ExamManager({ examId }: { examId: number }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [tab, setTab] = useState<'questions' | 'students' | 'attempts'>('questions');
  const [alert, setAlert] = useState<{ msg: string; type: string } | null>(null);
  const [showAddQ, setShowAddQ] = useState(false);
  const [savingQ, setSavingQ] = useState(false);
  const [formError, setFormError] = useState('');

  const [newQ, setNewQ] = useState({
    question_text: '',
    question_type: 'MCQ' as 'MCQ' | 'TRUE_FALSE' | 'ESSAY',
    marks: 1,
    choices: [
      { choice_text: '', is_correct: false },
      { choice_text: '', is_correct: false },
      { choice_text: '', is_correct: false },
      { choice_text: '', is_correct: false },
    ],
  });

  useEffect(() => {
    getCurrentUserWithRole().then(u => {
      if (!u || u.role !== 'Instructor') window.location.href = '/';
      else setCurrentUser(u);
    });
  }, []);

  useEffect(() => {
    if (currentUser) { fetchExam(); fetchQuestions(); fetchStudents(); }
  }, [currentUser]);

  async function fetchExam() {
    const { data } = await supabase.from('exams').select('*').eq('exam_id', examId).single();
    setExam(data);
  }

  async function fetchQuestions() {
    const { data } = await supabase
      .from('questions')
      .select('question_id, question_text, question_type, marks, choices(choice_id, choice_text, is_correct)')
      .eq('exam_id', examId)
      .order('question_id');
    setQuestions(data || []);
  }

  async function fetchStudents() {
  const { data: allClasses } = await supabase
    .from('classes')
    .select('class_id, class_name, year_of_study, major_id, majors(major_name)');

  const { data: assigned } = await supabase
    .from('exam_class_assignments')
    .select('class_id')
    .eq('exam_id', examId);

  const assignedIds = new Set((assigned || []).map(a => a.class_id));

  setStudents((allClasses || []).map((c: any) => ({
    user_id: String(c.class_id),
    full_name: `${c.class_name} — ${c.majors?.major_name || ''} (Year ${c.year_of_study})`,
    assigned: assignedIds.has(c.class_id),
  })));
}

  function showAlert(msg: string, type: string) {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  }

  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (newQ.question_type === 'MCQ') {
      const hasCorrect = newQ.choices.some(c => c.is_correct);
      const allFilled = newQ.choices.every(c => c.choice_text.trim());
      if (!allFilled) { setFormError('All 4 choices must be filled in.'); return; }
      if (!hasCorrect) { setFormError('Mark at least one correct answer.'); return; }
    }

    setSavingQ(true);
    const { data: qData, error } = await supabase
      .from('questions')
      .insert({ exam_id: examId, question_text: newQ.question_text, question_type: newQ.question_type, marks: newQ.marks })
      .select()
      .single();

    if (error || !qData) { setFormError(error?.message || 'Failed to save question.'); setSavingQ(false); return; }

    if (newQ.question_type === 'MCQ') {
      await supabase.from('choices').insert(
        newQ.choices.map(c => ({ question_id: qData.question_id, choice_text: c.choice_text, is_correct: c.is_correct }))
      );
    } else if (newQ.question_type === 'TRUE_FALSE') {
      await supabase.from('choices').insert([
        { question_id: qData.question_id, choice_text: 'True', is_correct: newQ.choices[0].is_correct },
        { question_id: qData.question_id, choice_text: 'False', is_correct: !newQ.choices[0].is_correct },
      ]);
    }

    setSavingQ(false);
    setShowAddQ(false);
    resetForm();
    fetchQuestions();
    showAlert('Question added.', 'success');
  }

  async function handleDeleteQuestion(questionId: number) {
    if (!confirm('Delete this question?')) return;
    await supabase.from('questions').delete().eq('question_id', questionId);
    fetchQuestions();
    showAlert('Question deleted.', 'success');
  }

  async function toggleAssignment(classId: string, assigned: boolean) {
  if (assigned) {
    await supabase.from('exam_class_assignments')
      .delete()
      .eq('exam_id', examId)
      .eq('class_id', Number(classId));
  } else {
    await supabase.from('exam_class_assignments')
      .insert({ exam_id: examId, class_id: Number(classId) });
  }
  fetchStudents();
}

async function assignAll() {
  const unassigned = students.filter(s => !s.assigned);
  await supabase.from('exam_class_assignments').insert(
    unassigned.map(s => ({ exam_id: examId, class_id: Number(s.user_id) }))
  );
  fetchStudents();
  showAlert('All classes assigned.', 'success');
}

  function resetForm() {
    setNewQ({
      question_text: '',
      question_type: 'MCQ',
      marks: 1,
      choices: [
        { choice_text: '', is_correct: false },
        { choice_text: '', is_correct: false },
        { choice_text: '', is_correct: false },
        { choice_text: '', is_correct: false },
      ],
    });
    setFormError('');
  }

  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  if (!currentUser || !exam) return <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Loading...</div>;

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

      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ marginBottom: '1.5rem' }}>
        <span className="breadcrumb-item" style={{ cursor: 'pointer', color: 'var(--primary-blue)' }}
          onClick={() => window.location.href = '/dashboard/instructor'}>
          My Exams
        </span>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-item active">{exam.title}</span>
      </div>

      {/* Exam Info */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.4rem' }}>{exam.title}</h3>
            {exam.description && <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{exam.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Duration', value: `${exam.duration_minutes} min` },
              { label: 'Questions', value: questions.length },
              { label: 'Total Marks', value: totalMarks },
              { label: 'Students', value: students.filter(s => s.assigned).length },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-blue)' }}>{s.value}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: '0.2rem' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1rem' }}>{alert.msg}</div>}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
          Questions ({questions.length})
        </button>
        <button className={`tab ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
          Assigned Classes ({students.filter(s => s.assigned).length})
        </button>
        <button className={`tab ${tab === 'attempts' ? 'active' : ''}`} onClick={() => setTab('attempts')}>
          Attempts
        </button>
      </div>

      {/* Questions Tab */}
      {tab === 'questions' && (
        <div className="card">
          <div className="card-header">
            <h3>📝 Questions</h3>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddQ(true); resetForm(); }}>
              + Add Question
            </button>
          </div>

          {questions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❓</div>
              <p style={{ fontWeight: 600, color: 'var(--gray-600)' }}>No questions yet</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Add your first question to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {questions.map((q, i) => (
                <div key={q.question_id} style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--gray-400)', fontSize: '0.85rem' }}>Q{i + 1}</span>
                        <span className={`badge ${q.question_type === 'MCQ' ? 'badge-blue' : q.question_type === 'TRUE_FALSE' ? 'badge-orange' : 'badge-purple'}`}>
                          {q.question_type === 'TRUE_FALSE' ? 'True/False' : q.question_type}
                        </span>
                        <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                      </div>
                      <p style={{ color: 'var(--gray-800)', fontWeight: 500 }}>{q.question_text}</p>
                      {q.choices && q.choices.length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {q.choices.map(c => (
                            <div key={c.choice_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                              <span style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${c.is_correct ? 'var(--success)' : 'var(--gray-300)'}`, background: c.is_correct ? 'var(--success)' : 'transparent', display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ color: c.is_correct ? 'var(--success)' : 'var(--gray-600)', fontWeight: c.is_correct ? 600 : 400 }}>{c.choice_text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteQuestion(q.question_id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Students Tab */}
      {tab === 'students' && (
  <div className="card">
    <div className="card-header">
      <h3>🏫 Assign Classes</h3>
      <button className="btn btn-outline btn-sm" onClick={assignAll}
        disabled={students.every(s => s.assigned)}>
        Assign All
      </button>
    </div>

    {students.length === 0 ? (
      <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-400)' }}>
        No classes found. Create classes in the Admin dashboard first.
      </p>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--gray-50)' }}>
            {['Class', 'Status', 'Action'].map(h => (
              <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--gray-200)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.user_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
              <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{s.full_name}</td>
              <td style={{ padding: '0.875rem 1rem' }}>
                <span className={`badge ${s.assigned ? 'badge-success' : 'badge-danger'}`}>
                  {s.assigned ? 'Assigned' : 'Not Assigned'}
                </span>
              </td>
              <td style={{ padding: '0.875rem 1rem' }}>
                <button className={`btn btn-sm ${s.assigned ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => toggleAssignment(s.user_id, s.assigned)}>
                  {s.assigned ? 'Remove' : 'Assign'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
      {tab === 'attempts' && (
        <div className="card">
          <div className="card-header">
            <h3>📋 Submitted Attempts</h3>
          </div>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>
            <a href={`/dashboard/instructor/exam/${examId}/attempts`}
              style={{ color: 'var(--primary-blue)', fontWeight: 600 }}>
              Open Grading Page →
            </a>
          </p>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddQ && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddQ(false); }}>
          <div className="card" style={{ width: 560, padding: '2rem', borderRadius: 'var(--radius-2xl)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Add Question</h3>
            {formError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{formError}</div>}
            <form onSubmit={handleAddQuestion}>
              <div className="form-group">
                <label className="form-label">Question Type</label>
                <select className="form-select" value={newQ.question_type}
                  onChange={e => { setNewQ(p => ({ ...p, question_type: e.target.value as any })); setFormError(''); }}>
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="TRUE_FALSE">True / False</option>
                  <option value="ESSAY">Essay</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea className="form-input" rows={3} required style={{ resize: 'vertical' }}
                  placeholder="Enter your question here..."
                  value={newQ.question_text}
                  onChange={e => setNewQ(p => ({ ...p, question_text: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Marks</label>
                <input className="form-input" type="number" min={1} max={100} required
                  value={newQ.marks} onChange={e => setNewQ(p => ({ ...p, marks: Number(e.target.value) }))} />
              </div>

              {/* MCQ Choices */}
              {newQ.question_type === 'MCQ' && (
                <div className="form-group">
                  <label className="form-label">Choices (check the correct answer)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {newQ.choices.map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input type="checkbox" checked={c.is_correct} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary-blue)' }}
                          onChange={e => setNewQ(p => ({ ...p, choices: p.choices.map((ch, idx) => idx === i ? { ...ch, is_correct: e.target.checked } : ch) }))} />
                        <input className="form-input" style={{ flex: 1 }} placeholder={`Choice ${i + 1}`}
                          value={c.choice_text}
                          onChange={e => setNewQ(p => ({ ...p, choices: p.choices.map((ch, idx) => idx === i ? { ...ch, choice_text: e.target.value } : ch) }))} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* True/False */}
              {newQ.question_type === 'TRUE_FALSE' && (
                <div className="form-group">
                  <label className="form-label">Correct Answer</label>
                  <select className="form-select"
                    value={newQ.choices[0].is_correct ? 'true' : 'false'}
                    onChange={e => setNewQ(p => ({ ...p, choices: [{ ...p.choices[0], is_correct: e.target.value === 'true' }, ...p.choices.slice(1)] }))}>
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </div>
              )}

              {newQ.question_type === 'ESSAY' && (
                <div className="alert alert-info" style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
                  Essay questions are manually graded by the instructor after submission.
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={savingQ}>
                  {savingQ ? 'Saving...' : 'Add Question'}
                </button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowAddQ(false)}>
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