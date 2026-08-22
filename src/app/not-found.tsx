import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
      <div className="text-center px-4">
        <p className="text-6xl font-bold text-[var(--color-primary)] mb-2">404</p>
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">Page Not Found</h1>
        <p className="text-[var(--color-text-secondary)] mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link href="/">
          <Button className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
