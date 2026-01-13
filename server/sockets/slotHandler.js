// server/sockets/slotHandler.js
import { z } from 'zod';

// --- Lógica del Juego (Mantengo la simple por ahora para asegurar que funcione) ---
const generateSpinResult = () => {
    const symbols = ["🍒", "🍋", "🍊", "🍇", "🔔", "💎", "🍀"];
    return [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
};

const calculatePayout = (bet, reels) => {
    // 3 iguales = x10
    if (reels[0] === reels[1] && reels[1] === reels[2]) return bet * 10;
    // 2 iguales = x2
    if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) return bet * 2;
    return 0;
};

// --- Validación ---
const spinSchema = z.object({
    betAmount: z.number().int().positive().min(10).max(1000)
});

// --- Handler Principal ---
// NOTA: Ahora recibimos 'pool' en lugar de 'prisma'
export const slotHandler = (io, socket, pool) => {

    const onSpin = async (data) => {
        // Necesitamos un cliente específico del pool para manejar la transacción
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

            // 2.1 Verificar Usuario y Saldo (Bloqueamos la fila con FOR UPDATE para evitar race conditions)
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

            // 2.3 Actualizar saldo del usuario
            await client.query(
                'UPDATE "User" SET balance = $1 WHERE id = $2',
                [newBalance, userId]
            );

            // 2.4 Guardar ronda de juego (GameRound)
            // Nota: JSON.stringify(reels) es necesario para guardar el array en columna JSONB
            const roundRes = await client.query(
                `INSERT INTO "GameRound" (userId, gameType, betAmount, payout, result)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id`,
                [userId, 'SLOTS_3_REEL', betAmount, payout, JSON.stringify(reels)]
            );
            const roundId = roundRes.rows[0].id;

            // 2.5 Registrar transacción (Apuesta - Gasto)
            await client.query(
                `INSERT INTO "Transaction" (userId, amount, type, referenceId)
                 VALUES ($1, $2, $3, $4)`,
                [userId, -betAmount, 'BET_SLOT', roundId]
            );

            // 2.6 Registrar transacción (Ganancia - Ingreso) si corresponde
            if (payout > 0) {
                await client.query(
                    `INSERT INTO "Transaction" (userId, amount, type, referenceId)
                     VALUES ($1, $2, $3, $4)`,
                    [userId, payout, 'WIN_SLOT', roundId]
                );
            }

            // 3. CONFIRMAR TRANSACCIÓN
            await client.query('COMMIT');

            // 4. Emitir éxito al cliente
            socket.emit('spin_result', {
                success: true,
                reels: reels,
                payout: payout,
                newBalance: newBalance
            });

        } catch (error) {
            // Si algo falla, deshacemos todos los cambios en la DB
            await client.query('ROLLBACK');
            console.error("❌ Error en spin:", error.message);
            socket.emit('spin_error', { message: error.message || "Error interno" });
        } finally {
            // SIEMPRE liberar el cliente devuelta al pool
            client.release();
        }
    };

    socket.on('spin_request', onSpin);
};