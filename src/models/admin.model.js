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
    rol:{
        type: Boolean,
        required: true
    },
    status:{
        type: Boolean,
        default: true
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