/**
 * Hug list feature flags.
 *
 * TOP_HUGGER: the badge + pinned card + butter-tinted surface. Built and
 * wired, but off until the ranking rule is settled. Flip `enabled` to true
 * and everything downstream (pinning, ring, badge) comes back on together —
 * there is no second copy of the rule anywhere else.
 */
export const TOP_HUGGER = {
  enabled: false,
  /** Minimum hugs received from one person before the badge can appear. */
  minHugs: 10,
} as const;
