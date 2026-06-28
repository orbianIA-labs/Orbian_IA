import { useId } from 'react'

type OrbianLogoProps = {
  size?: number
  withWordmark?: boolean
  /** cor da wordmark (texto). Por padrão usa o deep blue da marca. */
  wordmarkColor?: string
}

/**
 * Marca da Orbian — anel circular com gradiente (Primary → Deep Blue).
 * Segue o Logo System oficial. Use `withWordmark` para exibir "Orbian" ao lado.
 */
export function OrbianLogo({ size = 32, withWordmark = false, wordmarkColor }: OrbianLogoProps) {
  const gradId = useId()

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="Orbian">
        <defs>
          <linearGradient id={gradId} x1="7" y1="6" x2="33" y2="34" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6FB1FF" />
            <stop offset="1" stopColor="#2F6BE0" />
          </linearGradient>
        </defs>
        <circle cx="20" cy="20" r="13.5" stroke={`url(#${gradId})`} strokeWidth="7" />
      </svg>
      {withWordmark && (
        <strong
          style={{
            fontSize: size * 0.66,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: wordmarkColor ?? 'var(--c-deep)',
            lineHeight: 1,
          }}
        >
          Orbian
        </strong>
      )}
    </span>
  )
}
