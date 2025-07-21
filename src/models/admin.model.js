import { connectDBTrabajadores } from '../db.js';
import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
    nombre:{
        type: String,
        required: true
    },
    correo:{
        type: String,
        required: true,
        unique: true,
    },
    puesto:{
        type: String,
        required: true
    },
    p_responsable:{
        type: String
    },
    telefono:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
},
{
    timestamps: true
});

export default connectDBTrabajadores.model('Admin', adminSchema);