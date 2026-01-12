// server/sockets/slotHandler.js
import { z } from 'zod';
// Eliminamos las importaciones complejas de servicios por ahora para simplificar y que arranque
// import {generateSpinResult, calculatePayout } from '../services/slotService.js';

// Lógica simple temporal para que no dependas de archivos externos que quizás no tengas bien configurados
const generateSpinResult = () => {
    const symbols = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "🍀"];
    return [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
};

const calculatePayout = (bet, reels) => {
    // Lógica simplificada: 3 iguales ganan x10
    if (reels[0] === reels[1] && reels[1] === reels[2]) return bet * 10;
    // 2 iguales ganan x2
    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return bet * 2;
    return 0;
};

// Validación Zod
const spinSchema = z.object({
    betAmount: z.number().int().positive().min(10).max(1000)
});

// Exportación nombrada moderna (ES Modules)
// Recibimos 'prisma' como 3er argumento desde index.js
export const slotHandler = (io, socket, prisma) => {

    const onSpin = async (data) => {
        try {
            console.log("🎰 Spin solicitado:", data);

            // 1. Validar inputs
            const parseResult = spinSchema.safeParse(data);
            if (!parseResult.success) {
                throw new Error("Apuesta inválida: " + parseResult.error.message);
            }
            const { betAmount } = parseResult.data;
            const userId = socket.data.userId;

            // 2. Transacción
            const result = await prisma.$transaction(async (tx) => {
                const user = await tx.user.findUnique({ where: { id: userId } });

                if (!user || user.balance < betAmount) {
                    throw new Error("Saldo insuficiente");
                }

                const reels = generateSpinResult();
                const payout = calculatePayout(betAmount, reels);
                const netChange = payout - betAmount;

                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: { balance: { increment: netChange } }
                });

                const round = await tx.gameRound.create({
                    data: {
                        userId,
                        betAmount,
                        payout,
                        result: reels,
                        gameType: 'SLOTS_3_REEL'
                    }
                });

                // Registrar el gasto (apuesta)
                await tx.transaction.create({
                    data: {
                        userId,
                        amount: -betAmount,
                        type: 'BET_SLOT',
                        referenceId: round.id
                    }
                });

                // Registrar la ganancia (si hubo)
                if (payout > 0) {
                    await tx.transaction.create({
                        data: {
                            userId,
                            amount: payout,
                            type: 'WIN_SLOT',
                            referenceId: round.id
                        }
                    });
                }

                return { reels, payout, balance: updatedUser.balance };
            });

            // 3. Emitir éxito
            socket.emit('spin_result', {
                success: true,
                reels: result.reels,
                payout: result.payout,
                newBalance: result.balance
            });

        } catch (error) {
            console.error("❌ Error en spin:", error.message);
            socket.emit('spin_error', { message: error.message || "Error interno" });
        }
    };

    socket.on('spin_request', onSpin);
};