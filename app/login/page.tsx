import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-gradient-to-b from-[#0b3d91] to-[#1e40af] text-white">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <div className="inline-block bg-yellow-400 text-[#0b3d91] font-black px-4 py-2 rounded-full text-sm tracking-widest">
            SUPER
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Banco Imobiliário
          </h1>
          <p className="mt-3 text-white/80">
            Faça login para criar sua conta de anfitrião e começar a registrar
            partidas.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full bg-white text-slate-900 font-semibold py-4 rounded-2xl shadow-lg active:scale-[0.98] transition"
          >
            Entrar com Google
          </button>
        </form>

        <p className="text-xs text-white/60">
          Só o anfitrião precisa estar logado. Os jogadores ficam salvos no seu
          perfil.
        </p>
      </div>
    </main>
  );
}
