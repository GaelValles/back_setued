import { Router } from "express";
import multer from "multer";
import {
    subirParticipante,
    eliminarParticipante,
    actualizarParticipante,
    verParticipante,
    verParticipantes,
    subirCertificado,
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
        // Asegúrate de que este directorio exista en tu servidor
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

// --- Middleware para manejar errores de Multer ---
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

// [POST] /api/participantes -> Crear un nuevo participante
router.post('/add-participante', authRequired, upload.single('certificado'), handleMulterError, subirParticipante);

// [GET] /api/participantes -> Ver todos los participantes
router.get('/verParticipantes', authRequired, verParticipantes);

// [GET] /api/participantes/:id -> Ver un participante específico
router.get('/verParticipante/:id', authRequired, verParticipante);

// [PUT] /api/participantes/:id -> Actualizar un participante (usa el ID de la URL)
router.put('/participantes/:id', authRequired, upload.single('certificado'), handleMulterError, actualizarParticipante);

// [DELETE] /api/participantes -> Eliminar un participante (espera el ID en el body)
router.delete('/participantes', authRequired, eliminarParticipante);

// [POST] /api/participantes/inscribir -> Inscribir a curso (espera participanteId y cursoId en el body)
router.post('/participantes/inscribir', authRequired, inscribirACurso);

// [POST] /api/participantes/desinscribir -> Desinscribir de curso (espera participanteId y cursoId en el body)
router.post('/participantes/desinscribir', authRequired, desinscribirDeCurso);

// [POST] /api/participantes/:id/certificado -> Subir certificado a un participante existente
router.post('/participantes/:id/certificado', authRequired, upload.single('certificado'), handleMulterError, subirCertificado);

// [PUT] /api/participantes/:participanteId/cursos/:cursoId/estado -> Actualizar estado de un curso
router.put('/participantes/:participanteId/cursos/:cursoId/estado', authRequired, actualizarEstadoCurso);

// [GET] /api/cursos/:cursoId/participantes -> Ver participantes de un curso
router.get('/cursos/:cursoId/participantes', authRequired, verParticipantesDeCurso);

// [GET] /api/empresas/:empresaId/participantes -> Ver participantes de una empresa
router.get('/empresas/:empresaId/participantes', authRequired, verParticipantesPorEmpresa);


export default router;