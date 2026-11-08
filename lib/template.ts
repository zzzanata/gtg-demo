// Checklist padrão que cada obra nova recebe. Revise para o seu processo:
// depois de criada, o administrador ainda pode adicionar e remover tarefas em cada obra.
export const DEFAULT_CHECKLIST: { stage: string; tasks: string[] }[] = [
  {
    stage: "Projeto e homologação",
    tasks: [
      "Vistoria técnica do local",
      "Projeto elétrico e estrutural",
      "ART emitida",
      "Solicitação de acesso à concessionária",
      "Parecer de acesso aprovado",
    ],
  },
  {
    stage: "Suprimentos",
    tasks: [
      "Compra dos módulos fotovoltaicos",
      "Compra dos inversores",
      "Compra das estruturas de fixação",
      "Compra de cabos e proteções",
      "Recebimento e conferência dos materiais",
    ],
  },
  {
    stage: "Instalação",
    tasks: [
      "Montagem das estruturas",
      "Instalação dos módulos",
      "Instalação dos inversores",
      "Cabeamento CC e CA",
      "Aterramento e SPDA",
      "Quadros de proteção (string box)",
    ],
  },
  {
    stage: "Comissionamento",
    tasks: [
      "Testes elétricos",
      "Configuração do monitoramento",
      "Vistoria da concessionária",
      "Troca do medidor",
      "Energização e conexão à rede",
      "Entrega e treinamento do cliente",
    ],
  },
];

export function buildTemplateTasks() {
  let position = 0;
  return DEFAULT_CHECKLIST.flatMap((s) =>
    s.tasks.map((title) => ({ stage: s.stage, title, position: position++ })),
  );
}
