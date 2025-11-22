import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Play, CheckCircle2 } from 'lucide-react';
import type { PageType, UserProfile } from '../App';
import { ImageWithFallback } from './figma/ImageWithFallback';

type ExercisePlanProps = {
  onNavigate: (page: PageType) => void;
  userProfile: UserProfile;
};

type Exercise = {
  id: number;
  name: string;
  description: string;
  benefits: string[];
  duration: string;
  reps: string;
  difficulty: 'Easy' | 'Moderate';
  imageUrl: string;
  completed: boolean;
};

export function ExercisePlan({ onNavigate, userProfile }: ExercisePlanProps) {
  const exercises: Exercise[] = [
    {
      id: 1,
      name: 'Seated Arm Raises',
      description: 'Gentle shoulder and arm strengthening exercise performed while sitting in a chair. Helps improve upper body mobility and posture.',
      benefits: ['Improves shoulder mobility', 'Strengthens arm muscles', 'Better posture'],
      duration: '5 minutes',
      reps: '10 repetitions, 2 sets',
      difficulty: 'Easy',
      imageUrl: 'https://images.unsplash.com/photo-1686791789070-90949cfec4b6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW5pb3IlMjBzaG91bGRlciUyMGV4ZXJjaXNlJTIwbW92ZW1lbnR8ZW58MXx8fHwxNzYzNzk4ODYwfDA&ixlib=rb-4.1.0&q=80&w=1080',
      completed: true,
    },
    {
      id: 2,
      name: 'Gentle Leg Stretches',
      description: 'Low-impact leg stretching to improve flexibility and reduce joint stiffness. Excellent for arthritis and post-surgery recovery.',
      benefits: ['Reduces joint stiffness', 'Improves flexibility', 'Pain relief'],
      duration: '8 minutes',
      reps: '8 repetitions each leg',
      difficulty: 'Easy',
      imageUrl: 'https://images.unsplash.com/photo-1658314756052-30e8d440abf8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGRlcmx5JTIwbGVnJTIwZXhlcmNpc2UlMjBwaHlzaW90aGVyYXB5fGVufDF8fHx8MTc2Mzc5ODg2MHww&ixlib=rb-4.1.0&q=80&w=1080',
      completed: false,
    },
    {
      id: 3,
      name: 'Chair-Based Balance Exercise',
      description: 'Safe balance training using a chair for support. Helps prevent falls and improves stability in daily activities.',
      benefits: ['Prevents falls', 'Better balance', 'Builds confidence'],
      duration: '6 minutes',
      reps: '5 repetitions each side',
      difficulty: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1758599879693-9e06f55a4ded?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW5pb3IlMjBjaGFpciUyMHlvZ2ElMjBiYWxhbmNlfGVufDF8fHx8MTc2Mzc5ODg1OXww&ixlib=rb-4.1.0&q=80&w=1080',
      completed: false,
    },
    {
      id: 4,
      name: 'Gentle Spinal Stretch',
      description: 'Careful spine and back stretching to improve posture and reduce back pain. Performed at your own pace with breaks.',
      benefits: ['Reduces back pain', 'Improves posture', 'Increases mobility'],
      duration: '7 minutes',
      reps: 'Hold 15 seconds, repeat 6 times',
      difficulty: 'Easy',
      imageUrl: 'https://images.unsplash.com/photo-1747302653826-42c6cd7295f2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW5pb3IlMjBlbGRlcmx5JTIwZXhlcmNpc2UlMjBzdHJldGNoaW5nfGVufDF8fHx8MTc2Mzc5ODg1OXww&ixlib=rb-4.1.0&q=80&w=1080',
      completed: false,
    },
  ];

  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* Header */}
      <div className="bg-purple-600 border-b border-purple-700">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-white hover:text-purple-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="mb-2 text-white">Your Exercise Plan</h1>
          <p className="text-purple-100">Personalized exercises for your recovery goals</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary */}
        <div className="bg-purple-50 border-2 border-purple-200 p-6 mb-8 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-slate-900 mb-2">Today's Plan</h2>
              <p className="text-slate-600">
                4 exercises • About 26 minutes total • Tailored for your conditions
              </p>
            </div>
            <Button
              onClick={() => onNavigate('live')}
              className="h-14 px-8 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Play className="w-5 h-5 mr-2" />
              Start All Exercises
            </Button>
          </div>
        </div>

        {/* Conditions Note */}
        <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-slate-700">
            <span className="inline-block mr-2">ℹ️</span>
            These exercises are designed for: <span className="text-slate-900">{userProfile.conditions.join(', ')}</span>
          </p>
        </div>

        {/* Exercise Cards */}
        <div className="space-y-6">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden hover:border-purple-600 transition-colors">
              <div className="flex flex-col md:flex-row">
                {/* Image */}
                <div className="md:w-1/3 relative">
                  <ImageWithFallback
                    src={exercise.imageUrl}
                    alt={exercise.name}
                    className="w-full h-64 md:h-full object-cover"
                  />
                  {exercise.completed && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-2">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4">
                    <Badge className={exercise.difficulty === 'Easy' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}>
                      {exercise.difficulty}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6">
                  <h3 className="text-slate-900 mb-3">{exercise.name}</h3>
                  <p className="text-slate-600 mb-4">{exercise.description}</p>

                  <div className="grid md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-slate-200">
                    <div>
                      <p className="text-slate-500 mb-1">Duration</p>
                      <p className="text-slate-900">{exercise.duration}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Repetitions</p>
                      <p className="text-slate-900">{exercise.reps}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-slate-500 mb-2">Benefits:</p>
                    <div className="flex flex-wrap gap-2">
                      {exercise.benefits.map((benefit) => (
                        <span
                          key={benefit}
                          className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => onNavigate('live')}
                    className="w-full md:w-auto h-12 px-8 bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start with Live Guidance
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
