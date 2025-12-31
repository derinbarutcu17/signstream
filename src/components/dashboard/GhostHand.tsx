import React from 'react';
import { motion } from 'framer-motion';

interface GhostHandProps {
    targetLetter: string;
    opacity?: number;
}

// Procedural Rig Definitions
// Each finger: { rotation: deg (relative to palm), curl: 0 (straight) to 1 (full curl) }
// Palm is center.
type FingerConfig = { rotation: number; curl: number };
type PoseConfig = {
    thumb: { rotation: number; curl: number; x: number; y: number };
    index: FingerConfig;
    middle: FingerConfig;
    ring: FingerConfig;
    pinky: FingerConfig;
};

const DEFAULT_POSE: PoseConfig = {
    thumb: { rotation: 45, curl: 0, x: 20, y: 10 },
    index: { rotation: -10, curl: 0 },
    middle: { rotation: 0, curl: 0 },
    ring: { rotation: 10, curl: 0 },
    pinky: { rotation: 20, curl: 0 },
};

// Rig Poses for Supported Letters
const POSES: Record<string, PoseConfig> = {
    'A': {
        thumb: { rotation: 0, curl: 0, x: 25, y: -10 }, // Thumb Side straight up
        index: { rotation: -10, curl: 1 }, // Folded
        middle: { rotation: 0, curl: 1 },
        ring: { rotation: 10, curl: 1 },
        pinky: { rotation: 20, curl: 1 },
    },
    'B': {
        thumb: { rotation: 90, curl: 0.8, x: 10, y: 10 }, // Tucked
        index: { rotation: -5, curl: 0 }, // Straight
        middle: { rotation: 0, curl: 0 },
        ring: { rotation: 5, curl: 0 },
        pinky: { rotation: 10, curl: 0 },
    },
    'C': {
        thumb: { rotation: 45, curl: 0.2, x: 25, y: 20 },
        index: { rotation: -20, curl: 0.4 }, // Curved
        middle: { rotation: -10, curl: 0.4 },
        ring: { rotation: 0, curl: 0.4 },
        pinky: { rotation: 10, curl: 0.4 },
    },
    'D': {
        thumb: { rotation: 60, curl: 0.5, x: 15, y: 10 }, // Touching middle
        index: { rotation: -5, curl: 0 }, // Up
        middle: { rotation: 0, curl: 0.8 }, // Rounded
        ring: { rotation: 10, curl: 0.8 },
        pinky: { rotation: 20, curl: 0.8 },
    },
    // Add default fallbacks for others for now
};

const FingerBone = ({ config, length, color = "#ef4444" }: { config: FingerConfig, length: number, color?: string }) => {
    // 2-segment finger
    // Base segment
    const baseLen = length * 0.6;
    const tipLen = length * 0.4;

    // Curl affects the tip angle relative to base
    // Curl 0 = 0deg, Curl 1 = 90deg+
    const tipAngle = config.curl * 110;
    // Curl also rotates the base slightly inwards for natural closing
    const baseAngle = config.curl * 10;

    return (
        <motion.g
            animate={{ rotate: config.rotation }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
        >
            {/* Knuckle */}
            <circle r="4" fill={color} fillOpacity={0.5} />

            {/* Base Bone */}
            <motion.line
                x1="0" y1="0" x2="0" y2={-baseLen}
                stroke={color} strokeWidth="2" strokeLinecap="round"
                initial={false}
                animate={{ rotate: baseAngle }}
            />

            {/* Joint & Tip */}
            <motion.g
                initial={false}
                animate={{ y: -baseLen, rotate: baseAngle, x: 0 }}
            >
                <circle r="3" fill={color} fillOpacity={0.5} />
                <motion.line
                    x1="0" y1="0" x2="0" y2={-tipLen}
                    stroke={color} strokeWidth="2" strokeLinecap="round"
                    animate={{ rotate: tipAngle }}
                />
                <motion.circle
                    cy={-tipLen} r="2" fill={color}
                    animate={{ rotate: tipAngle }}
                    style={{ originY: 0 }}
                />
            </motion.g>
        </motion.g>
    );
};

const ThumbBone = ({ config, color = "#ef4444" }: { config: { rotation: number, curl: number, x: number, y: number }, color?: string }) => {
    // Thumb simpler logic
    const len = 50;
    return (
        <motion.g
            animate={{ x: config.x, y: config.y, rotate: config.rotation }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
        >
            <circle r="5" fill={color} fillOpacity={0.5} />
            <motion.path
                d={`M 0 0 Q 10 ${-len / 2} 0 ${-len}`}
                stroke={color} strokeWidth="2" fill="none"
                animate={{ d: `M 0 0 Q ${config.curl * 20} ${-len / 2} ${config.curl * -10} ${-len}` }}
            />
            <circle cy={-len} r="3" fill={color} fillOpacity={0.8} />
        </motion.g>
    )
}

export const GhostHand: React.FC<GhostHandProps> = ({ targetLetter, opacity = 0.3 }) => {
    const pose = POSES[targetLetter] || POSES['A'] || DEFAULT_POSE; // Fallback to A for now if missing

    // Scale and positioning
    // ViewBox 0 0 200 200. Palm Center at 100, 130

    return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <motion.svg
                viewBox="0 0 200 250"
                className="w-full h-full max-w-xs max-h-75"
                animate={{ opacity }}
            >
                {/* Palm Center */}
                <g transform="translate(100, 150)">
                    {/* Palm Shape */}
                    <motion.path
                        d="M -30 -10 Q 0 -15 30 -10 L 25 40 Q 0 45 -25 40 Z"
                        fill="#ef4444" fillOpacity={0.1} stroke="#ef4444" strokeWidth="1" strokeOpacity={0.5}
                    />

                    {/* Pinky Base (-30) */}
                    <g transform="translate(-30, -5)">
                        <FingerBone config={pose.pinky} length={45} />
                    </g>
                    {/* Ring Base (-10) */}
                    <g transform="translate(-10, -12)">
                        <FingerBone config={pose.ring} length={55} />
                    </g>
                    {/* Middle Base (10) */}
                    <g transform="translate(10, -14)">
                        <FingerBone config={pose.middle} length={60} />
                    </g>
                    {/* Index Base (30) */}
                    <g transform="translate(30, -8)">
                        <FingerBone config={pose.index} length={50} />
                    </g>

                    {/* Thumb Base */}
                    <ThumbBone config={pose.thumb} />
                </g>
            </motion.svg>
        </div>
    );
};
