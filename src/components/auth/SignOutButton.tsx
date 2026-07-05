/** Botón de cierre de sesión (POST a /auth/signout). Server-friendly. */
export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-separator px-3 py-1.5 text-xs text-label transition-colors hover:border-red-500 hover:text-red-400"
      >
        Salir
      </button>
    </form>
  );
}
