import { Router } from "express";
import { login, register, perfil, verifyToken, getUsers, getUser, deleteUser, logout, subirUser } from "../controllers/auth.controller.js";
import { authRequired } from "../middlewares/validateToken.js";
const router = Router()

router.post('/login', login);
router.post('/register', register);
router.post('/addUser', subirUser);
router.get('/verUsuarios',authRequired, getUsers);
router.get('/VerUsuario/:id',getUser);

router.put('/deleteUser/:id', authRequired, deleteUser);
router.post('/logout', logout);

router.get('/verify',verifyToken);
router.get('/perfil',authRequired, perfil);
export default router;