import { useState } from "react";

import { CaretRightIcon, ListChecksIcon, PlusIcon } from "@phosphor-icons/react";

import { canWrite, type Todo } from "@repo/library";
import { cn, CommonButton, ListSkeleton, SectionCard, toast } from "@repo/ui";

import { TodoCreateDrawer } from "@/components/test-forms/todo-create-drawer";
import { TodoRow } from "@/components/todos/todo-row";
import { useSession } from "@/hooks/use-auth";
import { useTestForms } from "@/hooks/use-settings";
import { useMakeIssueFromTodo, useSetTodoDone, useTodos } from "@/hooks/use-todos";

interface TodosSectionProps {
  teamId: string;
  timeZone: string;
}

export function TodosSection({ teamId, timeZone }: TodosSectionProps) {
  const { user } = useSession();
  const { data, isLoading, error } = useTodos(teamId);
  const setDone = useSetTodoDone(teamId);
  const makeIssue = useMakeIssueFromTodo(teamId);
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);
  const testForms = useTestForms();

  const readOnly = !user || !canWrite(user.role);
  const open = data?.todos.filter((todo) => todo.doneAt === null) ?? [];
  const done = data?.todos.filter((todo) => todo.doneAt !== null) ?? [];

  const toggle = (todo: Todo, isDone: boolean) =>
    setDone.mutate(
      { todoId: todo.id, done: isDone },
      {
        onError: (toggleError) => toast.error(toggleError.message || "Could not update the To-Do"),
      },
    );

  const rows = (todos: Todo[]) =>
    todos.map((todo) => (
      <TodoRow
        key={todo.id}
        todo={todo}
        timeZone={timeZone}
        readOnly={readOnly}
        pending={setDone.isPending && setDone.variables?.todoId === todo.id}
        onToggle={(isDone) => toggle(todo, isDone)}
        makingIssue={makeIssue.isPending && makeIssue.variables?.todoId === todo.id}
        onMakeIssue={
          readOnly
            ? undefined
            : () =>
                makeIssue.mutate(
                  { todoId: todo.id },
                  {
                    onSuccess: (issue) => toast.success(`Added to Issues: ${issue.title}`),
                    onError: (issueError) =>
                      toast.error(issueError.message || "Could not make it an Issue"),
                  },
                )
        }
      />
    ));

  return (
    <SectionCard
      id="todos"
      icon={ListChecksIcon}
      title="To-Do list"
      description="Tick a To-Do when it is done. Finished ones move to the Done list."
      action={
        testForms && !readOnly ? (
          <CommonButton type="button" className="h-10" onClick={() => setAdding(true)}>
            <PlusIcon aria-hidden weight="bold" />
            Add To-Do
          </CommonButton>
        ) : null
      }
    >
      {isLoading ? <ListSkeleton rows={4} /> : null}
      {error ? <p className="text-destructive">{error.message}</p> : null}

      {data ? (
        <>
          {open.length > 0 ? (
            <ul aria-label="Open To-Dos" className="-mt-2 divide-y divide-border">
              {rows(open)}
            </ul>
          ) : (
            <p className="py-2 text-muted-foreground">No open To-Dos.</p>
          )}

          {done.length > 0 ? (
            <div className="border-t border-border pt-3">
              <button
                type="button"
                aria-expanded={showDone}
                onClick={() => setShowDone((current) => !current)}
                className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-border"
              >
                <CaretRightIcon
                  aria-hidden
                  className={cn("size-4 transition-transform", showDone && "rotate-90")}
                />
                Done ({done.length})
              </button>
              {showDone ? (
                <ul aria-label="Done To-Dos" className="divide-y divide-border">
                  {rows(done)}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      <TodoCreateDrawer teamId={teamId} open={adding} onClose={() => setAdding(false)} />
    </SectionCard>
  );
}
