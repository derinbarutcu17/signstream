import { useState, useEffect, useRef } from 'react';

/**
 * A hook that debounces rapid changes in prediction by using a sliding window.
 * Returns a stable prediction only if a consensus is reached over the last N frames.
 * 
 * @param rawPrediction The noisy prediction from the current frame (e.g. 'A', 'B', or null)
 * @param windowSize Number of frames to keep in buffer (default 10)
 * @param threshold Consensus percentage required (0.0 - 1.0, default 0.7)
 */
export const useStablePrediction = (
    rawPrediction: string | null,
    windowSize: number = 10,
    threshold: number = 0.7
) => {
    const [stablePrediction, setStablePrediction] = useState<string | null>(null);

    // Buffer to store history
    const bufferRef = useRef<(string | null)[]>([]);

    useEffect(() => {
        // 1. Add new prediction to buffer
        bufferRef.current.push(rawPrediction);

        // 2. Trim buffer
        if (bufferRef.current.length > windowSize) {
            bufferRef.current.shift();
        }

        // 3. Count frequencies
        const counts: Record<string, number> = {};
        let maxCount = 0;
        let mostFrequent: string | null = null;
        let nullCount = 0;

        for (const pred of bufferRef.current) {
            if (pred === null) {
                nullCount++;
                continue;
            }

            counts[pred] = (counts[pred] || 0) + 1;

            if (counts[pred] > maxCount) {
                maxCount = counts[pred];
                mostFrequent = pred;
            }
        }

        // 4. Check consensus
        const total = bufferRef.current.length;
        let nextPrediction = stablePrediction;

        // Debug: log consensus
        if (mostFrequent) {
            console.log(`[StablePrediction] Consensus: ${mostFrequent} (${maxCount}/${total} = ${(maxCount / total * 100).toFixed(0)}%)`);
        }

        if (mostFrequent && (maxCount / total >= threshold)) {
            nextPrediction = mostFrequent;
        } else if (nullCount / total >= threshold) {
            nextPrediction = null;
        }

        if (nextPrediction !== stablePrediction) {
            console.log(`[StablePrediction] Changed to: ${nextPrediction}`);
            setStablePrediction(nextPrediction);
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rawPrediction, windowSize, threshold]);

    return stablePrediction;
};
