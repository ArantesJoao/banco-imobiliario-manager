import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Super Banco Imobiliário",
    short_name: "Banco BI",
    description:
      "Banco digital para o jogo Super Banco Imobiliário. Adicione jogadores, transfira dinheiro e gerencie propriedades.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a347a",
    theme_color: "#1a347a",
    lang: "pt-BR",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
