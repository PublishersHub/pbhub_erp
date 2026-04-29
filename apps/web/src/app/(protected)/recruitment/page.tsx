'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';

const SECTIONS = [
  {
    title: 'Job Requisitions',
    description: 'Create and manage hiring requests',
    href: '/recruitment/requisitions',
  },
  {
    title: 'Candidates',
    description: 'Manage your candidate pipeline',
    href: '/recruitment/candidates',
  },
  {
    title: 'Applications',
    description: 'Track candidate applications and stages',
    href: '/recruitment/applications',
  },
];

export default function RecruitmentPage() {
  return (
    <div>
      <PageHeader title="Recruitment" description="Manage your hiring pipeline" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <h3 className="font-semibold text-gray-900">{s.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{s.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
