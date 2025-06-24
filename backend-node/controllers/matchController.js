// controllers/matchController.js
const Match = require('../models/Match')
const User = require('../models/Users');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const { deleteMatchById } = require('../services/matchServices');

const { InfluxDB} = require('@influxdata/influxdb-client');
const { DeleteAPI } = require('@influxdata/influxdb-client-apis');

const influxUrl = process.env.INFLUX_URL;   
const influxToken = process.env.INFLUX_TOKEN;
const influxOrg = process.env.INFLUX_ORG;
const influxBucket = process.env.INFLUX_BUCKET;

// Crear cliente de InfluxDB
const influxClient = new InfluxDB({ url: influxUrl, token: influxToken });
// Crear instancia de DeleteAPI
//const deleteApi = new DeleteAPI(influxClient);

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
      .populate('playerPositions.top_left', 'username avatarPath')
      .populate('playerPositions.top_right', 'username avatarPath')
      .populate('playerPositions.bottom_right', 'username avatarPath')
      .populate('playerPositions.bottom_left', 'username avatarPath')
      .sort({ uploadDate: -1 })
      .lean()
    
      //console.log('Partidos encontrados:', JSON.stringify(partidos, null, 2))
      return res.json(partidos)
  }
  catch (err) {
    console.error('Error en getMyMatches:', err)
    return res.status(500).json({ error: err.message })
  }
}

exports.deleteMatch = async (req, res) => {
  try {
    await deleteMatchById(req.params.id, req.user.id)
    return res.json({ message: 'Partido y datos asociados eliminados correctamente' })
  } catch (err) {
    const status = err.status || 500
    return res.status(status).json({ error: err.message })
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

      //console.log('Partido actualizado:', match)
  
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
    match.videoPath = `/uploads/videos/${userId}/${filename}`
    console.log('Partido ruta de vídeo:', match.videoPath)

    //Obtener nombres de usuarios en playerPositions
    const positions = match.playerPositions || {};
    const userIds = Object.values(positions).filter(Boolean);
    const users = await User.find({ _id: { $in: userIds } }).select('username avatarPath level').lean();
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), { 
        name: u.username, 
        avatarPath: u.avatarPath,
        level: u.level
      }])
    );

    console.log('Usuarios encontrados:', userMap)

    // Crear nuevo objeto con nombres
    const resolvedPositions = {};
    for (const [pos, uid] of Object.entries(positions)) {
      if (uid) {
        const info = userMap[uid.toString()]
        resolvedPositions[pos] = {
          userId: uid.toString(),
          name: info.name || 'Usuario desconocido',
          avatarPath: info.avatarPath, 
          level: info.level || 'Desconocido'
        };
      } else {
        resolvedPositions[pos] = null;
      }
    }
    console.log('Usuarios encontrados:', resolvedPositions)

    // Reemplazar playerPositions por versión enriquecida
    match.playerPositions = resolvedPositions;

    //console.log('Match encontrado:', match)
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

  await match.populate('playerPositions.top_left', 'username avatarPath')
  await match.populate('playerPositions.top_right', 'username avatarPath')
  await match.populate('playerPositions.bottom_right', 'username avatarPath')
  await match.populate('playerPositions.bottom_left', 'username avatarPath')

  //console.log('Partidos encontrados:', JSON.stringify(match.p, null, 2))
  return res.json({ playerPositions: match.playerPositions })
}


// Obtiene estadísticas generales del usuario
exports.getGeneralStats = async (req, res) => {
  try {
    const userId = req.user.id

    // 1) Filtro: todos los partidos donde el usuario participa
    const userFilter = { owner: userId }

    // 2) Total de vídeos/partidos
    const totalVideos = await Match.countDocuments(userFilter)

    // 4) Fecha del último vídeo subido (por uploadDate)
    const last = await Match.findOne(userFilter)
      .sort({ uploadDate: -1 })
      .select('uploadDate')
      .lean()

    const latestVideoDate = last
      ? last.uploadDate.toISOString().split('T')[0]
      : null

    // 5) Devolvemos JSON
    return res.json({ totalVideos, latestVideoDate })
  } catch (err) {
    console.error('Error en getGeneralStats:', err)
    return res.status(500).json({ error: err.message })
  }
}

exports.getLastMatchesUserStats = async (req, res) => {
  try {
    const userId = req.user.id
    const limit  = 4  // siempre últimos 4

    // 1) Filtro: solo partidos donde el usuario aparece en playerPositions
    const userFilter = {
      $or: [
        { 'playerPositions.top_left':     userId },
        { 'playerPositions.top_right':    userId },
        { 'playerPositions.bottom_left':  userId },
        { 'playerPositions.bottom_right': userId }
      ]
    }

    // 2) Trae los últimos N
    const matches = await Match.find(userFilter)
      .sort({ uploadDate: -1 })
      .limit(limit)
      .select('_id matchName matchDate matchLocation analysis playerPositions')
      .lean()

    // 3) Extrae solo las métricas de la posición correspondiente
    const results = matches.map(m => {
      // ¿En qué posición está el usuario?
      const entry = Object.entries(m.playerPositions)
        .find(([_, pid]) => pid && pid.toString() === userId.toString())
      const pos = entry ? entry[0] : null

      const stats = {}
      if (pos && m.analysis) {
        stats.distance = m.analysis.distances?.[pos] ?? null
        stats.avgSpeed = m.analysis.avgSpeeds?.[pos] ?? null
        stats.maxSpeed = m.analysis.maxSpeeds?.[pos] ?? null
      }

      return {
        matchId:       m._id,
        matchName:     m.matchName,
        matchDate:     m.matchDate.toISOString().split('T')[0],
        matchLocation: m.matchLocation,
        stats
      }
    })

    return res.json({ data: results })
  } catch (err) {
    console.error('Error en getLastMatchesUserStats:', err)
    return res.status(500).json({ error: err.message })
  }
}