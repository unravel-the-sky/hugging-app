// @/hooks/useCollapsibleDays.ts
import { DayGroup } from "@/lib/hugs/groups";
import { isRecentGroup } from "@/lib/hugs/time";
import { useCallback, useState } from "react";

export const useCollapsibleDays = (days: DayGroup[]) => {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const isExpanded = useCallback(
    (day: DayGroup) => overrides[day.key] ?? true,
    [overrides],
  );

  const toggle = useCallback(
    (day: DayGroup) =>
      setOverrides((prev) => ({
        ...prev,
        [day.key]: !(prev[day.key] ?? true),
      })),
    [],
  );

  return { isExpanded, toggle, overrides };
};
