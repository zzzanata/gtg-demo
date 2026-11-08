import Image from "next/image";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Células do painel solar decorativo (6 x 5). O atraso de cada uma é "embaralhado" para
// o brilho parecer aleatório, mas é sempre o mesmo (nada de Math.random no servidor).
const cells = Array.from({ length: 30 }, (_, i) => ({ i, delay: ((i * 733) % 4200) / 1000 }));
const sparks = [
  { left: "6%", size: 9, delay: 0, dur: 9, blur: 0 },
  { left: "15%", size: 14, delay: 3.2, dur: 12, blur: 3 },
  { left: "26%", size: 6, delay: 5.5, dur: 10, blur: 0 },
  { left: "38%", size: 11, delay: 1.2, dur: 8, blur: 1 },
  { left: "50%", size: 16, delay: 4.4, dur: 13, blur: 4 },
  { left: "61%", size: 8, delay: 2.4, dur: 9, blur: 0 },
  { left: "72%", size: 12, delay: 6.8, dur: 11, blur: 2 },
  { left: "83%", size: 7, delay: 0.8, dur: 10, blur: 0 },
  { left: "92%", size: 15, delay: 3.8, dur: 12, blur: 3 },
  { left: "44%", size: 6, delay: 7.5, dur: 9, blur: 0 },
];

export default async function LoginPage() {
  // Já logado: não faz sentido ver a tela de login.
  if (await getCurrentUser()) redirect("/");

  return (
    <div data-gtg-own className="grid min-h-screen overflow-hidden lg:grid-cols-[1.1fr_1fr]">
      {/* Lado da marca: azul-marinho com sol, painel solar e partículas de energia. */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* Textura: grade de pontos deslizando + faixas de luz que atravessam */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 animate-gtg-pan opacity-70 [background-image:radial-gradient(rgba(0,6,40,0.55)_1.5px,transparent_1.9px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_30%_60%,black_25%,transparent_80%)]"
        />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="absolute inset-y-[-10%] left-0 w-1/4 animate-gtg-beam bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
          <span className="absolute inset-y-[-10%] left-0 w-[12%] animate-gtg-beam bg-gradient-to-r from-transparent via-sun-400/[0.09] to-transparent [animation-delay:4.5s]" />
        </div>

        {/* Sol com raios girando devagar */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-[30rem] w-[30rem]">
          <div className="absolute inset-0 animate-gtg-spin-slow rounded-full opacity-60 [background:repeating-conic-gradient(from_0deg,rgba(255,181,0,0.35)_0_3deg,transparent_3deg_24deg)] [mask-image:radial-gradient(circle,transparent_22%,black_24%,transparent_72%)]" />
          <div className="absolute inset-[34%] animate-gtg-glow rounded-full bg-sun-400 shadow-[0_0_90px_30px_rgba(255,181,0,0.45)]" />
        </div>

        {/* Partículas de energia subindo */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {sparks.map((s, i) => (
            <span
              key={i}
              className="absolute -bottom-5 animate-gtg-float rounded-full bg-sun-400 will-change-transform"
              style={{ left: s.left, width: s.size, height: s.size, animationDelay: `${s.delay}s`, animationDuration: `${s.dur}s`, filter: s.blur ? `blur(${s.blur}px)` : undefined }}
            />
          ))}
        </div>

        <div className="relative z-10 animate-gtg-rise">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-sun-200 ring-1 ring-inset ring-white/15">
            <span className="h-1.5 w-1.5 animate-gtg-pulse rounded-full bg-sun-400" />
            Energia solar
          </p>
        </div>

        {/* Painel solar em perspectiva */}
        <div aria-hidden className="relative z-10 mx-auto my-8 w-full max-w-md animate-gtg-rise [animation-delay:200ms]">
          <div className="relative [perspective:900px]">
            <div className="relative grid grid-cols-6 gap-1.5 overflow-hidden rounded-xl border border-white/20 bg-brand-950 p-2 shadow-2xl shadow-black/40 [transform:rotateX(52deg)_rotateZ(-22deg)]">
              {cells.map((c) => (
                <span
                  key={c.i}
                  className="gtg-tile relative aspect-[4/3] animate-gtg-twinkle rounded-[3px] border border-white/15 bg-gradient-to-br from-brand-500/60 to-brand-800"
                  style={{ animationDelay: `${c.delay}s` }}
                >
                  <span className="gtg-tile-glow pointer-events-none absolute inset-0 rounded-[3px]" />
                </span>
              ))}
              <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 animate-gtg-sweep bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-3 animate-gtg-rise [animation-delay:350ms]">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Gestão de obras <span className="text-sun-400">sem complicação.</span>
          </h2>
          <p className="text-sm leading-relaxed text-white/70">
            Acompanhe o andamento das usinas, as notas fiscais, o financeiro e o estoque da GTG Energia em um só lugar.
          </p>
        </div>
      </aside>

      {/* Lado do formulário */}
      <main className="relative flex flex-col items-center justify-center gap-8 bg-brand-50 p-5 sm:p-8">
        {/* Brilhos suaves de fundo */}
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 animate-gtg-glow rounded-full bg-sun-200/50 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 animate-gtg-glow rounded-full bg-brand-200/70 blur-3xl [animation-delay:2s]" />

        <Image
          src="/logo.png"
          alt="GTG Energia"
          width={640}
          height={364}
          priority
          className="relative h-24 w-auto animate-gtg-rise sm:h-28"
        />

        <div className="relative w-full max-w-sm animate-gtg-rise space-y-6 overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-7 shadow-xl shadow-brand-900/10 backdrop-blur [animation-delay:120ms] sm:p-8">
          <span className="absolute inset-x-0 top-0 h-1 origin-left animate-gtg-fill bg-gradient-to-r from-sun-400 via-sun-200 to-sun-400 [animation-delay:400ms]" />
          <header className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-brand-900">Gestão de Obras</h1>
            <p className="text-sm text-slate-500">Entre com seu e-mail e senha</p>
          </header>
          <LoginForm />
          <div className="rounded-xl border border-sun-200 bg-sun-50 px-3 py-2.5 text-xs text-slate-600">
            <p className="font-semibold text-brand-900">Acesso de demonstração</p>
            <p>
              E-mail: <span className="font-mono">admin@demo.com</span>
            </p>
            <p>
              Senha: <span className="font-mono">demo123</span>
            </p>
          </div>
        </div>

        <p className="relative animate-gtg-text text-xs text-slate-400">© GTG Energia · versão de demonstração com dados fictícios</p>
      </main>
    </div>
  );
}
