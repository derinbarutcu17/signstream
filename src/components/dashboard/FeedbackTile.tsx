import React from 'react';

interface FeedbackTileProps {
    confidence: number;
    fingerStates: string[];
    instruction?: string;
}

const FeedbackTile: React.FC<FeedbackTileProps> = ({ confidence, fingerStates, instruction }) => {
    const confidencePercent = Math.round(confidence * 100);

    return (
        <div className="flex-1 bento-tile p-5 bg-zinc-950/40 relative overflow-hidden group border-white/5 flex flex-col min-h-0">
            {/* Background Watermark */}
            <div className="absolute bottom-1 right-2 opacity-[0.02] pointer-events-none">
                <span className="text-[60px] mono-data text-red-500 font-black leading-none">HELP</span>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center mb-3 relative z-10 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
                    <span className="text-[9px] mono-data text-zinc-400 uppercase tracking-widest">Guide</span>
                </div>
                <span className="text-[8px] mono-data text-zinc-600 tracking-tighter uppercase">Technique Analysis</span>
            </div>

            {/* Data Content - Flexible */}
            <div className="flex-1 flex flex-col justify-center gap-2 relative z-10 font-mono min-h-0">
                {/* Instructions - REPLACING status section */}
                <div className="py-2.5 px-3 bg-red-500/5 rounded-lg border border-red-500/10 mb-1">
                    <span className="text-[8px] text-red-500/60 uppercase tracking-widest block mb-1">How to sign:</span>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-sans italic">
                        {instruction || 'Select a letter to see instructions.'}
                    </p>
                </div>

                {/* Confidence with bar */}
                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[9px]">
                        <span className="text-zinc-500 uppercase tracking-wider">Stability</span>
                        <span className={`font-bold tabular-nums ${confidencePercent > 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {confidencePercent}%
                        </span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-linear-to-r from-red-600 to-red-400 rounded-full transition-all duration-300"
                            style={{ width: `${confidencePercent}%` }}
                        />
                    </div>
                </div>

                {/* Finger States */}
                <div className="space-y-1.5 mt-1">
                    <span className="text-zinc-500 uppercase tracking-wider text-[9px]">Nodes</span>
                    <div className="flex flex-wrap gap-1">
                        {fingerStates.slice(0, 10).map((state, i) => (
                            <span
                                key={i}
                                className={`px-1.5 py-0.5 rounded border text-[8px] tracking-tight ${state === 'Searching...'
                                    ? 'bg-zinc-900/80 border-white/5 text-zinc-500'
                                    : 'bg-zinc-900 border-zinc-800 text-red-400'
                                    }`}
                            >
                                {state.replace('Extended', 'Ext').replace('Touching', 'Tch')}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FeedbackTile;
