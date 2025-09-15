import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import cursosRoutes from './routes/cursos.routes.js';
import participantesRoutes from './routes/participantes.router.js';
import empresasRoutes from './routes/empresas.routes.js';

import dotenv from 'dotenv';
dotenv.config();


const app = express();

app.use(morgan('dev'));
app.use(cors(
    {
        origin: ['http://localhost:5173', 'https://pruebas-80fw.onrender.com/', 'https://pruebas-80fw.onrender.com'],
        credentials: true
    }
));
app.use(express.json());
app.use(cookieParser());
app.use(authRoutes);
app.use('/cursos', cursosRoutes);
app.use('/participantes', participantesRoutes);
app.use('/empresas', empresasRoutes);
export default app;