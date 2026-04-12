'use client';
import { useEffect, useState } from 'react';
import { getCurrentUserWithRole, signOut } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css';
import '../styles/components.css';

type Attempt = {
  attempt_id: number;
  student_id: string;
  start_time: string;
  end_time: string;
  is_submitted: boolean;
  student_name: string;
  class_name: string;
  auto_score: number;
  total_possible: number;
  graded: boolean;
};

type Answer = {
  answer_id: number;
  question_id: number;
  question_text: string;
  question_type: string;
  marks: number;
  selected_choice: number | null;
  answer_text: string | null;
  marks_awarded: number;
  is_correct?: boolean;
  correct_choice_text?: string;
  selected_choice_text?: string;
};

export function GradingPage({ examId }: { examId: number }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [examTitle, setExamTitle] = useState('');
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [essayMarks, setEssayMarks] = useState<Record<number, number>>({});
  const [instructorNotes, setInstructorNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    getCurrentUserWithRole().then(u => {
      if (!u || u.role !== 'Instructor') window.location.href = '/';
      else setCurrentUser(u);
    });
  }, []);

  useEffect(() => {
    if (currentUser) { fetchExam(); fetchAttempts(); }
  }, [currentUser]);

  async function fetchExam() {
    const { data } = await supabase.from('exams').select('title').eq('exam_id', examId).single();
    if (data) setExamTitle(data.title);
  }

  async function fetchAttempts() {
    const { data: attemptsData } = await supabase
      .from('exam_attempts')
      .select('attempt_id, student_id, start_time, end_time, is_submitted')
      .eq('exam_id', examId)
      .eq('is_submitted', true);

    if (!attemptsData || attemptsData.length === 0) { setLoading(false); return; }

    const enriched = await Promise.all(attemptsData.map(async attempt => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, class_id, classes(class_name)')
        .eq('user_id', attempt.student_id)
        .single();

      const { data: result } = await supabase
        .from('results')
        .select('total_marks, graded')
        .eq('attempt_id', attempt.attempt_id)
        .single();

      const { data: questions } = await supabase
        .from('questions')
        .select('marks')
        .eq('exam_id', examId);

      const totalPossible = (questions || []).reduce((sum, q) => sum + q.marks, 0);

      return {
        ...attempt,
        student_name: profile?.full_name || 'Unknown',
        class_name: (profile?.classes as any)?.class_name || '—',
        auto_score: result?.total_marks || 0,
        total_possible: totalPossible,
        graded: result?.graded || false,
      };
    }));

    setAttempts(enriched);
    setLoading(false);
  }

  async function fetchAnswers(attempt: Attempt) {
    setSelectedAttempt(attempt);
    setAnswers([]);
    setEssayMarks({});
    setInstructorNotes('');

    const { data: result } = await supabase
      .from('results')
      .select('instructor_notes')
      .eq('attempt_id', attempt.attempt_id)
      .single();

    if (result?.instructor_notes) setInstructorNotes(result.instructor_notes);

    const { data: answersData } = await supabase
      .from('answers')
      .select('answer_id, question_id, selected_choice, answer_text, marks_awarded')
      .eq('attempt_id', attempt.attempt_id);

    const { data: questionsData } = await supabase
      .from('questions')
      .select('question_id, question_text, question_type, marks, choices(choice_id, choice_text, is_correct)')
      .eq('exam_id', examId);

    const enrichedAnswers: Answer[] = (questionsData || []).map(q => {
      const answer = (answersData || []).find(a => a.question_id === q.question_id);
      const choices = (q.choices as any[]) || [];
      const correctChoice = choices.find(c => c.is_correct);
      const selectedChoice = choices.find(c => c.choice_id === answer?.selected_choice);
      const isCorrect = selectedChoice?.is_correct || false;

      return {
        answer_id: answer?.answer_id || 0,
        question_id: q.question_id,
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        selected_choice: answer?.selected_choice || null,
        answer_text: answer?.answer_text || null,
        marks_awarded: answer?.marks_awarded || 0,
        is_correct: isCorrect,
        correct_choice_text: correctChoice?.choice_text || '',
        selected_choice_text: selectedChoice?.choice_text || '',
      };
    });

    setAnswers(enrichedAnswers);

    const initialMarks: Record<number, number> = {};
    enrichedAnswers.filter(a => a.question_type === 'ESSAY').forEach(a => {
      initialMarks[a.question_id] = a.marks_awarded;
    });
    setEssayMarks(initialMarks);
  }

  async function handleSaveGrades() {
    if (!selectedAttempt) return;
    setSaving(true);

    for (const answer of answers) {
      if (answer.question_type === 'ESSAY') {
        const awarded = essayMarks[answer.question_id] ?? 0;
        await supabase
          .from('answers')
          .update({ marks_awarded: awarded })
          .eq('answer_id', answer.answer_id);
      }
    }

    const totalMarks = answers.reduce((sum, a) => {
      if (a.question_type === 'ESSAY') return sum + (essayMarks[a.question_id] ?? 0);
      return sum + a.marks_awarded;
    }, 0);

    await supabase
      .from('results')
      .update({ total_marks: totalMarks, graded: true, graded_at: new Date().toISOString(), instructor_notes: instructorNotes })
      .eq('attempt_id', selectedAttempt.attempt_id);

    setSaving(false);
    setSelectedAttempt(null);
    fetchAttempts();
    showAlert('Grades saved successfully.', 'success');
  }

  function showAlert(msg: string, type: string) {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 3000);
  }

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
          <span className="role-badge">👩‍🏫 Instructor</span>
          <div className="avatar">{currentUser.fullName[0]}</div>
          <button className="btn btn-danger btn-sm" onClick={signOut}>Logout</button>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="breadcrumb" style={{ marginBottom: '1.5rem' }}>
        <span className="breadcrumb-item" style={{ cursor: 'pointer', color: 'var(--primary-blue)' }}
          onClick={() => window.location.href = '/dashboard/instructor'}>My Exams</span>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-item" style={{ cursor: 'pointer', color: 'var(--primary-blue)' }}
          onClick={() => window.location.href = `/dashboard/instructor/exam/${examId}`}>{examTitle}</span>
        <span className="breadcrumb-separator">›</span>
        <span className="breadcrumb-item active">Grading</span>
      </div>

      {alert && <div className={`alert alert-${alert.type}`} style={{ marginBottom: '1rem' }}>{alert.msg}</div>}

      {/* Attempts List */}
      {!selectedAttempt && (
        <div className="card">
          <div className="card-header">
            <h3>📋 Submitted Attempts</h3>
            <span className="badge badge-blue">{attempts.length} submission{attempts.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Loading attempts...</p>
          ) : attempts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p style={{ fontWeight: 600, color: 'var(--gray-600)' }}>No submissions yet</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Students haven't submitted this exam yet.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {['Student', 'Class', 'Submitted At', 'Score', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid var(--gray-200)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attempts.map(a => (
                  <tr key={a.attempt_id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{a.student_name}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)' }}>{a.class_name}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--gray-500)', fontSize: '0.85rem' }}>
                      {a.end_time ? new Date(a.end_time).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <strong style={{ color: 'var(--primary-blue)' }}>{a.auto_score}</strong>
                      <span style={{ color: 'var(--gray-400)' }}> / {a.total_possible}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span className={`badge ${a.graded ? 'badge-success' : 'badge-warning'}`}>
                        {a.graded ? 'Graded' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => fetchAnswers(a)}>
                        {a.graded ? 'Review' : 'Grade'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Grading View */}
      {selectedAttempt && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ marginBottom: '0.25rem' }}>{selectedAttempt.student_name}</h3>
                <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>{selectedAttempt.class_name}</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedAttempt(null)}>← Back to Attempts</button>
            </div>
          </div>

          {/* Answers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {answers.map((a, i) => (
              <div key={a.question_id} className="card" style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--gray-400)', fontSize: '0.85rem' }}>Q{i + 1}</span>
                  <span className={`badge ${a.question_type === 'MCQ' ? 'badge-blue' : a.question_type === 'TRUE_FALSE' ? 'badge-orange' : 'badge-purple'}`}>
                    {a.question_type === 'TRUE_FALSE' ? 'True/False' : a.question_type}
                  </span>
                  <span className="badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-600)' }}>{a.marks} mark{a.marks !== 1 ? 's' : ''}</span>
                  {a.question_type !== 'ESSAY' && (
                    <span className={`badge ${a.is_correct ? 'badge-success' : 'badge-danger'}`}>
                      {a.is_correct ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  )}
                </div>

                <p style={{ fontWeight: 500, marginBottom: '0.75rem' }}>{a.question_text}</p>

                {a.question_type !== 'ESSAY' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                      <span style={{ fontWeight: 600 }}>Student answered: </span>
                      <span style={{ color: a.is_correct ? 'var(--success)' : 'var(--danger)' }}>
                        {a.selected_choice_text || 'No answer'}
                      </span>
                    </div>
                    {!a.is_correct && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
                        <span style={{ fontWeight: 600 }}>Correct answer: </span>
                        <span style={{ color: 'var(--success)' }}>{a.correct_choice_text}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary-blue)' }}>
                      Marks: {a.marks_awarded} / {a.marks}
                    </div>
                  </div>
                )}

                {a.question_type === 'ESSAY' && (
                  <div>
                    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--gray-700)', minHeight: 80 }}>
                      {a.answer_text || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>No answer provided</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                        Marks awarded (max {a.marks}):
                      </label>
                      <input
                        type="number" min={0} max={a.marks}
                        className="form-input"
                        style={{ width: 100 }}
                        value={essayMarks[a.question_id] ?? 0}
                        onChange={e => setEssayMarks(p => ({ ...p, [a.question_id]: Math.min(a.marks, Math.max(0, Number(e.target.value))) }))}
                      />
                      <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>/ {a.marks}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Instructor Notes + Save */}
          <div className="card">
            <div className="card-header">
              <h3>📝 Instructor Notes</h3>
            </div>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Optional notes for the student..."
              style={{ resize: 'vertical', marginBottom: '1rem' }}
              value={instructorNotes}
              onChange={e => setInstructorNotes(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveGrades} disabled={saving}>
                {saving ? 'Saving...' : 'Save Grades'}
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedAttempt(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}