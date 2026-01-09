const { z } = import('zod');
const { prisma } = import('../lib/prisma'); // Tu instancia de Prisma Client
const { generateSpinResult, calculatePayout } = import ('../services/slotService');

// Validación de entrada con Zod
const spinSchema = z.object({
    betAmount: z.number().int().positive().min(10).max(1000)
});

module.exports = (io, socket) => {
    const onSpin = async (data) => {
        try {
            // 1. Validar inputs
            const { betAmount } = spinSchema.parse(data);
            const userId = socket.data.userId; // Asumimos que el middleware de auth ya puso el ID aquí

            // 2. Transacción Atómica en DB (CRÍTICO)
            const result = await prisma.$transaction(async (tx) => {
                // A. Buscar usuario y bloquear fila (opcionalmente) o verificar saldo
                const user = await tx.user.findUnique({ where: { id: userId } });

                if (!user || user.balance < betAmount) {
                    throw new Error("Saldo insuficiente");
                }

                // B. Calcular juego (Server Authority)
                const reels = generateSpinResult();
                const payout = calculatePayout(betAmount, reels);
                const netChange = payout - betAmount;

                // C. Actualizar Saldo
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: { balance: { increment: netChange } }
                });

                // D. Registrar Ronda
                const round = await tx.gameRound.create({
                    data: {
                        userId,
                        betAmount,
                        payout,
                        result: reels,
                        gameType: 'SLOTS_3_REEL'
                    }
                });

                // E. Registrar Transacciones (Gasto y Ganancia si hubo)
                await tx.transaction.create({
                    data: {
                        userId,
                        amount: -betAmount,
                        type: 'BET_SLOT',
                        referenceId: round.id
                    }
                });

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

            // 3. Emitir resultado al cliente (Solo al jugador)
            socket.emit('spin_result', {
                success: true,
                reels: result.reels,
                payout: result.payout,
                newBalance: result.balance
            });

            // 4. (Opcional) Broadcast de victoria grande a toda la sala
            if (result.payout >= betAmount * 10) {
                io.emit('big_win_announcement', {
                    username: socket.data.username,
                    amount: result.payout
                });
            }

        } catch (error) {
            console.error("Error en spin:", error);
            socket.emit('spin_error', { message: error.message || "Error interno" });
        }
    };

    socket.on('spin_request', onSpin);
};