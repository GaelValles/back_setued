import { connectDBParticipantes } from '../db.js';
import mongoose from 'mongoose';

const participantesSchema = new mongoose.Schema({
    nombre:{
        type: String,
        required: true
    },
    empresaProdecendia:{
        type: String,
        required: true
    },
    puesto:{
        type: String,
        required: true
    },
    edad:{
        type: Number,
        required: true
    },
    correo:{
        type: String,
        required: true,
        unique: true,
    },
    telefono:{
        type: String,
        required: true
    },
    curp:{
        type: String,
        required: true
    },
    cursos_inscritos: [{
    curso_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Curso'
    },
    fecha_inscripcion: {
        type: Date,
        default: Date.now
    },
    estado: {
        type: String,
        enum: ['inscrito', 'completado', 'abandonado'],
        default: 'inscrito'
    }
}]
},
{
    timestamps: true
});

export default connectDBParticipantes.model('Participantes', participantesSchema);