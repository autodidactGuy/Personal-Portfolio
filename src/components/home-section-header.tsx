import Link from "next/link";
import { Button } from "@nextui-org/react";

type HomeSectionHeaderProps = {
  title: string;
  actionHref?: string;
  actionLabel?: string;
};

export function HomeSectionHeader({
  title,
  actionHref,
  actionLabel = "View all",
}: HomeSectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {actionHref ? (
        <Button as={Link} color="primary" href={actionHref} radius="full" size="sm" variant="light">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
