import mongoose from "mongoose";

export const connectDBTrabajadores = mongoose.createConnection('mongodb+srv://yanezgael576:pjVRhaoZseWQt4jU@clustertrabajadores.7bgnuj6.mongodb.net/?retryWrites=true&w=majority&appName=ClusterTrabajadores');
export const connectDBCursos = mongoose.createConnection('mongodb+srv://gael3041220212:dyUYErXP7oT1vhl2@clustercursos.agolkrb.mongodb.net/?retryWrites=true&w=majority&appName=clusterCursos');

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
