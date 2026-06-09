import { supabase } from "@/lib/supabase";

type SearchParams = {
  huidige_richting?: string;
  gewenste_richting?: string;
  attest?: string;
  clausulering?: string;
  clausulering_type?: string;
  geclausuleerde_richting?: string;
  geclausuleerd_domein?: string;
  geclausuleerde_finaliteit?: string;
  geclausuleerde_onderwijsvorm?: string;
};

type Program = {
  id: string;
  code: string;
  officiele_naam: string;
  eigen_benaming: string | null;
  leerjaar: number;
  graad: string;
  finaliteit: string;
  onderwijsvorm: string;
  domein: string;
};

function naam(program?: Program) {
  if (!program) return "";
  return program.eigen_benaming || program.officiele_naam;
}

function bepaalResultaat({
  attest,
  clausulering,
  clausuleringType,
  gewensteRichting,
  geclausuleerdeRichting,
  geclausuleerdDomein,
  geclausuleerdeFinaliteit,
  geclausuleerdeOnderwijsvorm,
}: {
  attest?: string;
  clausulering?: string;
  clausuleringType?: string;
  gewensteRichting?: Program;
  geclausuleerdeRichting?: Program;
  geclausuleerdDomein?: string;
  geclausuleerdeFinaliteit?: string;
  geclausuleerdeOnderwijsvorm?: string;
}) {
  if (!attest || !gewensteRichting) {
    return null;
  }

  if (attest === "A") {
    return {
      status: "mogelijk",
      titel: "Voorlopig mogelijk",
      tekst:
        "Op basis van een A-attest lijkt deze overstap mogelijk. Controleer nog of er voor deze richting bijkomende toelatingsvoorwaarden gelden.",
    };
  }

  if (attest === "C") {
    return {
      status: "niet_mogelijk",
      titel: "Niet mogelijk",
      tekst:
        "Met een C-attest is een gewone overgang naar het volgende leerjaar niet mogelijk.",
    };
  }

  if (attest === "B" && clausulering !== "ja") {
    return {
      status: "manueel",
      titel: "Manueel controleren",
      tekst:
        "Er is een B-attest ingevoerd, maar geen clausulering. Controleer de exacte formulering van het attest voor je een beslissing neemt.",
    };
  }

  if (attest === "B" && clausulering === "ja") {
    if (clausuleringType === "richting") {
      if (!geclausuleerdeRichting) {
        return {
          status: "manueel",
          titel: "Manueel controleren",
          tekst:
            "Er is een clausulering op studierichting, maar er werd nog geen geclausuleerde richting gekozen.",
        };
      }

      if (geclausuleerdeRichting.id === gewensteRichting.id) {
        return {
          status: "niet_mogelijk",
          titel: "Niet mogelijk",
          tekst:
            "De gewenste richting is dezelfde als de geclausuleerde studierichting. Deze overstap lijkt dus niet mogelijk.",
        };
      }

      return {
        status: "manueel",
        titel: "Manueel controleren",
        tekst:
          "De geclausuleerde studierichting is niet dezelfde als de gewenste richting. Controleer of de clausulering ruimer geformuleerd is of enkel deze richting uitsluit.",
      };
    }

    if (clausuleringType === "domein") {
      if (!geclausuleerdDomein) {
        return {
          status: "manueel",
          titel: "Manueel controleren",
          tekst:
            "Er is een clausulering op studiedomein, maar er werd nog geen domein gekozen.",
        };
      }

      if (gewensteRichting.domein === geclausuleerdDomein) {
        return {
          status: "niet_mogelijk",
          titel: "Niet mogelijk",
          tekst:
            "De gewenste richting valt binnen het geclausuleerde studiedomein. Deze overstap lijkt dus niet mogelijk.",
        };
      }

      return {
        status: "mogelijk",
        titel: "Voorlopig mogelijk",
        tekst:
          "De gewenste richting valt niet binnen het geclausuleerde studiedomein. Controleer wel nog de exacte formulering van de clausulering.",
      };
    }

    if (clausuleringType === "finaliteit") {
      if (!geclausuleerdeFinaliteit) {
        return {
          status: "manueel",
          titel: "Manueel controleren",
          tekst:
            "Er is een clausulering op finaliteit, maar er werd nog geen finaliteit gekozen.",
        };
      }

      if (gewensteRichting.finaliteit === geclausuleerdeFinaliteit) {
        return {
          status: "niet_mogelijk",
          titel: "Niet mogelijk",
          tekst:
            "De gewenste richting valt binnen de geclausuleerde finaliteit. Deze overstap lijkt dus niet mogelijk.",
        };
      }

      return {
        status: "mogelijk",
        titel: "Voorlopig mogelijk",
        tekst:
          "De gewenste richting valt niet binnen de geclausuleerde finaliteit. Controleer nog de exacte formulering van het attest.",
      };
    }

    if (clausuleringType === "onderwijsvorm") {
      if (!geclausuleerdeOnderwijsvorm) {
        return {
          status: "manueel",
          titel: "Manueel controleren",
          tekst:
            "Er is een clausulering op onderwijsvorm, maar er werd nog geen onderwijsvorm gekozen.",
        };
      }

      if (gewensteRichting.onderwijsvorm === geclausuleerdeOnderwijsvorm) {
        return {
          status: "niet_mogelijk",
          titel: "Niet mogelijk",
          tekst:
            "De gewenste richting valt binnen de geclausuleerde onderwijsvorm. Deze overstap lijkt dus niet mogelijk.",
        };
      }

      return {
        status: "mogelijk",
        titel: "Voorlopig mogelijk",
        tekst:
          "De gewenste richting valt niet binnen de geclausuleerde onderwijsvorm. Controleer nog de exacte formulering van het attest.",
      };
    }

    return {
      status: "manueel",
      titel: "Manueel controleren",
      tekst:
        "Er is een B-attest met clausulering, maar het type clausulering werd nog niet duidelijk gekozen.",
    };
  }

  return {
    status: "manueel",
    titel: "Manueel controleren",
    tekst:
      "Deze situatie vraagt een manuele controle door directie of leerlingbegeleiding.",
  };
}

export default async function CheckerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { data: programs, error } = await supabase
    .from("study_programs")
    .select("*")
    .eq("actief", true)
    .order("leerjaar", { ascending: true })
    .order("officiele_naam", { ascending: true });

  if (error) {
    return (
      <main style={{ padding: "40px", fontFamily: "Arial" }}>
        <h1>Overstapchecker</h1>
        <p style={{ color: "red" }}>De richtingen konden niet geladen worden.</p>
        <pre>{JSON.stringify(error, null, 2)}</pre>
      </main>
    );
  }

  const alleProgrammas = (programs || []) as Program[];

  const huidigeRichting = alleProgrammas.find(
    (program) => program.id === searchParams.huidige_richting
  );

  const gewensteRichting = alleProgrammas.find(
    (program) => program.id === searchParams.gewenste_richting
  );

  const geclausuleerdeRichting = alleProgrammas.find(
    (program) => program.id === searchParams.geclausuleerde_richting
  );

  const domeinen = Array.from(
    new Set(alleProgrammas.map((program) => program.domein).filter(Boolean))
  ).sort();

  const finaliteiten = Array.from(
    new Set(
      alleProgrammas.map((program) => program.finaliteit).filter(Boolean)
    )
  ).sort();

  const onderwijsvormen = Array.from(
    new Set(
      alleProgrammas.map((program) => program.onderwijsvorm).filter(Boolean)
    )
  ).sort();

  const resultaat = bepaalResultaat({
    attest: searchParams.attest,
    clausulering: searchParams.clausulering,
    clausuleringType: searchParams.clausulering_type,
    gewensteRichting,
    geclausuleerdeRichting,
    geclausuleerdDomein: searchParams.geclausuleerd_domein,
    geclausuleerdeFinaliteit: searchParams.geclausuleerde_finaliteit,
    geclausuleerdeOnderwijsvorm: searchParams.geclausuleerde_onderwijsvorm,
  });

  return (
    <main style={{ padding: "40px", fontFamily: "Arial", maxWidth: "850px" }}>
      <h1>Overstapchecker</h1>

      <p>
        Eerste uitgebreide testversie. Deze checker vergelijkt al richting,
        domein, finaliteit en onderwijsvorm. De volledige GO-regelgeving voegen
        we daarna verder toe.
      </p>

      <form method="GET" style={{ marginTop: "30px" }}>
        <h2>1. Huidige situatie</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Huidige richting van de leerling
        </label>

        <select
          name="huidige_richting"
          defaultValue={searchParams.huidige_richting || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Kies huidige richting</option>
          {alleProgrammas.map((program) => (
            <option key={program.id} value={program.id}>
              Leerjaar {program.leerjaar}, {naam(program)}
            </option>
          ))}
        </select>

        <h2>2. Gewenste overstap</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Gewenste richting
        </label>

        <select
          name="gewenste_richting"
          defaultValue={searchParams.gewenste_richting || ""}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Kies gewenste richting</option>
          {alleProgrammas.map((program) => (
            <option key={program.id} value={program.id}>
              Leerjaar {program.leerjaar}, {naam(program)}
            </option>
          ))}
        </select>

        <h2>3. Attestering</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Attestering
        </label>

        <select
          name="attest"
          defaultValue={searchParams.attest || ""}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Kies attest</option>
          <option value="A">A-attest</option>
          <option value="B">B-attest</option>
          <option value="C">C-attest</option>
        </select>

        <h2>4. Clausulering</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Is er een clausulering?
        </label>

        <select
          name="clausulering"
          defaultValue={searchParams.clausulering || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Kies</option>
          <option value="nee">Nee</option>
          <option value="ja">Ja</option>
        </select>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Soort clausulering
        </label>

        <select
          name="clausulering_type"
          defaultValue={searchParams.clausulering_type || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Niet van toepassing of nog niet gekozen</option>
          <option value="richting">Specifieke studierichting</option>
          <option value="domein">Studiedomein</option>
          <option value="finaliteit">Finaliteit</option>
          <option value="onderwijsvorm">Onderwijsvorm</option>
        </select>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Geclausuleerde studierichting
        </label>

        <select
          name="geclausuleerde_richting"
          defaultValue={searchParams.geclausuleerde_richting || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Niet van toepassing of nog niet gekozen</option>
          {alleProgrammas.map((program) => (
            <option key={program.id} value={program.id}>
              Leerjaar {program.leerjaar}, {naam(program)}
            </option>
          ))}
        </select>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Geclausuleerd studiedomein
        </label>

        <select
          name="geclausuleerd_domein"
          defaultValue={searchParams.geclausuleerd_domein || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Niet van toepassing of nog niet gekozen</option>
          {domeinen.map((domein) => (
            <option key={domein} value={domein}>
              {domein}
            </option>
          ))}
        </select>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Geclausuleerde finaliteit
        </label>

        <select
          name="geclausuleerde_finaliteit"
          defaultValue={searchParams.geclausuleerde_finaliteit || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Niet van toepassing of nog niet gekozen</option>
          {finaliteiten.map((finaliteit) => (
            <option key={finaliteit} value={finaliteit}>
              {finaliteit}
            </option>
          ))}
        </select>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Geclausuleerde onderwijsvorm
        </label>

        <select
          name="geclausuleerde_onderwijsvorm"
          defaultValue={searchParams.geclausuleerde_onderwijsvorm || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Niet van toepassing of nog niet gekozen</option>
          {onderwijsvormen.map((onderwijsvorm) => (
            <option key={onderwijsvorm} value={onderwijsvorm}>
              {onderwijsvorm}
            </option>
          ))}
        </select>

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
          Controleer overstap
        </button>
      </form>

      {resultaat && (
        <section
          style={{
            marginTop: "30px",
            padding: "20px",
            border: "1px solid #ddd",
            background: "#f8f8f8",
          }}
        >
          <h2>{resultaat.titel}</h2>

          {huidigeRichting && (
            <p>
              Huidige richting: <strong>{naam(huidigeRichting)}</strong>
            </p>
          )}

          {gewensteRichting && (
            <p>
              Gewenste richting: <strong>{naam(gewensteRichting)}</strong>
            </p>
          )}

          <p>{resultaat.tekst}</p>
        </section>
      )}
    </main>
  );
}