import { Router } from "express";
import { subirParticipante, eliminarParticipante, actualizarParticipante, verParticipante, verParticipantes, inscribirACurso } from "../controllers/participantes.controller.js";
import { authRequired } from "../middlewares/validateToken.js";
const router = Router()

router.post('/add-participante',authRequired, subirParticipante);
router.delete('/eliminarparticipante/:id', authRequired, eliminarParticipante);
router.put('/actualizarparticipante/:id', authRequired, actualizarParticipante);
router.get('/verparticipante/:id', authRequired, verParticipante);
router.get('/verparticipantes', authRequired, verParticipantes);
router.post('/cursos/:cursoId/inscribir', authRequired, inscribirACurso);

router.post('/subirAlumnos', authRequired);

export default router;