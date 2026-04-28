import { API_CONTRACT_CODE } from '../constants/apiContractCodes.js';
import { clientErrorBody } from '../lib/clientErrorJson.js';

export function notFound(_req, res) {
  res.status(404).json(clientErrorBody('Not found', API_CONTRACT_CODE.NOT_FOUND));
}
