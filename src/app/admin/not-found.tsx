"use client";

export default function AdminNotFound() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <p className="text-4xl font-bold text-[var(--color-primary)] mb-2">404</p>
        <h1 className="text-lg font-bold text-[var(--color-text)] mb-2">Page Not Found</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          The admin page you are looking for does not exist.
        </p>
        <a
          href="/admin/dashboard"
          className="inline-block px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-light)]"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
