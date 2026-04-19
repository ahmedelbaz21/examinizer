import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../src/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  const { attemptId } = await req.json();

  // Fetch all answers for this attempt
  const { data: answers } = await supabaseAdmin
    .from('answers')
    .select('answer_id, question_id, selected_choice, answer_text, marks_awarded')
    .eq('attempt_id', attemptId);

  if (!answers) return NextResponse.json({ error: 'No answers found' }, { status: 400 });

  // Fetch all questions for scoring
  const questionIds = answers.map(a => a.question_id);
  const { data: questions } = await supabaseAdmin
    .from('questions')
    .select('question_id, question_type, marks')
    .in('question_id', questionIds);

  // Fetch correct choices
  const { data: choices } = await supabaseAdmin
    .from('choices')
    .select('choice_id, question_id, is_correct')
    .in('question_id', questionIds);

  let totalMarks = 0;
  let hasEssay = false;

  // Grade each answer
  for (const answer of answers) {
    const question = questions?.find(q => q.question_id === answer.question_id);
    if (!question) continue;

    if (question.question_type === 'ESSAY') {
      hasEssay = true;
      continue; // skip — instructor grades manually
    }

    if (question.question_type === 'MCQ' || question.question_type === 'TRUE_FALSE') {
      const selectedChoice = choices?.find(c => c.choice_id === answer.selected_choice);
      const marksAwarded = selectedChoice?.is_correct ? question.marks : 0;
      totalMarks += marksAwarded;

      await supabaseAdmin
        .from('answers')
        .update({ marks_awarded: marksAwarded })
        .eq('answer_id', answer.answer_id);
    }
  }

  // Mark attempt as submitted
  await supabaseAdmin
    .from('exam_attempts')
    .update({ is_submitted: true, end_time: new Date().toISOString() })
    .eq('attempt_id', attemptId);

  // Insert result
  await supabaseAdmin
    .from('results')
    .upsert({
      attempt_id: attemptId,
      total_marks: totalMarks,
      graded: !hasEssay,
      graded_at: !hasEssay ? new Date().toISOString() : null,
    });

  return NextResponse.json({ success: true, totalMarks, graded: !hasEssay });
}