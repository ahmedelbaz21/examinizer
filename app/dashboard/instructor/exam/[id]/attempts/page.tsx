import { GradingPage } from '../../../../../../src/dashboard/GradingPage';

export default async function AttemptsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GradingPage examId={Number(id)} />;
}