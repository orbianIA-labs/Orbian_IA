import { useAuthStore } from '@/store/authStore'

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="page-stack narrow">
      <section className="page-heading compact">
        <div>
          <p className="eyebrow">Perfil</p>
          <h1>{user?.name}</h1>
        </div>
      </section>

      <article className="panel">
        <dl className="definition-list">
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Plano</dt>
            <dd>{user?.plan}</dd>
          </div>
        </dl>
      </article>
    </div>
  )
}
