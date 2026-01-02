import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Hands } from '@mediapipe/hands';
import type { Results } from '@mediapipe/hands';
import { GestureLogic } from '../lib/GestureLogic';

export const useHandTracking = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const [isReady, setIsReady] = useState(false);
    const [results, setResults] = useState<Results | null>(null);

    // Use refs to persist across re-renders
    const handsRef = useRef<Hands | null>(null);
    const animationRef = useRef<number | null>(null);
    const isRunningRef = useRef(false);

    // Gesture stabilization refs - require consistent detection to switch
    const currentGestureRef = useRef<string | null>(null);
    const pendingGestureRef = useRef<string | null>(null);
    const gestureCountRef = useRef(0);
    const STABILITY_THRESHOLD = 3; // Need 3 consistent frames to switch

    // Smoothed accuracy value for less jittery display
    const smoothedSimilarityRef = useRef(0);

    // Stateless gesture logic - no state to track
    const [logic] = useState(() => new GestureLogic());

    // Stable callback for results
    const onResults = useCallback((detectionResults: Results) => {
        setResults(detectionResults);

        // Mark as ready once we receive any results (even without hands)
        if (!isRunningRef.current) {
            setIsReady(true);
            isRunningRef.current = true;
            console.log('[HandTracking] Detection active! Ready for recognition.');
        }
    }, []);


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
            // Smoothly decay to 0 when no hand detected
            smoothedSimilarityRef.current = smoothedSimilarityRef.current * 0.9;
            return {
                confidence: 0,
                fingerStates: ['Searching...'],
                handCount: 0,
                landmarks: null,
                worldLandmarks: null,
                bestMatch: null,
                similarity: smoothedSimilarityRef.current
            };
        }

        const worldLandmarks = results.multiHandWorldLandmarks[0];

        // Use new stateless GestureLogic for recognition
        const { match: rawMatch } = logic.analyze(worldLandmarks);

        // Gesture stabilization: require N consistent detections before switching
        let stableMatch = currentGestureRef.current;

        if (rawMatch !== pendingGestureRef.current) {
            // New gesture, start counting
            pendingGestureRef.current = rawMatch;
            gestureCountRef.current = 1;
        } else {
            // Same gesture, increment count
            gestureCountRef.current++;
        }

        // If we've seen the same gesture N times, accept it
        if (gestureCountRef.current >= STABILITY_THRESHOLD) {
            stableMatch = rawMatch;
            currentGestureRef.current = rawMatch;
        }

        // Use MediaPipe's hand detection confidence as the accuracy (not always 100%)
        const rawConfidence = results.multiHandedness?.[0]?.score || 0;

        // Apply exponential moving average smoothing (factor 0.15 = very smooth)
        const smoothingFactor = 0.15;
        smoothedSimilarityRef.current = smoothedSimilarityRef.current * (1 - smoothingFactor) + rawConfidence * smoothingFactor;

        return {
            confidence: rawConfidence,
            fingerStates: stableMatch ? [`Detected: ${stableMatch}`] : ['Analyzing...'],
            handCount: results.multiHandLandmarks?.length || 0,
            landmarks: results.multiHandLandmarks[0],
            worldLandmarks: worldLandmarks,
            bestMatch: stableMatch,
            similarity: smoothedSimilarityRef.current
        };
    }, [results, logic, STABILITY_THRESHOLD]);

    // Debug logging effect
    useEffect(() => {
        if (detectionData.similarity > 0) {
            console.log(`[HandTracking] Score: ${detectionData.similarity.toFixed(2)} | Match: ${detectionData.bestMatch || 'None'}`);
        }
    }, [detectionData.bestMatch, detectionData.similarity]);

    // Keyboard listener for calibration (Spacebar logs current detection)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && detectionData.worldLandmarks) {
                e.preventDefault();
                console.log('=== CALIBRATION TRIGGERED ===');
                console.log(`Current: ${detectionData.bestMatch} (${(detectionData.similarity * 100).toFixed(0)}%)`);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [detectionData]);

    return {
        isReady,
        results,
        detectionData,
    };
};


