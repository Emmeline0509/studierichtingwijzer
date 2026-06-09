import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function login(formData: FormData) {
  "use server";

  const password = String(formData.get("password") || "");
  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword || password !== appPassword) {
    redirect("/login?error=1");
  }

  const cookieStore = await cookies();

  cookieStore.set("studierichtingenwijzer_auth", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main style={{ padding: "40px", fontFamily: "Arial", maxWidth: "480px" }}>
      <h1>Studierichtingenwijzer</h1>

      <p>Deze toepassing is enkel bedoeld voor directie en leerlingbegeleiding.</p>

      {searchParams.error && (
        <p style={{ color: "red" }}>De toegangscode klopt niet.</p>
      )}

      <form action={login} style={{ marginTop: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px" }}>
          Toegangscode
        </label>

        <input
          name="password"
          type="password"
          required
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #aaa",
            marginBottom: "12px",
          }}
        />

        <button
          type="submit"
          style={{
            padding: "10px 16px",
            background: "#111",
            color: "white",
            border: "1px solid #111",
            cursor: "pointer",
          }}
        >
          Aanmelden
        </button>
      </form>
    </main>
  );
}