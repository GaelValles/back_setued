// src/db.js
import mongoose from "mongoose";
import dotenv from "dotenv";

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
