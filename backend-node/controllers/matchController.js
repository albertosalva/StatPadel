// controllers/matchController.js
const Match = require('../models/Match')
const User = require('../models/Users');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

const { InfluxDB} = require('@influxdata/influxdb-client');
const { DeleteAPI } = require('@influxdata/influxdb-client-apis');

const influxUrl = process.env.INFLUX_URL;   
const influxToken = process.env.INFLUX_TOKEN;
const influxOrg = process.env.INFLUX_ORG;
const influxBucket = process.env.INFLUX_BUCKET;

// Crear cliente de InfluxDB
const influxClient = new InfluxDB({ url: influxUrl, token: influxToken });
// Crear instancia de DeleteAPI
const deleteApi = new DeleteAPI(influxClient);

// Obtiene los partidos del usuario autenticado
exports.getMyMatches = async (req, res) => {
  try{
    const userId = req.user.id

    const partidos = await Match.find({
      $or: [
        { owner: userId },
        { 'playerPositions.top_left': userId },
        { 'playerPositions.top_right': userId },
        { 'playerPositions.bottom_right': userId },
        { 'playerPositions.bottom_left': userId }
      ]
    })
      .select('matchName matchDate matchLocation status playerPositions owner')
      .populate('playerPositions.top_left', 'username')
      .populate('playerPositions.top_right', 'username')
      .populate('playerPositions.bottom_right', 'username')
      .populate('playerPositions.bottom_left', 'username')
      .sort({ uploadDate: -1 })
      .lean()
    
      console.log('Partidos encontrados:', partidos)
      return res.json(partidos)
  }
  catch (err) {
    console.error('Error en getMyMatches:', err)
    return res.status(500).json({ error: err.message })
  }
}

// Eliminar un partido específico
exports.deleteMatch = async (req, res) => {
    try {
      const ownerId = req.user.id;
      const matchId = req.params.id;

      // 1) Validar existencia y permiso
      const match = await Match.findOne({ _id: matchId, owner: ownerId })
      if (!match) {
        return res.status(404).json({ error: 'Partido no encontrado o no autorizado' })
      }

      // 2) Eliminar datos en InfluxDB
      await deleteApi.postDelete({
        org: influxOrg,
        bucket: influxBucket,
        body: {
          start: '1970-01-01T00:00:00Z',
          stop:  new Date().toISOString(),
          predicate: `partido_id="${matchId}"`
        }
      });
      console.log(`InfluxDB: datos borrados para partido_id=${matchId}`)

      // 3) Borrar fichero de vídeo en disco (si existe)
      if (match.filePath) {
        try {
          await fs.unlink(match.filePath)
          console.log(`Fichero eliminado: ${match.filePath}`)
        } catch (errFs) {
          console.warn(`No se pudo eliminar fichero ${match.filePath}:`, errFs.message)
        }
      }

      // 4) Eliminar documento de MongoDB
      await Match.deleteOne({ _id: matchId, owner: ownerId })
      console.log(`MongoDB: documento borrado para matchId=${matchId}`)

      return res.json({ message: 'Partido y datos asociados eliminados correctamente' })
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
      const { matchName, matchDate, matchLocation } = req.body

      console.log('Payload recibido en updateMatch:', req.body)

      const update = {
        matchName,
        matchDate,
        matchLocation
      }
  
      const match = await Match.findOneAndUpdate(
        { _id: matchId, owner: ownerId },
        update,
        { new: true }
      )

      console.log('Partido actualizado:', match)
  
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
    return res.status(400).json({ error: "ID de partido inválido" })
  }

  try {
    const match = await Match.findById(id).lean()
    if (!match) return res.status(404).json({ error: "Partido no encontrado" })

    const filename = path.basename(match.filePath)
    const userId = match.owner.toString()
    match.videoPath = `/videos/${userId}/${filename}`

    //Obtener nombres de usuarios en playerPositions
    const positions = match.playerPositions || {};
    const userIds = Object.values(positions).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u.username]));

    // Crear nuevo objeto con nombres
    const resolvedPositions = {};
    for (const [pos, uid] of Object.entries(positions)) {
      if (uid) {
        resolvedPositions[pos] = {
          userId: uid.toString(),
          name: userMap[uid.toString()] || 'Usuario desconocido'
        };
      } else {
        resolvedPositions[pos] = null;
      }
    }

    // Reemplazar playerPositions por versión enriquecida
    match.playerPositions = resolvedPositions;

    console.log('Match encontrado:', match)
    return res.json(match);
  } catch (err) {
    console.error('Error en getMatchById:', err)
    return res.status(500).json({ error: err.message })
  }
}


exports.updatePlayers = async (req, res) => {
  const ownerId = req.user.id
  const matchId = req.params.id
  const { top_left, top_right, bottom_right, bottom_left } = req.body

  // Convertir nombres a ObjectId si existe usuario o null
  const map = { top_left, top_right, bottom_right, bottom_left }
  const playerPositions = {}

  for (const key of Object.keys(map)) {
    const username = map[key]
    if (username) {
      const u = await User.findOne({ username }).select('_id')
      if (u) {
        playerPositions[key] = u._id
      } else {
        console.warn(`⚠️ [updatePlayers] no existe usuario "${username}", asignando null`)
        playerPositions[key] = null
      }
    } else {
      playerPositions[key] = null
    }
  }

  const match = await Match.findOneAndUpdate(
    { _id: matchId, owner: ownerId },
    { playerPositions },
    { new: true }
  )

  if (!match) {
    console.error('❌ [updatePlayers] partido no encontrado o no autorizado')
    return res.status(404).json({ error: 'Match not found or unauthorized' })
  }

  await match.populate('playerPositions.top_left', 'username')
  await match.populate('playerPositions.top_right', 'username')
  await match.populate('playerPositions.bottom_right', 'username')
  await match.populate('playerPositions.bottom_left', 'username')

  return res.json({ playerPositions: match.playerPositions })
}

