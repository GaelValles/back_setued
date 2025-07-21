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
        enum: ["curso", "certificado", "distintivo"]
    },
    fechaInicio: {
        type: Date,
        required: true
    },
    fechaFin: {
        type: Date,
        required: true
    },

    horario:{
        type:String,
    },
    duracionhoras: {
        type: Number,
        required: true
    },
    modalidad: {
        type: String,
    },
    instructor:{
        type: String,
        required: true
    },
    objetivo: {
        type: String,
        required: true
    },
    cupoMinimo: {
        type: Number,
        required: true
    },
    cupoMaximo: {
        type: Number,
        required: true
    },
    temario: {
        type: String,
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
    participantes: {
        type: String
    },
},
{
    timestamps: true
}
)

export default connectDBCursos.model('Curso', cursosSchema);