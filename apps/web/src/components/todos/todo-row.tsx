import { formatDate, formatInstant, type Todo } from "@repo/library";
import { Checkbox, cn, Pill } from "@repo/ui";

interface TodoRowProps {
  todo: Todo;
  timeZone: string;
  readOnly: boolean;
  pending: boolean;
  onToggle: (done: boolean) => void;
}

export function TodoRow({ todo, timeZone, readOnly, pending, onToggle }: TodoRowProps) {
  const done = todo.doneAt !== null;

  return (
    <li className="flex items-start gap-4 py-4">
      <Checkbox
        checked={done}
        disabled={readOnly || pending}
        onCheckedChange={(checked) => onToggle(checked === true)}
        aria-label={done ? `Mark "${todo.title}" not done` : `Mark "${todo.title}" done`}
        className="mt-0.5 size-6"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold", done && "text-muted-foreground line-through")}>
          {todo.title}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {todo.owner.name}
          {todo.sourceIssue ? ` · from Issue: ${todo.sourceIssue.title}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5 text-sm text-muted-foreground">
        <span className="flex flex-wrap items-center justify-end gap-2">
          {todo.overdue ? <Pill tone="danger">Overdue</Pill> : null}
          <span className="whitespace-nowrap font-medium">Due {formatDate(todo.dueDate)}</span>
        </span>
        {todo.doneAt ? (
          <span className="text-xs">
            Done {formatInstant(todo.doneAt, timeZone)}
            {todo.doneBy ? ` by ${todo.doneBy.name}` : ""}
          </span>
        ) : null}
      </div>
    </li>
  );
}
