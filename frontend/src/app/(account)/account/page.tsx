import { AccountScreen } from '../../../features/identity';
import { ReviewEntry } from '../../../features/review/components/review-entry';
export default function Page() {
  return <AccountScreen workspaceTools={<ReviewEntry />} />;
}
