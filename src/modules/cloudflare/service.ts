const API = "https://api.cloudflare.com/client/v4";

export interface Zone {
  id: string;
  name: string;
  status: string;
}

export interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

export class CloudflareApiError extends Error {}

async function call<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json();
  if (!res.ok || body.success === false) {
    const message = body?.errors?.[0]?.message ?? `Erreur Cloudflare (HTTP ${res.status})`;
    throw new CloudflareApiError(message);
  }
  return body.result as T;
}

export function listZones(token: string): Promise<Zone[]> {
  return call<Zone[]>(token, "/zones?per_page=50");
}

export function listRecords(token: string, zoneId: string): Promise<DnsRecord[]> {
  return call<DnsRecord[]>(token, `/zones/${zoneId}/dns_records?per_page=100`);
}

export interface DnsRecordInput {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

export function createRecord(token: string, zoneId: string, record: DnsRecordInput): Promise<DnsRecord> {
  return call<DnsRecord>(token, `/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify(record),
  });
}

export function updateRecord(token: string, zoneId: string, recordId: string, record: DnsRecordInput): Promise<DnsRecord> {
  return call<DnsRecord>(token, `/zones/${zoneId}/dns_records/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(record),
  });
}

export function deleteRecord(token: string, zoneId: string, recordId: string): Promise<{ id: string }> {
  return call<{ id: string }>(token, `/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
  });
}
