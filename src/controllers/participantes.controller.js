import Participantes from "../models/participantes.model.js";
import Curso from "../models/cursos.model.js";
import Empresa from "../models/empresas.model.js"; // Importar modelo de empresas
import { uploadCertificado } from "../libs/cloudinary.js";
import fs from "fs";

// Función para validar que el archivo sea PDF
const validarPDF = (file) => {
    const allowedMimeTypes = ['application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB máximo
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error('Solo se permiten archivos PDF');
    }
    
    if (file.size > maxSize) {
        throw new Error('El archivo PDF no puede ser mayor a 10MB');
    }
    
    return true;
};

//Función para subir participantes
export const subirParticipante = async (req, res) => {
    const { 
        nombre, 
        sexo,           // Nuevo campo
        empresaProdecendia, 
        empresa_id, 
        puesto, 
        edad, 
        correo, 
        telefono, 
        curp,
        fechaRegistro // Nuevo campo
    } = req.body;
    
    try {
        // Validar que el sexo sea uno de los valores permitidos
        if (!['Hombre', 'Mujer', 'No binario'].includes(sexo)) {
            throw new Error('El sexo debe ser: Hombre, Mujer o No binario');
        }

        let certificadoData = null;
        
        // Si se envía un archivo de certificado PDF, validarlo y subirlo a Cloudinary
        if (req.file) {
            validarPDF(req.file);
            
            const result = await uploadCertificado(req.file.path);
            certificadoData = {
                url: result.secure_url,
                public_id: result.public_id,
                nombre_archivo: req.file.originalname,
                tipo: 'otro',
                fecha_subida: new Date(),
                estado: 'activo'
            };

            // Limpiar archivo temporal
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        }

        // Si se proporciona empresa_id, validar que existe y obtener el nombre
        let nombreEmpresa = empresaProdecendia;
        if (empresa_id) {
            const empresa = await Empresa.findById(empresa_id);
            if (!empresa) {
                return res.status(404).json({ message: 'Empresa no encontrada' });
            }
            nombreEmpresa = empresa.nombre;
        }

        const newParticipante = new Participantes({
            nombre,
            sexo,           // Nuevo campo
            empresaProdecendia: nombreEmpresa,
            empresa_id: empresa_id || null,
            puesto,
            edad,
            correo,
            telefono,
            curp,
            certificados: certificadoData ? [certificadoData] : [], // Ahora es un array
            fechaRegistro: fechaRegistro || new Date()
        });

        const participanteSaved = await newParticipante.save();

        // Si tiene empresa_id, actualizar la lista de participantes en la empresa
        if (empresa_id) {
            const empresa = await Empresa.findById(empresa_id);
            if (empresa) {
                empresa.participantes.push({
                    participante_id: participanteSaved._id,
                    fecha_asociacion: new Date(),
                    estado: 'activo'
                });
                await empresa.save();
            }
        }

        res.json({
            ...participanteSaved.toObject(),
            message: certificadoData ? 'Participante creado con certificado PDF' : 'Participante creado sin certificado'
        });
    } catch (error) {
        // Limpiar archivo temporal en caso de error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (error.message.includes('PDF') || error.message.includes('archivo')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const eliminarParticipante = async (req, res) => {
    const { id } = req.params; // Cambiar de req.body a req.params
    try {
        const participante = await Participantes.findById(id);
        if (!participante) {
            return res.status(404).json({ message: 'Participante no encontrado' });
        }

        // Verificar si ya está inactivo
        if (participante.estado === 'inactivo') {
            return res.status(400).json({ message: 'El participante ya está inactivo' });
        }

        // BAJA LÓGICA: Cambiar estado a inactivo en lugar de eliminar físicamente
        participante.estado = 'inactivo';
        participante.fecha_baja = new Date();
        await participante.save();

        // Si tiene empresa asociada, actualizar el estado en la empresa
        if (participante.empresa_id) {
            const empresa = await Empresa.findById(participante.empresa_id);
            if (empresa) {
                const participanteEnEmpresa = empresa.participantes.find(
                    p => p.participante_id && p.participante_id.toString() === id
                );
                if (participanteEnEmpresa) {
                    participanteEnEmpresa.estado = 'inactivo';
                    participanteEnEmpresa.fecha_baja = new Date();
                    await empresa.save();
                }
            }
        }

        // Actualizar estado en cursos donde esté inscrito (opcional)
        for (const inscripcion of participante.cursos_inscritos) {
            if (inscripcion.estado === 'inscrito') {
                inscripcion.estado = 'abandonado';
                inscripcion.fecha_abandono = new Date();
            }
            
            // Actualizar también en el curso
            const curso = await Curso.findById(inscripcion.curso_id);
            if (curso) {
                const participanteEnCurso = curso.participantes.find(
                    p => p.participante_id && p.participante_id.toString() === id
                );
                if (participanteEnCurso && participanteEnCurso.estado === 'inscrito') {
                    participanteEnCurso.estado = 'abandonado';
                    participanteEnCurso.fecha_abandono = new Date();
                    await curso.save();
                }
            }
        }

        await participante.save();

        res.json({ 
            message: 'Participante desactivado correctamente',
            participante: {
                id: participante._id,
                nombre: participante.nombre,
                estado: participante.estado,
                fecha_baja: participante.fecha_baja
            }
        });
    } catch (error) {
        console.error('Error al eliminar participante:', error);
        res.status(500).json({ message: error.message });
    }
};

export const verHistorialParticipantes = async (req, res) => {
    try {
        // Solo mostrar participantes inactivos
        const participantesInactivos = await Participantes.find({ 
            estado: 'inactivo'
        }).sort({ fecha_baja: -1 }); // Ordenar por fecha de baja más reciente primero
        
        // Agregar información de empresa y estadísticas para cada participante
        const participantesConInfo = await Promise.all(
            participantesInactivos.map(async (participante) => {
                let empresaInfo = null;
                if (participante.empresa_id) {
                    const empresa = await Empresa.findById(participante.empresa_id);
                    if (empresa) {
                        empresaInfo = {
                            id: empresa._id,
                            nombre: empresa.nombre,
                            tipo: empresa.tipo,
                            municipio: empresa.municipio
                        };
                    }
                }
                
                // Calcular estadísticas de cursos
                const totalCursos = participante.cursos_inscritos.length;
                const cursosCompletados = participante.cursos_inscritos.filter(c => c.estado === 'completado').length;
                const cursosAbandonados = participante.cursos_inscritos.filter(c => c.estado === 'abandonado').length;
                const cursosInscritos = participante.cursos_inscritos.filter(c => c.estado === 'inscrito').length;
                
                // Calcular tiempo activo (desde createdAt hasta fecha_baja)
                const fechaCreacion = participante.createdAt;
                const fechaBaja = participante.fecha_baja;
                let tiempoActivo = null;
                
                if (fechaCreacion && fechaBaja) {
                    const diffTime = Math.abs(fechaBaja - fechaCreacion);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    tiempoActivo = {
                        dias: diffDays,
                        meses: Math.floor(diffDays / 30),
                        texto: diffDays > 30 ? `${Math.floor(diffDays / 30)} meses` : `${diffDays} días`
                    };
                }
                
                return {
                    ...participante.toObject(),
                    empresa_info: empresaInfo,
                    estadisticas_cursos: {
                        total: totalCursos,
                        completados: cursosCompletados,
                        abandonados: cursosAbandonados,
                        inscritos: cursosInscritos
                    },
                    tiempo_activo: tiempoActivo,
                    // Formatear fechas para mejor visualización
                    fecha_creacion_formateada: fechaCreacion ? fechaCreacion.toLocaleDateString('es-MX') : null,
                    fecha_baja_formateada: fechaBaja ? fechaBaja.toLocaleDateString('es-MX') : null
                };
            })
        );
        
        // Estadísticas generales del historial
        const estadisticasGenerales = {
            total_inactivos: participantesConInfo.length,
            total_cursos_completados: participantesConInfo.reduce((sum, p) => sum + p.estadisticas_cursos.completados, 0),
            total_cursos_abandonados: participantesConInfo.reduce((sum, p) => sum + p.estadisticas_cursos.abandonados, 0),
            empresas_afectadas: [...new Set(participantesConInfo
                .filter(p => p.empresa_info)
                .map(p => p.empresa_info.nombre))].length,
            bajas_este_mes: participantesConInfo.filter(p => {
                if (!p.fecha_baja) return false;
                const fechaBaja = new Date(p.fecha_baja);
                const ahora = new Date();
                return fechaBaja.getMonth() === ahora.getMonth() && 
                       fechaBaja.getFullYear() === ahora.getFullYear();
            }).length
        };
        
        res.json({
            participantes: participantesConInfo,
            estadisticas: estadisticasGenerales,
            mensaje: participantesConInfo.length === 0 ? 'No hay participantes en el historial' : undefined
        });
        
    } catch (error) {
        console.error('Error al obtener historial de participantes:', error);
        res.status(500).json({ message: error.message });
    }
};

export const actualizarParticipante = async (req, res) => {
    const { id } = req.params;
    try {
        let updateData = { ...req.body };
        
        // Validar sexo si se está actualizando
        if (updateData.sexo && !['Hombre', 'Mujer', 'No binario'].includes(updateData.sexo)) {
            throw new Error('El sexo debe ser: Hombre, Mujer o No binario');
        }

        // Si se envía un nuevo archivo PDF de certificado, validarlo y subirlo a Cloudinary
        if (req.file) {
            validarPDF(req.file);
            
            const result = await uploadCertificado(req.file.path);
            const nuevoCertificado = {
                url: result.secure_url,
                public_id: result.public_id,
                nombre_archivo: req.file.originalname,
                tipo: updateData.tipo_certificado || 'otro',
                descripcion: updateData.descripcion_certificado,
                fecha_subida: new Date(),
                estado: 'activo'
            };

            // Obtener participante actual
            const participante = await Participantes.findById(id);
            if (!participante) {
                throw new Error('Participante no encontrado');
            }

            // Agregar nuevo certificado al array
            if (!participante.certificados) {
                participante.certificados = [];
            }
            participante.certificados.push(nuevoCertificado);
            updateData.certificados = participante.certificados;

            // Limpiar archivo temporal
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        }

        const participanteUpdated = await Participantes.findByIdAndUpdate(
            id, 
            updateData, 
            { new: true }
        );

        if (!participanteUpdated) {
            return res.status(404).json({ message: 'Participante no encontrado' });
        }
        
        res.json({
            ...participanteUpdated.toObject(),
            message: req.file ? 'Participante actualizado con nuevo certificado PDF' : 'Participante actualizado'
        });
    } catch (error) {
        // Limpiar archivo temporal en caso de error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        if (error.message.includes('PDF') || error.message.includes('archivo')) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

export const verParticipante = async (req, res) => {
    const { id } = req.params;
    try {
        const participanteFound = await Participantes.findById(id);
        if (!participanteFound) {
            return res.status(404).json({ message: 'Participante no encontrado' });
        }

        // Agregar conteo de certificados activos
        const certificadosActivos = participanteFound.certificados?.filter(c => c.estado === 'activo').length || 0;
        
        res.json({ 
            ...participanteFound.toObject(),
            certificados_activos: certificadosActivos,
            total_certificados: participanteFound.certificados?.length || 0,

        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verParticipantes = async (req, res) => {
    try {
        const { 
            fechaInicio, 
            fechaFin, 
            tipoFecha = 'fechaRegistro' // puede ser 'fechaRegistro' o 'createdAt'
        } = req.query;

        let filtro = {};

        // Filtro por estado (mantiene el código existente)
        const incluirInactivos = req.query.incluirInactivos === 'true';
        if (!incluirInactivos) {
            filtro.estado = 'activo';
        }

        // Agregar filtros de fecha si se proporcionan
        if (fechaInicio || fechaFin) {
            filtro[tipoFecha] = {};
            if (fechaInicio) {
                filtro[tipoFecha].$gte = new Date(fechaInicio);
            }
            if (fechaFin) {
                filtro[tipoFecha].$lte = new Date(fechaFin);
            }
        }

        const participantes = await Participantes.find(filtro)
            .sort({ [tipoFecha]: -1 }); // Ordenar por la fecha seleccionada

        // Agregar información básica de empresa para cada participante
        const participantesConEmpresa = await Promise.all(
            participantes.map(async (participante) => {
                let empresaInfo = null;
                if (participante.empresa_id) {
                    const empresa = await Empresa.findById(participante.empresa_id);
                    if (empresa) {
                        empresaInfo = {
                            id: empresa._id,
                            nombre: empresa.nombre,
                            tipo: empresa.tipo
                        };
                    }
                }
                
                return {
                    ...participante.toObject(),
                    empresa_info: empresaInfo,
                    total_cursos: participante.cursos_inscritos.length,
                    cursos_activos: participante.cursos_inscritos.filter(c => c.estado === 'inscrito').length,
                    cursos_completados: participante.cursos_inscritos.filter(c => c.estado === 'completado').length
                };
            })
        );
        
        res.json(participantesConEmpresa);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función específica para subir certificado PDF a un participante existente
export const subirCertificado = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Verificar que el participante existe
        const participante = await Participantes.findById(id);
        if (!participante) {
            return res.status(404).json({ message: 'Participante no encontrado' });
        }

        // Verificar que se envió un archivo
        if (!req.file) {
            return res.status(400).json({ message: 'No se ha enviado ningún archivo PDF' });
        }

        // Validar que sea PDF
        validarPDF(req.file);

        // Subir certificado PDF a Cloudinary
        const result = await uploadCertificado(req.file.path);
        console.log("ANTES del push:", participante.certificados);

        // Actualizar el participante con los datos completos del certificado
        participante.certificados.push({
    url: result.secure_url,
    public_id: result.public_id,
    nombre_archivo: req.file.originalname,
    tipo: req.body.tipo,
    descripcion: req.body.descripcion,
    fecha_subida: new Date()
});
        
        await participante.save();

        // Limpiar archivo temporal después de subir exitosamente
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({
            message: 'Certificado PDF subido correctamente',
            participante: participante  // Devuelve todo el participante con certificados actualizados
        });

console.log("DESPUÉS del push:", participante.certificados);
        
    } catch (error) {
        console.error('Error en subirCertificado:', error);
        
        // Limpiar archivo temporal en caso de error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        // Manejo específico de errores
        if (error.message && (error.message.includes('PDF') || error.message.includes('archivo'))) {
            return res.status(400).json({ message: error.message });
        }
        
        // Error genérico
        res.status(500).json({ 
            message: 'Error interno del servidor: ' + error.message
        });
    }
};

// Función para inscribir participante a un curso (desde el lado del participante)
export const inscribirACurso = async (req, res) => {
    const { participanteId, cursoId } = req.body;
    try {
        // Verificar que el participante existe
        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        // Verificar que el curso existe en la otra DB
        const curso = await Curso.findById(cursoId);
        if (!curso) return res.status(404).json({ message: 'Curso no encontrado' });

        // Verificar cupo disponible
        if (curso.participantes.length >= curso.cupoMaximo) {
            return res.status(400).json({ message: 'Curso lleno, no hay cupos disponibles' });
        }

        // Verificar que no esté ya inscrito
        const yaInscrito = participante.cursos_inscritos.some(c => c.curso_id.toString() === cursoId);
        if (yaInscrito) {
            return res.status(400).json({ message: 'Ya está inscrito en este curso' });
        }

        // Agregar curso al participante
        participante.cursos_inscritos.push({
            curso_id: cursoId,
            nombreCurso: curso.nombreCurso,
            fecha_inscripcion: new Date(),
            estado: 'inscrito',
            modalidad: curso.modalidad
        });

        // Agregar participante al curso en la otra DB
        curso.participantes.push({
            participante_id: participanteId,
            fecha_inscripcion: new Date(),
            estado: 'inscrito'
        });

        // Guardar ambos
        await participante.save();
        await curso.save();

        res.json({ 
            message: 'Inscripción realizada correctamente', 
            participante: {
                id: participante._id,
                nombre: participante.nombre,
                total_cursos: participante.cursos_inscritos.length
            },
            curso: {
                id: curso._id,
                nombre: curso.nombre,
                participantes_inscritos: curso.participantes.length,
                cupo_maximo: curso.cupoMaximo
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para desinscribir participante de un curso
export const desinscribirDeCurso = async (req, res) => {
    const { participanteId, cursoId } = req.body;
    try {
        // Verificar que el participante existe
        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        // Verificar que el curso existe
        const curso = await Curso.findById(cursoId);
        if (!curso) return res.status(404).json({ message: 'Curso no encontrado' });

        // Verificar que esté inscrito
        const inscripcionIndex = participante.cursos_inscritos.findIndex(c => c.curso_id.toString() === cursoId);
        if (inscripcionIndex === -1) {
            return res.status(400).json({ message: 'El participante no está inscrito en este curso' });
        }

        // Remover del participante
        participante.cursos_inscritos.splice(inscripcionIndex, 1);

        // Remover del curso
        const participanteEnCursoIndex = curso.participantes.findIndex(p => p.participante_id.toString() === participanteId);
        if (participanteEnCursoIndex !== -1) {
            curso.participantes.splice(participanteEnCursoIndex, 1);
        }

        // Guardar ambos
        await participante.save();
        await curso.save();

        res.json({ 
            message: 'Participante desinscrito del curso correctamente',
            participante: {
                id: participante._id,
                nombre: participante.nombre
            },
            curso: {
                id: curso._id,
                nombre: curso.nombre
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para actualizar el estado de un curso de un participante
export const actualizarEstadoCurso = async (req, res) => {
    const { participanteId, cursoId } = req.params;
    const { estado, calificacion, comentarios } = req.body;
    
    try {
        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        const inscripcionIndex = participante.cursos_inscritos.findIndex(c => c.curso_id.toString() === cursoId);
        if (inscripcionIndex === -1) {
            return res.status(404).json({ message: 'El participante no está inscrito en este curso' });
        }

        // Actualizar estado y datos adicionales
        if (estado) participante.cursos_inscritos[inscripcionIndex].estado = estado;
        if (calificacion !== undefined) participante.cursos_inscritos[inscripcionIndex].calificacion = calificacion;
        if (comentarios !== undefined) participante.cursos_inscritos[inscripcionIndex].comentarios = comentarios;

        await participante.save();

        res.json({
            message: 'Estado del curso actualizado correctamente',
            inscripcion: participante.cursos_inscritos[inscripcionIndex]
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para ver participantes de un curso específico (desde participantes)
export const verParticipantesDeCurso = async (req, res) => {
    const { cursoId } = req.params;
    try {
        // Buscar participantes que tengan este curso inscrito
        const participantesInscritos = await Participantes.find({
            'cursos_inscritos.curso_id': cursoId
        });

        // Obtener información del curso
        const curso = await Curso.findById(cursoId);
        if (!curso) return res.status(404).json({ message: 'Curso no encontrado' });

        // Procesar participantes con información de empresa
        const participantesConInfo = await Promise.all(
            participantesInscritos.map(async (participante) => {
                // Obtener información de la empresa
                let empresaInfo = null;
                if (participante.empresa_id) {
                    const empresa = await Empresa.findById(participante.empresa_id);
                    if (empresa) {
                        empresaInfo = {
                            id: empresa._id,
                            nombre: empresa.nombre,
                            tipo: empresa.tipo
                        };
                    }
                }

                // Encontrar la inscripción específica para este curso
                const inscripcion = participante.cursos_inscritos.find(c => c.curso_id.toString() === cursoId);

                return {
                    id: participante._id,
                    nombre: participante.nombre,
                    correo: participante.correo,
                    telefono: participante.telefono,
                    puesto: participante.puesto,
                    edad: participante.edad,
                    empresa_info: empresaInfo,
                    inscripcion: {
                        fecha_inscripcion: inscripcion.fecha_inscripcion,
                        estado: inscripcion.estado,
                        calificacion: inscripcion.calificacion,
                        comentarios: inscripcion.comentarios
                    }
                };
            })
        );

        res.json({
            curso: {
                id: curso._id,
                nombre: curso.nombre,
                tipo: curso.tipo,
                fechaInicio: curso.fechaInicio,
                fechaFin: curso.fechaFin,
                cupoMaximo: curso.cupoMaximo
            },
            totalInscritos: participantesConInfo.length,
            participantes: participantesConInfo,
            estadisticas: {
                inscritos: participantesConInfo.filter(p => p.inscripcion.estado === 'inscrito').length,
                completados: participantesConInfo.filter(p => p.inscripcion.estado === 'completado').length,
                abandonados: participantesConInfo.filter(p => p.inscripcion.estado === 'abandonado').length
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para obtener participantes por empresa
export const verParticipantesPorEmpresa = async (req, res) => {
    const { empresaId } = req.params;
    try {
        // Verificar que la empresa existe
        const empresa = await Empresa.findById(empresaId);
        if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

        // Buscar participantes de esta empresa
        const participantes = await Participantes.find({
            $or: [
                { empresa_id: empresaId },
                { empresaProdecendia: empresa.nombre }
            ]
        });

        // Procesar participantes con información de cursos
        const participantesConCursos = await Promise.all(
            participantes.map(async (participante) => {
                const cursosInfo = await Promise.all(
                    participante.cursos_inscritos.map(async (inscripcion) => {
                        const curso = await Curso.findById(inscripcion.curso_id);
                        return {
                            ...inscripcion.toObject(),
                            curso_info: curso ? {
                                id: curso._id,
                                nombre: curso.nombre,
                                tipo: curso.tipo
                            } : null
                        };
                    })
                );

                return {
                    ...participante.toObject(),
                    cursos_inscritos: cursosInfo
                };
            })
        );

        res.json({
            empresa: {
                id: empresa._id,
                nombre: empresa.nombre,
                tipo: empresa.tipo
            },
            total_participantes: participantesConCursos.length,
            participantes: participantesConCursos
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verCertificado = async (req, res) => {
    const { id } = req.params; // id del participante
    
    try {
        // Verificar que el participante existe
        const participante = await Participantes.findById(id);
        if (!participante) {
            return res.status(404).json({ message: 'Participante no encontrado' });
        }

        // Verificar que tiene certificado
        if (!participante.certificado || !participante.certificado.url) {
            return res.status(404).json({ message: 'El participante no tiene certificado subido' });
        }

        // Devolver la URL del certificado para visualización
        res.json({
            success: true,
            url: participante.certificado.url,
            nombre_archivo: participante.certificado.nombre_archivo,
            fecha_subida: participante.certificado.fecha_subida,
            participante: {
                id: participante._id,
                nombre: participante.nombre
            }
        });
        
    } catch (error) {
        console.error('Error en verCertificado:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor: ' + error.message
        });
    }
};

// Función para descargar certificado (devuelve el archivo como blob)
export const descargarCertificado = async (req, res) => {
    const { id } = req.params; // id del participante
    
    try {
        // Verificar que el participante existe
        const participante = await Participantes.findById(id);
        if (!participante) {
            return res.status(404).json({ message: 'Participante no encontrado' });
        }

        // Verificar que tiene certificado
        if (!participante.certificado || !participante.certificado.url) {
            return res.status(404).json({ message: 'El participante no tiene certificado subido' });
        }

        // Obtener el archivo de Cloudinary
        const certificadoUrl = participante.certificado.url;
        const nombreArchivo = participante.certificado.nombre_archivo || 
            `certificado_${participante.nombre.replace(/\s+/g, '_')}.pdf`;

        try {
            // Usar fetch nativo de Node.js 22
            const response = await fetch(certificadoUrl);
            
            if (!response.ok) {
                console.error(`Error al obtener archivo de Cloudinary: ${response.status} ${response.statusText}`);
                throw new Error(`No se pudo obtener el archivo de Cloudinary: ${response.status}`);
            }

            // Obtener el arrayBuffer y convertirlo a Buffer
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Configurar headers para descarga
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'no-cache');

            // Enviar el archivo
            res.send(buffer);
            
        } catch (fetchError) {
            console.error('Error al descargar desde Cloudinary:', fetchError);
            return res.status(500).json({ 
                message: 'Error al descargar el certificado desde el almacenamiento',
                error: fetchError.message 
            });
        }
        
    } catch (error) {
        console.error('Error en descargarCertificado:', error);
        res.status(500).json({ 
            message: 'Error interno del servidor: ' + error.message
        });
    }
};

// Agregar una nueva función para obtener estadísticas por fechas
export const obtenerEstadisticasPorFecha = async (req, res) => {
    try {
        const { 
            fechaInicio, 
            fechaFin, 
            tipoFecha = 'fechaRegistro'
        } = req.query;

        let filtro = {};
        if (fechaInicio || fechaFin) {
            filtro[tipoFecha] = {};
            if (fechaInicio) filtro[tipoFecha].$gte = new Date(fechaInicio);
            if (fechaFin) filtro[tipoFecha].$lte = new Date(fechaFin);
        }

        const estadisticas = await Participantes.aggregate([
            { $match: filtro },
            { 
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    activos: { 
                        $sum: { 
                            $cond: [{ $eq: ["$estado", "activo"] }, 1, 0] 
                        }
                    },
                    inactivos: { 
                        $sum: { 
                            $cond: [{ $eq: ["$estado", "inactivo"] }, 1, 0] 
                        }
                    },
                    promedioEdad: { $avg: "$edad" }
                }
            }
        ]);

        res.json({
            periodo: {
                inicio: fechaInicio,
                fin: fechaFin,
                tipoFecha
            },
            estadisticas: estadisticas[0] || {
                total: 0,
                activos: 0,
                inactivos: 0,
                promedioEdad: 0
            }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};