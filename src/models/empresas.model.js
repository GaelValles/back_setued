import { connectDBEmpresas } from '../db.js';
import mongoose from "mongoose";

const empresasSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    tipo: {
        type: String,
        required: true,
        enum: [
            "Hoteles con otros servicios integrados",
            "Hoteles sin otros servicios integrados",
            "Moteles",
            "Cabañas, villas y similares",
            "Campamentos y albergues recreativos",
            "Pensiones y casas de huéspedes",
            "Departamentos y casas amueblados con servicios de hotelería",
            "Agencias de viajes",
            "Organización de excursiones y paquetes turísticos para agencias de viajes",
            "Otros servicios de reservaciones",
            "Parques acuáticos y balnearios",
            "Alquiler de automóviles sin chofer",
            "Campos de golf",
            "Marinas turísticas",
            "Administración de puertos y muelles",
            "Transporte turístico por tierra",
            "Transporte turístico por agua",
            "Otro transporte turístico",
            "Comercio al por menor en tiendas de artesanías",
            "Otros servicios recreativos prestados por el sector privado",
            "Centros nocturnos, discotecas y similares",
            "Escuelas del sector privado que combinan diversos niveles de educación",
            "Escuelas del sector público que combinan diversos niveles de educación",
            "Bares, cantinas y similares",
            "Restaurantes con servicio de preparación de alimentos a la carta o de comida corrida",
            "Restaurantes con servicio de preparación de pescados y mariscos",
            "Restaurantes con servicio de preparación de antojitos",
            "Restaurantes con servicio de preparación de tacos y tortas",
            "Restaurantes de autoservicio",
            "Restaurantes con servicio de preparación de pizzas, hamburguesas, hot dogs y pollos rostizados para llevar",
            "Guía de Turistas",
            "Módulos de auxilio turístico",
            "Restaurantes que preparan otro tipo de alimentos para llevar",
            "Cafeterías, fuentes de sodas, neverías, refresquerías y similares",
            "Servicios de preparación de otros alimentos para consumo inmediato"
        ]
    },
    rfc: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                // Validación básica para RFC (12-13 caracteres alfanuméricos)
                return /^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(v);
            },
            message: 'RFC no tiene el formato válido'
        }
    },
    telefono: {
        type: String,
        trim: true
    },
    correo: {
        type: String,
        lowercase: true,
        trim: true,
        validate: {
            validator: function(v) {
                if (!v) return true; // Campo opcional
                return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
            },
            message: 'Correo electrónico no válido'
        }
    },
    direccion: { // Corregido: era "dirección"
        type: String,
        required: true,
        trim: true
    },
    municipio: {
        type: String,
        required: true,
        enum: [
            "Canatlán",
            "Canelas",
            "Coneto de Comonfort",
            "Cuencamé",
            "Durango",
            "General Simón Bolívar",
            "Gómez Palacio",
            "Guadalupe Victoria",
            "Guanaceví",
            "Hidalgo",
            "Indé",
            "Lerdo",
            "Mapimí",
            "Mezquital",
            "Nazas",
            "Nombre de Dios",
            "Ocampo",
            "El Oro",
            "Otáez",
            "Pánuco de Coronado",
            "Peñón Blanco",
            "Poanas",
            "Pueblo Nuevo",
            "Rodeo",
            "San Bernardo",
            "San Dimas",
            "San Juan de Guadalupe",
            "San Juan del Río",
            "San Luis del Cordero",
            "San Pedro del Gallo",
            "Santa Clara",
            "Santiago Papasquiaro",
            "Súchil",
            "Tamazula",
            "Tepehuanes",
            "Tlahualilo",
            "Top",
            "Vicente Guerrero",
            "Nuevo Ideal"
        ]
    },
    contacto: {
        nombre: {
            type: String,
            trim: true
        },
        puesto: {
            type: String,
            trim: true
        },
        telefono: {
            type: String,
            trim: true
        },
        correo: {
            type: String,
            lowercase: true,
            trim: true,
            validate: {
                validator: function(v) {
                    if (!v) return true; // Campo opcional
                    return /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v);
                },
                message: 'Correo electrónico de contacto no válido'
            }
        }
    },
    // Estructura para manejar participantes asociados
    participantes: [{
        participante_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participantes',
            required: true
        },
        fecha_asociacion: {
            type: Date,
            default: Date.now
        },
        estado: {
            type: String,
            enum: ['activo', 'inactivo'],
            default: 'activo'
        }
    }],
    // Estado de la empresa
    estado: {
        type: String,
        enum: ['activa', 'inactiva', 'suspendida'],
        default: 'activa'
    }
}, {
    timestamps: true
});



export default connectDBEmpresas.model('Empresa', empresasSchema);