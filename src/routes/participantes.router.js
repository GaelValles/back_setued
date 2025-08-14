import { Router } from "express";
import multer from "multer";
import {
    subirParticipante,
    eliminarParticipante,
    actualizarParticipante,
    verHistorialParticipantes,
    verParticipante,
    verParticipantes,
    subirCertificado,
    verCertificado,
    descargarCertificado,
    inscribirACurso,
    desinscribirDeCurso,
    actualizarEstadoCurso,
    verParticipantesDeCurso,
    verParticipantesPorEmpresa,
} from "../controllers/participantes.controller.js";
import { authRequired } from "../middlewares/validateToken.js";

const router = Router();

// --- Configuración de Multer para la subida de archivos PDF ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        
        cb(null, 'uploads/certificados/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `certificado-${uniqueSuffix}.pdf`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // Límite de 10MB
    }
});

const handleMulterError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'El archivo PDF es demasiado grande. Máximo 10MB.' });
        }
        return res.status(400).json({ message: `Error de Multer: ${error.message}` });
    }
    if (error) {
        return res.status(400).json({ message: error.message });
    }
    next();
};

// Crear un nuevo participante
router.post('/add-participante', authRequired, upload.single('certificado'), handleMulterError, subirParticipante);

// Ver todos los participantes
router.get('/verParticipantes', authRequired, verParticipantes);

// Ver un participante específico
router.get('/verParticipante/:id', authRequired, verParticipante);

// Actualizar un participante (usa el ID de la URL)
router.put('/participantes/:id', authRequired, upload.single('certificado'), handleMulterError, actualizarParticipante);

// Subir certificado a un participante existente
router.post('/participante/:id/certificado', authRequired, upload.single('certificado'), handleMulterError, subirCertificado);

// [GET] /api/participantes/participante/:id/certificado/ver -> Ver certificado (obtener URL)
router.get('/participante/:id/certificado/ver', authRequired, verCertificado);

// [GET] /api/participantes/participante/:id/certificado/descargar -> Descargar certificado
router.get('/participante/:id/certificado/descargar', authRequired, descargarCertificado);

// Inscribir a curso (espera participanteId y cursoId en el body)
router.post('/participantes/inscribir', authRequired, inscribirACurso);

// Eliminar un participante
router.delete('/participante/:id/bajar', authRequired, eliminarParticipante);

// Ver historial de participantes
router.get('/historial-participantes', authRequired, verHistorialParticipantes);

//Desinscribir de curso (espera participanteId y cursoId en el body)
router.post('/participantes/desinscribir', authRequired, desinscribirDeCurso);

// Actualizar estado de un curso
router.put('/participantes/:participanteId/cursos/:cursoId/estado', authRequired, actualizarEstadoCurso);

//Ver participantes de un curso
router.get('/cursos/:cursoId/participantes', authRequired, verParticipantesDeCurso);

// Ver participantes de una empresa
router.get('/empresas/:empresaId/participantes', authRequired, verParticipantesPorEmpresa);

export default router;