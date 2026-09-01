import { Link } from "react-router-dom";
import { UserRound } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { toDataUrl } from "@/lib/photo";
import type { MemberListItem } from "@/types";

export function MemberCard({ member }: { member: MemberListItem }) {
  return (
    <Link to={`/membros/${member.id}`}>
      <Card className="hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center gap-4">
          <div className="bg-muted flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {member.facePhoto ? (
              <img
                src={toDataUrl(member.facePhoto)}
                alt={member.name}
                className="size-full object-cover"
              />
            ) : (
              <UserRound className="text-muted-foreground size-7" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{member.name}</p>
            <p className="text-muted-foreground truncate text-sm">
              Próxima avaliação: {formatDate(member.nextEvaluationDate)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}
