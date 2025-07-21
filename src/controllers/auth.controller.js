import Admin from "../models/admin.model.js";

import bcrypt from "bcryptjs";

import {createAccessToken} from "../libs/jwt.js";

export const register = async (req, res) => {
    const {nombre, correo, puesto, p_responsable, telefono, password}= req.body;
    try {
    
    const passwordHash = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({
        nombre,
        correo,
        puesto,
        p_responsable,
        telefono,
        password: passwordHash
    });

    console.log(newAdmin);

    const AdminSaved = await newAdmin.save();
    const token = await createAccessToken({id: AdminSaved._id,})
    
    res.cookie('token',token)
    res.json({
        message: 'Usuario creado correctamente',
    })
    // res.json(AdminSaved)

    } catch (error) {
        res.status(500).json({ message: error.message})
    }
};


export const login = async (req, res) => {
    const {correo, password}= req.body;
    try {
    const AdminFound = await Admin.findOne({correo});

    if (!AdminFound) return res.status(400).json({message: 'Usuario no encontrado'});
    const isMatch = await bcrypt.compare(password, AdminFound.password);
    
    if (!isMatch) return res.status(400).json({message: 'Contraseña incorrecta'});

    const token = await createAccessToken({id: AdminFound._id,})
    
    res.cookie('token',token)
    res.json({
        message: 'Usuario encontrado correctamente',
    })
    // res.json(AdminSaved)

    } catch (error) {
        res.status(500).json({ message: error.message})
    }
};

export const logout = (req, res) => {
    res.cookie("token", "",{
        expires: new Date(0)
    });
    return res.sendStatus(200).json({message: "Sesión cerrada correctamente"});
}

export const perfil = async(req, res) => {
    const adminFound = await Admin.findById(req.admin.id)

    if (!adminFound) return res.status(404).json({message: 'Usuario no encontrado'});

    return res.json(adminFound);
}

export const updatePerfil = async (req, res) => {
    const {nombre, correo, puesto, p_responsable, telefono} = req.body;
    const adminUpdated = await Admin.findByIdAndUpdate(req.admin.id, {
        nombre,
        correo,
        puesto,
        p_responsable,
        telefono
    }, {new: true});
    if (!adminUpdated) return res.status(404).json({message: 'Usuario no encontrado'});
    return res.json(adminUpdated);
};

export const subirCurso = async (req, res) => {
    const {nombreCurso, tipo, fechaInicio, fechaFin, horario, duracionhoras, modalidad, instructor, objetivo, cupoMinimo, cupoMaximo, temario, costo, costoGeneral, participantes} = req.body;
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