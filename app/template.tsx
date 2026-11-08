// Ao contrário do layout, o template é recriado a cada troca de página:
// por isso a animação de entrada roda sempre que o usuário navega.
// "animate-gtg-page" é só opacidade (para não afetar o loading, que é "fixed") e
// "gtg-stagger" (em globals.css) faz os blocos da página entrarem em sequência.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-gtg-page gtg-stagger">{children}</div>;
}
