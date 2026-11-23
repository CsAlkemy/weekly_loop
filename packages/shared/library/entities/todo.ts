import type { User } from "./user";

export interface SourceIssue {
  id: string;
  title: string;
}

export interface Todo {
  id: string;
  title: string;
  owner: User;
  dueDate: string;
  doneAt: string | null;
  doneBy: User | null;
  createdAt: string;
  overdue: boolean;
  sourceIssue: SourceIssue | null;
}

export interface TodoCompletion {
  due: number;
  done: number;
  ratePercent: number;
  meetsTarget: boolean;
}

export interface TodoWeek {
  weekStart: string;
  completion: TodoCompletion | null;
}

export interface TodoList {
  todos: Todo[];
  lastClosedWeek: string;
  completion: TodoCompletion | null;
  thisWeek: TodoWeek;
  history: TodoWeek[];
}
