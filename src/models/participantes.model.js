import { connectDBParticipantes } from '../db.js';
import mongoose from 'mongoose';

const participantesSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    empresaProdecendia: {
        type: String,
        required: true,
        trim: true
    },
    // Agregamos referencia al ID de empresa para mejor relacionamiento
    empresa_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa' // Referencia a la empresa en la otra DB
    },
    puesto: {
        type: String,
        required: true,
        trim: true
    },
    edad: {
        type: Number,
        required: true,
        min: 18,
        max: 100
    },
    correo: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: 'Correo electrónico no válido'
        }
    },
    telefono: {
        type: String,
        required: true,
        trim: true
    },
    curp: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                // Validación básica de CURP (18 caracteres)
                return /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z][0-9]$/.test(v);
            },
            message: 'CURP no tiene el formato válido'
        }
    },
    // Agregamos certificado como en tu controlador actual
    certificado: {
        url: String,
        public_id: String,
        nombre_archivo: String,
        fecha_subida: Date
    },
    cursos_inscritos: [{
        curso_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Curso',
            required: true
        },
        fecha_inscripcion: {
            type: Date,
            default: Date.now
        },
        estado: {
            type: String,
            enum: ['inscrito', 'completado', 'abandonado'],
            default: 'inscrito'
        },
        calificacion: {
            type: Number,
            min: 0,
            max: 100
        },
        comentarios: String
    }],
    // Estado general del participante
    estado: {
        type: String,
        enum: ['activo', 'inactivo'],
        default: 'activo'
    }
}, {
    timestamps: true
});

export default connectDBParticipantes.model('Participantes', participantesSchema);