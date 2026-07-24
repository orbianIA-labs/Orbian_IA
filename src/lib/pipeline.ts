import { Eye, FileText, Flag, Pencil, Upload } from 'lucide-react'
import type { EtapaPipeline, LegalCase } from '@/types/domain.types'

export const PIPELINE: { key: EtapaPipeline; label: string; icon: typeof Pencil }[] = [
  { key: 'cadastro',     label: 'Cadastro',     icon: Pencil },
  { key: 'documentos',   label: 'Documentos',   icon: Upload },
  { key: 'pecas',        label: 'Gerar Peças',  icon: FileText },
  { key: 'revisao',      label: 'Revisão',      icon: Eye },
  { key: 'encerramento', label: 'Finalização',  icon: Flag },
]

/** Índice mais avançado que o caso já alcançou de fato (não trava no valor salvo
 *  se o progresso real — ex.: já tem peça gerada — estiver mais adiantado). */
export function reachableIndex(legalCase: LegalCase | undefined, hasPeca: boolean): number {
  if (!legalCase) return 1
  const storedIdx = PIPELINE.findIndex((s) => s.key === legalCase.etapaAtual)
  const derivedIdx = hasPeca ? PIPELINE.length - 2 : 2
  return Math.max(1, storedIdx, derivedIdx)
}

/** Rota para onde navegar ao clicar numa etapa a partir de outra página do caso.
 *  Cadastro/Revisão/Encerramento não têm rota própria — vivem dentro de
 *  CaseDetailPage, que lê "?view=" para abrir direto na etapa pedida. */
export function stageRoute(casoId: string, key: EtapaPipeline): string {
  if (key === 'documentos') return `/cases/${casoId}/documentos`
  if (key === 'pecas') return `/cases/${casoId}/pecas`
  return `/cases/${casoId}?view=${key}`
}
