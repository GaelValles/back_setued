import Curso from "../models/cursos.model.js";


export const subirCurso = async (req, res) => {
    const {nombreCurso, tipo, fechaInicio, fechaFin, horario, duracionhoras, modalidad, instructor, objetivo, cupoMinimo, cupoMaximo, temario, costo, costoGeneral, participantes} = req.body;
    try {
        const newCurso = new Curso({
            nombreCurso,
            tipo,
            fechaInicio,
            fechaFin,
            horario,
            duracionhoras,
            modalidad,
            instructor,
            objetivo,
            cupoMinimo,
            cupoMaximo,
            temario,
            costo,
            costoGeneral,
            participantes
        });

        const cursoSaved = await newCurso.save();
        res.json(cursoSaved);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const eliminarCurso = async (req, res) => {
    const { id } = req.body;
    try {
        const cursoDeleted = await Curso.findByIdAndDelete(id);
        if (!cursoDeleted) return res.status(404).json({ message: 'Curso no encontrado' });
        res.json({ message: 'Curso eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
export const actualizarCurso = async (req, res) => {
    const { id } = req.params;
    const { nombreCurso, tipo, fechaInicio, fechaFin, horario, duracionhoras, modalidad, instructor, objetivo, cupoMinimo, cupoMaximo, temario, costo, costoGeneral, participantes } = req.body;
    try {
        const cursoUpdated = await Curso.findByIdAndUpdate(id, {
            nombreCurso,
            tipo,
            fechaInicio,
            fechaFin,
            horario,
            duracionhoras,
            modalidad,
            instructor,
            objetivo,
            cupoMinimo,
            cupoMaximo,
            temario,
            costo,
            costoGeneral,
            participantes
        }, { new: true });

        if (!cursoUpdated) return res.status(404).json({ message: 'Curso no encontrado' });
        res.json(cursoUpdated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const verCurso = async (req, res) => {
    const { id } = req.params;
    try {
        const cursoFound = await Curso.findById(id);
        if (!cursoFound) return res.status(404).json({ message: 'Curso no encontrado' });
        res.json(cursoFound);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
export const verCursos = async (req, res) => {
    try {
        const cursos = await Curso.find();
        res.json(cursos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}