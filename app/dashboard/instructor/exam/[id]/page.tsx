import { ExamManager } from '../../../../../src/dashboard/ExamManager';

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ExamManager examId={Number(id)} />;
}