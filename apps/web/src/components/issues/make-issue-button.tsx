import { CheckCircleIcon, FlagIcon } from "@phosphor-icons/react";

import { CommonButton, Pill } from "@repo/ui";

interface MakeIssueButtonProps {
  subject: string;
  onIssues: boolean;
  pending: boolean;
  onClick: () => void;
}

export function MakeIssueButton({ subject, onIssues, pending, onClick }: MakeIssueButtonProps) {
  if (onIssues) {
    return (
      <Pill tone="primary" className="w-fit">
        <CheckCircleIcon aria-hidden weight="fill" className="size-3.5" />
        On the Issues list
      </Pill>
    );
  }

  return (
    <CommonButton
      type="button"
      variant="outline"
      size="sm"
      loading={pending}
      aria-label={`Make "${subject}" an Issue`}
      onClick={onClick}
    >
      <FlagIcon aria-hidden />
      Make it an Issue
    </CommonButton>
  );
}
