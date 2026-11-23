import { NO_PRIORITY, PRIORITY_OPTIONS } from "@repo/library";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui";

interface PrioritySelectProps {
  issueTitle: string;
  priority: number | null;
  disabled: boolean;
  onChange: (priority: number | null) => void;
}

export function PrioritySelect({ issueTitle, priority, disabled, onChange }: PrioritySelectProps) {
  return (
    <Select
      value={priority === null ? NO_PRIORITY : String(priority)}
      disabled={disabled}
      onValueChange={(value) => onChange(value === NO_PRIORITY ? null : Number(value))}
    >
      <SelectTrigger
        aria-label={`Priority of "${issueTitle}"`}
        className="h-9 w-40 rounded-full px-4 text-sm font-medium"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
