import { CheckCircle2, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { PIPELINE } from '@/lib/pipeline'
import type { EtapaPipeline } from '@/types/domain.types'

type PipelineStepperProps = {
  label: string
  subtitle?: string
  viewedIdx: number
  currentPipelineIdx: number
  progressoPct: number
  podeVoltar: boolean
  podeAvancarView: boolean
  onIrParaIdx: (idx: number) => void
  onIrParaEtapa: (key: EtapaPipeline) => void
  proximaEtapaLabel?: string
  podeAvancarEtapa?: boolean
  avancarHint?: string
  onAvancarEtapa?: () => void
}

/** Esteira de pipeline (Cadastro → Documentos → Gerar Peças → Prazos → Encerramento),
 *  compartilhada entre o workspace do caso, Documentos e Gerar Peças — fica visualmente
 *  fixa e idêntica em todas essas telas. */
export function PipelineStepper({
  label, subtitle, viewedIdx, currentPipelineIdx, progressoPct,
  podeVoltar, podeAvancarView, onIrParaIdx, onIrParaEtapa,
  proximaEtapaLabel, podeAvancarEtapa, avancarHint, onAvancarEtapa,
}: PipelineStepperProps) {
  return (
    <div className="workspace-pipeline">
      <div className="case-stage-head">
        <h2>{label} <span className="case-stage-badge">STAGE {viewedIdx + 1}</span></h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <span className="case-progress-pct">{progressoPct}% concluído</span>
      <div className="case-stepper-row">
        <button
          className="case-stepper-arrow"
          aria-label="Etapa anterior"
          title="Etapa anterior"
          disabled={!podeVoltar}
          onClick={() => onIrParaIdx(viewedIdx - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <nav className="case-stepper">
          {PIPELINE.map((stage, idx) => {
            const done = idx < currentPipelineIdx
            const viewing = idx === viewedIdx
            const locked = idx > currentPipelineIdx
            const clickable = !locked
            const cls = ['case-step', done && 'done', viewing && 'active', locked && 'locked', clickable && 'clickable'].filter(Boolean).join(' ')
            const StageIcon = stage.icon
            return (
              <div
                key={stage.key}
                className={cls}
                title={stage.label}
                onClick={clickable ? () => onIrParaEtapa(stage.key) : undefined}
              >
                <span className="case-step-dot">
                  {done ? <CheckCircle2 size={14} /> : locked ? <Lock size={11} /> : idx + 1}
                </span>
                <span className="case-step-label"><StageIcon size={13} /></span>
              </div>
            )
          })}
        </nav>
        <button
          className="case-stepper-arrow"
          aria-label="Próxima etapa"
          title="Próxima etapa"
          disabled={!podeAvancarView}
          onClick={() => onIrParaIdx(viewedIdx + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {proximaEtapaLabel && onAvancarEtapa && (
        <div className="pipeline-advance">
          <button className="pipeline-advance-btn" onClick={onAvancarEtapa}>
            {podeAvancarEtapa ? `Avançar para ${proximaEtapaLabel}` : `${proximaEtapaLabel} bloqueado`}
          </button>
          {!podeAvancarEtapa && avancarHint && (
            <p className="advance-hint"><Lock size={11} /> {avancarHint}</p>
          )}
        </div>
      )}
    </div>
  )
}
