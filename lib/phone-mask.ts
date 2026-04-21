export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function maskPhone(value: string): string {
  let digits = onlyDigits(value);
  // Remove código do país "55" APENAS quando o input tem exatamente 13 dígitos
  // começando com 55 (cenário de autofill/cola com "+55" + 11 dígitos BR).
  // Não mexer em 12 dígitos — é ambíguo com DDD 55 (RS) + dígito extra.
  if (digits.length === 13 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  const cleaned = digits.slice(0, 11);
  if (cleaned.length === 0) return "";
  if (cleaned.length <= 2) return `(${cleaned}`;
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

// DDDs válidos no Brasil (ANATEL)
const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function isValidBrPhone(value: string): boolean {
  return onlyDigits(value).length === 11;
}

/**
 * Valida celular brasileiro:
 * - 11 dígitos
 * - DDD válido (ANATEL)
 * - Primeiro dígito após DDD é 9 (regra do celular desde 2014)
 * - Todos os dígitos não podem ser iguais (ex: 99999999999)
 */
export function isMobilePhone(value: string): boolean {
  const d = onlyDigits(value);
  if (d.length !== 11) return false;

  const ddd = parseInt(d.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) return false;

  if (d[2] !== "9") return false;

  if (/^(\d)\1{10}$/.test(d)) return false;

  return true;
}

export function validateMobilePhoneWithReason(value: string): {
  valid: boolean;
  reason?: string;
} {
  const d = onlyDigits(value);
  if (d.length === 0) return { valid: false, reason: "Digite seu número." };
  if (d.length < 11) return { valid: false, reason: "Número incompleto." };
  if (d.length > 11) return { valid: false, reason: "Número muito longo." };

  const ddd = parseInt(d.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) return { valid: false, reason: "DDD inválido." };

  if (d[2] !== "9") return { valid: false, reason: "Informe um número de celular (começa com 9 após o DDD)." };

  if (/^(\d)\1{10}$/.test(d)) return { valid: false, reason: "Número inválido." };

  return { valid: true };
}

export function formatBrl(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function splitValor(valor: number): { reais: string; centavos: string } {
  const [reais, centavos = "00"] = valor.toFixed(2).split(".");
  return { reais, centavos };
}
