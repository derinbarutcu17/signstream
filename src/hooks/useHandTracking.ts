import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Hands } from '@mediapipe/hands';
import type { Results } from '@mediapipe/hands';
import { GestureEngine } from '../lib/GestureEngine';
import { VectorEngine } from '../lib/VectorEngine';

export const useHandTracking = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const [isReady, setIsReady] = useState(false);
    const [results, setResults] = useState<Results | null>(null);

    // Use refs to persist across re-renders
    const handsRef = useRef<Hands | null>(null);
    const animationRef = useRef<number | null>(null);
    const isRunningRef = useRef(false);

    // Engine Instances
    // Using useState with initializer instead of useRef to avoid "Accessing refs during render" lint
    const [engine] = useState(() => new GestureEngine());
    const [vectorEngine] = useState(() => new VectorEngine());

    // Stable callback for results
    const onResults = useCallback((detectionResults: Results) => {
        setResults(detectionResults);

        // Update physics engine
        if (detectionResults) {
            engine.update(detectionResults);
        }

        // Mark as ready once we receive any results (even without hands)
        if (!isRunningRef.current) {
            setIsReady(true);
            isRunningRef.current = true;
            console.log('[HandTracking] Detection active! Ready for recognition.');
        }
    }, [engine]);


    // Initialize MediaPipe only once
    useEffect(() => {
        // Skip if already initialized
        if (handsRef.current) {
            console.log('[HandTracking] Already initialized, skipping...');
            return;
        }

        console.log('[HandTracking] Initializing MediaPipe Hands...');

        const hands = new Hands({
            locateFile: (file) => {
                console.log('[HandTracking] Loading:', file);
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            },
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        hands.onResults(onResults);
        handsRef.current = hands;

        console.log('[HandTracking] MediaPipe initialized');

        // Cleanup only on actual unmount
        return () => {
            console.log('[HandTracking] Cleanup called');
            // Don't actually close in dev mode - let it persist
        };
    }, [onResults]);

    // Detection loop - separate effect
    useEffect(() => {
        const runLoop = async () => {
            const video = videoRef.current;
            const hands = handsRef.current;

            if (video && hands && video.readyState >= 2 && video.videoWidth > 0) {
                try {
                    await hands.send({ image: video });
                } catch {
                    // Silently ignore errors during detection
                }
            }

            animationRef.current = requestAnimationFrame(runLoop);
        };

        // Start loop after a short delay to let video initialize
        const startLoop = () => {
            console.log('[HandTracking] Starting detection loop...');
            runLoop();
        };

        const timer = setTimeout(startLoop, 500);

        return () => {
            clearTimeout(timer);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [videoRef]);

    // Compute finger states and metadata from results
    const detectionData = useMemo(() => {
        if (!results?.multiHandWorldLandmarks?.[0]) {
            return {
                confidence: 0,
                fingerStates: ['Searching...'],
                handCount: 0,
                landmarks: null,
                worldLandmarks: null,
                bestMatch: null,
                similarity: 0
            };
        }

        const worldLandmarks = results.multiHandWorldLandmarks[0];
        const states: string[] = [];

        // 1. Finger States
        const fingers: Array<'Index' | 'Middle' | 'Ring' | 'Pinky'> = ['Index', 'Middle', 'Ring', 'Pinky'];
        fingers.forEach(f => {
            const state = engine.getFingerState(f);
            if (state !== 'Closed') states.push(`${f} ${state}`);
        });

        // 2. Thumb State
        const thumbState = engine.getThumbState();
        if (thumbState !== 'Closed') states.push(`Thumb ${thumbState}`);

        // 3. Semantic States
        const semanticStates = engine.getSemanticStates();
        states.push(...semanticStates);

        // 4. Vector Match (Internal to hook for stability)
        const match = vectorEngine.matchPose(worldLandmarks);

        return {
            confidence: results.multiHandedness?.[0]?.score || 0,
            fingerStates: states.length > 0 ? states : ['Fist / Closed'],
            handCount: results.multiHandLandmarks?.length || 0,
            landmarks: results.multiHandLandmarks[0],
            worldLandmarks: worldLandmarks,
            bestMatch: match.score > 0.6 ? match.letter : null,
            similarity: match.score
        };
    }, [results, engine, vectorEngine]);

    // Debug logging effect
    useEffect(() => {
        if (detectionData.similarity > 0) {
            console.log(`[HandTracking] Raw Score: ${detectionData.similarity.toFixed(2)} | Best Match: ${detectionData.bestMatch || 'None'}`);
        }
    }, [detectionData.bestMatch, detectionData.similarity]);

    return {
        isReady,
        results,
        detectionData,
    };
};


