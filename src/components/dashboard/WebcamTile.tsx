import React, { useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import type { Results } from '@mediapipe/hands';
import { HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { GhostHand } from './GhostHand';

interface WebcamTileProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    results: Results | null;
    isTrackingReady: boolean;
    targetLetter: string;
}

const WebcamTile = ({ videoRef, results, isTrackingReady, targetLetter }: WebcamTileProps) => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Connect webcam video element to the passed videoRef
    useEffect(() => {
        const checkVideo = () => {
            if (webcamRef.current?.video) {
                // Mutate the ref to point to the video element
                (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = webcamRef.current.video;
                console.log('[WebcamTile] Video element connected:', webcamRef.current.video.videoWidth, 'x', webcamRef.current.video.videoHeight);
            }
        };

        // Check immediately and also on interval until connected
        checkVideo();
        const interval = setInterval(() => {
            if (webcamRef.current?.video && webcamRef.current.video.readyState >= 2) {
                checkVideo();
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [videoRef]);

    // Draw hand landmarks on canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const video = webcamRef.current?.video;

        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Match canvas size to video
        if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw landmarks if we have results
        if (results?.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // Draw connections (bones)
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                    color: '#ef4444',
                    lineWidth: 4,
                });

                // Draw landmarks (joints)
                drawLandmarks(ctx, landmarks, {
                    color: '#ffffff',
                    fillColor: '#ef4444',
                    lineWidth: 2,
                    radius: 5,
                });
            }
        }
    }, [results]);


    return (
        <div className="bento-tile bento-tile-active relative bg-black/40 group overflow-hidden h-full">
            {/* Video Container */}
            <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    className="w-full h-full object-cover scale-x-[-1]"
                    videoConstraints={{
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    }}
                />

                {/* Ghost Hand Overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 scale-x-[-1] opacity-40">
                    <GhostHand targetLetter={targetLetter} />
                </div>

                {/* Canvas Overlay for Hand Tracking */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none z-20"
                    style={{
                        objectFit: 'cover',
                    }}
                />
            </div>

            {/* Bottom Labels */}
            <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-0.5 pointer-events-none">
                <h2 className="text-xl font-bold text-white tracking-tight">Main Stage</h2>
                <p className="text-[10px] text-zinc-400 mono-data tracking-widest opacity-80">
                    {isTrackingReady ? 'Hand Tracking Active' : 'Initializing MediaPipe...'}
                </p>
            </div>
        </div>
    );
};

export default WebcamTile;
