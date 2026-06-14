import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function CookieConsent() {
  const [accepted, setAccepted] = useState(
    () => localStorage.getItem('cookie-consent') === 'accepted',
  )

  if (accepted) {
    return null
  }

  return (
    <div className="cookie-banner">
      <p>
        Usamos apenas cookies tecnicos essenciais para manter sua sessao segura e funcional.
      </p>
      <Button
        onClick={() => {
          localStorage.setItem('cookie-consent', 'accepted')
          setAccepted(true)
        }}
      >
        Entendi
      </Button>
    </div>
  )
}
