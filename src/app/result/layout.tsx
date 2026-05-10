import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function ResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
