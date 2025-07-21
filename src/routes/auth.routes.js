import { Router } from "express";
import { login, register, perfil, logout } from "../controllers/auth.controller.js";
import { authRequired } from "../middlewares/validateToken.js";
const router = Router()

router.post('/login', login);
router.post('/register', register);
router.post('/logout', logout);

router.get('/perfil',authRequired, perfil)
export default router;