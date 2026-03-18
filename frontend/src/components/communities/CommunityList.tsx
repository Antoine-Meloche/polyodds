import type { Community } from '@/types';
import { CommunityCard } from './CommunityCard';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';

export const CommunityList = ({
  communities,
  isLoading,
}: {
  communities: Community[];
  isLoading: boolean;
}) => {
  if (isLoading) return <LoadingSpinner />;

  if (!communities || communities.length === 0) {
    return <EmptyState title="No communities found" description="Be the first to create one!" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {communities.map((community) => (
        <CommunityCard key={community.id} community={community} />
      ))}
    </div>
  );
};
