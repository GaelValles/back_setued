import Participantes from "../models/participantes.model.js";
import Curso from "../models/cursos.model.js";

//Funcion para subir participantes
//Esta funcion recibe los datos del participante y lo guarda en la base de datos
export const subirParticipante = async (req, res) => {
    const {nombre, empresaProdecendia, puesto, edad, correo, telefono, curp} = req.body;
    try {
        const newParticipante = new Participantes({
            nombre,
            empresaProdecendia,
            puesto,
            edad,
            correo,
            telefono,
            curp
        });

        const participanteSaved = await newParticipante.save();
        res.json(participanteSaved);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const eliminarParticipante = async (req, res) => {
    //Esta funcion recibe el id del participante y lo elimina de la base de datos
    const { id } = req.body;
    try {
        const participanteDeleted = await Participantes.findByIdAndDelete(id);
        if (!participanteDeleted) return res.status(404).json({ message: 'Participante no encontrado' });
        res.json({ message: 'Participante eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const actualizarParticipante = async (req, res) => {
    const { id } = req.params;
    try {
        const participanteUpdated = await Participantes.findByIdAndUpdate(id, req.body, { new: true });
        if (!participanteUpdated) return res.status(404).json({ message: 'Participante no encontrado' });
        res.json(participanteUpdated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verParticipante = async (req, res) => {
    const { id } = req.params;
    try {
        // Populate para ver los cursos inscritos del participante
        const participanteFound = await Participantes.findById(id).populate('cursos_inscritos.curso_id');
        if (!participanteFound) return res.status(404).json({ message: 'Participante no encontrado' });
        res.json(participanteFound);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const verParticipantes = async (req, res) => {
    //Esta funcion devuelve todos los participantes
    //Busca todos los participantes en la base de datos
    try {
        const participantes = await Participantes.find();
        res.json(participantes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para inscribir participante a un curso (desde el lado del participante)
export const inscribirACurso = async (req, res) => {
    const { participanteId, cursoId } = req.body;
    try {
        // Verificar que el participante existe
        const participante = await Participantes.findById(participanteId);
        if (!participante) return res.status(404).json({ message: 'Participante no encontrado' });

        // Verificar que el curso existe
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

        // Agregar participante al curso
        curso.participantes.push({
            participante_id: participanteId,
            fecha_inscripcion: new Date(),
            estado: 'inscrito'
        });

        // Guardar ambos
        await participante.save();
        await curso.save();

        res.json({ message: 'Inscripción realizada correctamente', participante, curso });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Función para ver participantes de un curso específico
export const verParticipantesDeCurso = async (req, res) => {
    const { cursoId } = req.params;
    try {
        const curso = await Curso.findById(cursoId).populate('participantes.participante_id');
        if (!curso) return res.status(404).json({ message: 'Curso no encontrado' });
        
        res.json({
            curso: curso.nombre,
            totalInscritos: curso.participantes.length,
            cupoMaximo: curso.cupoMaximo,
            participantes: curso.participantes
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};