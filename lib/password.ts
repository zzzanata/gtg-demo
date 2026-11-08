import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

let dummyHash: string | undefined;

// Quando o usuário não existe, ainda comparamos com um hash falso para que o tempo de
// resposta seja parecido (evita descobrir quais e-mails estão cadastrados).
export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    dummyHash ??= await bcrypt.hash("senha-invalida", ROUNDS);
    await bcrypt.compare(password, dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}
