/** Botón de cierre de sesión (POST a /auth/signout). Server-friendly. */
export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-red-500 hover:text-red-400"
      >
        Salir
      </button>
    </form>
  );
}
