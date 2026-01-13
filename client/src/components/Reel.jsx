import { motion } from "framer-motion";

// Símbolos para el efecto de movimiento borroso (fake strip)
const STRIP = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "🍀", "BAR"];

export const Reel = ({ symbol, spinning, delay }) => {
    return (
        <div className="relative w-24 h-32 bg-white/10 border-2 border-yellow-600/50 rounded-lg overflow-hidden shadow-inner flex items-center justify-center backdrop-blur-sm">

            {/* 1. Estado GIRANDO: Muestra una tira moviéndose rápido */}
            {spinning ? (
                <motion.div
                    className="flex flex-col gap-4 absolute"
                    animate={{ y: [0, -400] }}
                    transition={{
                        repeat: Infinity,
                        duration: 0.2,
                        ease: "linear",
                        delay: delay // Un pequeño retraso entre rodillos da realismo
                    }}
                >
                    {/* Repetimos la tira varias veces para el loop infinito */}
                    {[...STRIP, ...STRIP, ...STRIP].map((item, i) => (
                        <span key={i} className="text-5xl opacity-50 blur-[2px] filter grayscale-[30%]">
              {item}
            </span>
                    ))}
                </motion.div>
            ) : (
                /* 2. Estado FRENADO: Muestra el símbolo final con un golpe */
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-6xl drop-shadow-lg"
                >
                    {symbol}
                </motion.div>
            )}

            {/* Brillo overlay para efecto cristal */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
        </div>
    );
};