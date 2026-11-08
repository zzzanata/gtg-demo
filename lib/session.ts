// Sessão em cookie assinado (JWT HS256). Sem acesso ao banco: pode ser usado no proxy.ts.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_DAYS = 7;

function getKey() {
  // Versão demo: não precisa configurar nada. (Se quiser, defina SESSION_SECRET.)
  const secret = process.env.SESSION_SECRET || "gtg-demo-sessao-nao-use-em-producao-0123456789";
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getKey());
}

export async function verifySession(
  token: string | undefined,
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const key = getKey(); // fora do try: segredo ausente deve falhar de forma visível
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.userId === "string" ? { userId: payload.userId } : null;
  } catch {
    return null; // token inválido ou expirado
  }
}
