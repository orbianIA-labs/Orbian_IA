import { FileText, Flag, Pencil, Upload } from 'lucide-react'
import type { EtapaPipeline, LegalCase } from '@/types/domain.types'

// "Prazos" não é mais uma etapa sequencial da esteira — prazos podem existir em
// qualquer momento do caso, não é algo que se "conclui" pra avançar. O quadro de
// prazos continua no workspace do caso e no calendário do dashboard, só não trava
// mais o avanço da esteira nem é um destino automático dela.
export const PIPELINE: { key: EtapaPipeline; label: string; icon: typeof Pencil }[] = [
  { key: 'cadastro',     label: 'Cadastro',     icon: Pencil },
  { key: 'documentos',   label: 'Documentos',   icon: Upload },
  { key: 'pecas',        label: 'Gerar Peças',  icon: FileText },
  { key: 'encerramento', label: 'Encerramento', icon: Flag },
]

// Casos salvos antes da esteira mudar guardam etapas que não existem mais
// ('prazos', 'revisao', ...). Sem esse mapa o findIndex devolve -1 e o caso
// aparece como se estivesse no Cadastro.
const ETAPA_EQUIVALENTE: Partial<Record<EtapaPipeline, EtapaPipeline>> = {
  prazos: 'pecas',
  revisao: 'pecas',
  protocolo: 'pecas',
  atualizacoes: 'pecas',
}

/** Índice da etapa na esteira atual, traduzindo etapas legadas. -1 se desconhecida. */
export function pipelineIndex(etapa: EtapaPipeline | undefined): number {
  if (!etapa) return -1
  const key = ETAPA_EQUIVALENTE[etapa] ?? etapa
  return PIPELINE.findIndex((s) => s.key === key)
}

/** Índice mais avançado que o caso já alcançou de fato (não trava no valor salvo
 *  se o progresso real — ex.: já tem peça gerada — estiver mais adiantado).
 *  Nunca alcança "Encerramento" sozinho — encerrar é sempre uma ação explícita. */
export function reachableIndex(legalCase: LegalCase | undefined, hasPeca: boolean): number {
  if (!legalCase) return 1
  const storedIdx = pipelineIndex(legalCase.etapaAtual)
  const derivedIdx = hasPeca ? 2 : 1
  return Math.max(1, storedIdx, derivedIdx)
}

/** Rota para onde navegar ao clicar numa etapa a partir de outra página do caso.
 *  Cadastro/Encerramento não têm rota própria — vivem dentro de
 *  CaseDetailPage, que lê "?view=" para abrir direto na etapa pedida. */
export function stageRoute(casoId: string, key: EtapaPipeline): string {
  if (key === 'documentos') return `/cases/${casoId}/documentos`
  if (key === 'pecas') return `/cases/${casoId}/pecas`
  return `/cases/${casoId}?view=${key}`
}
