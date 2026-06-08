import { supabase } from "@/lib/supabase";

export default async function HomePage() {
  const { data: programs, error } = await supabase
    .from("study_programs")
    .select("*")
    .eq("actief", true)
    .order("leerjaar", { ascending: true })
    .order("officiele_naam", { ascending: true });

  if (error) {
    return (
      <main style={{ padding: "40px", fontFamily: "Arial" }}>
        <h1>Studierichtingenwijzer</h1>

        <p style={{ color: "red", fontSize: "20px" }}>
          Er ging iets mis bij het ophalen van de studierichtingen.
        </p>

        <pre
          style={{
            marginTop: "20px",
            padding: "16px",
            background: "#f3f3f3",
            border: "1px solid #ddd",
            whiteSpace: "pre-wrap",
          }}
        >
          {JSON.stringify(error, null, 2)}
        </pre>
      </main>
    );
  }

  return (
    <main style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Studierichtingenwijzer</h1>

      <p>Interne tool voor directie en leerlingbegeleiding.</p>

      <h2 style={{ marginTop: "30px" }}>Schoolaanbod</h2>

      {programs && programs.length > 0 ? (
        <div>
          {programs.map((program) => (
            <div
              key={program.id}
              style={{
                padding: "14px 0",
                borderBottom: "1px solid #ddd",
              }}
            >
              <strong>
                {program.eigen_benaming || program.officiele_naam}
              </strong>

              {program.eigen_benaming && (
                <div style={{ color: "#666" }}>
                  Officieel: {program.officiele_naam}
                </div>
              )}

              <div style={{ color: "#555" }}>
                Leerjaar {program.leerjaar}, {program.finaliteit}, code{" "}
                {program.code}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>Er staan nog geen actieve studierichtingen in de databank.</p>
      )}
    </main>
  );
}