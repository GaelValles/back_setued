import Curso from "../models/cursos.model.js";
import Participantes from "../models/participantes.model.js";

//Funcion para subir cursos
export const subirCurso = async (req, res) => {
    const { nombreCurso, tipo, fechaInicio, fechaFin, horario, duracion, modalidad, instructor, perfilInstructor, objetivos,
            perfilParticipante, cupoMinimo, cupoMaximo, costo, costoGeneral, temario, procesoInscripcion } = req.body;
    try {
        const newCurso = new Curso({
            nombreCurso, tipo, fechaInicio, fechaFin, horario, duracion, modalidad, instructor, perfilInstructor, objetivos,
            perfilParticipante, cupoMinimo, cupoMaximo, costo, costoGeneral, temario, procesoInscripcion
        });

        const cursoSaved = await newCurso.save();
        res.json(cursoSaved);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// CORRECCIÓN: Ahora mantiene la integridad de los datos
export const eliminarCurso = async (req, res) => {
    const { id } = req.body;
    try {
        // 1. Encontrar a todos los participantes inscritos en este curso
        const participantesAfectados = await Participantes.find({ 'cursos_inscritos.curso_id': id });

        // 2. Eliminar la referencia del curso en cada participante
        for (const participante of participantesAfectados) {
            participante.cursos_inscritos = participante.cursos_inscritos.filter(
                inscripcion => inscripcion.curso_id.toString() !== id
            );
            await participante.save();
        }

        // 3. Ahora sí, eliminar el curso
        const cursoDeleted = await Curso.findByIdAndDelete(id);
        if (!cursoDeleted) return res.status(404).json({ message: 'Curso no encontrado' });

        res.json({ message: 'Curso eliminado correctamente y participantes actualizados.' });
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

// MEJORA: La respuesta ahora es más clara y estructurada
export const verCurso = async (req, res) => {
    const { id } = req.params;
    try {
        const cursoFound = await Curso.findById(id);
        if (!cursoFound) return res.status(404).json({ message: 'Curso no encontrado' });
        
        // Crear una copia del objeto para modificarlo
        const cursoCompleto = cursoFound.toObject();

        if (cursoCompleto.participantes && cursoCompleto.participantes.length > 0) {
            const participantesIds = cursoCompleto.participantes.map(p => p.participante_id);
            const participantesNombres = cursoCompleto.participantes.map(p => p.nombre);
            const participantesData = await Participantes.find({ _id: { $in: participantesIds } }, { nombre: { $in: participantesNombres } }).select('nombre correo telefono empresaProdecendia');
            
            // Crear un mapa para búsqueda eficiente
            const participantesMap = new Map(participantesData.map(p => [p._id.toString(), p]));

            // Enriquecer la información de cada participante en la inscripción
            cursoCompleto.participantes = cursoCompleto.participantes.map(inscripcion => {
                return {
                    ...inscripcion,
                    participante_info: participantesMap.get(inscripcion.participante_id.toString()) || null
                };
            });
        }
        
        res.json(cursoCompleto);

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
}

// Esta función ya estaba bien, la dejamos como está
export const inscribirParticipante = async (req, res) => {
    const { cursoId } = req.params;
    const { participanteId } = req.body;

    try {
        const curso = await Curso.findById(cursoId);
        if (!curso) return res.status(404).json({ message: 'Curso no encontrado' });

        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        if (curso.participantes.length >= curso.cupoMaximo) {
            return res.status(400).json({ message: 'Curso lleno, no hay cupos disponibles' });
        }

        if (curso.participantes.some(p => p.participante_id.toString() === participanteId)) {
            return res.status(400).json({ message: 'El participante ya está inscrito en este curso' });
        }

        const fechaInscripcion = new Date();
        const nombreCurso = curso.nombreCurso;
        curso.participantes.push({ participante_id: participanteId, nombreCurso: nombreCurso,fecha_inscripcion: fechaInscripcion, estado: 'inscrito' });
        participante.cursos_inscritos.push({ curso_id: cursoId, nombreCurso: nombreCurso,fecha_inscripcion: fechaInscripcion, estado: 'inscrito' });

        await curso.save();
        await participante.save();

        res.json({ message: 'Participante inscrito correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// ¡NUEVA FUNCIÓN! Para desinscribir participantes
export const desinscribirParticipante = async (req, res) => {
    const { cursoId, participanteId } = req.params; // Ambos IDs desde la URL

    try {
        const curso = await Curso.findById(cursoId);
        if (!curso) return res.status(404).json({ message: 'Curso no encontrado' });

        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        // Verificar que el participante realmente esté inscrito
        const estaInscritoCurso = curso.participantes.some(p => p.participante_id.toString() === participanteId);
        const estaInscritoParticipante = participante.cursos_inscritos.some(c => c.curso_id.toString() === cursoId);

        if (!estaInscritoCurso || !estaInscritoParticipante) {
            return res.status(400).json({ message: 'El participante no se encuentra inscrito en este curso.' });
        }

        // Remover de la lista del curso
        curso.participantes = curso.participantes.filter(p => p.participante_id.toString() !== participanteId);

        // Remover de la lista del participante
        participante.cursos_inscritos = participante.cursos_inscritos.filter(c => c.curso_id.toString() !== cursoId);
        
        await curso.save();
        await participante.save();

        res.json({ message: 'Participante desinscrito correctamente.' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};