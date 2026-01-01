/**
 * useMLPrediction - Hook for ML-based gesture recognition
 * 
 * Encapsulates the RecognitionService prediction logic with proper
 * React patterns that satisfy strict lint rules.
 */

import { useState, useEffect, useCallback } from 'react';
import { RecognitionService, type PredictionResult, type Landmark, type TrainingStats } from '../lib/RecognitionService';

interface UseMLPredictionResult {
    isReady: boolean;
    prediction: PredictionResult | null;
    trainingStats: TrainingStats;
    train: (landmarks: Landmark[], label: string) => boolean;
    clearAll: () => void;
}

export function useMLPrediction(worldLandmarks: Landmark[] | null): UseMLPredictionResult {
    const [isReady, setIsReady] = useState(false);
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [trainingStats, setTrainingStats] = useState<TrainingStats>({});

    // Initialize ML Service
    useEffect(() => {
        let mounted = true;

        RecognitionService.initialize().then(ready => {
            if (mounted) {
                setIsReady(ready);
            }
        });

        return () => {
            mounted = false;
        };
    }, []);

    // Run prediction when landmarks change
    useEffect(() => {
        if (!isReady || !worldLandmarks) {
            return;
        }

        let cancelled = false;

        const runPrediction = async () => {
            const result = await RecognitionService.predict(worldLandmarks);
            if (!cancelled) {
                setPrediction(result);
            }
        };

        runPrediction();

        return () => {
            cancelled = true;
        };
    }, [isReady, worldLandmarks]);

    // Clear prediction when no landmarks
    useEffect(() => {
        if (!worldLandmarks && prediction !== null) {
            // Use timeout to move out of synchronous effect
            const timer = setTimeout(() => {
                setPrediction(null);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [worldLandmarks, prediction]);

    // Training function
    const train = useCallback((landmarks: Landmark[], label: string): boolean => {
        const success = RecognitionService.train(landmarks, label);
        if (success) {
            setTrainingStats(RecognitionService.getTrainingStats());
        }
        return success;
    }, []);

    // Clear all training data
    const clearAll = useCallback(() => {
        RecognitionService.clearAll();
        setTrainingStats({});
        setPrediction(null);
    }, []);

    return {
        isReady,
        prediction,
        trainingStats,
        train,
        clearAll
    };
}
