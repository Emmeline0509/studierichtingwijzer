import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

async function updateEigenBenaming(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const eigenBenaming = String(formData.get("eigen_benaming") || "").trim();

  const { createClient } = await import("@supabase/supabase-js");

  const supabaseServer = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabaseServer
    .from("study_programs")
    .update({ eigen_benaming: eigenBenaming || null })
    .eq("id", id);

  revalidatePath("/");
  revalidatePath("/beheer");
}

export default async function BeheerPage() {
  const { data: programs, error } = await supabase
    .from("study_programs")
    .select("*")
    .order("leerjaar", { ascending: true })
    .order("officiele_naam", { ascending: true });

  if (error) {
    return (
      <main style={{ padding: "40px", fontFamily: "Arial" }}>
        <h1>Beheer studierichtingen</h1>
        <p style={{ color: "red" }}>De richtingen konden niet geladen worden.</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Beheer studierichtingen</h1>

      <p>
        Voeg hier eventueel een eigen schoolbenaming toe. De officiële benaming
        blijft bewaard voor de koppeling met de regelgeving.
      </p>

      <div style={{ marginTop: "30px" }}>
        {programs?.map((program) => (
          <form
            key={program.id}
            action={updateEigenBenaming}
            style={{
              padding: "16px 0",
              borderBottom: "1px solid #ddd",
            }}
          >
            <input type="hidden" name="id" value={program.id} />

            <strong>{program.officiele_naam}</strong>

            <div style={{ color: "#555", marginTop: "4px" }}>
              Leerjaar {program.leerjaar}, {program.finaliteit}, code{" "}
              {program.code}
            </div>

            <label
              style={{
                display: "block",
                marginTop: "12px",
                marginBottom: "4px",
              }}
            >
              Eigen benaming op school
            </label>

            <input
              name="eigen_benaming"
              defaultValue={program.eigen_benaming || ""}
              placeholder="Bijvoorbeeld: Economie en talen"
              style={{
                padding: "8px",
                width: "320px",
                maxWidth: "100%",
                border: "1px solid #aaa",
              }}
            />

            <button
              type="submit"
              style={{
                marginLeft: "8px",
                padding: "8px 12px",
                border: "1px solid #333",
                background: "#111",
                color: "white",
                cursor: "pointer",
              }}
            >
              Bewaren
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}