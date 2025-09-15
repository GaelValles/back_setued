import Admin from "../models/admin.model.js";
import { TOKEN_SECRET } from "../config.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createAccessToken } from "../libs/jwt.js";

export const register = async (req, res) => {
    const { nombre, correo, puesto, rol, telefono, password } = req.body;
    try {

        const passwordHash = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({
            nombre,
            correo,
            puesto,
            rol,
            telefono,
            password: passwordHash
        });

        console.log(newAdmin);

        const AdminSaved = await newAdmin.save();
        const token = await createAccessToken({ id: AdminSaved._id, })

        res.cookie('token', token, {
            samesite: 'none',
            secure: true,
        })
        res.json({
            message: 'Usuario creado correctamente',
        })
        // res.json(AdminSaved)

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
};
export const subirUser = async (req, res) => {
    const { nombre, correo, puesto, rol, telefono, password } = req.body;
    try {

        const passwordHash = await bcrypt.hash(password, 10);
        const newAdmin = new Admin({
            nombre,
            correo,
            puesto,
            rol,
            telefono,
            password: passwordHash
        });

        const AdminSaved = await newAdmin.save();
        res.json(AdminSaved);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const login = async (req, res) => {
    const { correo, password } = req.body;
    try {
        const AdminFound = await Admin.findOne({ correo });
        if (!AdminFound) return res.status(400).json({ message: 'Usuario no encontrado' });

        const isMatch = await bcrypt.compare(password, AdminFound.password);
        if (!isMatch) return res.status(400).json({ message: 'Contraseña incorrecta' });

        const token = await createAccessToken({ id: AdminFound._id });

        // 🔥 Cookie con opciones
        res.cookie('token', token, {
            httpOnly: true,
            expires: new Date(Date.now() + 900000),
            sameSite: "strict",
            secure: true,
            priority: "high"
        });

        res.json({ message: 'Usuario encontrado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const getUsers = async (req, res) => {
    try {
        const users = await Admin.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // Asegúrate de recibir el id por params
        const user = await Admin.findByIdAndUpdate(id, { status: false }, { new: true });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json({ message: 'Usuario desactivado correctamente', user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await Admin.findById(id).select('-password'); // Excluye el campo de la contraseña

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const logout = (req, res) => {
    res.cookie("token", "", {
        expires: new Date(0)
    });
    return res.sendStatus(200).json({ message: "Sesión cerrada correctamente" });
}

export const verifyToken = async (req, res) => {
    const { token } = req.cookies;

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, TOKEN_SECRET, async (err, admin) => {
        if (err) return res.status(401).json({ message: 'Token no válido' });

        const adminFound = await Admin.findById(admin.id);
        if (!adminFound) return res.status(404).json({ message: 'Usuario no encontrado' });
        console.log(adminFound);
        return res.json({
            id: adminFound._id,
            nombre: adminFound.nombre,
            correo: adminFound.correo,
            puesto: adminFound.puesto,
            p_responsable: adminFound.p_responsable,
            telefono: adminFound.telefono
        })
    });

}


export const perfil = async (req, res) => {
    const adminFound = await Admin.findById(req.admin.id)

    if (!adminFound) return res.status(404).json({ message: 'Usuario no encontrado' });

    return res.json(adminFound);
}

export const updatePerfil = async (req, res) => {
    const { nombre, correo, puesto, p_responsable, telefono } = req.body;
    const adminUpdated = await Admin.findByIdAndUpdate(req.admin.id, {
        nombre,
        correo,
        puesto,
        p_responsable,
        telefono
    }, { new: true });
    if (!adminUpdated) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json(adminUpdated);
};

export const subirCurso = async (req, res) => {
    const { nombreCurso, tipo, fechaInicio, fechaFin, horario, duracionhoras, modalidad, instructor, objetivo, cupoMinimo, cupoMaximo, temario, costo, costoGeneral, participantes } = req.body;
    try {
        const newCurso = new Curso({
            nombreCurso,
            tipo,
            fechaInicio,
            fechaFin,
            horario,
            duracionhoras,
            modalidad,
            instructor,
            objetivo,
            cupoMinimo,
            cupoMaximo,
            temario,
            costo,
            costoGeneral,
            participantes
        });

        const cursoSaved = await newCurso.save();
        res.json(cursoSaved);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}