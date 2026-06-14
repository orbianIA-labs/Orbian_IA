export function AdminPage() {
  return (
    <div className="page-stack">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Administracao Lexio</p>
          <h1>Biblioteca juridica interna</h1>
          <p>Area reservada para categorias, fluxos, modelos, prompts e versionamento.</p>
        </div>
      </section>

      <section className="data-table">
        {[
          ['Previdenciario', 'BPC/LOAS', 'Modelo Inicial', 'Prompt Base', 'Ativo'],
          ['Familia', 'Alimentos', 'Modelo Inicial', 'Prompt Base', 'Rascunho'],
          ['Trabalhista', 'Rescisao', 'Modelo Inicial', 'Prompt Base', 'Ativo'],
        ].map((item) => (
          <div className="table-row" key={item.join('-')}>
            <strong>{item[0]}</strong>
            <span>{item[1]}</span>
            <span>{item[2]}</span>
            <span>{item[3]}</span>
            <span>{item[4]}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
