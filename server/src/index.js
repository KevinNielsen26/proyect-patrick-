// server/src/index.js
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { slotHandler } from '../sockets/slotHandler.js'; // Importamos tu lógica de slots

// 1. Cargar variables de entorno del archivo .env
dotenv.config();

const app = express();
const httpServer = createServer(app);

// 2. Inicializar Prisma (Con la nueva configuración de Prisma 7)
const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
});

// 3. Configurar Socket.io con CORS para el frontend (Vite por defecto en 5173)
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// 4. Middlewares globales
app.use(cors());
app.use(express.json());

// 5. Test de conexión a la Base de Datos "pepito"
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

    // NOTA: Aquí deberías agregar un middleware de autenticación más adelante
    // Por ahora, simulamos un userId para que el slotHandler funcione
    socket.data.userId = "id-de-prueba-usuario";

    // Inyectamos la lógica de la máquina tragamonedas que ya creaste
    slotHandler(io, socket);

    socket.on('disconnect', () => {
        console.log('🚫 Usuario desconectado');
    });
});

// 7. Ruta de estado para verificar que el servidor vive
app.get('/status', (req, res) => {
    res.json({
        status: 'Patrick Casino Online',
        database: 'Connected',
        version: '1.0.0-MVP'
    });
});

// 8. Iniciar el servidor
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`🍀 Patrick Casino Server corriendo en http://localhost:${PORT}`);
});