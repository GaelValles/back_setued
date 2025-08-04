// src/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

export const connectDBParticipantes = mongoose.createConnection('mongodb+srv://yanezgael576:zlf8SO3is2GSXOzx@clusterparticipantes.hbz6men.mongodb.net/?retryWrites=true&w=majority&appName=ClusterParticipantes')

dotenv.config(); // Carga las variables del archivo .env

// Usa las variables de entorno
export const connectDBTrabajadores = mongoose.createConnection(process.env.connectDBTrabajadores, {
  
});

export const connectDBCursos = mongoose.createConnection(process.env.connectDBCursos, {
  
});


// Verifica conexión trabajadores
connectDBTrabajadores.on('connected', () => {
  console.log('Conectado a MongoDB Trabajadores');
});
connectDBTrabajadores.on('error', (err) => {
  console.error('Error en conexión Trabajadores:', err);
});

// Verifica conexión cursos
connectDBCursos.on('connected', () => {
  console.log('Conectado a MongoDB Cursos');
});
connectDBCursos.on('error', (err) => {
  console.error('Error en conexión Cursos:', err);
});

// Verifica conexión participantes
connectDBParticipantes.on('connected', () => {
  console.log('Conectado a MongoDB Participantes');
});
connectDBParticipantes.on('error', (err) => {
  console.error('Error en conexión Participantes:', err);
});
