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
    const { nombre, empresaProdecendia, empresa_id, puesto, edad, correo, telefono, curp } = req.body;
    try {
        let certificadoData = null;
        
        // Si se envía un archivo de certificado PDF, validarlo y subirlo a Cloudinary
        if (req.file) {
            validarPDF(req.file);
            
            const result = await uploadCertificado(req.file.path);
            certificadoData = {
                url: result.secure_url,
                public_id: result.public_id,
                nombre_archivo: req.file.originalname,
                fecha_subida: new Date()
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
            empresaProdecendia: nombreEmpresa,
            empresa_id: empresa_id || null,
            puesto,
            edad,
            correo,
            telefono,
            curp,
            certificado: certificadoData
        });

        const participanteSaved = await newParticipante.save();

        // Si tiene empresa_id, actualizar la lista de participantes en la empresa
        if (empresa_id) {
            const empresa = await Empresa.findById(empresa_id);
            if (empresa && !empresa.participantes.some(p => p.participante_id && p.participante_id.toString() === participanteSaved._id.toString())) {
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
    const { id } = req.body;
    try {
        const participante = await Participantes.findById(id);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        // Si tiene empresa asociada, remover de la lista de participantes de la empresa
        if (participante.empresa_id) {
            const empresa = await Empresa.findById(participante.empresa_id);
            if (empresa) {
                empresa.participantes = empresa.participantes.filter(
                    p => p.participante_id && p.participante_id.toString() !== id
                );
                await empresa.save();
            }
        }

        // Remover participante de los cursos donde esté inscrito
        for (const inscripcion of participante.cursos_inscritos) {
            const curso = await Curso.findById(inscripcion.curso_id);
            if (curso) {
                curso.participantes = curso.participantes.filter(
                    p => p.participante_id && p.participante_id.toString() !== id
                );
                await curso.save();
            }
        }

        await Participantes.findByIdAndDelete(id);
        res.json({ message: 'Participante eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const actualizarParticipante = async (req, res) => {
    const { id } = req.params;
    try {
        let updateData = { ...req.body };
        
        // Si se envía un nuevo archivo PDF de certificado, validarlo y subirlo a Cloudinary
        if (req.file) {
            validarPDF(req.file);
            
            const result = await uploadCertificado(req.file.path);
            updateData.certificado = {
                url: result.secure_url,
                public_id: result.public_id,
                nombre_archivo: req.file.originalname,
                fecha_subida: new Date()
            };

            // Limpiar archivo temporal
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        }

        // Si se actualiza la empresa, validar y sincronizar
        if (updateData.empresa_id) {
            const empresa = await Empresa.findById(updateData.empresa_id);
            if (!empresa) {
                return res.status(404).json({ message: 'Empresa no encontrada' });
            }
            updateData.empresaProdecendia = empresa.nombre;
        }

        const participanteUpdated = await Participantes.findByIdAndUpdate(id, updateData, { new: true });
        if (!participanteUpdated) return res.status(404).json({ message: 'Participante no encontrado' });
        
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
        if (!participanteFound) return res.status(404).json({ message: 'Participante no encontrado' });

        // Cargar cursos manualmente desde la otra base
        const cursos = await Promise.all(participanteFound.cursos_inscritos.map(async (inscripcion) => {
            const curso = await Curso.findById(inscripcion.curso_id);
            return {
                ...inscripcion.toObject(),
                curso: curso ? curso.toObject() : null
            };
        }));

        // Cargar información de la empresa si existe
        let empresaInfo = null;
        if (participanteFound.empresa_id) {
            const empresa = await Empresa.findById(participanteFound.empresa_id);
            if (empresa) {
                empresaInfo = {
                    id: empresa._id,
                    nombre: empresa.nombre,
                    tipo: empresa.tipo,
                    municipio: empresa.municipio,
                    rfc: empresa.rfc
                };
            }
        }

        res.json({ 
            ...participanteFound.toObject(), 
            cursos_inscritos: cursos,
            empresa_info: empresaInfo
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verParticipantes = async (req, res) => {
    try {
        const participantes = await Participantes.find();
        
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

        // Actualizar el participante con los datos completos del certificado
        participante.certificado = {
            url: result.secure_url,
            public_id: result.public_id,
            nombre_archivo: req.file.originalname,
            fecha_subida: new Date()
        };
        
        await participante.save();

        // Limpiar archivo temporal después de subir exitosamente
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.json({ 
            message: 'Certificado PDF subido correctamente',
            certificado: participante.certificado,
            participante: {
                id: participante._id,
                nombre: participante.nombre,
                correo: participante.correo
            }
        });
        
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
            fecha_inscripcion: new Date(),
            estado: 'inscrito'
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