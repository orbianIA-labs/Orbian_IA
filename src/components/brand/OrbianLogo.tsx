type OrbianLogoProps = {
  size?: number
  withWordmark?: boolean
  /** cor da wordmark (texto). Por padrão usa o deep blue da marca. */
  wordmarkColor?: string
}

/**
 * Marca da Orbian. Use `withWordmark` para exibir "Orbian" ao lado.
 */
export function OrbianLogo({ size = 32, withWordmark = false, wordmarkColor }: OrbianLogoProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Orbian" height={size} style={{ width: 'auto', display: 'block' }} />
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
