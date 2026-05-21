import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="min-h-screen bg-cream flex flex-col">
      {/* Top color block — editorial */}
      <div className="bg-ink text-cream rounded-b-[36px] px-6 pt-12 pb-14 relative overflow-hidden">
        <div className="font-mono text-[11px] tracking-widest uppercase opacity-70 bracket">
          super banco imobiliário
        </div>
        <h1 className="h-display text-[64px] mt-3">
          o banco
          <br />
          <span className="text-mint">na palma</span>
          <br />
          da mão.
        </h1>
        <p className="mt-6 max-w-xs text-cream/80 text-[15px] leading-snug">
          Faça login como anfitrião pra cadastrar jogadores, abrir partidas e
          deixar o tabuleiro contar a história.
        </p>
        {/* Subtle decorative line */}
        <svg
          aria-hidden
          className="absolute -bottom-2 right-4 opacity-50"
          width="120"
          height="60"
          viewBox="0 0 120 60"
          fill="none"
        >
          <path
            d="M2 50 C 30 20, 50 60, 80 30 S 110 40, 118 10"
            stroke="var(--color-mint)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      <div className="flex-1 px-6 py-10 flex flex-col gap-6 max-w-md mx-auto w-full">
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-crimson text-cream font-bold py-5 rounded-3xl text-lg shadow-[6px_6px_0_var(--color-ink)] border-2 border-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_var(--color-ink)] transition"
          >
            Entrar com Google →
          </button>
        </form>

        <div className="bg-ink/5 rounded-3xl p-5 border border-ink/10">
          <div className="font-mono text-[11px] tracking-widest uppercase opacity-60 bracket">
            como funciona
          </div>
          <ul className="mt-3 space-y-2 text-[14px] leading-snug">
            <li>
              <span className="text-crimson font-bold">·</span> Só o anfitrião
              loga. Os jogadores são salvos no seu perfil.
            </li>
            <li>
              <span className="text-crimson font-bold">·</span> Saldos,
              propriedades, casas, hotéis e hipotecas em um lugar só.
            </li>
            <li>
              <span className="text-crimson font-bold">·</span> Vitórias ficam
              registradas no histórico.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
