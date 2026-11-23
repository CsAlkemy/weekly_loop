import { useState } from "react";

import type { User } from "@repo/library";
import { Popover, PopoverContent, PopoverTrigger, UserAvatar } from "@repo/ui";

export function OwnerAvatar({ owner }: { owner: User }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Owner: ${owner.name}`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2"
        >
          <UserAvatar name={owner.name} className="size-9" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-auto px-4 py-3"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <p className="text-sm font-semibold">{owner.name}</p>
        <p className="text-xs text-muted-foreground">Accountable for this number</p>
      </PopoverContent>
    </Popover>
  );
}
