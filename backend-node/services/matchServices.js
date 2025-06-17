const Match     = require('../models/Match')
const fs        = require('fs/promises')

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

// Eliminar un partido específico
async function deleteMatchById(matchId, ownerId) {
  // 1) Validar existencia y permisos
  const match = await Match.findOne({ _id: matchId, owner: ownerId })
  if (!match) {
    const err = new Error('Partido no encontrado o no autorizado')
    err.status = 404
    throw err
  }

  // 2) Borrar datos de InfluxDB
  await deleteApi.postDelete({
    org: influxOrg,
    bucket: influxBucket,
    body: {
      start: '1970-01-01T00:00:00Z',
      stop:  new Date().toISOString(),
      predicate: `partido_id="${matchId}"`
    }
  })

  // 3) Borrar el fichero de vídeo
  if (match.filePath) {
    try {
      await fs.unlink(match.filePath)
    } catch (e) {
      console.warn(`No se pudo borrar fichero ${match.filePath}:`, e.message)
    }
  }

  // 4) Borrar documento de MongoDB
  await Match.deleteOne({ _id: matchId, owner: ownerId })
}

module.exports = {deleteMatchById}