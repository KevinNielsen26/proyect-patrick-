// server/sockets/slotHandler.js
import { z } from 'zod';

// --- Lógica del Juego ---
const generateSpinResult = () => {
    const symbols = [ "🍒", "🍋", "🍊", "🍇", "🔔", "💎","🍀"];
    return [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
};

const calculatePayout = (bet, reels) => {
    if (reels[0] === reels[1] && reels[1] === reels[2]) return bet * 10;
    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return bet * 2;
    return 0;
};

// --- Validación ---
const spinSchema = z.object({
    betAmount: z.number().int().positive().min(10).max(1000)
});

// --- Handler Principal ---
export const slotHandler = (io, socket, pool) => {

    const onSpin = async (data) => {
        const client = await pool.connect();

        try {
            console.log("🎰 Spin solicitado:", data);

            // 1. Validar inputs
            const parseResult = spinSchema.safeParse(data);
            if (!parseResult.success) {
                throw new Error("Apuesta inválida: " + parseResult.error.message);
            }
            const { betAmount } = parseResult.data;
            const userId = socket.data.userId;

            // 2. INICIAR TRANSACCIÓN SQL
            await client.query('BEGIN');

            // 2.1 Verificar Usuario y Saldo
            const userRes = await client.query(
                'SELECT balance FROM "User" WHERE id = $1 FOR UPDATE',
                [userId]
            );

            if (userRes.rows.length === 0) throw new Error("Usuario no encontrado");

            const currentBalance = userRes.rows[0].balance;

            if (currentBalance < betAmount) {
                throw new Error("Saldo insuficiente");
            }

            // 2.2 Calcular Resultado
            const reels = generateSpinResult();
            const payout = calculatePayout(betAmount, reels);
            const netChange = payout - betAmount;
            const newBalance = currentBalance + netChange;

            // 2.3 Actualizar saldo
            await client.query(
                'UPDATE "User" SET balance = $1 WHERE id = $2',
                [newBalance, userId]
            );

            // 2.4 Guardar ronda (CORREGIDO: Columnas entre comillas)
            const roundRes = await client.query(
                `INSERT INTO "GameRound" ("userId", "gameType", "betAmount", "payout", "result")
                 VALUES ($1, $2, $3, $4, $5)
                     RETURNING id`,
                [userId, 'SLOTS_3_REEL', betAmount, payout, JSON.stringify(reels)]
            );
            const roundId = roundRes.rows[0].id;

            // 2.5 Registrar Apuesta (CORREGIDO: Columnas entre comillas)
            await client.query(
                `INSERT INTO "Transaction" ("userId", "amount", "type", "referenceId")
                 VALUES ($1, $2, $3, $4)`,
                [userId, -betAmount, 'BET_SLOT', roundId]
            );

            // 2.6 Registrar Ganancia (CORREGIDO: Columnas entre comillas)
            if (payout > 0) {
                await client.query(
                    `INSERT INTO "Transaction" ("userId", "amount", "type", "referenceId")
                     VALUES ($1, $2, $3, $4)`,
                    [userId, payout, 'WIN_SLOT', roundId]
                );
            }

            // 3. CONFIRMAR
            await client.query('COMMIT');

            // 4. Emitir
            socket.emit('spin_result', {
                success: true,
                reels: reels,
                payout: payout,
                newBalance: newBalance
            });

        } catch (error) {
            await client.query('ROLLBACK');
            console.error("❌ Error en spin:", error.message);
            socket.emit('spin_error', { message: error.message || "Error interno" });
        } finally {
            client.release();
        }
    };

    socket.on('spin_request', onSpin);
};