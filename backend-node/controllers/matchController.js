// controllers/matchController.js
const Match = require('../models/Match')
const mongoose = require('mongoose');
const path = require('path');

// Esta de devolver todos los partidos de un usuario
exports.getMyMatches = async (req, res) => {
  try {
    const ownerId = req.user.id
    const partidos = await Match.find({ owner: ownerId }).lean()
    return res.json(partidos)
  } catch (err) {
    console.error('Error en getMyMatches:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Eliminar un partido específico
exports.deleteMatch = async (req, res) => {
    try {
      const ownerId = req.user.id
      const matchId = req.params.id
  
      const match = await Match.findOneAndDelete({ _id: matchId, owner: ownerId })
      if (!match) {
        return res.status(404).json({ error: 'Partido no encontrado o no autorizado' })
      }
      return res.json({ message: 'Partido eliminado correctamente' })
    } catch (err) {
      console.error('Error en deleteMatch:', err)
      return res.status(500).json({ error: err.message })
    }
}

//Edita el nombre del video de un partido específico
exports.updateMatch = async (req, res) => {
    try {
      const ownerId   = req.user.id
      const matchId   = req.params.id
      const { videoName } = req.body
  
      const match = await Match.findOneAndUpdate(
        { _id: matchId, owner: ownerId },
        { videoName },
        { new: true }
      )
  
      if (!match) {
        return res.status(404).json({ error: 'Partido no encontrado o no autorizado' })
      }
      return res.json(match)
    } catch (err) {
      console.error('Error en updateMatch:', err)
      return res.status(500).json({ error: err.message })
    }
  }

// Obtiene un partido específico por su ID
exports.getMatchById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "ID de partido inválido" });
  }

  try {
    const match = await Match.findById(id).lean()
    if (!match) return res.status(404).json({ error: "Partido no encontrado" });

    const filename = path.basename(match.filePath)
    const userId = match.owner.toString()
    match.videoPath = `/videos/${userId}/${filename}`

    return res.json(match);
  } catch (err) {
    console.error('Error en getMatchById:', err)
    return res.status(500).json({ error: err.message });
  }
};