import Image from "next/image";

// Logo pequena pulsando no centro da tela, com uma barrinha amarela embaixo.
// Entra com um pequeno atraso: páginas que carregam rápido nem chegam a mostrá-lo.
export default function PageLoader() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-50/75 backdrop-blur-[2px] animate-gtg-fade motion-reduce:animate-none"
    >
      <div className="flex flex-col items-center gap-3">
        <Image
          src="/logo.png"
          alt=""
          width={640}
          height={364}
          priority
          className="h-14 w-auto animate-gtg-pulse motion-reduce:animate-none"
        />
        <div className="h-1 w-16 overflow-hidden rounded-full bg-brand-200">
          <div className="h-full w-1/3 rounded-full bg-sun-400 animate-gtg-bar motion-reduce:animate-none" />
        </div>
      </div>
    </div>
  );
}
