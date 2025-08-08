import Empresa from "../models/empresas.model.js";
import Participantes from "../models/participantes.model.js";
import Curso from "../models/cursos.model.js";

// Función para crear/registrar una nueva empresa
export const subirEmpresa = async (req, res) => {
    const { nombre, tipo, rfc, telefono, correo, direccion, municipio, contacto } = req.body;
    try {
        // Verificar que la empresa no exista ya por RFC
        const empresaExistente = await Empresa.findOne({ rfc });
        if (empresaExistente) {
            return res.status(400).json({ message: 'Ya existe una empresa registrada con este RFC' });
        }

        const newEmpresa = new Empresa({
            nombre,
            tipo,
            rfc,
            telefono,
            correo,
            direccion,
            municipio,
            contacto,
            participantes: [],
            estado: 'activa'
        });

        const empresaSaved = await newEmpresa.save();
        res.json({
            ...empresaSaved.toObject(),
            message: 'Empresa registrada correctamente'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para eliminar una empresa
export const eliminarEmpresa = async (req, res) => {
    const { id } = req.body;
    try {
        // Verificar si la empresa existe
        const empresa = await Empresa.findById(id);
        if (!empresa) {
            return res.status(404).json({ message: 'Empresa no encontrada' });
        }

        // Verificar participantes asociados en la base de participantes
        const participantesAsociados = await Participantes.find({ 
            $or: [
                { empresaProdecendia: empresa.nombre },
                { empresa_id: id }
            ]
        });

        if (participantesAsociados.length > 0) {
            return res.status(400).json({ 
                message: `No se puede eliminar la empresa porque tiene ${participantesAsociados.length} participantes asociados. Elimine primero los participantes o cámbielos de empresa.` 
            });
        }

        await Empresa.findByIdAndDelete(id);
        res.json({ message: 'Empresa eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para actualizar datos de una empresa
export const actualizarEmpresa = async (req, res) => {
    const { id } = req.params;
    try {
        // Si se está actualizando el RFC, verificar que no exista en otra empresa
        if (req.body.rfc) {
            const empresaConRFC = await Empresa.findOne({ rfc: req.body.rfc, _id: { $ne: id } });
            if (empresaConRFC) {
                return res.status(400).json({ message: 'Ya existe otra empresa con este RFC' });
            }
        }

        const empresaUpdated = await Empresa.findByIdAndUpdate(id, req.body, { new: true });
        if (!empresaUpdated) return res.status(404).json({ message: 'Empresa no encontrada' });

        // Si se actualiza el nombre de la empresa, actualizar también en participantes
        if (req.body.nombre && req.body.nombre !== empresaUpdated.nombre) {
            await Participantes.updateMany(
                { empresa_id: id },
                { empresaProdecendia: req.body.nombre }
            );
        }
        
        res.json({
            ...empresaUpdated.toObject(),
            message: 'Empresa actualizada correctamente'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para ver una empresa específica con sus participantes y cursos
export const verEmpresa = async (req, res) => {
    const { id } = req.params;
    try {
        // Obtener la empresa
        const empresaFound = await Empresa.findById(id);
        if (!empresaFound) return res.status(404).json({ message: 'Empresa no encontrada' });
        
        // Buscar participantes asociados a esta empresa en la otra DB
        const participantesData = await Participantes.find({ 
            $or: [
                { empresaProdecendia: empresaFound.nombre },
                { empresa_id: id }
            ]
        });
        
        // Para cada participante, obtener también sus cursos
        const participantesCompletos = await Promise.all(
            participantesData.map(async (participante) => {
                // Obtener cursos del participante desde la DB de cursos
                const cursosInscritos = await Promise.all(
                    participante.cursos_inscritos.map(async (inscripcion) => {
                        const curso = await Curso.findById(inscripcion.curso_id);
                        return {
                            ...inscripcion.toObject(),
                            curso_info: curso ? {
                                id: curso._id,
                                nombre: curso.nombre,
                                tipo: curso.tipo,
                                fechaInicio: curso.fechaInicio,
                                fechaFin: curso.fechaFin,
                                modalidad: curso.modalidad,
                                instructor: curso.instructor
                            } : null
                        };
                    })
                );

                return {
                    ...participante.toObject(),
                    cursos_inscritos: cursosInscritos
                };
            })
        );

        // Calcular estadísticas
        const cursosUnicos = [...new Set(
            participantesCompletos.flatMap(p => 
                p.cursos_inscritos
                    .filter(c => c.estado === 'inscrito')
                    .map(c => c.curso_id.toString())
            )
        )];
        
        const empresaCompleta = {
            ...empresaFound.toObject(),
            participantes: participantesCompletos,
            estadisticas: {
                total_participantes: participantesCompletos.length,
                cursos_activos: cursosUnicos.length,
                participantes_activos: participantesCompletos.filter(p => p.estado === 'activo').length,
                cursos_completados: participantesCompletos.reduce((total, p) => 
                    total + p.cursos_inscritos.filter(c => c.estado === 'completado').length, 0
                )
            }
        };
        
        res.json(empresaCompleta);
        
    } catch (error) {
        console.error("Error en verEmpresa:", error);
        res.status(500).json({ message: error.message });
    }
};

// Función para ver todas las empresas con estadísticas básicas
export const verEmpresas = async (req, res) => {
    try {
        const empresas = await Empresa.find();
        
        // Agregar estadísticas básicas a cada empresa
        const empresasConEstadisticas = await Promise.all(
            empresas.map(async (empresa) => {
                // Buscar participantes de esta empresa
                const participantesData = await Participantes.find({ 
                    $or: [
                        { empresaProdecendia: empresa.nombre },
                        { empresa_id: empresa._id }
                    ]
                });
                
                const totalParticipantes = participantesData.length;
                
                // Contar cursos activos de los participantes de esta empresa
                const cursosActivos = totalParticipantes > 0 ? [...new Set(
                    participantesData.flatMap(p => 
                        p.cursos_inscritos
                            .filter(c => c.estado === 'inscrito')
                            .map(c => c.curso_id.toString())
                    )
                )].length : 0;

                return {
                    ...empresa.toObject(),
                    estadisticas: {
                        total_participantes: totalParticipantes,
                        cursos_activos: cursosActivos,
                        participantes_activos: participantesData.filter(p => p.estado === 'activo').length
                    }
                };
            })
        );
        
        res.json(empresasConEstadisticas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para asociar un participante existente a una empresa
export const asociarParticipante = async (req, res) => {
    const { empresaId } = req.params;
    const { participanteId } = req.body;
    
    try {
        // Verificar que la empresa existe
        const empresa = await Empresa.findById(empresaId);
        if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

        // Verificar que el participante existe en la otra DB
        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        // Verificar que el participante no esté ya asociado a otra empresa
        if (participante.empresa_id && participante.empresa_id.toString() !== empresaId) {
            const empresaAnterior = await Empresa.findById(participante.empresa_id);
            return res.status(400).json({ 
                message: `El participante ya está asociado a la empresa: ${empresaAnterior?.nombre || 'Empresa no encontrada'}` 
            });
        }

        // Asociar participante a empresa
        participante.empresa_id = empresaId;
        participante.empresaProdecendia = empresa.nombre;
        
        await participante.save();

        // Actualizar la lista de participantes en la empresa (opcional, para estadísticas)
        if (!empresa.participantes.some(p => p.participante_id && p.participante_id.toString() === participanteId)) {
            empresa.participantes.push({
                participante_id: participanteId,
                fecha_asociacion: new Date(),
                estado: 'activo'
            });
            await empresa.save();
        }

        res.json({ 
            message: 'Participante asociado a la empresa correctamente',
            empresa: {
                id: empresa._id,
                nombre: empresa.nombre
            },
            participante: {
                id: participante._id,
                nombre: participante.nombre,
                empresa: empresa.nombre
            }
        });
    } catch (error) {
        console.error("Error en asociarParticipante:", error);
        res.status(500).json({ message: error.message });
    }
};

// Función para desasociar un participante de una empresa
export const desasociarParticipante = async (req, res) => {
    const { empresaId, participanteId } = req.params;
    
    try {
        // Verificar que la empresa existe
        const empresa = await Empresa.findById(empresaId);
        if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

        // Verificar que el participante existe y está asociado a esta empresa
        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        if (!participante.empresa_id || participante.empresa_id.toString() !== empresaId) {
            return res.status(400).json({ message: 'El participante no está asociado a esta empresa' });
        }

        // Desasociar participante
        participante.empresa_id = null;
        participante.empresaProdecendia = '';
        await participante.save();

        // Remover de la lista de participantes de la empresa
        empresa.participantes = empresa.participantes.filter(
            p => p.participante_id && p.participante_id.toString() !== participanteId
        );
        await empresa.save();

        res.json({ 
            message: 'Participante desasociado de la empresa correctamente',
            empresa: {
                id: empresa._id,
                nombre: empresa.nombre
            }
        });
    } catch (error) {
        console.error("Error en desasociarParticipante:", error);
        res.status(500).json({ message: error.message });
    }
};

// Función para obtener participantes de una empresa agrupados por curso
export const verParticipantesPorCurso = async (req, res) => {
    const { empresaId } = req.params;
    
    try {
        const empresa = await Empresa.findById(empresaId);
        if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

        // Obtener participantes de la empresa desde la otra DB
        const participantesData = await Participantes.find({ 
            $or: [
                { empresaProdecendia: empresa.nombre },
                { empresa_id: empresaId }
            ]
        });

        // Agrupar participantes por curso
        const participantesPorCurso = {};
        
        for (const participante of participantesData) {
            for (const inscripcion of participante.cursos_inscritos) {
                const curso = await Curso.findById(inscripcion.curso_id);
                if (curso) {
                    const cursoId = curso._id.toString();
                    if (!participantesPorCurso[cursoId]) {
                        participantesPorCurso[cursoId] = {
                            curso_info: {
                                id: curso._id,
                                nombre: curso.nombre,
                                tipo: curso.tipo,
                                fechaInicio: curso.fechaInicio,
                                fechaFin: curso.fechaFin,
                                modalidad: curso.modalidad,
                                instructor: curso.instructor
                            },
                            participantes: []
                        };
                    }
                    
                    participantesPorCurso[cursoId].participantes.push({
                        id: participante._id,
                        nombre: participante.nombre,
                        correo: participante.correo,
                        puesto: participante.puesto,
                        telefono: participante.telefono,
                        fecha_inscripcion: inscripcion.fecha_inscripcion,
                        estado: inscripcion.estado,
                        calificacion: inscripcion.calificacion
                    });
                }
            }
        }

        res.json({
            empresa: {
                id: empresa._id,
                nombre: empresa.nombre
            },
            cursos_con_participantes: Object.values(participantesPorCurso),
            total_cursos: Object.keys(participantesPorCurso).length,
            total_participantes: participantesData.length
        });
    } catch (error) {
        console.error("Error en verParticipantesPorCurso:", error);
        res.status(500).json({ message: error.message });
    }
};

// Función para obtener estadísticas detalladas de cursos
export const obtenerEstadisticasCursos = async (req, res) => {
  const { empresaId } = req.params;
  
  try {
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

    const participantes = await Participantes.find({ 
      $or: [
        { empresaProdecendia: empresa.nombre },
        { empresa_id: empresaId }
      ]
    });

    // Estadísticas por curso
    const estadisticasCursos = {};
    
    participantes.forEach(participante => {
      participante.cursos_inscritos.forEach(inscripcion => {
        const cursoId = inscripcion.curso_id.toString();
        if (!estadisticasCursos[cursoId]) {
          estadisticasCursos[cursoId] = {
            curso_id: cursoId,
            nombre: '',
            total_inscritos: 0,
            completados: 0,
            abandonados: 0,
            calificacion_promedio: 0,
          };
        }
        
        estadisticasCursos[cursoId].total_inscritos++;
        if (inscripcion.estado === 'completado') estadisticasCursos[cursoId].completados++;
        if (inscripcion.estado === 'abandonado') estadisticasCursos[cursoId].abandonados++;
        if (inscripcion.calificacion) {
          estadisticasCursos[cursoId].calificacion_promedio += inscripcion.calificacion;
        }
      });
    });

    // Obtener nombres de cursos y calcular promedios
    for (const cursoId in estadisticasCursos) {
      const curso = await Curso.findById(cursoId);
      if (curso) estadisticasCursos[cursoId].nombre = curso.nombre;
      
      if (estadisticasCursos[cursoId].total_inscritos > 0) {
        estadisticasCursos[cursoId].calificacion_promedio = 
          (estadisticasCursos[cursoId].calificacion_promedio / 
          estadisticasCursos[cursoId].total_inscritos).toFixed(2);
      }
    }

    res.json({
      empresa: {
        id: empresa._id,
        nombre: empresa.nombre
      },
      estadisticas_cursos: Object.values(estadisticasCursos)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Función para obtener participantes con detalles de cursos
export const obtenerParticipantesConCursos = async (req, res) => {
  const { empresaId } = req.params;
  
  try {
    const empresa = await Empresa.findById(empresaId);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

    const participantes = await Participantes.find({ 
      $or: [
        { empresaProdecendia: empresa.nombre },
        { empresa_id: empresaId }
      ]
    }).populate({
      path: 'cursos_inscritos.curso_id',
      select: 'nombre tipo fechaInicio fechaFin'
    });

    const participantesConDetalles = participantes.map(p => ({
      id: p._id,
      nombre: p.nombre,
      puesto: p.puesto,
      cursos: p.cursos_inscritos.map(c => ({
        curso_id: c.curso_id._id,
        nombre: c.curso_id.nombre,
        tipo: c.curso_id.tipo,
        fecha_inscripcion: c.fecha_inscripcion,
        estado: c.estado,
        calificacion: c.calificacion
      }))
    }));

    res.json({
      empresa: {
        id: empresa._id,
        nombre: empresa.nombre
      },
      total_participantes: participantes.length,
      participantes: participantesConDetalles
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Función para obtener estadísticas generales por empresa
export const obtenerEstadisticasEmpresa = async (req, res) => {
    const { empresaId } = req.params;
    
    try {
        const empresa = await Empresa.findById(empresaId);
        if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

        // Obtener participantes de la empresa
        const participantesData = await Participantes.find({ 
            $or: [
                { empresaProdecendia: empresa.nombre },
                { empresa_id: empresaId }
            ]
        });

        // Calcular estadísticas detalladas
        const totalParticipantes = participantesData.length;
        const participantesActivos = participantesData.filter(p => p.estado === 'activo').length;
        
        const cursosInscritos = participantesData.reduce((total, p) => 
            total + p.cursos_inscritos.filter(c => c.estado === 'inscrito').length, 0
        );
        
        const cursosCompletados = participantesData.reduce((total, p) => 
            total + p.cursos_inscritos.filter(c => c.estado === 'completado').length, 0
        );

        const cursosAbandonados = participantesData.reduce((total, p) => 
            total + p.cursos_inscritos.filter(c => c.estado === 'abandonado').length, 0
        );

        // Cursos únicos
        const cursosUnicos = [...new Set(
            participantesData.flatMap(p => 
                p.cursos_inscritos.map(c => c.curso_id.toString())
            )
        )];

        res.json({
            empresa: {
                id: empresa._id,
                nombre: empresa.nombre,
                tipo: empresa.tipo,
                municipio: empresa.municipio
            },
            estadisticas: {
                total_participantes: totalParticipantes,
                participantes_activos: participantesActivos,
                participantes_inactivos: totalParticipantes - participantesActivos,
                total_inscripciones: cursosInscritos,
                cursos_completados: cursosCompletados,
                cursos_abandonados: cursosAbandonados,
                cursos_unicos_tomados: cursosUnicos.length,
                tasa_completacion: cursosInscritos > 0 ? ((cursosCompletados / cursosInscritos) * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error("Error en obtenerEstadisticasEmpresa:", error);
        res.status(500).json({ message: error.message });
    }
};