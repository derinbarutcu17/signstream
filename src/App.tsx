import { useState, useEffect, useRef } from 'react';
import WebcamTile from './components/dashboard/WebcamTile';
import GoalTile from './components/dashboard/GoalTile';
import FeedbackTile from './components/dashboard/FeedbackTile';
import ScoreTile from './components/dashboard/ScoreTile';
import { useHandTracking } from './hooks/useHandTracking';
import { useStablePrediction } from './hooks/useStablePrediction';
import ReferenceGuide from './components/dashboard/ReferenceGuide';

const ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'I', 'L', 'O', 'R', 'S', 'U', 'V', 'W', 'Y'];

const INSTRUCTIONS: Record<string, string> = {
  'A': 'Thumb on the side of a closed fist.',
  'B': 'All fingers straight up, thumb tucked across palm.',
  'C': 'Curved hand forming a "C" shape.',
  'D': 'Index finger up, others touching thumb.',
  'E': 'All fingers folded over a tucked thumb.',
  'F': 'Index and thumb touching, other fingers up.',
  'I': 'Pinky finger straight up, others closed.',
  'L': 'Index and thumb extended (forming an L).',
  'O': 'All fingers touching thumb tip in a circle.',
  'R': 'Index and middle fingers crossed.',
  'S': 'Tight fist with thumb over the middle.',
  'U': 'Index and middle fingers up and touching.',
  'V': 'Index and middle fingers in a "V" shape.',
  'W': 'Index, middle, and ring fingers up and spread.',
  'Y': 'Thumb and pinky extended.',
};

function App() {
  const [targetIndex, setTargetIndex] = useState(0);
  const [score] = useState(0);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { isReady, results, detectionData } = useHandTracking(videoRef);

  const targetLetter = ALPHABET[targetIndex];

  // Stability Filter (Debounce detection)
  const stablePrediction = useStablePrediction(detectionData.bestMatch, 5, 0.4);

  // Sync Logic
  useEffect(() => {
    // Accuracy is based on the target letter match score from the engine
    // This is handled by consumption of detectionData
    // Note: We could move targetSimilarity calculation to useHandTracking too.
  }, []);

  const handleNext = () => setTargetIndex(prev => (prev + 1) % ALPHABET.length);
  const handlePrev = () => setTargetIndex(prev => (prev - 1 + ALPHABET.length) % ALPHABET.length);

  // We should ideally calculate targetSimilarity here to avoid extra renders
  // but it's okay for now if we don't have a loop.

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
            <p className="text-[10px] mono-data text-zinc-500 mt-1 uppercase tracking-widest opacity-60">Gesture Recognition Engine</p>
          </div>
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
            detectedLetter={stablePrediction}
            onOpenReference={() => setIsReferenceOpen(true)}
            onNext={handleNext}
            onPrev={handlePrev}
          />
          <ScoreTile score={Math.round(detectionData.similarity * 100)} totalScore={score} />
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
