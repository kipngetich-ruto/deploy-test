import axios from 'axios';

const SCANNER_API_URL = process.env.SCANNER_API_URL || 'http://localhost:8000';

export const scannerClient = axios.create({
  baseURL: SCANNER_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function scanPorts(target: string, ports: string = '1-1000') {
  const response = await scannerClient.post('/scan/ports', { target, ports });
  return response.data;
}

export async function scanVulnerabilities(target: string) {
  const response = await scannerClient.post('/scan/vulnerabilities', { target });
  return response.data;
}

export async function scanSSL(target: string) {
  const response = await scannerClient.post('/scan/ssl', { target });
  return response.data;
}