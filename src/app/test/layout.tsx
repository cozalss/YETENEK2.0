import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
