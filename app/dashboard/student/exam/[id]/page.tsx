import { ExamPage } from '../../../../../src/dashboard/ExamPage';

export default async function StudentExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExamPage examId={Number(id)} />;
}