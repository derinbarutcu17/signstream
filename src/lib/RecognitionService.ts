/**
 * RecognitionService - KNN-based Machine Learning Gesture Recognition
 * 
 * This service uses TensorFlow.js and a K-Nearest Neighbors classifier
 * to learn gestures from user examples and predict them in real-time.
 * 
 * Features:
 * - Adapts to YOUR hand shape and gestures
 * - No hard-coded math or angles
 * - Confidence threshold prevents bad guesses
 * - Proper tensor memory management for 60fps performance
 */

import * as tf from '@tensorflow/tfjs';
import * as knn from '@tensorflow-models/knn-classifier';

// Type definitions for MediaPipe landmarks
export interface Landmark {
    x: number;
    y: number;
    z: number;
}

// Prediction result with confidence
export interface PredictionResult {
    label: string;
    confidence: number;
}

// Training example count per label
export interface TrainingStats {
    [label: string]: number;
}

/**
 * Singleton Machine Learning Service for Gesture Recognition
 * Uses KNN (K-Nearest Neighbors) to learn from examples
 */
class RecognitionServiceClass {
    private classifier: knn.KNNClassifier | null = null;
    private isReady = false;
    private isInitializing = false;
    private confidenceThreshold = 0.75; // Require 75% confidence minimum

    constructor() {
        // Don't auto-initialize - wait for explicit call
    }

    /**
     * Initialize TensorFlow.js and KNN classifier
     * Call this once when the app starts
     */
    public async initialize(): Promise<boolean> {
        if (this.isReady) return true;
        if (this.isInitializing) return false;

        this.isInitializing = true;

        try {
            // Initialize TensorFlow.js backend
            await tf.ready();
            console.log('[RecognitionService] TensorFlow.js backend:', tf.getBackend());

            // Create KNN classifier
            this.classifier = knn.create();
            this.isReady = true;
            this.isInitializing = false;

            console.log('[RecognitionService] ✅ ML Engine Ready');
            return true;
        } catch (error) {
            console.error('[RecognitionService] ❌ Failed to initialize:', error);
            this.isInitializing = false;
            return false;
        }
    }

    /**
     * Check if the service is ready for use
     */
    public getIsReady(): boolean {
        return this.isReady;
    }

    /**
     * Get the number of classes (unique labels) the classifier knows
     */
    public getNumClasses(): number {
        if (!this.classifier) return 0;
        return this.classifier.getNumClasses();
    }

    /**
     * Get training statistics (example count per label)
     */
    public getTrainingStats(): TrainingStats {
        if (!this.classifier) return {};
        return this.classifier.getClassExampleCount();
    }

    /**
     * Train the classifier with a new example
     * 
     * @param landmarks - 21 MediaPipe hand landmarks (worldLandmarks recommended)
     * @param label - The gesture label (e.g., 'A', 'B', 'V')
     * @returns true if training succeeded
     */
    public train(landmarks: Landmark[], label: string): boolean {
        if (!this.isReady || !this.classifier) {
            console.warn('[RecognitionService] Cannot train - not ready');
            return false;
        }

        if (!landmarks || landmarks.length < 21) {
            console.warn('[RecognitionService] Cannot train - invalid landmarks');
            return false;
        }

        // Convert landmarks to feature vector
        // Flatten 21 points × 3 coordinates = 63 features
        const features = this.landmarksToFeatures(landmarks);

        // Create tensor and add example
        const tensor = tf.tensor1d(features);

        try {
            this.classifier.addExample(tensor, label);
            console.log(`[RecognitionService] 📚 Trained "${label}" (Total: ${this.getTrainingStats()[label] || 0} examples)`);
            return true;
        } finally {
            // CRITICAL: Always dispose tensor to prevent memory leak
            tensor.dispose();
        }
    }

    /**
     * Predict the gesture from current landmarks
     * 
     * @param landmarks - 21 MediaPipe hand landmarks
     * @returns Prediction result with label and confidence, or null if uncertain
     */
    public async predict(landmarks: Landmark[]): Promise<PredictionResult | null> {
        if (!this.isReady || !this.classifier) {
            return null;
        }

        // Need at least one trained class to predict
        if (this.classifier.getNumClasses() === 0) {
            return null;
        }

        if (!landmarks || landmarks.length < 21) {
            return null;
        }

        // Convert landmarks to feature vector
        const features = this.landmarksToFeatures(landmarks);
        const tensor = tf.tensor1d(features);

        try {
            // Predict using KNN
            const result = await this.classifier.predictClass(tensor);

            // Get confidence for the predicted label
            const confidence = result.confidences[result.label];

            // Only return if confidence exceeds threshold
            if (confidence >= this.confidenceThreshold) {
                return {
                    label: result.label,
                    confidence: confidence
                };
            }

            return null;
        } catch (error) {
            console.error('[RecognitionService] Prediction error:', error);
            return null;
        } finally {
            // CRITICAL: Always dispose tensor to prevent memory leak
            tensor.dispose();
        }
    }

    /**
     * Clear all training data for a specific label
     */
    public clearLabel(label: string): void {
        if (!this.classifier) return;
        this.classifier.clearClass(label);
        console.log(`[RecognitionService] 🗑️ Cleared training data for "${label}"`);
    }

    /**
     * Clear all training data
     */
    public clearAll(): void {
        if (!this.classifier) return;
        this.classifier.clearAllClasses();
        console.log('[RecognitionService] 🗑️ Cleared all training data');
    }

    /**
     * Set the confidence threshold (0-1)
     */
    public setConfidenceThreshold(threshold: number): void {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`[RecognitionService] Confidence threshold set to ${(this.confidenceThreshold * 100).toFixed(0)}%`);
    }

    /**
     * Convert landmarks array to normalized feature vector
     * Uses relative positions for rotation/translation invariance
     */
    private landmarksToFeatures(landmarks: Landmark[]): number[] {
        // Get wrist as origin for relative positioning
        const wrist = landmarks[0];

        // Calculate features relative to wrist
        const features: number[] = [];

        for (let i = 0; i < 21; i++) {
            features.push(landmarks[i].x - wrist.x);
            features.push(landmarks[i].y - wrist.y);
            features.push(landmarks[i].z - wrist.z);
        }

        // Normalize the feature vector (helps with scale invariance)
        const magnitude = Math.sqrt(features.reduce((sum, v) => sum + v * v, 0)) || 1;
        return features.map(v => v / magnitude);
    }

    /**
     * Export training data as JSON (for saving/loading)
     */
    public async exportData(): Promise<string | null> {
        if (!this.classifier) return null;
        const dataset = this.classifier.getClassifierDataset();

        const dataToSave: Record<string, number[][]> = {};

        for (const [label, tensor] of Object.entries(dataset)) {
            const data = await (tensor as tf.Tensor2D).array();
            dataToSave[label] = data;
        }

        return JSON.stringify(dataToSave);
    }

    /**
     * Import training data from JSON
     */
    public async importData(jsonData: string): Promise<boolean> {
        if (!this.classifier) return false;

        try {
            const data = JSON.parse(jsonData) as Record<string, number[][]>;

            const dataset: Record<string, tf.Tensor2D> = {};
            for (const [label, examples] of Object.entries(data)) {
                dataset[label] = tf.tensor2d(examples);
            }

            this.classifier.setClassifierDataset(dataset);
            console.log('[RecognitionService] 📥 Imported training data');
            return true;
        } catch (error) {
            console.error('[RecognitionService] Failed to import data:', error);
            return false;
        }
    }
}

// Singleton instance
export const RecognitionService = new RecognitionServiceClass();
