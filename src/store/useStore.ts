import { create } from 'zustand';
import { User, Room, Vote, VotingSummary, Task } from '../types';

interface Store {
  user: User | null;
  room: Room | null;
  votes: Vote[];
  tasks: Task[];
  summary: VotingSummary | null;
  setUser: (user: User | null) => void;
  setRoom: (room: Room | null) => void;
  setVotes: (votes: Vote[]) => void;
  setTasks: (tasks: Task[]) => void;
  setSummary: (summary: VotingSummary | null) => void;
}

export const useStore = create<Store>((set) => ({
  user: null,
  room: null,
  votes: [],
  tasks: [],
  summary: null,
  setUser: (user) => set({ user }),
  setRoom: (room) => set({ room }),
  setVotes: (votes) => set({ votes }),
  setTasks: (tasks) => set({ tasks }),
  setSummary: (summary) => set({ summary }),
}));