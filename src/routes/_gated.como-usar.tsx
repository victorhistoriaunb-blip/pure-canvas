import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  FileDown,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  Target,
  Upload,
  Wallet,
} from "lucide-react";

import { Page } from "@/components/dashboard/page";
import { Panel } from "@/components/dashboard/charts";

export const Route = createFileRoute("/_gated/como-usar")({
  head: () => ({
    meta: [
      { title: "Como usar · PINA Finanças" },
      {
        name: "description",
        content:
          "Guia rápido da PINA Finanças: importar planilhas, cadastrar contas, editar em linha, acompanhar metas e personalizar painéis.",
      },
      { property: "og:title", content: "Como usar · PINA Finanças" },
      { property: "og:description", content: "Passo a passo completo da plataforma." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HowToPage,
});

const STEPS = [
  {
    icon: Upload,
    title: "1. Traga seus dados",
    to: "/importar" as const,
    cta: "Ir para Importar Planilhas",
    body: [
      "Arraste arquivos .xlsx, .xls, .xlsm ou .csv para a área de upload (ou clique para escolher).",
      "Revise o resumo de abas e avisos e clique em “Confirmar importação” para gravar os lançamentos na sua conta.",
      "Não existem colunas obrigatórias: o sistema reconhece cabeçalhos comuns (data, conta, valor, vencimento, situação) e guarda as demais colunas como informações extras.",
    ],
  },
  {
    icon: Wallet,
    title: "2. Cadastre e edite contas",
    to: "/contas" as const,
    cta: "Ir para Contas",
    body: [
      "Use “Novo registro” para lançar manualmente, com abas Principal e Detalhamento (observações, histórico, links e comentários).",
      "Na lista e nos cards, clique sobre qualquer campo para editar em linha: data, conta, despesa, vencimento, situação e valor.",
      "Use “Copiar informações” para levar os dados de uma conta para onde quiser e a replicação para repetir contas em outros meses.",
      "Marque os checkboxes dos cards (ou “Selecionar todas”) para excluir várias contas de uma vez — a barra fixa no rodapé confirma antes de mover tudo para a lixeira.",
    ],
  },
  {
    icon: LayoutDashboard,
    title: "3. Acompanhe os painéis",
    to: "/paineis" as const,
    cta: "Ir para Painéis",
    body: [
      "O Dashboard mostra saldo, receitas, despesas, economia, gráficos e insights do período escolhido.",
      "Em Painéis, clique em “Personalizar” para mostrar/ocultar cards, mudar o tamanho e reordenar. A organização fica salva na sua conta.",
      "Análise reúne dia, semana, mês, ano e categorias em uma única tela com filtros.",
    ],
  },
  {
    icon: Target,
    title: "4. Defina metas",
    to: "/metas" as const,
    cta: "Ir para Metas",
    body: [
      "Informe o nome e o valor alvo da meta e salve — o progresso é calculado com o saldo dos seus lançamentos.",
      "A previsão em meses considera a economia média do período atual.",
    ],
  },
  {
    icon: FileDown,
    title: "5. Exporte relatórios",
    to: "/relatorios" as const,
    cta: "Ir para Relatórios",
    body: [
      "Em Dashboard, Painéis, Análise, Contas e Relatórios existe o botão “Exportar”, que gera o documento com exatamente o que está na tela (filtros, indicadores, gráficos e tabelas).",
      "PDF: documento pronto para impressão, com a identidade do app no cabeçalho.",
      "PowerPoint (.pptx): slides com gráficos e tabelas editáveis — abrem no PowerPoint, no Google Slides e no Canva.",
      "CSV: dados brutos para abrir no Excel e continuar a análise.",
    ],
  },
  {
    icon: CalendarDays,
    title: "6. Organize a agenda",
    to: "/agenda" as const,
    cta: "Ir para Agenda",
    body: [
      "A Agenda mostra um calendário com compromissos e vencimentos de contas do mês, tudo em um só lugar.",
      "Clique em um dia para ver os detalhes e cadastrar novos compromissos sem sair do calendário.",
    ],
  },
  {
    icon: Settings,
    title: "7. Ajuste o sistema",
    to: "/configuracoes" as const,
    cta: "Ir para Configurações",
    body: [
      "Personalize nome do app, saudação, cor de destaque, densidade da interface, tipografia e os rótulos e a ordem das abas do menu.",
      "Em Relatórios, defina o cliente, o template e a logo própria que aparecem nos documentos exportados.",
      "Tudo é salvo na sua conta e volta igual em qualquer dispositivo.",
    ],
  },
];

const FAQ = [
  {
    q: "Meus dados ficam salvos?",
    a: "Sim. Tudo o que você cadastra ou importa é gravado na sua conta, protegido por login. Ao entrar em outro dispositivo com o mesmo e-mail, as informações aparecem novamente.",
  },
  {
    q: "Outra pessoa pode ver meus lançamentos?",
    a: "Não. Cada conta só enxerga os próprios dados — as regras de acesso são aplicadas no banco de dados.",
  },
  {
    q: "Posso usar sem planilha?",
    a: "Pode. O cadastro manual é completo e alimenta gráficos, relatórios e metas do mesmo jeito.",
  },
  {
    q: "Preciso de um número mínimo de lançamentos?",
    a: "Não. Com poucos dados os gráficos que ainda não têm informação suficiente exibem um aviso no lugar, e o restante do sistema continua funcionando normalmente.",
  },
  {
    q: "Como remover uma planilha importada?",
    a: "Em Importar Planilhas, use o ícone de lixeira do arquivo. Os lançamentos que vieram dele são removidos junto; os manuais permanecem.",
  },
  {
    q: "Excluí uma conta sem querer. Dá para recuperar?",
    a: "Sim. Registros excluídos vão para a área translúcida no fim da tela de Contas, onde você pode restaurar um a um ou usar “Restaurar todos”, ou apagar em definitivo.",
  },
  {
    q: "Como excluo várias contas de uma vez?",
    a: "Em Contas, marque o checkbox dos cards desejados (ou “Selecionar todas”, que respeita os filtros ativos). A barra fixa no rodapé mostra a quantidade selecionada e o botão “Excluir selecionados”, com confirmação antes de mover tudo para a lixeira.",
  },
  {
    q: "Dá para personalizar os relatórios exportados?",
    a: "Sim. Em Configurações, você pode definir o nome do cliente, escolher o template do documento e enviar sua própria logo para aparecer nos relatórios exportados.",
  },
  {
    q: "Posso mudar a ordem das abas do menu?",
    a: "Sim. Em Configurações é possível personalizar os rótulos, a ordem das abas do menu e a tipografia usada na interface.",
  },
  {
    q: "O arquivo exportado em PowerPoint funciona no Canva?",
    a: "Sim. Os gráficos e tabelas são objetos nativos e editáveis, então o Canva e o Google Slides abrem o arquivo mantendo a edição.",
  },
  {
    q: "Esqueci minha senha, e agora?",
    a: "Na tela de entrada, escolha “Esqueci a senha”, informe o e-mail e siga o link enviado para definir uma nova senha.",
  },
];

const TROUBLESHOOTING = [
  {
    q: "A planilha não importou ou veio com poucos lançamentos",
    a: "Baixe o modelo base em Importar Planilhas e compare os cabeçalhos. Linhas totalmente vazias e abas de resumo são ignoradas; valores em texto (ex.: “R$ 1.200,00”) são convertidos automaticamente, mas células mescladas no cabeçalho podem atrapalhar a leitura.",
  },
  {
    q: "As datas ficaram trocadas",
    a: "Use o formato dia/mês/ano ou o formato de data nativo do Excel. Datas escritas por extenso não são reconhecidas e o lançamento fica sem período.",
  },
  {
    q: "Os gráficos apareceram vazios",
    a: "Verifique o filtro de período no topo da página: se não houver lançamentos naquele mês, os cards ficam sem dados. Selecione “Todos” ou outro mês.",
  },
  {
    q: "Entrei em outro dispositivo e não vejo meus dados",
    a: "Confirme que entrou com o mesmo e-mail. A sincronização acontece logo após o login; se a conexão cair no meio, atualize a página para recarregar da nuvem.",
  },
  {
    q: "A exportação demorou ou não abriu",
    a: "Arquivos com muitos lançamentos levam alguns segundos para serem gerados. Se o navegador bloquear o download, autorize downloads para este site e tente novamente.",
  },
];


function HowToPage() {
  return (
    <Page title="Como usar" subtitle="Guia completo da PINA Finanças" requireData={false}>
      <div className="flex flex-col gap-5">
        <Panel title="Visão geral" description="Em poucos minutos você tem o controle completo">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <BookOpen className="size-5" />
            </span>
            <p>
              A PINA Finanças reúne seus lançamentos — importados de planilhas ou cadastrados à mão —
              em indicadores, gráficos, contas a pagar e metas. Siga os passos abaixo na ordem: eles
              cobrem todos os recursos disponíveis hoje.
            </p>
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-2">
          {STEPS.map((step, i) => (
            <Panel key={step.title} title={step.title} delay={0.05 * i}>
              <div className="flex flex-col gap-3">
                <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {step.body.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={step.to}
                  className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/60"
                >
                  <step.icon className="size-4" /> {step.cta}
                </Link>
              </div>
            </Panel>
          ))}
        </div>

        <Panel title="Perguntas frequentes" description="Dúvidas comuns do dia a dia">
          <div className="flex flex-col gap-2">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border/60 px-4 py-3 transition-colors hover:border-primary/40"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </Panel>

        <Panel
          title="Solução de problemas"
          description="O que fazer quando algo não sai como esperado"
        >
          <div className="flex items-start gap-3 pb-3 text-sm text-muted-foreground">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <LifeBuoy className="size-5" />
            </span>
            <p>
              A maioria dos problemas vem do formato da planilha ou do filtro de período ativo.
              Comece por estes casos antes de recadastrar qualquer informação.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {TROUBLESHOOTING.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-border/60 px-4 py-3 transition-colors hover:border-primary/40"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </Panel>

      </div>
    </Page>
  );
}
