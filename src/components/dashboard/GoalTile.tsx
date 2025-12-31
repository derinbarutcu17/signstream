import { HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface GoalTileProps {
    targetLetter: string;
    detectedLetter: string | null;
    onOpenReference?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
}

const GoalTile: React.FC<GoalTileProps> = ({ targetLetter, detectedLetter, onOpenReference, onNext, onPrev }) => {
    const isCorrect = detectedLetter === targetLetter;

    return (
        <div className="flex-1 bento-tile flex flex-col p-5 border-white/5 bg-zinc-900/30 min-h-0 relative group">
            {/* Header - Compact */}
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <span className="text-[9px] mono-data text-zinc-500 uppercase tracking-widest">Challenge vs Detected</span>
                    <h3 className="text-sm font-bold text-white tracking-tight">Active Letter</h3>
                </div>
                <button
                    onClick={onOpenReference}
                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-red-500 transition-all border border-transparent hover:border-red-500/30 active:scale-95"
                    title="Gesture Reference Guide"
                >
                    <HelpCircle size={16} />
                </button>
            </div>

            {/* Hero Letters - Flexible center with Arrows */}
            <div className="flex-1 flex items-center justify-between min-h-0 px-2 gap-4">
                <button
                    onClick={onPrev}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-600 hover:text-white transition-all active:scale-90"
                >
                    <ChevronLeft size={24} />
                </button>

                <div className="flex items-center gap-6">
                    {/* Challenge Letter */}
                    <div className="relative text-center">
                        <span className="block text-[8px] mono-data text-zinc-500 uppercase mb-1 tracking-tighter">Target</span>
                        <div className="relative">
                            <div className="absolute inset-0 blur-2xl bg-red-500/10 rounded-full scale-125" />
                            <span className="relative text-[clamp(2.5rem,10vh,6rem)] font-black text-white select-none leading-none">
                                {targetLetter}
                            </span>
                        </div>
                    </div>

                    <div className="h-12 w-px bg-white/5 mx-2" />

                    {/* Detected Letter */}
                    <div className="relative text-center">
                        <span className="block text-[8px] mono-data text-zinc-500 uppercase mb-1 tracking-tighter">Detected</span>
                        <div className="relative">
                            <div className={`absolute inset-0 blur-2xl rounded-full scale-125 ${isCorrect ? 'bg-green-500/20' : 'bg-red-500/10'}`} />
                            <span className={`relative text-[clamp(2.5rem,10vh,6rem)] font-black select-none leading-none ${isCorrect ? 'text-green-500' : 'text-zinc-600'}`}>
                                {detectedLetter || '?'}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onNext}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-600 hover:text-white transition-all active:scale-90"
                >
                    <ChevronRight size={24} />
                </button>
            </div>

            {/* Footer - Compact status */}
            <div className="shrink-0 py-2 px-3 bg-black/30 rounded-lg border border-white/5 text-center">
                <p className={`text-[11px] uppercase tracking-tighter ${isCorrect ? 'text-green-400 font-bold' : 'text-zinc-500'}`}>
                    {isCorrect ? 'Perfect Match' : 'Adjust your hand...'}
                </p>
            </div>
        </div>
    );
};


export default GoalTile;
