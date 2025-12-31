import React from 'react';

interface ScoreTileProps {
    score: number;
    totalScore?: number;
}

const ScoreTile: React.FC<ScoreTileProps> = ({ score, totalScore = 0 }) => {
    const percentage = Math.min(Math.max(score, 0), 100);
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (circumference * percentage) / 100;

    return (
        <div className="flex-1 bento-tile p-5 flex flex-col border-white/5 bg-zinc-900/20 min-h-0">
            {/* Header - Compact */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <span className="text-[9px] mono-data text-zinc-500 uppercase tracking-widest">Progress</span>
                    <h3 className="text-sm font-bold text-white tracking-tight">Accuracy</h3>
                </div>
                <span className="text-[9px] mono-data text-green-500 font-bold px-2 py-0.5 bg-green-500/10 rounded-full border border-green-500/20">LIVE</span>
            </div>

            {/* Hero Ring - Takes most space */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-2">
                <div className="relative">
                    {/* Glow */}
                    <div className="absolute inset-0 blur-2xl bg-red-500/10 rounded-full scale-125" />

                    {/* Ring - Larger with viewBox scaling */}
                    <svg
                        viewBox="0 0 100 100"
                        className="w-[clamp(90px,14vh,160px)] h-[clamp(90px,14vh,160px)] transform -rotate-90 relative z-10"
                    >
                        <circle
                            cx="50" cy="50" r="45"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="transparent"
                            className="text-white/5"
                        />
                        <circle
                            cx="50" cy="50" r="45"
                            stroke="currentColor"
                            strokeWidth="5"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="text-red-500 transition-all duration-300 ease-out"
                            style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.6))' }}
                        />
                    </svg>

                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                        <span className="text-[clamp(1.35rem,4.5vh,2.7rem)] font-black text-white leading-none tabular-nums">
                            {percentage}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer - Session info */}
            <div className="shrink-0 flex justify-between items-center text-[9px] mono-data pt-2 border-t border-white/5">
                <span className="text-zinc-600 uppercase tracking-tighter">Matches: <span className="text-zinc-400 font-bold">{totalScore}</span></span>
                <span className="text-zinc-400">{percentage > 80 ? 'Perfect!' : percentage > 50 ? 'Good!' : 'Match...'}</span>
            </div>
        </div>
    );
};

export default ScoreTile;

