import Curso from "../models/cursos.model.js";

//Funcion para suir cursos
//Esta funcion recibe los datos del curso y lo guarda en la base de datos
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
    //Esta funcion recibe los datos del curso y los actualiza en la base de datos
    const { id } = req.params.id;
    const { nombreCurso, tipo, fechaInicio, fechaFin, horario, duracionhoras, modalidad, instructor, objetivo, cupoMinimo, cupoMaximo, temario, costo, costoGeneral, participantes } = req.body;
    try {
        const cursoUpdated = await Curso.findByIdAndUpdate(id, req.body, { new: true });

        if (!cursoUpdated) return res.status(404).json({ message: 'Curso no encontrado' });
        res.json(cursoUpdated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const verCurso = async (req, res) => {
    //Esta funcion recibe el id del curso y lo devuelve
    const { id } = req.params.id;
    try {
        //Busca el curso por su id en la base de datos
        const cursoFound = await Curso.findById(id);
        if (!cursoFound) return res.status(404).json({ message: 'Curso no encontrado' });
        res.json(cursoFound);
    } catch (error) {
        //Si ocurre un error, se devuelve un mensaje de error
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