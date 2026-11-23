import { useState } from "react";

import { ArrowCounterClockwiseIcon, FlaskIcon } from "@phosphor-icons/react";

import { CommonButton, CommonModal, ListSkeleton, SectionCard, Switch, toast } from "@repo/ui";

import { SettingsShell } from "@/components/settings/settings-shell";
import { useResetToSeed, useSettings, useUpdateSettings } from "@/hooks/use-settings";

const TEST_FORMS = [
  "Add To-Do on the To-Dos page",
  "Add Rock on the Rocks page",
  "Tick a Milestone done on the Rocks page",
];

function TestFormsCard() {
  const { data: settings, isLoading, error } = useSettings();
  const update = useUpdateSettings();

  return (
    <SectionCard
      icon={FlaskIcon}
      title="Test forms"
      description="Extra forms for trying the app. Normally To-Dos come from Issues and Rocks are set each quarter."
    >
      {isLoading ? <ListSkeleton rows={2} /> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}
      {settings ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
            <div>
              <p id="test-forms-label" className="font-semibold">
                Turn on all test forms
              </p>
              <p className="text-sm text-muted-foreground">
                Applies to everyone. Observers still cannot change anything.
              </p>
            </div>
            <Switch
              aria-labelledby="test-forms-label"
              checked={settings.testForms}
              disabled={!settings.testToolsAvailable || update.isPending}
              onCheckedChange={(testForms) =>
                update.mutate(
                  { testForms },
                  {
                    onSuccess: () =>
                      toast.success(testForms ? "Test forms are on" : "Test forms are off"),
                    onError: (failure) => toast.error(failure.message),
                  },
                )
              }
            />
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {TEST_FORMS.map((form) => (
              <li key={form}>{form}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  );
}

function ResetCard({ available }: { available: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const reset = useResetToSeed();

  return (
    <SectionCard
      icon={ArrowCounterClockwiseIcon}
      title="Reset to seed data"
      description="Start over with the sample company: its teams, people, scores, Issues, To-Dos, Rocks and meetings."
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Everything added or changed since is removed, including people you added and changed
          passwords. The test forms switch stays as it is. Open pages refresh on their own.
        </p>
        <CommonButton
          type="button"
          variant="destructive"
          disabled={!available}
          onClick={() => setConfirming(true)}
        >
          <ArrowCounterClockwiseIcon aria-hidden weight="bold" />
          Reset to seed data
        </CommonButton>
      </div>

      <CommonModal
        open={confirming}
        onOpenChange={setConfirming}
        title="Reset all data?"
        description="This replaces everything with the seed data and cannot be undone."
        footer={
          <>
            <CommonButton type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </CommonButton>
            <CommonButton
              type="button"
              variant="destructive"
              disabled={reset.isPending}
              onClick={() =>
                reset.mutate(undefined, {
                  onSuccess: () => {
                    setConfirming(false);
                    toast.success("Data reset to the seed");
                  },
                  onError: (failure) => toast.error(failure.message),
                })
              }
            >
              {reset.isPending ? "Resetting…" : "Reset everything"}
            </CommonButton>
          </>
        }
      />
    </SectionCard>
  );
}

export function TestingToolsView() {
  const { data: settings } = useSettings();
  const available = settings?.testToolsAvailable ?? false;

  return (
    <SettingsShell>
      {settings && !available ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-muted-foreground">
          These tools are turned off on this server. Start the API with ENABLE_TEST_TOOLS=true to
          use them.
        </p>
      ) : null}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <TestFormsCard />
        <ResetCard available={available} />
      </div>
    </SettingsShell>
  );
}
