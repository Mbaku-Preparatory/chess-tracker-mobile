import { Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/SectionContainer";

/**
 * Games — a placeholder tab, deliberately.
 *
 * The tab exists now so the bottom bar settles into its final shape rather
 * than shifting under people later; moving a tab someone has learned to reach
 * for is worse than showing them an honest empty screen.
 */
export function GamesScreen() {
  return (
    <Screen>
      <PageHeader title="Games" subtitle="Coming soon" />
      <EmptyState
        title="Nothing here yet"
        description="This is where your games will live."
      />
    </Screen>
  );
}
