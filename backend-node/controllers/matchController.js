// controllers/matchController.js

/**
 * @module controllers/matchController
 * @description
 * Controlador para la gestión de partidos:
 * <ul>
 *   <li><code>getMyMatches</code>: obtiene todos los partidos en que participa o posee el usuario.</li>
 *   <li><code>deleteMatch</code>: elimina un partido y sus datos asociados.</li>
 *   <li><code>updateMatch</code>: actualiza nombre, fecha y ubicación de un partido (sólo propietario).</li>
 *   <li><code>getMatchById</code>: recupera todos los detalles de un partido, incluyendo ruta de vídeo y usuarios en esquinas.</li>
 *   <li><code>updatePlayers</code>: reasigna posiciones de jugadores por username.</li>
 *   <li><code>getGeneralStats</code>: estadísticas globales del usuario (total de vídeos, fecha último vídeo).</li>
 *   <li><code>getLastMatchesUserStats</code>: estadísticas de los últimos 4 partidos donde participa el usuario.</li>
 * </ul>
 */

const Match = require('../models/Match');
const User = require('../models/Users');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs/promises');
const { deleteMatchById } = require('../services/matchServices');


/**
 * Obtiene todos los partidos donde el usuario autenticado participa o es propietario.
 *
 * @async
 * @function getMyMatches
 * @param   {express.Request}  req      Petición con usuario en `req.user.id`.
 * @param   {express.Response} res      Respuesta JSON con array de partidos.
 * @returns {Promise<express.Response>} Código 200 y lista de partidos.
 * @throws  {Error}                     Si ocurre un error inesperado.
 */
exports.getMyMatches = async (req, res) => {
  try{
    const userId = req.user.id;

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
    
      //console.log('Partidos encontrados:', JSON.stringify(partidos, null, 2));
      return res.json(partidos);
  }
  catch (err) {
    console.error('Error en getMyMatches:', err);
    return res.status(500).json({ error: err.message });
  }
};


/**
 * Elimina un partido y todos sus datos asociados (Influx, fichero y documento Mongo).
 *
 * @async
 * @function deleteMatch
 * @param   {express.Request}  req      Petición con `req.params.id` y usuario en `req.user.id`.
 * @param   {express.Response} res      Respuesta JSON con mensaje de confirmación.
 * @returns {Promise<express.Response>} Código 200 `{ message }`.
 * @throws  {Error}                     Si el partido no existe o el usuario no está autorizado.
 */
exports.deleteMatch = async (req, res) => {
  try {
    await deleteMatchById(req.params.id, req.user.id);
    return res.json({ message: 'Partido y datos asociados eliminados correctamente' });
  } catch (err) {
    const status = err.status || 500;
    return res.status(status).json({ error: err.message });
  }
};


/**
 * Actualiza nombre, fecha y ubicación de un partido específico.
 *
 * @async
 * @function updateMatch
 * @param   {express.Request}  req        Petición con `req.params.id`, `req.user.id` y campos en body.
 * @param   {express.Response} res        Respuesta JSON con el partido actualizado.
 * @returns {Promise<express.Response>}   Código 200 y partido modificado.
 * @throws  {Error}                       Si no se encuentra o no está autorizado.
 */
exports.updateMatch = async (req, res) => {
    try {
      const ownerId   = req.user.id;
      const matchId   = req.params.id;
      const { matchName, matchDate, matchLocation } = req.body;

      console.log('Payload recibido en updateMatch:', req.body);

      const update = {
        matchName,
        matchDate,
        matchLocation
      };
  
      const match = await Match.findOneAndUpdate(
        { _id: matchId, owner: ownerId },
        update,
        { new: true }
      );

      //console.log('Partido actualizado:', match);
  
      if (!match) {
        return res.status(404).json({ error: 'Partido no encontrado o no autorizado' });
      }
      return res.json(match);
    } catch (err) {
      console.error('Error en updateMatch:', err);
      return res.status(500).json({ error: err.message });
    }
  };


/**
 * Recupera todos los detalles de un partido, incluyendo ruta de vídeo y datos enriquecidos de jugadores.
 *
 * @async
 * @function getMatchById
 * @param   {express.Request}  req      Petición con `req.params.id`.
 * @param   {express.Response} res      Respuesta JSON con el partido completo.
 * @returns {Promise<express.Response>} Código 200 y objeto `match`.
 * @throws  {Error}                     Si el ID es inválido o el partido no existe.
 */
exports.getMatchById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "ID de partido inválido" });
  }

  try {
    const match = await Match.findById(id).lean();
    if (!match) return res.status(404).json({ error: "Partido no encontrado" });

    const filename = path.basename(match.filePath);
    const userId = match.owner.toString();
    match.videoPath = `/uploads/videos/${userId}/${filename}`;
    console.log('Partido ruta de vídeo:', match.videoPath);

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

    //console.log('Usuarios encontrados:', userMap);

    // Crear nuevo objeto con nombres
    const resolvedPositions = {};
    for (const [pos, uid] of Object.entries(positions)) {
      if (uid) {
        const info = userMap[uid.toString()];
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
    //console.log('Usuarios encontrados:', resolvedPositions);

    // Reemplazar playerPositions por versión enriquecida
    match.playerPositions = resolvedPositions;

    //console.log('Match encontrado:', match)
    return res.json(match);
  } catch (err) {
    console.error('Error en getMatchById:', err);
    return res.status(500).json({ error: err.message });
  }
};


/**
 * Reasigna las jugadores de un partido por sus nombres de usuario.
 *
 * @async
 * @function updatePlayers
 * @param   {express.Request}  req        Petición con `req.params.id`, `req.user.id` y usernames en body.
 * @param   {express.Response} res        Respuesta JSON con `playerPositions` poblado.
 * @returns {Promise<express.Response>}   Código 200 y posiciones actualizadas.
 * @throws  {Error}                       Si no autorizado o partido no encontrado.
 */
exports.updatePlayers = async (req, res) => {
  const ownerId = req.user.id;
  const matchId = req.params.id;
  const { top_left, top_right, bottom_right, bottom_left } = req.body;

  // Convertir nombres a ObjectId si existe usuario o null
  const map = { top_left, top_right, bottom_right, bottom_left };
  const playerPositions = {};

  for (const key of Object.keys(map)) {
    const username = map[key];
    if (username) {
      const u = await User.findOne({ username }).select('_id');
      if (u) {
        playerPositions[key] = u._id;
      } else {
        console.warn(`[updatePlayers] no existe usuario "${username}", asignando null`);
        playerPositions[key] = null;
      }
    } else {
      playerPositions[key] = null;
    }
  }

  const match = await Match.findOneAndUpdate(
    { _id: matchId, owner: ownerId },
    { playerPositions },
    { new: true }
  );

  if (!match) {
    console.error('[updatePlayers] partido no encontrado o no autorizado');
    return res.status(404).json({ error: 'Match not found or unauthorized' });
  }

  await match.populate('playerPositions.top_left', 'username avatarPath');
  await match.populate('playerPositions.top_right', 'username avatarPath');
  await match.populate('playerPositions.bottom_right', 'username avatarPath');
  await match.populate('playerPositions.bottom_left', 'username avatarPath');

  //console.log('Partidos encontrados:', JSON.stringify(match.p, null, 2))
  return res.json({ playerPositions: match.playerPositions });
};


/**
 * Devuelve estadísticas globales del usuario: total de vídeos y fecha del último.
 *
 * @async
 * @function getGeneralStats
 * @param   {express.Request}  req      Petición con usuario en `req.user.id`.
 * @param   {express.Response} res      Respuesta JSON `{ totalVideos, latestVideoDate }`.
 * @returns {Promise<express.Response>} Código 200 y estadísticas.
 * @throws  {Error}                     Si ocurre error al consultar.
 */
exports.getGeneralStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Filtro: todos los partidos donde el usuario participa
    const userFilter = { owner: userId };

    // Total de vídeos/partidos
    const totalVideos = await Match.countDocuments(userFilter);

    // Fecha del último vídeo subido (por uploadDate)
    const last = await Match.findOne(userFilter)
      .sort({ uploadDate: -1 })
      .select('uploadDate')
      .lean();

    const latestVideoDate = last
      ? last.uploadDate.toISOString().split('T')[0]
      : null;

    // Devolvemos JSON
    return res.json({ totalVideos, latestVideoDate });
  } catch (err) {
    console.error('Error en getGeneralStats:', err);
    return res.status(500).json({ error: err.message });
  }
};


/**
 * Obtiene métricas (distancia, velocidades) de los últimos 4 partidos donde participa el usuario.
 *
 * @async
 * @function getLastMatchesUserStats
 * @param   {express.Request}  req        Petición con usuario en `req.user.id`.
 * @param   {express.Response} res        Respuesta JSON `{ data: [...] }`.
 * @returns {Promise<express.Response>}   Código 200 y array de estadísticas por partido.
 * @throws  {Error}                       Si ocurre error al consultar.
 */
exports.getLastMatchesUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    // Limite de partidos a devolver
    const limit  = 4 ;

    // 1) Filtro: solo partidos donde el usuario aparece en playerPositions
    const userFilter = {
      $or: [
        { 'playerPositions.top_left':     userId },
        { 'playerPositions.top_right':    userId },
        { 'playerPositions.bottom_left':  userId },
        { 'playerPositions.bottom_right': userId }
      ]
    };

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
        .find(([_, pid]) => pid && pid.toString() === userId.toString());
      const pos = entry ? entry[0] : null;

      const stats = {};
      if (pos && m.analysis) {
        stats.distance = m.analysis.distances?.[pos] ?? null;
        stats.avgSpeed = m.analysis.avgSpeeds?.[pos] ?? null;
        stats.maxSpeed = m.analysis.maxSpeeds?.[pos] ?? null;
      }

      return {
        matchId:       m._id,
        matchName:     m.matchName,
        matchDate:     m.matchDate.toISOString().split('T')[0],
        matchLocation: m.matchLocation,
        stats
      };
    });

    return res.json({ data: results });
  } catch (err) {
    console.error('Error en getLastMatchesUserStats:', err);
    return res.status(500).json({ error: err.message });
  }
};