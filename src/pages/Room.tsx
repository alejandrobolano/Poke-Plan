import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, RefreshCw, Share2, Users, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import type { Vote, VotingSummary, Task } from '../types';

export default function Room() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useStore();
  const [room, setRoom] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedValue, setSelectedValue] = useState<string | number | null>(null);
  const [summary, setSummary] = useState<VotingSummary | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(true);


  useEffect(() => {
    if (!user && id) {
      const storedUser = localStorage.getItem(`room_${id}_participant`);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        } catch (e) {
          localStorage.removeItem(`room_${id}_participant`);
        }
      }
    }
  
    setIsCheckingUser(false);
  }, [id, user, setUser]);

  useEffect(() => {
    if (isCheckingUser) return;

    if (!id || !user) {
      navigate('/');
      return;
    }

    const roomSubscription = supabase
      .channel(`room:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, (payload) => {
        if (payload.new) {
          setRoom(payload.new);
          if (payload.new.revealed) {
            calculateSummary(votes);
          } else {
            setSummary(null);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${id}` }, () => {
        fetchParticipants();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `room_id=eq.${id}` }, () => {
        fetchTasks();
      })
      .subscribe();

    fetchRoom();
    fetchParticipants();
    fetchTasks();

    return () => {
      roomSubscription.unsubscribe();
    };
  }, [id, user, isCheckingUser, navigate]);

  useEffect(() => {
    if (!room?.voting_task_id) {
      setVotes([]);
      setSelectedValue(null);
      setSummary(null);
      return;
    }

    const votesSubscription = supabase
      .channel(`votes:${room.voting_task_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `task_id=eq.${room.voting_task_id}` }, () => {
        fetchVotes();
      })
      .subscribe();

    return () => {
      votesSubscription.unsubscribe();
    };
  }, [room?.voting_task_id]);

  useEffect(() => {
    if (room?.revealed && votes.length > 0) {
      calculateSummary(votes);
    }
  }, [room?.revealed, votes]);

  const fetchRoom = async () => {
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select()
      .eq('id', id)
      .single();

    if (roomError) {
      toast.error('Room not found');
      navigate('/');
      return;
    }

    setRoom(roomData);
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('participants')
      .select()
      .eq('room_id', id);
    setParticipants(data || []);
  };

  const fetchVotes = async () => {
    if (!room?.voting_task_id) return;

    const { data } = await supabase
      .from('votes')
      .select()
      .eq('room_id', id)
      .eq('task_id', room.voting_task_id);

    setVotes(data || []);

    const userVote = data?.find(vote => vote.user_id === user?.id);
    setSelectedValue(userVote?.value || null);

    if (room.revealed && data?.length) {
      calculateSummary(data);
    }
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select()
      .eq('room_id', id)
      .order('created_at', { ascending: true });
    setTasks(data || []);
  };

  const calculateSummary = (votes: Vote[]) => {
    const latestVotes = new Map<string, Vote>();
    votes.forEach(vote => {
      latestVotes.set(vote.user_id, vote);
    });

    const finalVotes = Array.from(latestVotes.values());
    const numericVotes = finalVotes
      .map((v) => v.value)
      .filter((v): v is number => !isNaN(Number(v)))
      .map(Number);

    const average = numericVotes.length
      ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
      : 0;

    const voteCount: Record<string | number, number> = {};
    finalVotes.forEach((vote) => {
      voteCount[vote.value] = (voteCount[vote.value] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(voteCount));
    const mode = Object.entries(voteCount)
      .filter(([_, count]) => count === maxCount)
      .map(([value]) => (isNaN(Number(value)) ? value : Number(value)));

    setSummary({
      average: Number(average.toFixed(1)),
      mode,
      votes: voteCount,
      total: finalVotes.length
    });
  };

  const handleVote = async (value: string | number) => {
    if (!user || !room?.voting_task_id) return;

    setSelectedValue(value);
    const vote = {
      user_id: user.id,
      room_id: room.id,
      task_id: room.voting_task_id,
      value
    };

    await supabase.from('votes').upsert(vote);
  };

  const revealVotes = async () => {
    if (!room) return;

    await supabase
      .from('rooms')
      .update({ revealed: true })
      .eq('id', room.id);
  };

  const resetVoting = async () => {
    if (!room) return;

    await supabase
      .from('votes')
      .delete()
      .eq('room_id', room.id);

    await supabase
      .from('rooms')
      .update({ revealed: false, voting_task_id: null })
      .eq('id', room.id);


    setSelectedValue(null);
    setSummary(null);    
    setVotes([]);
  };

  const shareRoom = () => {
    const url = window.location.origin + '/' + id;
    navigator.clipboard.writeText(url);
    toast.success('Room link copied to clipboard!', {
      icon: '📋',
      position: 'bottom-center'
    });
  };

  const startVoting = async (taskId: string) => {
    if (!room) return;

    await supabase
      .from('rooms')
      .update({ voting_task_id: taskId, revealed: false })
      .eq('id', room.id);

    await supabase
      .from('votes')
      .delete()
      .eq('room_id', room.id);

    setSelectedValue(null);
    setSummary(null);
  };

  const addTask = async () => {
    if (!room || !newTask.title.trim()) return;

    const { error } = await supabase.from('tasks').insert({
      room_id: room.id,
      title: newTask.title,
      description: newTask.description
    });

    if (error) {
      toast.error('Failed to create task');
      return;
    }

    setNewTask({ title: '', description: '' });
    setIsAddingTask(false);
  };

  const updateTask = async () => {
    if (!editingTask) return;

    const { error } = await supabase
      .from('tasks')
      .update({
        title: editingTask.title,
        description: editingTask.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingTask.id);

    if (error) {
      toast.error('Failed to update task');
      return;
    }

    setEditingTask(null);
  };

  const deleteTask = async (taskId: string) => {
    if (!room) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      toast.error('Failed to delete task');
      return;
    }

    if (room.voting_task_id === taskId) {
      resetVoting();
    }
  };

  if (!room) return null;

  const currentTask = tasks.find((t) => t.id === room.voting_task_id);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {room.name}
            </h1>
            <div className="flex items-center gap-2 text-gray-600 mt-2">
              <Users className="w-4 h-4" />
              <span>{participants.length} participants</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={shareRoom}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share Room
            </button>
            {user?.isAdmin && currentTask && (
              <>
                <button
                  onClick={revealVotes}
                  disabled={room.revealed}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:hover:bg-purple-500"
                >
                  <Eye className="w-4 h-4" />
                  Reveal
                </button>
                <button
                  onClick={resetVoting}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            {currentTask ? (
              <>
                <div className="bg-purple-50 rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-2">Current Task</h2>
                  <h3 className="text-lg font-medium">{currentTask.title}</h3>
                  {currentTask.description && (
                    <p className="text-gray-600 mt-2">{currentTask.description}</p>
                  )}
                  {room.revealed && summary && (
                    <div className="mt-4 p-4 bg-white rounded-lg">
                      <p className="text-lg font-semibold text-purple-600">
                        Average Score: {summary.average}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Most voted: {summary.mode.join(', ')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Total votes: {summary.total}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {room.voting_system.map((option: any) => (
                    <button
                      key={option.value}
                      onClick={() => handleVote(option.value)}
                      disabled={room.revealed}
                      className={`p-8 rounded-xl text-center transition-all ${
                        selectedValue === option.value
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      } ${room.revealed ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-3xl mb-2">{option.value}</div>
                      <div className="text-sm">{option.label}</div>
                      {selectedValue === option.value && (
                        <div className="mt-2">
                          <Check className="w-5 h-5 mx-auto" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6 text-center">
                <p className="text-gray-600">No task selected for voting</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Tasks</h2>
                {user?.isAdmin && (
                  <button
                    onClick={() => setIsAddingTask(true)}
                    className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Task
                  </button>
                )}
              </div>

              {isAddingTask && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                  />
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingTask(false)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addTask}
                      disabled={!newTask.title.trim()}
                      className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                    >
                      Add Task
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`bg-white rounded-lg p-4 border ${
                      task.id === room.voting_task_id
                        ? 'border-purple-500'
                        : 'border-gray-200'
                    }`}
                  >
                    {editingTask?.id === task.id ? (
                      <div>
                        <input
                          type="text"
                          value={editingTask.title}
                          onChange={(e) =>
                            setEditingTask({ ...editingTask, title: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                        />
                        <textarea
                          value={editingTask.description}
                          onChange={(e) =>
                            setEditingTask({ ...editingTask, description: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
                          rows={3}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingTask(null)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={updateTask}
                            disabled={!editingTask.title.trim()}
                            className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">
                              {task.title}
                              {task.id === room.voting_task_id && summary && (
                                <span className="ml-2 text-sm text-purple-600">
                                  (Score: {summary.average})
                                </span>
                              )}
                            </h3>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {user?.isAdmin && (
                              <>
                                <button
                                  onClick={() => setEditingTask(task)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="text-gray-500 hover:text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {user?.isAdmin && task.id !== room.voting_task_id && (
                              <button
                                onClick={() => startVoting(task.id)}
                                className="px-2 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                              >
                                Start Voting
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Participants</h2>
              <div className="space-y-2">
                {participants.map((participant) => {
                  const participantVote = votes.find(
                    (v) => v.user_id === participant.id
                  );
                  return (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between bg-gray-100 rounded-lg px-4 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{participant.emoji}</span>
                        <span>{participant.name}</span>
                        {participant.is_admin && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      {currentTask && (
                        <div className="flex items-center gap-2">
                          {participantVote ? (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              {room.revealed && (
                                <span className="font-bold">{participantVote.value}</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-500">(not voted)</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}