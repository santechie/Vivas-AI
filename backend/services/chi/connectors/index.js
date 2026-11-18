// backend/services/chi/connectors/index.js
// Connector factory resolver

import inaturalist from './inaturalist.js';
import gbif from './gbif.js';
import datasetArchive from './datasetArchive.js';
import wikimedia from './wikimedia.js';
import eppoMeta from './eppoMeta.js';
import customRest from './customRest.js';

const CONNECTORS = {
  INATURALIST: inaturalist,
  GBIF: gbif,
  DATASET_ARCHIVE: datasetArchive,
  WIKIMEDIA: wikimedia,
  EPPO_META: eppoMeta,
  CUSTOM_REST: customRest,
  CSV_ZIP: datasetArchive
};

export function getConnector(connectorType) {
  const conn = CONNECTORS[connectorType];
  if (!conn) {
    throw new Error(`Unsupported connector type: ${connectorType}`);
  }
  return conn;
}

export default {
  getConnector
};
