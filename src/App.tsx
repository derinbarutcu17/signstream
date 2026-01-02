import { useState, useRef } from 'react';
import WebcamTile from './components/dashboard/WebcamTile';
import GoalTile from './components/dashboard/GoalTile';
import FeedbackTile from './components/dashboard/FeedbackTile';
import ScoreTile from './components/dashboard/ScoreTile';
import { useHandTracking } from './hooks/useHandTracking';
import ReferenceGuide from './components/dashboard/ReferenceGuide';

const ALPHABET = ['A', 'B', 'D', 'F', 'I', 'L', 'R', 'U', 'V', 'W', 'Y'];

const INSTRUCTIONS: Record<string, string> = {
  'A': 'Thumb on the side of a closed fist.',
  'B': 'All fingers straight up, thumb tucked across palm.',
  'D': 'Index finger up, others touching thumb.',
  'F': 'Index and thumb touching, other fingers up.',
  'I': 'Pinky finger straight up, others closed.',
  'L': 'Index and thumb extended (forming an L).',
  'R': 'Index and middle fingers crossed.',
  'U': 'Index and middle fingers up and touching.',
  'V': 'Index and middle fingers in a "V" shape.',
  'W': 'Index, middle, and ring fingers up and spread.',
  'Y': 'Thumb and pinky extended.',
};

function App() {
  const [targetIndex, setTargetIndex] = useState(0);
  const [score] = useState(0);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  // Hand tracking hook - now includes GestureLogic recognition
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isReady, results, detectionData } = useHandTracking(videoRef);

  const targetLetter = ALPHABET[targetIndex];

  // Score when detection matches target
  const handleNext = () => setTargetIndex(prev => (prev + 1) % ALPHABET.length);
  const handlePrev = () => setTargetIndex(prev => (prev - 1 + ALPHABET.length) % ALPHABET.length);

  // Use the new GestureLogic detection directly
  const displayedLetter = detectionData.bestMatch;
  const displayedConfidence = detectionData.similarity > 0 ? detectionData.similarity : 0;

  return (
    <main className="h-dvh w-dvw bg-zinc-950 flex flex-col transition-colors duration-700 font-sans">
      <ReferenceGuide isOpen={isReferenceOpen} onClose={() => setIsReferenceOpen(false)} />

      <header className="h-20 px-4 flex items-center justify-between border-b border-zinc-900/50 bg-zinc-950/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <span className="text-zinc-950 font-black text-sm">SS</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none">Sign Stream</h1>
            <p className="text-[10px] mono-data text-zinc-500 mt-1 uppercase tracking-widest opacity-60">
              {isReady ? 'Geometric Engine Ready' : 'Loading...'}
            </p>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg text-xs font-medium ${displayedLetter
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-zinc-800 text-zinc-400'
            }`}>
            {displayedLetter ? `Detecting: ${displayedLetter}` : 'No match'}
          </div>
          <span className="text-[10px] text-zinc-500">
            {displayedConfidence > 0 ? `${(displayedConfidence * 100).toFixed(0)}%` : '--'}
          </span>
        </div>
      </header>

      <div className="flex-1 bento-grid w-full px-4 py-4 overflow-hidden">
        <WebcamTile
          videoRef={videoRef}
          results={results}
          isTrackingReady={isReady}
        />

        <div className="flex flex-col gap-4 h-full min-h-0">
          <GoalTile
            targetLetter={targetLetter}
            detectedLetter={displayedLetter}
            onOpenReference={() => setIsReferenceOpen(true)}
            onNext={handleNext}
            onPrev={handlePrev}
          />
          <ScoreTile
            score={Math.round(displayedConfidence * 100)}
            totalScore={score}
          />
          <FeedbackTile
            confidence={detectionData.confidence}
            fingerStates={detectionData.fingerStates}
            instruction={INSTRUCTIONS[targetLetter]}
          />
        </div>
      </div>
    </main>
  );
}

export default App;
