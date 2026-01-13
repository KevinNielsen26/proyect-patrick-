// server/src/index.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg'; // <--- El driver nativo

const { Pool } = pg;
import { slotHandler } from '../sockets/slotHandler.js';

// 1. Configuración
dotenv.config();
const app = express();
const httpServer = createServer(app);

// 2. Conexión a Base de Datos (Pool)
// Esto maneja múltiples conexiones automáticamente
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ssl: { rejectUnauthorized: false } // Descomenta si usas DB en la nube (Render/Neon)
});

// 3. Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174"],
        methods: ["GET", "POST"]
    }
});

// 4. Middlewares
app.use(cors());
app.use(express.json());

// 5. Verificar Conexión
pool.connect()
    .then(client => {
        console.log('✅ PostgreSQL Conectado exitosamente');
        client.release(); // Importante: liberar el cliente
    })
    .catch(err => {
        console.error('❌ Error de conexión a DB:', err.message);
    });

// 6. Sockets
io.on('connection', (socket) => {
    console.log('👤 Usuario conectado:', socket.id);

    // IMPORTANTE: Ahora pasamos "pool" en vez de "prisma"
    slotHandler(io, socket, pool);

    socket.on('disconnect', () => {
        console.log('🚫 Usuario desconectado');
    });
});

// 7. Rutas
app.get('/status', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'Patrick Casino Online',
            database: 'Connected',
            time: result.rows[0].now
        });
    } catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// 8. Iniciar
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🍀 Server corriendo en http://localhost:${PORT}`);
});