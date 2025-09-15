import { Router } from "express";
import {
    subirEmpresa,
    eliminarEmpresa,
    actualizarEmpresa,
    verEmpresa,
    verEmpresas,
    asociarParticipante,
    desasociarParticipante,
    verParticipantesPorCurso,
    obtenerEstadisticasEmpresa,
    obtenerEstadisticasCursos,
    obtenerParticipantesConCursos
} from "../controllers/empresas.controller.js";
import { authRequired } from "../middlewares/validateToken.js";

const router = Router();

// Crear una nueva empresa
router.post('/add-empresa', authRequired, subirEmpresa);

// Ver el listado de todas las empresas
router.get('/VerEmpresas',  verEmpresas);

// Ver una empresa específica con todos sus detalles
router.get('/VerEmpresa/:id', authRequired, verEmpresa);

// Actualizar los datos de una empresa
router.put('/empresas/:id', authRequired, actualizarEmpresa);

// Eliminar una empresa (espera el 'id' en el body)
router.delete('/empresas', authRequired, eliminarEmpresa);

// Asociar un participante existente a una empresa
router.post('/empresas/:empresaId/participantes', authRequired, asociarParticipante);

// Desasociar a un participante de una empresa
router.delete('/empresas/:empresaId/participantes/:participanteId', authRequired, desasociarParticipante);

// Obtener estadísticas generales de una empresa
router.get('/empresas/:empresaId/estadisticas', authRequired, obtenerEstadisticasEmpresa);

// Ver participantes de una empresa agrupados por curso
router.get('/empresas/:empresaId/participantes-por-curso', authRequired, verParticipantesPorCurso);

router.get('/:empresaId/estadisticas-cursos', obtenerEstadisticasCursos);
router.get('/:empresaId/participantes-con-cursos', obtenerParticipantesConCursos);

export default router;