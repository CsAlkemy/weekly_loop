import type { MeasurableStatus } from "../enum/measurable-status";
import type { MeetingSection } from "../enum/meeting-section";
import type { User } from "./user";

export interface AgendaItem {
  section: MeetingSection;
  label: string;
  minutes: number;
}

export interface MeetingRating {
  userId: string;
  rating: number;
}

export interface Meeting {
  id: string;
  facilitator: User;
  startedAt: string;
  section: MeetingSection;
  sectionStartedAt: string;
  serverNow: string;
  scorecardWeek: string;
  agenda: AgendaItem[];
  attendees: User[];
  ratings: MeetingRating[];
  averageRating: number | null;
}

export interface ActiveMeeting {
  meeting: Meeting | null;
  lastEndedMeetingId: string | null;
}

export interface SummaryMeasurable {
  id: string;
  name: string;
  unit: string;
  value: number | null;
  status: MeasurableStatus;
}

export interface SummaryIssue {
  id: string;
  title: string;
  resolutionNote: string | null;
}

export interface SummaryTodo {
  id: string;
  title: string;
  owner: User;
  dueDate: string;
}

export interface MeetingSummary {
  id: string;
  facilitator: User;
  startedAt: string;
  endedAt: string;
  scorecardWeek: string;
  measurables: SummaryMeasurable[];
  issuesSolved: SummaryIssue[];
  todosCreated: SummaryTodo[];
  attendees: User[];
  rating: number | null;
  ratingsCount: number;
}

export interface PastMeeting {
  id: string;
  startedAt: string;
  endedAt: string;
  facilitator: User;
  attendeesCount: number;
  rating: number | null;
  ratingsCount: number;
}
