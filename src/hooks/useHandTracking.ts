import { useState, useEffect, useRef, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import type { Results } from '@mediapipe/hands';
import { GestureEngine } from '../lib/GestureEngine';

export const useHandTracking = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
    const [isReady, setIsReady] = useState(false);
    const [results, setResults] = useState<Results | null>(null);

    // Use refs to persist across re-renders
    const handsRef = useRef<Hands | null>(null);
    const animationRef = useRef<number | null>(null);
    const isRunningRef = useRef(false);

    // Engine Instance
    const engineRef = useRef<GestureEngine>(new GestureEngine());

    // Stable callback for results
    const onResults = useCallback((detectionResults: Results) => {
        setResults(detectionResults);

        // Update physics engine
        if (detectionResults) {
            engineRef.current.update(detectionResults);
        }

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
                } catch (err) {
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
    const detectionData = {
        confidence: results?.multiHandedness?.[0]?.score || 0,
        fingerStates: (() => {
            if (!results?.multiHandLandmarks?.[0]) return ['Searching...'];

            const engine = engineRef.current;
            const states: string[] = [];

            // 1. Finger States (Engine uses Angle-Based logic now)
            const fingers: Array<'Index' | 'Middle' | 'Ring' | 'Pinky'> = ['Index', 'Middle', 'Ring', 'Pinky'];

            fingers.forEach(f => {
                const state = engine.getFingerState(f);
                if (state !== 'Closed') states.push(`${f} ${state}`);
            });

            // 2. Thumb State
            const thumbState = engine.getThumbState();
            if (thumbState === 'Extended') states.push('Thumb Extended');
            if (thumbState === 'Over') states.push('Thumb Over');
            if (thumbState === 'Under') states.push('Thumb Under');
            if (thumbState === 'Side') states.push('Thumb Side');

            // 3. Semantic States (Pinch, Circular, Crossed)
            const semanticStates = engine.getSemanticStates();
            states.push(...semanticStates);

            // SPECIAL CASE: Resolve F vs B confusion
            // If Thumb is touching Index (Pinch), Index is effectively formed into a loop.
            // It should NOT count as "Index Extended" for the purpose of 'B' detection (Open Hand).
            if (states.includes('Thumb Touching Index')) {
                const idx = states.indexOf('Index Extended');
                if (idx > -1) states.splice(idx, 1);
            }

            return states.length > 0 ? states : ['Fist / Closed'];
        })(),
        handCount: results?.multiHandLandmarks?.length || 0,
        landmarks: results?.multiHandLandmarks?.[0] || null,
        worldLandmarks: results?.multiHandWorldLandmarks?.[0] || null
    };


    return {
        isReady,
        results,
        detectionData,
    };
};


