import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ReferenceGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const GESTURES = [
    { letter: 'A', name: 'Fist', description: 'Closed fist with thumb against the side of the index finger.' },
    { letter: 'B', name: 'Flat', description: 'Open palm with fingers together and thumb tucked across the palm.' },
    { letter: 'C', name: 'Curved', description: 'Hand curved into a "C" shape, fingers and thumb separated.' },
    { letter: 'D', name: 'Index', description: 'Index finger points up, others curved to touch the thumb.' },
    { letter: 'E', name: 'Folded', description: 'All fingers folded down with the thumb tucked under.' },
    { letter: 'F', name: 'Touch', description: 'Index and thumb tips touch, other fingers extended and spread.' },
    { letter: 'I', name: 'Pinky', description: 'Hand in a fist with only the pinky finger extended up.' },
    { letter: 'L', name: 'L-Shape', description: 'Index and thumb extended, forming a "L" shape.' },
    { letter: 'O', name: 'Circle', description: 'All fingers curved to touch the thumb, forming an "O".' },
    { letter: 'R', name: 'Crossed', description: 'Index and middle fingers extended and crossed.' },
    { letter: 'S', name: 'Solid', description: 'Closed fist with the thumb tucked over the fingers.' },
    { letter: 'U', name: 'Together', description: 'Index and middle fingers extended and held together.' },
    { letter: 'V', name: 'Peace', description: 'Index and middle fingers extended and separated.' },
    { letter: 'W', name: 'Three', description: 'Index, middle, and ring fingers extended and spread.' },
    { letter: 'Y', name: 'Hang Loose', description: 'Thumb and pinky extended, other fingers folded.' },
];

const ReferenceGuide: React.FC<ReferenceGuideProps> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-100"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-zinc-950 border border-white/10 rounded-2xl p-6 z-101 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-white">ASL Reference Guide</h2>
                                <p className="text-[10px] mono-data text-zinc-500 uppercase tracking-widest mt-1">Gestural Library v2.0 • 15 Letters</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Area */}
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                            {GESTURES.map((g) => (
                                <div key={g.letter} className="p-4 bg-zinc-900/50 border border-white/5 rounded-xl flex gap-4 group hover:border-red-500/30 transition-colors">
                                    <div className="w-16 h-16 shrink-0 bg-red-500 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/20">
                                        <span className="text-3xl font-black text-zinc-950">{g.letter}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">{g.name}</h4>
                                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                                            {g.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between shrink-0">
                            <span className="text-[9px] mono-data text-zinc-600 uppercase tracking-tighter">Engine: Vector Geometry 2.0</span>
                            <span className="text-[9px] mono-data text-red-500 font-bold uppercase cursor-default">Scroll for more</span>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};


export default ReferenceGuide;
