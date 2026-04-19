'use client';

import { useEffect, useState, useRef } from 'react';
import { getCurrentUserWithRole } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import '../styles/global.css';
import '../styles/components.css';

type Question = {
  question_id: number;
  question_text: string;
  question_type: 'MCQ' | 'TRUE_FALSE' | 'ESSAY';
  marks: number;
  choices?: { choice_id: number; choice_text: string }[];
};

export function ExamPage({ examId }: { examId: number }) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, { selectedChoice?: number; answerText?: string }>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitRef = useRef(false);

  useEffect(() => {
    getCurrentUserWithRole().then(u => {
      if (!u || u.role !== 'Student') window.location.href = '/';
      else setCurrentUser(u);
    });
  }, []);

  useEffect(() => {
    if (currentUser) initExam();
  }, [currentUser]);

  async function initExam() {
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .single();

    if (!examData) {
      setError('Exam not found.');
      setLoading(false);
      return;
    }

    setExam(examData);

    const { data: existingAttempt } = await supabase
      .from('exam_attempts')
      .select('attempt_id, is_submitted, start_time')
      .eq('exam_id', examId)
      .eq('student_id', currentUser.userId)
      .maybeSingle();

    let currentAttemptId = existingAttempt?.attempt_id;

    if (!currentAttemptId) {
      const { data: newAttempt } = await supabase
        .from('exam_attempts')
        .insert({ exam_id: examId, student_id: currentUser.userId })
        .select('attempt_id')
        .single();

      currentAttemptId = newAttempt?.attempt_id;
    }

    setAttemptId(currentAttemptId);

    // Timer
    const now = new Date();
    const startTime = existingAttempt?.start_time
      ? new Date(existingAttempt.start_time)
      : new Date();

    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const totalSeconds = examData.duration_minutes * 60;
    setSecondsLeft(Math.max(0, totalSeconds - elapsed));

    // Questions
    const { data: qData } = await supabase
      .from('questions')
      .select(`
        question_id,
        question_text,
        question_type,
        marks,
        choices (
          choice_id,
          choice_text
        )
      `)
      .eq('exam_id', examId)
      .order('question_id');

    setQuestions(qData || []);

    setLoading(false);
  }

  // Timer logic
  useEffect(() => {
    if (!attemptId || submitted || secondsLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
  }, [attemptId, submitted]);

  async function saveAnswer(questionId: number, selectedChoice?: number, answerText?: string) {
    if (!attemptId) return;

    setAnswers(prev => ({
      ...prev,
      [questionId]: { selectedChoice, answerText },
    }));

    await supabase.from('answers').upsert({
      attempt_id: attemptId,
      question_id: questionId,
      selected_choice: selectedChoice ?? null,
      answer_text: answerText ?? null,
    });
  }

  async function handleSubmit(auto = false) {
    if (!attemptId || submitting) return;
    if (!auto && !confirm('Submit exam?')) return;

    setSubmitting(true);

    await fetch('/api/student/submit-exam', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attemptId }),
    });

    setSubmitted(true);
    setSubmitting(false);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  const answeredCount = Object.keys(answers).length;
  const timerColor =
    secondsLeft < 300 ? 'var(--danger)' :
    secondsLeft < 600 ? 'var(--warning)' :
    'var(--success)';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading exam...</p>
      </div>
    );
  }

  if (error) return <p>{error}</p>;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--gray-50), var(--gray-100))' }}>

      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'white',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div>
          <b>{exam?.title}</b>
          <div>{answeredCount} / {questions.length} answered</div>
        </div>

        <div style={{ color: timerColor }}>
          {formatTime(secondsLeft)}
        </div>

        <button className="btn btn-primary" onClick={() => handleSubmit()}>
          Submit
        </button>
      </div>

      {/* Questions */}
      <div style={{ maxWidth: 800, margin: 'auto', padding: '2rem' }}>
        {questions.map((q, i) => (
          <div key={q.question_id} className="card" style={{ marginBottom: '1.5rem' }}>

            <p><b>Q{i + 1}:</b> {q.question_text}</p>

            {/* MCQ */}
            {q.question_type === 'MCQ' && (
              <div>
                {(q.choices || []).map(c => {
                  const isSelected = answers[q.question_id]?.selectedChoice === c.choice_id;

                  return (
                    <label key={c.choice_id} style={{ display: 'block' }}>
                      <input
                        type="radio"
                        name={`q_${q.question_id}`}
                        checked={isSelected}
                        onChange={() => saveAnswer(q.question_id, c.choice_id)}
                      />
                      {c.choice_text}
                    </label>
                  );
                })}
              </div>
            )}

            {/* TRUE FALSE */}
            {q.question_type === 'TRUE_FALSE' && (
              <div>
                {[
                  { label: 'True', value: 1 },
                  { label: 'False', value: 0 }
                ].map(opt => {
                  const isSelected = answers[q.question_id]?.selectedChoice === opt.value;

                  return (
                    <label key={opt.value} style={{ display: 'block' }}>
                      <input
                        type="radio"
                        name={`q_${q.question_id}`}
                        checked={isSelected}
                        onChange={() => saveAnswer(q.question_id, opt.value)}
                      />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            )}

            {/* Essay */}
            {q.question_type === 'ESSAY' && (
              <textarea
                style={{ width: '100%' }}
                onChange={e => saveAnswer(q.question_id, undefined, e.target.value)}
              />
            )}

          </div>
        ))}
      </div>
    </div>
  );
}