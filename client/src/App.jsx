import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css'; // Asegúrate de tener estilos básicos o usa Tailwind directo

// Conexión única fuera del componente para evitar reconexiones
const socket = io('http://localhost:3001');

function App() {
    const [connected, setConnected] = useState(false);
    const [balance, setBalance] = useState(1000); // Estado inicial visual
    const [reels, setReels] = useState(['❓', '❓', '❓']);
    const [spinning, setSpinning] = useState(false);
    const [message, setMessage] = useState('¡Bienvenido a Patrick Casino! 🍀');
    const [lastWin, setLastWin] = useState(0);

    useEffect(() => {
        // 1. Listeners de conexión
        socket.on('connect', () => {
            setConnected(true);
            console.log('Conectado al servidor Socket.io');
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        // 2. Listener del resultado del giro (viene de slotHandler.js)
        socket.on('spin_result', (data) => {
            // data = { success, reels, payout, newBalance }
            if (data.success) {
                setReels(data.reels);
                setBalance(data.newBalance);
                setLastWin(data.payout);
                setSpinning(false);

                if (data.payout > 0) {
                    setMessage(`¡Ganaste $${data.payout}! 🎉`);
                } else {
                    setMessage('Suerte para la próxima... 🍀');
                }
            }
        });

        socket.on('spin_error', (err) => {
            console.error(err);
            setSpinning(false);
            setMessage(`Error: ${err.message}`);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('spin_result');
            socket.off('spin_error');
        };
    }, []);

    const handleSpin = () => {
        if (balance < 10) {
            setMessage("Saldo insuficiente 😢");
            return;
        }

        setSpinning(true);
        setMessage("Girando... 🎰");
        setLastWin(0);

        // Simular efecto visual de giro antes de mostrar el resultado real (opcional)
        setReels(['🌀', '🌀', '🌀']);

        // 3. Emitir evento al backend (slotHandler espera {betAmount})
        // El userId ya está inyectado en el servidor por ahora.
        socket.emit('spin_request', {betAmount: 10});
    };

    return (
        <div className="min-h-screen bg-green-900 text-yellow-100 flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold mb-8 text-yellow-400 drop-shadow-md">
                🍀 Patrick Casino 🍀
            </h1>

            {/* Estado de Conexión */}
            <div className={`mb-4 text-sm ${connected ? 'text-green-400' : 'text-red-500'}`}>
                Estado: {connected ? 'Online 🟢' : 'Desconectado 🔴'}
            </div>

            {/* Pantalla de Juego */}
            <div className="bg-green-800 p-8 rounded-xl shadow-2xl border-4 border-yellow-600 max-w-md w-full text-center">

                {/* Carretes */}
                <div className="flex justify-center gap-4 mb-8 bg-black p-6 rounded-lg border-2 border-yellow-500/50">
                    {reels.map((symbol, i) => (
                        <div key={i} className="text-6xl animate-bounce-short">
                            {symbol}
                        </div>
                    ))}
                </div>

                {/* Panel de Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-xl">
                    <div className="bg-green-950 p-2 rounded border border-green-700">
                        <p className="text-xs text-gray-400">BALANCE</p>
                        <p className="font-mono text-yellow-300">${balance}</p>
                    </div>
                    <div className="bg-green-950 p-2 rounded border border-green-700">
                        <p className="text-xs text-gray-400">GANANCIA</p>
                        <p className={`font-mono ${lastWin > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                            ${lastWin}
                        </p>
                    </div>
                </div>

                {/* Mensaje de Estado */}
                <div className="h-8 mb-4 text-yellow-200 font-semibold">
                    {message}
                </div>

                {/* Botón de Jugar */}
                <button
                    onClick={handleSpin}
                    disabled={spinning || !connected}
                    className={`
            w-full py-4 rounded-lg text-2xl font-bold uppercase tracking-widest transition-all
            ${spinning
                        ? 'bg-gray-600 cursor-not-allowed text-gray-400'
                        : 'bg-yellow-500 hover:bg-yellow-400 text-green-900 hover:scale-105 shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                    }
          `}
                >
                    {spinning ? 'GIRANDO...' : 'GIRAR ($10)'}
                </button>
            </div>

            <p className="mt-8 text-green-400/60 text-xs">
                MVP v1.0.0 - UserID: ...bec4f
            </p>
        </div>
    );
}

export default App;