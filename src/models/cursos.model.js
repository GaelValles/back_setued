import { connectDBCursos } from '../db.js';
import mongoose from "mongoose";

const cursosSchema = new mongoose.Schema({
    nombreCurso: {
        type: String,
        required: true
    },
    tipo: {
        type: String,
        required: true,
        enum: ["curso", "evaluacion", "certificacion", "diplomado", "distintivo", "seminario", "Taller"]
    },
    fechaInicio: {
        type: Date,
        required: true
    },
    fechaFin: {
        type: Date,
        required: true
    },
    horario: {
        type: String
    },
    duracion: {
        type: Number,
        required: true
    },
    modalidad: {
        type: String
    },
    instructor: {
        type: String,
        required: true
    },
    perfilInstructor: {
        type: String
    },
    objetivos: {
        type: String,
        required: true
    },
    perfilParticipante: {
        type: String
    },
    cupoMinimo: {
        type: Number,
        required: true
    },
    cupoMaximo: {
        type: Number,
        required: true
    },
    costo: {
        type: Number,
        required: true
    },
    costoGeneral: {
        type: Number,
        required: true
    },
    temario: {
        type: String,
        required: true
    },
    procesoInscripcion: {
        type: String
    },
    participantes: [{
        participante_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participantes'
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

export default connectDBCursos.model('Curso', cursosSchema);
