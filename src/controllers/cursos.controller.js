import Curso from "../models/cursos.model.js";
import Participantes from "../models/participantes.model.js";
//Funcion para subir cursos
//Esta funcion recibe los datos del curso y lo guarda en la base de datos
export const subirCurso = async (req, res) => {
    const {nombre, tipo, fechaInicio, fechaFin, horario, duracion, modalidad, instructor, perfilInstructor, objetivos,
            perfilParticipante, cupoMinimo, cupoMaximo, costo, costoGeneral, temario, procesoInscripcion} = req.body;
    try {
        const newCurso = new Curso({
            nombre,
            tipo,
            fechaInicio,
            fechaFin,
            horario,
            duracion,
            modalidad,
            instructor,
            perfilInstructor,
            objetivos,
            perfilParticipante,
            cupoMinimo,
            cupoMaximo,
            costo,
            costoGeneral,
            temario,
            procesoInscripcion
            // Removido 'correo' porque no existe en tu modelo
        });

        const cursoSaved = await newCurso.save();
        res.json(cursoSaved);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const eliminarCurso = async (req, res) => {
    //Esta funcion recibe el id del curso y lo elimina de la base de datos
    const { id } = req.body;
    try {
        const cursoDeleted = await Curso.findByIdAndDelete(id);
        if (!cursoDeleted) return res.status(404).json({ message: 'Curso no encontrado' });
        res.json({ message: 'Curso eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const actualizarCurso = async (req, res) => {
    const { id } = req.params;
    try {
        const cursoUpdated = await Curso.findByIdAndUpdate(id, req.body, { new: true });
        if (!cursoUpdated) return res.status(404).json({ message: 'Curso no encontrado' });
        res.json(cursoUpdated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verCurso = async (req, res) => {
    const { id } = req.params;
    try {
        // Obtener el curso sin populate
        const cursoFound = await Curso.findById(id);
        if (!cursoFound) return res.status(404).json({ message: 'Curso no encontrado' });
        
        // Si hay participantes, obtener sus datos manualmente
        if (cursoFound.participantes && cursoFound.participantes.length > 0) {
            // Extraer los IDs de participantes
            const participantesIds = cursoFound.participantes.map(p => p.participante_id);
            
            // Obtener datos de participantes de la otra base de datos
            const participantesData = await Participantes.find({ 
                _id: { $in: participantesIds } 
            });
            
            // Combinar los datos
            const participantesCompletos = cursoFound.participantes.map(p => {
                const participanteData = participantesData.find(
                    pd => pd._id.toString() === p.participante_id.toString()
                );
                return {
                    ...p.toObject(),
                    participante_id: participanteData || null
                };
            });
            
            // Crear objeto con datos completos
            const cursoCompleto = {
                ...cursoFound.toObject(),
                participantes: participantesCompletos
            };
            
            res.json(cursoCompleto);
        } else {
            // Si no hay participantes, devolver el curso tal como está
            res.json(cursoFound);
        }
    } catch (error) {
        console.error("Error en verCurso:", error);
        res.status(500).json({ message: error.message });
    }
};

export const verCursos = async (req, res) => {
    //Esta funcion devuelve todos los cursos
    //Busca todos los cursos en la base de datos
    try {
        const cursos = await Curso.find();
        res.json(cursos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Nueva función para inscribir participante a curso
export const inscribirParticipante = async (req, res) => {
    const { cursoId } = req.params; // cursoId viene de la URL
    const { participanteId } = req.body; // participanteId viene del body
    
    try {
        // Verificar que el curso existe
        const curso = await Curso.findById(cursoId);
        if (!curso) return res.status(404).json({ message: 'Curso no encontrado' });

        // Verificar que el participante existe en la otra base de datos
        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        // Verificar cupo disponible
        if (curso.participantes.length >= curso.cupoMaximo) {
            return res.status(400).json({ message: 'Curso lleno, no hay cupos disponibles' });
        }

        // Verificar que el participante no esté ya inscrito
        const yaInscrito = curso.participantes.some(p => p.participante_id.toString() === participanteId);
        if (yaInscrito) {
            return res.status(400).json({ message: 'El participante ya está inscrito en este curso' });
        }

        // Agregar participante al curso
        curso.participantes.push({
            participante_id: participanteId,
            fecha_inscripcion: new Date(),
            estado: 'inscrito'
        });

        // También actualizar el participante con el curso inscrito
        participante.cursos_inscritos.push({
            curso_id: cursoId,
            fecha_inscripcion: new Date(),
            estado: 'inscrito'
        });

        // Guardar en ambas bases de datos
        await curso.save();
        await participante.save();

        res.json({ 
            message: 'Participante inscrito correctamente', 
            curso: {
                id: curso._id,
                nombre: curso.nombre,
                participantes_inscritos: curso.participantes.length,
                cupo_maximo: curso.cupoMaximo
            },
            participante: {
                id: participante._id,
                nombre: participante.nombre // Ajusta según tu modelo
            }
        });
    } catch (error) {
        console.error("Error en inscribirParticipante:", error);
        res.status(500).json({ message: error.message });
    }
};