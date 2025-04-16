export interface User {
  id: string;
  name: string;
  emoji: string;
  isAdmin: boolean;
}

export interface Room {
  id: string;
  name: string;
  votingSystem: VotingOption[];
  currentVoting: boolean;
  revealed: boolean;
  createdAt: string;
  votingTaskId: string | null;
}

export interface Task {
  id: string;
  roomId: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  userId: string;
  value: string | number;
  roomId: string;
  taskId: string;
}

export type VotingOption = {
  value: string | number;
  label: string;
};

export interface VotingSummary {
  average: number;
  mode: (string | number)[];
  votes: Record<string, number>;
  total: number;
}