import mongoose from "mongoose";

export const connectDBTrabajadores = mongoose.createConnection('mongodb+srv://yanezgael576:pjVRhaoZseWQt4jU@clustertrabajadores.7bgnuj6.mongodb.net/?retryWrites=true&w=majority&appName=ClusterTrabajadores');
export const connectDBCursos = mongoose.createConnection('mongodb+srv://gael3041220212:dyUYErXP7oT1vhl2@clustercursos.agolkrb.mongodb.net/?retryWrites=true&w=majority&appName=clusterCursos');
export const connectDBParticipantes = mongoose.createConnection('mongodb+srv://yanezgael576:zlf8SO3is2GSXOzx@clusterparticipantes.hbz6men.mongodb.net/?retryWrites=true&w=majority&appName=ClusterParticipantes')

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
