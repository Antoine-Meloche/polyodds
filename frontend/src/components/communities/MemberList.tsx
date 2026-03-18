import type { CommunityMember } from '@/types';

export const MemberList = ({ members }: { members: CommunityMember[] }) => {
  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.user_id} className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="font-medium">{member.user_id}</p>
            <p className="text-xs text-muted-foreground">{member.role}</p>
          </div>
          <p className="text-xs text-muted-foreground">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};
