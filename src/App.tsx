import { useState, useEffect, useCallback, useRef } from 'react';
import WebcamTile from './components/dashboard/WebcamTile';
import GoalTile from './components/dashboard/GoalTile';
import FeedbackTile from './components/dashboard/FeedbackTile';
import ScoreTile from './components/dashboard/ScoreTile';
import { useHandTracking } from './hooks/useHandTracking';

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
  const [detectedLetter, setDetectedLetter] = useState<string | null>(null);
  const [targetIndex, setTargetIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  const [isReferenceOpen, setIsReferenceOpen] = useState(false);

  // Lifted state for shared access
  const videoRef = useRef<HTMLVideoElement>(null);
  const { isReady, results, detectionData } = useHandTracking(videoRef);

  const targetLetter = ALPHABET[targetIndex];

  // Stability Refs
  const lastFrameLetter = useRef<string | null>(null);
  const frameCount = useRef(0);

  // Recognition logic
  const analyzePose = useCallback((): { detectedLetter: string | null; targetSimilarity: number } => {
    const states = detectionData.fingerStates;
    const confidence = detectionData.confidence;

    if (detectionData.handCount === 0 || states[0] === 'Searching...' || confidence < 0.5) {
      return { detectedLetter: null, targetSimilarity: 0 };
    }

    const is = (f: string) => states.includes(f);
    const count = states.filter(s => s.includes('Extended')).length;

    const only = (...fingers: string[]) => {
      const extendedFingers = states.filter(s => s.includes('Extended'));
      if (extendedFingers.length !== fingers.length) return false;
      return fingers.every(f => extendedFingers.includes(f));
    };

    const poses: Record<string, { match: boolean; score: number }> = {
      'A': { match: (only() || only('Thumb Extended')) && is('Thumb Side') && !is('Index Folded'), score: 0.95 },
      'B': { match: count >= 4, score: 0.92 },
      'C': { match: is('Circular Shape') && !is('Thumb Touching Index') && is('Index Folded'), score: 0.92 },
      'D': {
        match: only('Index Extended') || (only('Index Extended') && is('Thumb Touching Middle')),
        score: is('Thumb Touching Middle') ? 0.98 : 0.85
      },
      'E': { match: is('Index Folded') && is('Middle Folded') && is('Thumb Under'), score: 0.95 },
      'F': { match: only('Middle Extended', 'Ring Extended', 'Pinky Extended'), score: 0.92 },
      'I': { match: only('Pinky Extended') && !is('Thumb Extended'), score: 0.90 },
      'L': { match: only('Index Extended', 'Thumb Extended'), score: 0.98 },
      'O': { match: is('Circular Shape') && (is('Thumb Touching Index') || is('Thumb Touching Middle')) && count === 0, score: 0.98 },
      'R': { match: only('Index Extended', 'Middle Extended') && is('Index/Middle Crossed'), score: 0.96 },
      'S': { match: is('Thumb Over') && !is('Index Folded'), score: 0.95 },
      'U': { match: only('Index Extended', 'Middle Extended') && is('Index/Middle Together') && !is('Index/Middle Crossed'), score: 0.94 },
      'V': { match: only('Index Extended', 'Middle Extended') && is('Index/Middle Spread'), score: 0.96 },
      'W': { match: only('Index Extended', 'Middle Extended', 'Ring Extended'), score: 0.92 },
      'Y': { match: (only('Pinky Extended', 'Thumb Extended') || (is('Pinky Extended') && is('Thumb Extended') && count === 1)), score: 0.95 },
    };

    let bestLetter: string | null = null;
    let maxSimilarity = 0;

    for (const [letter, data] of Object.entries(poses)) {
      if (data.match) {
        const sim = data.score * confidence;
        if (sim > maxSimilarity) {
          maxSimilarity = sim;
          bestLetter = letter;
        }
      }
    }

    const targetPose = poses[targetLetter];
    const targetSim = targetPose?.match ? targetPose.score * confidence : 0;

    return { detectedLetter: bestLetter, targetSimilarity: targetSim };
  }, [detectionData, targetLetter]);

  // Main Interpretation Loop
  useEffect(() => {
    if (!isReady) return;
    const { detectedLetter: currentDetection, targetSimilarity } = analyzePose();

    if (currentDetection === lastFrameLetter.current) {
      frameCount.current += 1;
    } else {
      lastFrameLetter.current = currentDetection;
      frameCount.current = 0;
    }

    if (frameCount.current >= 3 && currentDetection) {
      setDetectedLetter(currentDetection);
      setLiveAccuracy(Math.round(targetSimilarity * 100));

      if (targetSimilarity > 0.8 && currentDetection === targetLetter) {
        // Point counting logic
      }
    } else {
      if (!currentDetection) setDetectedLetter(null);
      setLiveAccuracy(prev => Math.max(0, prev - 5));
    }
  }, [detectionData, isReady, analyzePose, targetLetter]);

  const handleNext = () => setTargetIndex(prev => (prev + 1) % ALPHABET.length);
  const handlePrev = () => setTargetIndex(prev => (prev - 1 + ALPHABET.length) % ALPHABET.length);

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
        {/* Left: Camera */}
        {/* Left: Camera */}
        <WebcamTile
          videoRef={videoRef}
          results={results}
          isTrackingReady={isReady}
          targetLetter={targetLetter}
        />


        {/* Right: Sidebar Stack */}
        <div className="flex flex-col gap-4 h-full min-h-0">
          <GoalTile
            targetLetter={targetLetter}
            detectedLetter={detectedLetter}
            onOpenReference={() => setIsReferenceOpen(true)}
            onNext={handleNext}
            onPrev={handlePrev}
          />
          <ScoreTile score={liveAccuracy} totalScore={score} />
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
