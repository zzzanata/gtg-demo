// Painel com barra de título azul-marinho e detalhe amarelo (cores da logo).
// Em grade, todos os painéis da fileira ficam com a mesma altura (h-full).
export default function Panel({
  title,
  action,
  index = 0,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  /** Posição na tela: define o atraso da animação de entrada. */
  index?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{ animationDelay: `${index * 90}ms` }}
      className="flex h-full animate-gtg-rise flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-md"
    >
      <header className="flex items-center justify-between gap-3 border-l-4 border-sun-400 bg-gradient-to-r from-brand-900 to-brand-800 px-4 py-3 text-white">
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        {action}
      </header>
      <div className="flex-1 p-3.5">{children}</div>
    </section>
  );
}
