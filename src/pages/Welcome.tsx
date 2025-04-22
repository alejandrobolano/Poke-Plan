import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Fish } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

const DEFAULT_EMOJIS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🦄', '🐙', '🦋', '😍','😱','😡','🤢'];
const DEFAULT_VOTING_SYSTEM = [
  { value: '☕', label: 'Coffee Break' },
  { value: 1, label: '1 Point' },
  { value: 2, label: '2 Points' },
  { value: 3, label: '3 Points' },
  { value: 5, label: '5 Points' },
  { value: 8, label: '8 Points' },
  { value: 13, label: '13 Points' }
];

export default function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [emoji, setEmoji] = useState(DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)]);
  const [isJoining, setIsJoining] = useState(false);
  const [votingSystem, setVotingSystem] = useState(DEFAULT_VOTING_SYSTEM);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const { user, setUser } = useStore();

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const roomIdFromPath = pathParts[1];
    
    if (roomIdFromPath && roomIdFromPath !== 'room') {
      setRoomCode(roomIdFromPath);
      setIsJoining(true);
      checkExistingParticipant(roomIdFromPath);
    }
  }, [location.pathname]);

  const checkExistingParticipant = async (roomId: string) => {
    try {
      const storedParticipant = localStorage.getItem(`room_${roomId}_participant`);
      if (storedParticipant) {
        const participantData = JSON.parse(storedParticipant);
        const { data: participant } = await supabase
          .from('participants')
          .select('*')
          .eq('id', participantData.id)
          .eq('room_id', roomId)
          .single();

        if (participant) {
          setUser({
            id: participant.id,
            name: participant.name,
            emoji: participant.emoji,
            isAdmin: participant.is_admin
          });
          navigate(`/room/${roomId}`);
          return;
        } else {
          localStorage.removeItem(`room_${roomId}_participant`);
        }
      }

      const { data: room } = await supabase
        .from('rooms')
        .select()
        .eq('id', roomId)
        .single();

      if (!room) {
        toast.error('Room not found');
        navigate('/');
        return;
      }
    } catch (error) {
      console.error('Error checking existing participant:', error);
    }
  };

  const createRoom = async () => {
    if (!name.trim() || !roomName.trim()) return;

    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: roomName,
          voting_system: votingSystem
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          room_id: room.id,
          name,
          emoji,
          is_admin: true
        })
        .select()
        .single();

      if (participantError) throw participantError;

      const userData = {
        id: participant.id,
        name,
        emoji,
        isAdmin: true
      };

      setUser(userData);
      localStorage.setItem(`room_${room.id}_participant`, JSON.stringify(userData));
      navigate(`/room/${room.id}`);
      
      toast.success(`Room created! Share this code: ${room.id}`, {
        duration: 10000,
        icon: '🎉'
      });
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  };

  const joinRoom = async () => {
    if (!name.trim() || !roomCode.trim()) return;

    try {
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select()
        .eq('id', roomCode)
        .single();

      if (roomError) {
        toast.error('Room not found');
        return;
      }

      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .insert({
          room_id: room.id,
          name,
          emoji,
          is_admin: false
        })
        .select()
        .single();

      if (participantError) throw participantError;

      const userData = {
        id: participant.id,
        name,
        emoji,
        isAdmin: false
      };

      setUser(userData);
      localStorage.setItem(`room_${room.id}_participant`, JSON.stringify(userData));
      navigate(`/room/${room.id}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  };

  const addCustomOption = () => {
    if (!customValue || !customLabel) return;
    
    setVotingSystem([...votingSystem, { value: isNaN(Number(customValue)) ? customValue : Number(customValue), label: customLabel }]);
    setCustomValue('');
    setCustomLabel('');
  };

  const removeOption = (index: number) => {
    setVotingSystem(votingSystem.filter((_, i) => i !== index));
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Fish className="h-16 w-16 text-yellow-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">PokePlan 🍣</h1>
          <p className="text-gray-600">Collaborative Planning Poker for Agile Teams by Alejandro Bolaño. 
            This is a emojically <a href='https://github.com/alejandrobolano/Poke-Plan?tab=readme-ov-file#readme' target='_blank'>readme.md</a></p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pick your emoji
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DEFAULT_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    emoji === e ? 'bg-purple-100 scale-110' : 'hover:bg-gray-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {isJoining ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter room code"
                  readOnly={!!roomCode}
                />
              </div>
              <button
                onClick={joinRoom}
                disabled={!name.trim() || !roomCode.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                Join Room
              </button>
              <button
                onClick={() => {
                  setIsJoining(false);
                  setRoomCode('');
                  navigate('/');
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                Back to Create Room
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter room name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voting System
                </label>
                <div className="space-y-2">
                  {votingSystem.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 px-4 py-2 rounded-lg">
                        {option.value} - {option.label}
                      </div>
                      <button
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {isCustomizing ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customValue}
                          onChange={(e) => setCustomValue(e.target.value)}
                          placeholder="Value (e.g., 1, XL, ☕)"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          value={customLabel}
                          onChange={(e) => setCustomLabel(e.target.value)}
                          placeholder="Label"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={addCustomOption}
                          disabled={!customValue || !customLabel}
                          className="flex-1 bg-purple-100 text-purple-700 py-2 px-4 rounded-lg font-medium hover:bg-purple-200 disabled:opacity-50"
                        >
                          Add Option
                        </button>
                        <button
                          onClick={() => setIsCustomizing(false)}
                          className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCustomizing(true)}
                      className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200"
                    >
                      + Add Custom Option
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={createRoom}
                disabled={!name.trim() || !roomName.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-all"
              >
                Create New Room
              </button>
              <button
                onClick={() => setIsJoining(true)}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all"
              >
                <Users className="w-4 h-4" />
                Join Existing Room
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}