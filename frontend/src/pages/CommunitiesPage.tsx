import { useState } from 'react';
import { useCommunities } from '@/hooks/useCommunities';
import { CommunityList } from '@/components/communities/CommunityList';
import { PaginationControls } from '@/components/shared/PaginationControls';

export const CommunitiesPage = () => {
  const [offset, setOffset] = useState(0);
  const limit = 12;

  const { data, isLoading } = useCommunities({ limit, offset });

  return (
    <div className="space-y-6">
      <div className="app-panel p-5">
        <h1 className="text-3xl font-bold text-primary">Communautés</h1>
      </div>

      <CommunityList communities={data?.communities || []} isLoading={isLoading} />

      {data && data.total > limit && (
        <PaginationControls
          offset={offset}
          limit={limit}
          total={data.total}
          onOffsetChange={setOffset}
        />
      )}
    </div>
  );
};
