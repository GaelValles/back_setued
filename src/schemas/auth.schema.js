import { z } from "zod";

export const cursoSchema = z.object({
    nombreCurso: z.string().min(1, "Nombre del curso es requerido"),
    tipo: z.enum(["curso", "evaluacion", "certificacion", "diplomado", "distintivo", "seminario"], {
        errorMap: () => ({ message: "Tipo debe ser 'curso', 'certificado' o 'distintivo'" })
    }),
    fechaInicio: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Fecha de inicio debe ser una fecha válida"
    }).transform(val => new Date(val)),
    fechaFin: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Fecha de fin debe ser una fecha válida"
    }).transform(val => new Date(val)),
    horario: z.string().optional(),
    duracionhoras: z.number().min(1, "Duración en horas es requerida"),
    modalidad: z.string().optional(),
    instructor: z.string().min(1, "Instructor es requerido"),
    objetivo: z.string().min(1, "Objetivo es requerido"),
    cupoMinimo: z.number().min(1, "Cupo mínimo es requerido"),
    cupoMaximo: z.number().min(1, "Cupo máximo es requerido").refine((value, ctx) => {
        if (value < ctx.parent.cupoMinimo) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Cupo máximo debe ser mayor o igual al cupo mínimo"
            });
            return false;
        }
        return true;
    }),
    temario: z.string().min(1, "Temario es requerido"),
    costo: z.number().min(0, "Costo es requerido"),
    costoGeneral: z.number().min(0, "Costo general es requerido"),
    participantes: z.string().optional(), // O usa z.array(z.string()).optional() si es un array
}).refine(data => data.fechaFin > data.fechaInicio, {
    message: "Fecha de fin debe ser posterior a la fecha de inicio",
    path: ["fechaFin"]
});

export const registerSchema = z.object({
    nombre: z.string().min(1, "Nombre es requerido"),
    correo: z.string().email("Correo no es válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    puesto: z.string().min(1, "Puesto es requerido"),
    p_responsable: z.string().optional(),
    telefono: z.string().optional(),
});

export const loginSchema = z.object({
    correo: z.string({
        required_error: "Correo es requerido",
    }).email("Correo no es válido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres")
});