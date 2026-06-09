import { supabase } from "@/lib/supabase";

type SearchParams = {
  overstapmoment?: string;
  overstapdatum?: string;
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

function datumInfo(overstapmoment?: string, overstapdatum?: string) {
  if (overstapmoment === "volgend_schooljaar") {
    return {
      titel: "Overstap naar volgend schooljaar",
      tekst:
        "De checker kijkt naar een overstap bij de start van een nieuw schooljaar. De attestering en eventuele clausulering zijn hier vooral belangrijk.",
    };
  }

  if (overstapmoment !== "tijdens_schooljaar") {
    return null;
  }

  if (!overstapdatum) {
    return {
      titel: "Datum ontbreekt",
      tekst:
        "Bij een overstap tijdens het schooljaar moet je een datum invullen. De datum bepaalt welke regels of beperkingen kunnen gelden.",
    };
  }

  const datum = new Date(overstapdatum);
  const maand = datum.getMonth() + 1;
  const dag = datum.getDate();

  if (maand < 10 || (maand === 10 && dag <= 15)) {
    return {
      titel: "Tijdens het schooljaar, tot en met 15 oktober",
      tekst:
        "De overstap valt in de vroegste periode van het schooljaar. In veel gevallen zijn overstappen dan eenvoudiger, maar controleer nog de richting, finaliteit en eventuele clausulering.",
    };
  }

  if (
    (maand === 10 && dag >= 16) ||
    maand === 11 ||
    maand === 12 ||
    (maand === 1 && dag <= 15)
  ) {
    return {
      titel: "Tijdens het schooljaar, van 16 oktober tot en met 15 januari",
      tekst:
        "De overstap valt in de tweede periode. Hier gelden meestal strengere voorwaarden. Controleer zeker of het om hetzelfde studiedomein gaat of dat een beslissing van de klassenraad nodig is.",
    };
  }

  return {
    titel: "Tijdens het schooljaar, na 15 januari",
    tekst:
      "De overstap valt na 15 januari. Dit is meestal een uitzonderlijke situatie. Manuele controle door directie of leerlingbegeleiding is aangewezen.",
  };
}

function bepaalResultaat({
  overstapmoment,
  overstapdatum,
  attest,
  clausulering,
  clausuleringType,
  gewensteRichting,
  geclausuleerdeRichting,
  geclausuleerdDomein,
  geclausuleerdeFinaliteit,
  geclausuleerdeOnderwijsvorm,
}: {
  overstapmoment?: string;
  overstapdatum?: string;
  attest?: string;
  clausulering?: string;
  clausuleringType?: string;
  gewensteRichting?: Program;
  geclausuleerdeRichting?: Program;
  geclausuleerdDomein?: string;
  geclausuleerdeFinaliteit?: string;
  geclausuleerdeOnderwijsvorm?: string;
}) {
  const infoDatum = datumInfo(overstapmoment, overstapdatum);

  if (!attest || !gewensteRichting) {
    return null;
  }

  if (overstapmoment === "tijdens_schooljaar" && !overstapdatum) {
    return {
      status: "manueel",
      titel: "Manueel controleren",
      tekst:
        "Er werd gekozen voor een overstap tijdens het schooljaar, maar er is nog geen datum ingevuld.",
      datumTekst: infoDatum?.tekst,
    };
  }

  if (attest === "A") {
    return {
      status: "mogelijk",
      titel: "Voorlopig mogelijk",
      tekst:
        "Op basis van een A-attest lijkt deze overstap mogelijk. Controleer nog of er voor deze richting bijkomende toelatingsvoorwaarden gelden.",
      datumTekst: infoDatum?.tekst,
    };
  }

  if (attest === "C") {
    return {
      status: "niet_mogelijk",
      titel: "Niet mogelijk",
      tekst:
        "Met een C-attest is een gewone overgang naar het volgende leerjaar niet mogelijk.",
      datumTekst: infoDatum?.tekst,
    };
  }

  if (attest === "B" && clausulering !== "ja") {
    return {
      status: "manueel",
      titel: "Manueel controleren",
      tekst:
        "Er is een B-attest ingevoerd, maar geen clausulering. Controleer de exacte formulering van het attest voor je een beslissing neemt.",
      datumTekst: infoDatum?.tekst,
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
          datumTekst: infoDatum?.tekst,
        };
      }

      if (geclausuleerdeRichting.id === gewensteRichting.id) {
        return {
          status: "niet_mogelijk",
          titel: "Niet mogelijk",
          tekst:
            "De gewenste richting is dezelfde als de geclausuleerde studierichting. Deze overstap lijkt dus niet mogelijk.",
          datumTekst: infoDatum?.tekst,
        };
      }

      return {
        status: "manueel",
        titel: "Manueel controleren",
        tekst:
          "De geclausuleerde studierichting is niet dezelfde als de gewenste richting. Controleer of de clausulering ruimer geformuleerd is of enkel deze richting uitsluit.",
        datumTekst: infoDatum?.tekst,
      };
    }

    if (clausuleringType === "domein") {
      if (!geclausuleerdDomein) {
        return {
          status: "manueel",
          titel: "Manueel controleren",
          tekst:
            "Er is een clausulering op studiedomein, maar er werd nog geen domein gekozen.",
          datumTekst: infoDatum?.tekst,
        };
      }

      if (gewensteRichting.domein === geclausuleerdDomein) {
        return {
          status: "niet_mogelijk",
          titel: "Niet mogelijk",
          tekst:
            "De gewenste richting valt binnen het geclausuleerde studiedomein. Deze overstap lijkt dus niet mogelijk.",
          datumTekst: infoDatum?.tekst,
        };
      }

      return {
        status: "mogelijk",
        titel: "Voorlopig mogelijk",
        tekst:
          "De gewenste richting valt niet binnen het geclausuleerde studiedomein. Controleer wel nog de exacte formulering van de clausulering.",
        datumTekst: infoDatum?.tekst,
      };
    }

    if (clausuleringType === "finaliteit") {
      if (!geclausuleerdeFinaliteit) {
        return {
          status: "manueel",
          titel: "Manueel controleren",
          tekst:
            "Er is een clausulering op finaliteit, maar er werd nog geen finaliteit gekozen.",
          datumTekst: infoDatum?.tekst,
        };
      }

      if (gewensteRichting.finaliteit === geclausuleerdeFinaliteit) {
        return {
          status: "niet_mogelijk",
          titel: "Niet mogelijk",
          tekst:
            "De gewenste richting valt binnen de geclausuleerde finaliteit. Deze overstap lijkt dus niet mogelijk.",
          datumTekst: infoDatum?.tekst,
        };
      }

      return {
        status: "mogelijk",
        titel: "Voorlopig mogelijk",
        tekst:
          "De gewenste richting valt niet binnen de geclausuleerde finaliteit. Controleer nog de exacte formulering van het attest.",
        datumTekst: infoDatum?.tekst,
      };
    }

    if (clausuleringType === "onderwijsvorm") {
      if (!geclausuleerdeOnderwijsvorm) {
        return {
          status: "manueel",
          titel: "Manueel controleren",
          tekst:
            "Er is een clausulering op onderwijsvorm, maar er werd nog geen onderwijsvorm gekozen.",
          datumTekst: infoDatum?.tekst,
        };
      }

      if (gewensteRichting.onderwijsvorm === geclausuleerdeOnderwijsvorm) {
        return {
          status: "niet_mogelijk",
          titel: "Niet mogelijk",
          tekst:
            "De gewenste richting valt binnen de geclausuleerde onderwijsvorm. Deze overstap lijkt dus niet mogelijk.",
          datumTekst: infoDatum?.tekst,
        };
      }

      return {
        status: "mogelijk",
        titel: "Voorlopig mogelijk",
        tekst:
          "De gewenste richting valt niet binnen de geclausuleerde onderwijsvorm. Controleer nog de exacte formulering van het attest.",
        datumTekst: infoDatum?.tekst,
      };
    }

    return {
      status: "manueel",
      titel: "Manueel controleren",
      tekst:
        "Er is een B-attest met clausulering, maar het type clausulering werd nog niet duidelijk gekozen.",
      datumTekst: infoDatum?.tekst,
    };
  }

  return {
    status: "manueel",
    titel: "Manueel controleren",
    tekst:
      "Deze situatie vraagt een manuele controle door directie of leerlingbegeleiding.",
    datumTekst: infoDatum?.tekst,
  };
}

export default async function CheckerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
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
    (program) => program.id === params.huidige_richting
  );

  const gewensteRichting = alleProgrammas.find(
    (program) => program.id === params..gewenste_richting
  );

  const geclausuleerdeRichting = alleProgrammas.find(
    (program) => program.id === geclausuleerde_richting
  );

  const domeinen = Array.from(
    new Set(alleProgrammas.map((program) => program.domein).filter(Boolean))
  ).sort();

  const finaliteiten = Array.from(
    new Set(alleProgrammas.map((program) => program.finaliteit).filter(Boolean))
  ).sort();

  const onderwijsvormen = Array.from(
    new Set(
      alleProgrammas.map((program) => program.onderwijsvorm).filter(Boolean)
    )
  ).sort();

  const infoDatum = datumInfo(
    params.overstapmoment,
    params.overstapdatum
  );

  const resultaat = bepaalResultaat({
    overstapmoment: params..overstapmoment,
    overstapdatum: params..overstapdatum,
    attest: attest,
    clausulering: params..clausulering,
    clausuleringType: params..clausulering_type,
    gewensteRichting,
    geclausuleerdeRichting,
    geclausuleerdDomein: params.geclausuleerd_domein,
    geclausuleerdeFinaliteit: params.geclausuleerde_finaliteit,
    geclausuleerdeOnderwijsvorm: params.geclausuleerde_onderwijsvorm,
  });

  return (
    <main style={{ padding: "40px", fontFamily: "Arial", maxWidth: "850px" }}>
      <h1>Overstapchecker</h1>

      <p>
        Deze testversie vergelijkt richting, domein, finaliteit,
        onderwijsvorm en overstapmoment. De volledige GO-regelgeving voegen we
        daarna verder toe.
      </p>

      <form method="GET" style={{ marginTop: "30px" }}>
        <h2>1. Overstapmoment</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Wanneer gebeurt de overstap?
        </label>

        <select
          name="overstapmoment"
          defaultValue={overstapmoment || ""}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Kies overstapmoment</option>
          <option value="volgend_schooljaar">Bij de start van volgend schooljaar</option>
          <option value="tijdens_schooljaar">Tijdens het schooljaar</option>
        </select>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Datum van overstap, alleen nodig tijdens het schooljaar
        </label>

        <input
          type="date"
          name="overstapdatum"
          defaultValue={overstapdatum || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        />

        {infoDatum && (
          <div
            style={{
              padding: "14px",
              border: "1px solid #ddd",
              background: "#f8f8f8",
              marginBottom: "24px",
            }}
          >
            <strong>{infoDatum.titel}</strong>
            <p>{infoDatum.tekst}</p>
          </div>
        )}

        <h2>2. Huidige situatie</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Huidige richting van de leerling
        </label>

        <select
          name="huidige_richting"
          defaultValue={huidige_richting || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Kies huidige richting</option>
          {alleProgrammas.map((program) => (
            <option key={program.id} value={program.id}>
              Leerjaar {program.leerjaar}, {naam(program)}
            </option>
          ))}
        </select>

        <h2>3. Gewenste overstap</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Gewenste richting
        </label>

        <select
          name="gewenste_richting"
          defaultValue={gewenste_richting || ""}
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

        <h2>4. Attestering</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Attestering
        </label>

        <select
          name="attest"
          defaultValue={attest || ""}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Kies attest</option>
          <option value="A">A-attest</option>
          <option value="B">B-attest</option>
          <option value="C">C-attest</option>
        </select>

        <h2>5. Clausulering</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Is er een clausulering?
        </label>

        <select
          name="clausulering"
          defaultValue={clausulering || ""}
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
          defaultValue={clausulering_type || ""}
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
          defaultValue={geclausuleerde_richting || ""}
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
          defaultValue={geclausuleerd_domein || ""}
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
          defaultValue={geclausuleerde_finaliteit || ""}
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
          defaultValue={geclausuleerde_onderwijsvorm || ""}
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

          {resultaat.datumTekst && (
            <p>
              <strong>Opmerking overstapmoment:</strong>{" "}
              {resultaat.datumTekst}
            </p>
          )}
        </section>
      )}
    </main>
  );
}