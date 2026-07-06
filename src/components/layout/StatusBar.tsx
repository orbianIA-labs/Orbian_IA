export function StatusBar() {
  return (
    <footer className="status-bar">
      <div className="status-bar-left">
        <span className="status-dot" />
        <strong>IA ASSISTENTE ONLINE</strong>
        <span className="status-sep">•</span>
        <span>Tudo pronto para sua próxima execução.</span>
      </div>
      <div className="status-bar-right">
        <span>LATENCY: 24MS</span>
        <span>OS BUILD: 2.4.0-STABLE</span>
      </div>
    </footer>
  )
}
