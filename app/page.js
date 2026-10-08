import LandingForm from "./LandingForm";
import { getLandingConfig } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Home() {
  const { phone, message } = await getLandingConfig();

  return (
    <main className="page">
      <img src="/logo.png" alt="Ganamos.net" className="logo" />
      <p className="eyebrow">ACCESO VIP EXCLUSIVO</p>
      <img src="/bono-15.png" alt="Bono 15%" className="bono" />
      <div className="info-pill">ESCRIBINOS APRETANDO EL BOTÓN DE ABAJO</div>
      <LandingForm phone={phone} message={message} />
    </main>
  );
}
