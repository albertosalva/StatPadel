// controllers/matchController.js
const Match = require('../models/Match')
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
      const ownerId = req.user.id;
      const matchId = req.params.id;

      // 1) Validar existencia y permiso
      const match = await Match.findOne({ _id: matchId, owner: ownerId });
      if (!match) {
        return res.status(404).json({ error: 'Partido no encontrado o no autorizado' });
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
      console.log(`InfluxDB: datos borrados para partido_id=${matchId}`);

      // 3) Borrar fichero de vídeo en disco (si existe)
      if (match.filePath) {
        try {
          await fs.unlink(match.filePath);
          console.log(`Fichero eliminado: ${match.filePath}`);
        } catch (errFs) {
          console.warn(`No se pudo eliminar fichero ${match.filePath}:`, errFs.message);
        }
      }

      // 4) Eliminar documento de MongoDB
      await Match.deleteOne({ _id: matchId, owner: ownerId });
      console.log(`MongoDB: documento borrado para matchId=${matchId}`);

      return res.json({ message: 'Partido y datos asociados eliminados correctamente' });
    } catch (err) {
      console.error('Error en deleteMatch:', err);
      return res.status(500).json({ error: err.message });
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

    console.log('Match encontrado:', match)
    return res.json(match);
  } catch (err) {
    console.error('Error en getMatchById:', err)
    return res.status(500).json({ error: err.message });
  }
};