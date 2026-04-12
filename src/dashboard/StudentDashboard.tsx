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
  attempt_status: 'not_started' | 'in_progress' | 'submitted';
  result?: { total_marks: number; graded: boolean };
  total_possible?: number;
};

function getExamStatus(start: string, end: string) {
  const now = new Date();
  if (new Date(start) > now) return { label: 'Upcoming', className: 'badge-blue' };
  if (new Date(end) > now) return { label: 'Active', className: 'badge-success' };
  return { label: 'Ended', className: 'badge-danger' };
}

export function StudentDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUserWithRole().then(u => {
      if (!u || u.role !== 'Student') window.location.href = '/';
      else setCurrentUser(u);
    });
  }, []);

  useEffect(() => {
    if (currentUser) fetchData();
  }, [currentUser]);

  async function fetchData() {
    // Fetch profile with major, class, year
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, year_of_study, majors(major_name), classes(class_name)')
      .eq('user_id', currentUser.userId)
      .single();

    setProfile(profileData);

    // Fetch assigned exams via class
    const { data: classData } = await supabase
      .from('profiles')
      .select('class_id')
      .eq('user_id', currentUser.userId)
      .single();

    if (!classData?.class_id) { setLoading(false); return; }

    const { data: assignments } = await supabase
      .from('exam_class_assignments')
      .select('exam_id')
      .eq('class_id', classData.class_id);

    if (!assignments || assignments.length === 0) { setLoading(false); return; }

    const examIds = assignments.map(a => a.exam_id);

    const { data: examsData } = await supabase
      .from('exams')
      .select('exam_id, title, description, duration_minutes, start_time, end_time')
      .in('exam_id', examIds)
      .order('start_time', { ascending: true });

    if (!examsData) { setLoading(false); return; }

    // Enrich with attempt status and results
    const enriched = await Promise.all(examsData.map(async exam => {
      const { data: attempt } = await supabase
        .from('exam_attempts')
        .select('attempt_id, is_submitted')
        .eq('exam_id', exam.exam_id)
        .eq('student_id', currentUser.userId)
        .single();

      let result = undefined;
      if (attempt?.is_submitted) {
        const { data: resultData } = await supabase
          .from('results')
          .select('total_marks, graded')
          .eq('attempt_id', attempt.attempt_id)
          .single();
        result = resultData || undefined;
      }

      const { data: questions } = await supabase
        .from('questions')
        .select('marks')
        .eq('exam_id', exam.exam_id);

      const totalPossible = (questions || []).reduce((sum, q) => sum + q.marks, 0);

      return {
        ...exam,
        attempt_status: !attempt ? 'not_started' : attempt.is_submitted ? 'submitted' : 'in_progress',
        result: result,
        total_possible: totalPossible,
      } as Exam;
    }));

    setExams(enriched);
    setLoading(false);
  }

  if (!currentUser) return <div style={{ padding: '2rem', fontFamily: 'var(--font-sans)' }}>Loading...</div>;

  const activeExams = exams.filter(e => getExamStatus(e.start_time, e.end_time).label === 'Active');
  const upcomingExams = exams.filter(e => getExamStatus(e.start_time, e.end_time).label === 'Upcoming');
  const endedExams = exams.filter(e => getExamStatus(e.start_time, e.end_time).label === 'Ended');

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
          <span className="role-badge">📘 Student</span>
          <div className="avatar">{currentUser.fullName[0]}</div>
          <button className="btn btn-danger btn-sm" onClick={signOut}>Logout</button>
        </div>
      </nav>

      {/* Student Info Card */}
      {profile && (
        <div className="card" style={{ marginBottom: '2rem', background: 'linear-gradient(135deg, var(--primary-blue), var(--primary-dark))', color: 'white', border: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                {currentUser.fullName[0]}
              </div>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{currentUser.fullName}</div>
                <div style={{ opacity: 0.85, fontSize: '0.9rem', marginTop: '0.2rem' }}>{currentUser.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Major', value: (profile.majors as any)?.major_name || '—' },
                { label: 'Class', value: (profile.classes as any)?.class_name || '—' },
                { label: 'Year', value: profile.year_of_study ? `Year ${profile.year_of_study}` : '—' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{s.value}</div>
                  <div style={{ opacity: 0.75, fontSize: '0.75rem', marginTop: '0.2rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Exams', value: exams.length, color: 'var(--primary-blue)' },
          { label: 'Active Now', value: activeExams.length, color: 'var(--success)' },
          { label: 'Upcoming', value: upcomingExams.length, color: 'var(--warning)' },
          { label: 'Completed', value: exams.filter(e => e.attempt_status === 'submitted').length, color: 'var(--gray-600)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: 0 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 500, marginBottom: '0.4rem' }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Exams */}
      <div className="card">
        <div className="card-header">
          <h3>📚 My Exams</h3>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>Loading exams...</p>
        ) : exams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p style={{ fontWeight: 600, color: 'var(--gray-600)' }}>No exams assigned yet</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Your instructor hasn't assigned any exams to your class.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {exams.map(exam => {
              const status = getExamStatus(exam.start_time, exam.end_time);
              const canStart = status.label === 'Active' && exam.attempt_status === 'not_started';

              return (
                <div key={exam.exam_id} style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', transition: 'all 250ms ease' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)' }}>{exam.title}</span>
                      <span className={`badge ${status.className}`}>{status.label}</span>
                      {exam.attempt_status === 'submitted' && <span className="badge badge-success">✓ Submitted</span>}
                      {exam.attempt_status === 'in_progress' && <span className="badge badge-warning">In Progress</span>}
                    </div>
                    {exam.description && (
                      <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{exam.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--gray-400)', flexWrap: 'wrap' }}>
                      <span>⏱ {exam.duration_minutes} min</span>
                      <span>📅 {new Date(exam.start_time).toLocaleString()}</span>
                      <span>🏁 {new Date(exam.end_time).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {exam.attempt_status === 'submitted' && exam.result && (
                      <div style={{ textAlign: 'center' }}>
                        {exam.result.graded ? (
                          <>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                              {exam.result.total_marks}<span style={{ fontSize: '1rem', color: 'var(--gray-400)' }}>/{exam.total_possible}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>Final Score</div>
                          </>
                        ) : (
                          <span className="badge badge-warning">Awaiting Grade</span>
                        )}
                      </div>
                    )}
                    {canStart && (
                      <button className="btn btn-primary"
                        onClick={() => window.location.href = `/dashboard/student/exam/${exam.exam_id}`}>
                        Start Exam →
                      </button>
                    )}
                    {exam.attempt_status === 'submitted' && exam.result?.graded && (
                      <button className="btn btn-outline btn-sm"
                        onClick={() => window.location.href = `/dashboard/student/exam/${exam.exam_id}/results`}>
                        View Results
                      </button>
                    )}
                    {status.label === 'Upcoming' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>Not available yet</span>
                    )}
                    {status.label === 'Ended' && exam.attempt_status === 'not_started' && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Not attempted</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
