import Link from 'next/link';
import type { Publication } from '../../model/publication.types';

export function PublicationIssues({
  businessId,
  issues,
}: {
  businessId: string;
  issues: Publication['issues'];
}) {
  return (
    <ul className="space-y-3">
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${issue.resource_id}-${index}`}>
          <Link
            className="inline-flex min-h-11 items-center text-sm leading-7 text-petrol underline underline-offset-4"
            href={`/manage/${businessId}${issue.section === 'settings' ? '' : '/' + issue.section}`}
          >
            {issue.message}
          </Link>
        </li>
      ))}
    </ul>
  );
}
