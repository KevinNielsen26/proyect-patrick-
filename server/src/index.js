// server/src/index.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import pkg from '@prisma/client';
const { PrismaClient } = pkg;

import { slotHandler } from '../sockets/slotHandler.js';

// 1. Cargar variables de entorno PRIMERO
dotenv.config();

const app = express();
const httpServer = createServer(app);

// 2. Inicializar Prisma con un objeto vacío
const prisma = new PrismaClient({
});

// 3. Configurar Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174"],
        methods: ["GET", "POST"]
    }
});

// 4. Middlewares
app.use(cors());
app.use(express.json());

// 5. Test DB
async function testDbConnection() {
    try {
        await prisma.$connect();
        console.log('✅ Conexión exitosa a la base de datos PostgreSQL');
    } catch (error) {
        console.error('❌ Error al conectar a la base de datos:', error);
        process.exit(1);
    }
}
testDbConnection();

// 6. Configuración de Sockets
io.on('connection', (socket) => {
    console.log('👤 Usuario conectado:', socket.id);

    socket.data.userId = "e5a6dccc-df35-43a8-ab87-7976394bec4f";

    slotHandler(io, socket, prisma);

    socket.on('disconnect', () => {
        console.log('🚫 Usuario desconectado');
    });
});

// 7. Ruta de estado
app.get('/status', (req, res) => {
    res.json({
        status: 'Patrick Casino Online',
        database: 'Connected',
        version: '1.0.0-MVP'
    });
});

// 8. Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await prisma.$disconnect();
    process.exit(0);
});

// 9. Iniciar
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🍀 Patrick Casino Server corriendo en http://localhost:${PORT}`);
});