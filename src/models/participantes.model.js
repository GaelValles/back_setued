import { connectDBParticipantes } from '../db.js';
import mongoose from 'mongoose';

const participantesSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    sexo: {
        type: String,
        enum: ['Hombre', 'Mujer', 'No binario'],
        message: 'El sexo debe ser: Hombre, Mujer o No binario'
    },
    empresaProdecendia: {
        type: String,
        required: true,
        trim: true
    },
    empresa_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Empresa'
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
        trim: true
    },
    certificados: [{
        url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            required: true
        },
        nombre_archivo: {
            type: String,
            required: true
        },
        tipo: {
            type: String,
            required: true,
            enum: ['constancia', 'diploma', 'certificacion', 'otro']
        },
        descripcion: {
            type: String,
            trim: true
        },
        fecha_subida: {
            type: Date,
            default: Date.now
        },
        estado: {
            type: String,
            enum: ['activo', 'revocado'],
            default: 'activo'
        }
    }],
    cursos_inscritos: [{
        curso_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Curso',
            required: true
        },
        nombre: {
            type: String,
            
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
        modalidad:{
            type: String,
            enum: ['presencial', 'en línea', 'híbrido'],

        },
        calificacion: {
            type: Number,
            min: 0,
            max: 100
        },
        comentarios: String
    }],
    estado: {
        type: String,
        enum: ['activo', 'inactivo'],
        default: 'activo'
    },

    fechaRegistro: {
        type: Date,
        required: true, // Hacemos este campo requerido
        default: Date.now // Por defecto será la fecha actual
    },
    fecha_baja: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Mantiene createdAt y updatedAt
});

export default connectDBParticipantes.model('Participantes', participantesSchema);

export const subirCertificado = async (req, res) => {
    const { id } = req.params;
    const { tipo, descripcion } = req.body;
    
    try {
        const participante = await Participantes.findById(id);
        if (!participante) {
            return res.status(404).json({ message: 'Participante no encontrado' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No se ha enviado ningún archivo PDF' });
        }

        validarPDF(req.file);

        const result = await uploadCertificado(req.file.path);

        const nuevoCertificado = {
            url: result.secure_url,
            public_id: result.public_id,
            nombre_archivo: req.file.originalname,
            tipo: tipo || 'otro',
            descripcion,
            fecha_subida: new Date(),
            estado: 'activo'
        };
        
        // Agregar el nuevo certificado al array
        if (!participante.certificados) {
            participante.certificados = [];
        }
        participante.certificados.push(nuevoCertificado);
        
        await participante.save();

        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({ 
            message: 'Certificado PDF subido correctamente',
            certificado: nuevoCertificado,
            total_certificados: participante.certificados.length
        });
        
    } catch (error) {
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        if (error.message.includes('PDF') || error.message.includes('archivo')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ message: error.message });
    }
};
