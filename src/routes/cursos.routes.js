import { Router } from "express";
import { subirCurso, eliminarCurso, actualizarCurso, verCurso, verCursos, inscribirParticipante } from "../controllers/cursos.controller.js";
import { authRequired } from "../middlewares/validateToken.js";
const router = Router()

router.post('/add-curso',authRequired, subirCurso);
router.delete('/eliminarCurso/:id', authRequired, eliminarCurso);
router.put('/actualizarCurso/:id', authRequired, actualizarCurso);
router.get('/verCurso/:id', authRequired, verCurso);
router.get('/verCursos', authRequired, verCursos);
router.post('/cursos/:cursoId/inscribir', inscribirParticipante);


router.post('/subirAlumnos', authRequired);

export default router;