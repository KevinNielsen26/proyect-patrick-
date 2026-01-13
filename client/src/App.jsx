import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Reel } from './components/Reel'; // Asegúrate de importar el componente
import './index.css';

// Conexión al backend
const socket = io('http://localhost:3001');

function App() {
    const [connected, setConnected] = useState(false);
    const [balance, setBalance] = useState(1000);
    const [reels, setReels] = useState(['🍀', '🍀', '🍀']); // Inicial estético
    const [spinning, setSpinning] = useState(false);
    const [message, setMessage] = useState('¡Prueba tu suerte! 🍀');
    const [lastWin, setLastWin] = useState(0);

    useEffect(() => {
        socket.on('connect', () => {
            setConnected(true);
            console.log('Conectado al servidor Socket.io');
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        // --- NUEVO: Escuchar actualización de saldo inicial ---
        socket.on('balance_update', (newBalance) => {
            setBalance(newBalance);
        });

        socket.on('spin_result', (data) => {
            if (data.success) {
                // Pequeño delay artificial para que la animación dure al menos 2 segundos
                setTimeout(() => {
                    setReels(data.reels);
                    setBalance(data.newBalance);
                    setLastWin(data.payout);
                    setSpinning(false); // Aquí se detienen los rodillos

                    if (data.payout > 0) {
                        setMessage(`¡BIG WIN! Ganaste $${data.payout} 🎉`);
                    } else {
                        setMessage('Inténtalo de nuevo...');
                    }
                }, 2000);
            }
        });

        socket.on('spin_error', (err) => {
            setSpinning(false);
            setMessage(`❌ Error: ${err.message}`);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('balance_update');
            socket.off('spin_result');
            socket.off('spin_error');
        };
    }, []);

    const handleSpin = () => {
        if (balance < 10) return;
        setSpinning(true);
        setMessage("¡Buena suerte! 🤞");
        setLastWin(0);

        // Enviamos la petición
        socket.emit('spin_request', { betAmount: 10 });
    };

    return (
        <div className="min-h-screen bg-green-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Fondo Decorativo */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500 via-green-900 to-black"></div>

            {/* Título */}
            <motion.h1
                className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-md mb-8 z-10"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                🍀 Patrick Casino
            </motion.h1>

            {/* Máquina Tragamonedas */}
            <div className="bg-green-900/80 p-8 rounded-3xl border-8 border-yellow-600 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-lg w-full z-10 relative">

                {/* Cabecera de la Máquina */}
                <div className="flex justify-between items-center mb-6 bg-black/40 p-3 rounded-xl border border-white/10">
                    <div className="flex flex-col text-left">
                        <span className="text-xs text-green-300 uppercase tracking-widest">Saldo</span>
                        <span className="text-2xl font-mono text-white">${balance}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-xs text-yellow-300 uppercase tracking-widest">Estado</span>
                        <span className={`text-sm font-bold ${connected ? 'text-green-400' : 'text-red-500'}`}>
                            {connected ? 'CONNECTED' : 'OFFLINE'}
                        </span>
                    </div>
                </div>

                {/* Área de Rodillos */}
                <div className="flex justify-center gap-2 md:gap-4 mb-8 bg-black/60 p-6 rounded-xl border-4 border-yellow-500/30 shadow-inner">
                    <Reel symbol={reels[0]} spinning={spinning} delay={0} />
                    <Reel symbol={reels[1]} spinning={spinning} delay={0.1} />
                    <Reel symbol={reels[2]} spinning={spinning} delay={0.2} />
                </div>

                {/* Mensaje Dinámico */}
                <div className="h-12 flex items-center justify-center mb-4">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={message}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className={`text-xl font-bold ${lastWin > 0 ? 'text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]' : 'text-white'}`}
                        >
                            {message}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Botón de Acción */}
                <motion.button
                    whileHover={!spinning && connected ? { scale: 1.05 } : {}}
                    whileTap={!spinning && connected ? { scale: 0.95 } : {}}
                    onClick={handleSpin}
                    disabled={spinning || !connected || balance < 10}
                    className={`
                        w-full py-5 rounded-xl text-2xl font-black uppercase tracking-widest shadow-lg transition-all
                        ${spinning
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed border-b-4 border-gray-900'
                        : 'bg-gradient-to-b from-yellow-400 to-yellow-600 text-green-950 border-b-8 border-yellow-800 hover:brightness-110 active:border-b-0 active:translate-y-2'
                    }
                    `}
                >
                    {spinning ? 'GIRANDO...' : 'GIRAR ($10)'}
                </motion.button>

                {/* Decoración Inferior */}
                <div className="mt-6 text-center text-xs text-white/30">
                    ID: ...bec4f • Provably Fair (Próximamente)
                </div>
            </div>
        </div>
    );
}

export default App;