/**
 * Normalization and parsing functions for quota data.
 */

import type {
  ClaudeUsagePayload,
  CodexResetCreditExpiry,
  CodexResetCreditItemPayload,
  CodexResetCreditsPayload,
  CodexUsagePayload,
  KimiUsagePayload,
  XaiBillingPayload,
} from '@/types';
import { normalizeAuthIndex } from '@/utils/authIndex';

export { normalizeAuthIndex };

export function normalizeStringValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }
  return null;
}

export function normalizeNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function normalizeQuotaFraction(value: unknown): number | null {
  const normalized = normalizeNumberValue(value);
  if (normalized !== null) return normalized;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.endsWith('%')) {
      const parsed = Number(trimmed.slice(0, -1));
      return Number.isFinite(parsed) ? parsed / 100 : null;
    }
  }
  return null;
}

export function normalizePlanType(value: unknown): string | null {
  const normalized = normalizeStringValue(value);
  return normalized ? normalized.toLowerCase() : null;
}

export function decodeBase64UrlPayload(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(padded);
    }
    if (typeof atob === 'function') {
      return atob(padded);
    }
  } catch {
    return null;
  }
  return null;
}

export function parseIdTokenPayload(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'object') {
    return Array.isArray(value) ? null : (value as Record<string, unknown>);
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Continue to JWT parsing
  }
  const segments = trimmed.split('.');
  if (segments.length < 2) return null;
  const decoded = decodeBase64UrlPayload(segments[1]);
  if (!decoded) return null;
  try {
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    return null;
  }
  return null;
}

export function parseAntigravityPayload(payload: unknown): Record<string, unknown> | null {
  const toRecord = (value: unknown): Record<string, unknown> | null => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
      return null;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  };

  const parsed = toRecord(payload);
  if (!parsed) return null;

  if ('models' in parsed) {
    return parsed;
  }

  const nested = toRecord(parsed.body);
  if (nested) {
    return nested;
  }

  return parsed;
}

export function parseClaudeUsagePayload(payload: unknown): ClaudeUsagePayload | null {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as ClaudeUsagePayload;
    } catch {
      return null;
    }
  }
  if (typeof payload === 'object') {
    return payload as ClaudeUsagePayload;
  }
  return null;
}

export function parseCodexUsagePayload(payload: unknown): CodexUsagePayload | null {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as CodexUsagePayload;
    } catch {
      return null;
    }
  }
  if (typeof payload === 'object') {
    return payload as CodexUsagePayload;
  }
  return null;
}

export function parseCodexResetCreditsPayload(
  payload: unknown
): CodexResetCreditsPayload | null {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as CodexResetCreditsPayload;
    } catch {
      return null;
    }
  }
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as CodexResetCreditsPayload;
  }
  return null;
}

export function parseCodexResetCreditExpiries(
  payload: CodexResetCreditsPayload | null
): CodexResetCreditExpiry[] {
  if (!payload) return [];

  const credits = getCodexResetCreditItems(payload);
  return credits
    .map((credit) =>
      parseCodexResetCreditExpiryMs(
        credit.expires_at ?? credit.expiresAt ?? credit.expiration_time ?? credit.expirationTime
      )
    )
    .filter((expiresAtMs): expiresAtMs is number => expiresAtMs !== null)
    .sort((left, right) => left - right)
    .map((expiresAtMs) => ({ expiresAtMs }));
}

export function parseKimiUsagePayload(payload: unknown): KimiUsagePayload | null {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as KimiUsagePayload;
    } catch {
      return null;
    }
  }
  if (typeof payload === 'object') {
    return payload as KimiUsagePayload;
  }
  return null;
}

function getCodexResetCreditItems(
  payload: CodexResetCreditsPayload
): CodexResetCreditItemPayload[] {
  const candidates = [payload.reset_credits, payload.resetCredits, payload.credits, payload.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(
        (item): item is CodexResetCreditItemPayload =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item)
      );
    }
  }
  return [];
}

function parseCodexResetCreditExpiryMs(value: unknown): number | null {
  if (typeof value === 'boolean' || value === undefined || value === null) return null;

  if (typeof value === 'number') {
    return normalizeCodexExpiryTimestampMs(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return normalizeCodexExpiryTimestampMs(numeric);
    }

    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function normalizeCodexExpiryTimestampMs(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const timestampMs = value > 10_000_000_000 ? value : value * 1000;
  const date = new Date(timestampMs);
  return Number.isNaN(date.getTime()) ? null : timestampMs;
}

export function parseXaiBillingPayload(payload: unknown): XaiBillingPayload | null {
  if (payload === undefined || payload === null) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as XaiBillingPayload;
    } catch {
      return null;
    }
  }
  if (typeof payload === 'object') {
    return payload as XaiBillingPayload;
  }
  return null;
}
