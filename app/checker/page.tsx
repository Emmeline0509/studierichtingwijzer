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
  tkr?: string;
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

type Resultaat = {
  status: string;
  titel: string;
  reden: string;
  aandachtspunt: string;
  volgendeStap: string;
  datumTekst?: string;
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
        "De overstap valt in de vroegste periode van het schooljaar. Controleer nog de richting, finaliteit en eventuele clausulering.",
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
        "De overstap valt in de tweede periode. Controleer zeker of het om hetzelfde studiedomein gaat of dat een beslissing van de klassenraad nodig is.",
    };
  }

  return {
    titel: "Tijdens het schooljaar, na 15 januari",
    tekst:
      "De overstap valt na 15 januari. Dit is meestal een uitzonderlijke situatie. Manuele controle door directie of leerlingbegeleiding is aangewezen.",
  };
}

function tkrTekst(tkr?: string) {
  if (tkr === "niet_nodig") {
    return "Er werd aangeduid dat een beslissing van de toelatingsklassenraad niet nodig is.";
  }

  if (tkr === "gunstig") {
    return "Er werd een gunstige beslissing van de toelatingsklassenraad aangeduid.";
  }

  if (tkr === "ongunstig") {
    return "Er werd een ongunstige beslissing van de toelatingsklassenraad aangeduid.";
  }

  if (tkr === "twijfel") {
    return "De situatie moet nog besproken worden met de toelatingsklassenraad.";
  }

  return "Er werd nog geen beslissing van de toelatingsklassenraad aangeduid.";
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
  tkr,
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
  tkr?: string;
}): Resultaat | null {
  const infoDatum = datumInfo(overstapmoment, overstapdatum);
  const tekstTkr = tkrTekst(tkr);

  if (!attest || !gewensteRichting) {
    return null;
  }

  if (tkr === "ongunstig") {
    return {
      status: "Niet mogelijk",
      titel: "Niet mogelijk",
      reden:
        "Er werd een ongunstige beslissing van de toelatingsklassenraad aangeduid.",
      aandachtspunt:
        "Controleer of deze beslissing definitief is en of er nog bijkomende informatie nodig is.",
      volgendeStap:
        "Bespreek de communicatie naar leerling en ouders. Controleer ook of er alternatieven binnen of buiten de school zijn.",
      datumTekst: infoDatum?.tekst,
    };
  }

  if (overstapmoment === "tijdens_schooljaar" && !overstapdatum) {
    return {
      status: "Manueel controleren",
      titel: "Manueel controleren",
      reden:
        "Er werd gekozen voor een overstap tijdens het schooljaar, maar er is nog geen datum ingevuld.",
      aandachtspunt:
        "De datum is belangrijk omdat de voorwaarden verschillen naargelang de periode van het schooljaar.",
      volgendeStap: "Vul eerst de datum van overstap in.",
      datumTekst: infoDatum?.tekst,
    };
  }

  if (attest === "C") {
    return {
      status: "Niet mogelijk",
      titel: "Niet mogelijk",
      reden:
        "Met een C-attest is een gewone overgang naar het volgende leerjaar niet mogelijk.",
      aandachtspunt:
        "Controleer of het om een overgang naar een volgend leerjaar gaat of om een andere uitzonderlijke situatie.",
      volgendeStap:
        "Bespreek het traject manueel met directie of leerlingbegeleiding.",
      datumTekst: infoDatum?.tekst,
    };
  }

  if (attest === "A") {
    return {
      status: "Voorlopig mogelijk",
      titel: "Voorlopig mogelijk",
      reden:
        "Op basis van een A-attest lijkt deze overstap mogelijk.",
      aandachtspunt:
        "Controleer nog of er voor deze richting bijkomende toelatingsvoorwaarden gelden. " +
        tekstTkr,
      volgendeStap:
        "Controleer de officiële voorwaarden en bevestig daarna de overstap.",
      datumTekst: infoDatum?.tekst,
    };
  }

  if (attest === "B" && clausulering !== "ja") {
    return {
      status: "Manueel controleren",
      titel: "Manueel controleren",
      reden:
        "Er is een B-attest ingevoerd, maar er werd geen clausulering aangeduid.",
      aandachtspunt:
        "Bij een B-attest is de exacte formulering van de clausulering belangrijk. " +
        tekstTkr,
      volgendeStap:
        "Controleer het oriënteringsattest en vul de clausulering nauwkeuriger in.",
      datumTekst: infoDatum?.tekst,
    };
  }

  if (attest === "B" && clausulering === "ja") {
    if (clausuleringType === "richting") {
      if (!geclausuleerdeRichting) {
        return {
          status: "Manueel controleren",
          titel: "Manueel controleren",
          reden:
            "Er is een clausulering op studierichting, maar er werd nog geen geclausuleerde richting gekozen.",
          aandachtspunt:
            "Zonder concrete geclausuleerde richting kan de app niet vergelijken met de gewenste richting.",
          volgendeStap:
            "Kies de geclausuleerde studierichting en controleer opnieuw.",
          datumTekst: infoDatum?.tekst,
        };
      }

      if (geclausuleerdeRichting.id === gewensteRichting.id) {
        return {
          status: "Niet mogelijk",
          titel: "Niet mogelijk",
          reden:
            "De gewenste richting is dezelfde als de geclausuleerde studierichting.",
          aandachtspunt:
            "De clausulering lijkt deze overstap rechtstreeks uit te sluiten. " +
            tekstTkr,
          volgendeStap:
            "Controleer de exacte formulering van het attest en bespreek mogelijke alternatieven.",
          datumTekst: infoDatum?.tekst,
        };
      }

      return {
        status: "Manueel controleren",
        titel: "Manueel controleren",
        reden:
          "De geclausuleerde studierichting is niet dezelfde als de gewenste richting.",
        aandachtspunt:
          "Controleer of de clausulering echt alleen die richting uitsluit, of ruimer geformuleerd is. " +
          tekstTkr,
        volgendeStap:
          "Lees de formulering van het attest na en beslis of een manuele beoordeling nodig is.",
        datumTekst: infoDatum?.tekst,
      };
    }

    if (clausuleringType === "domein") {
      if (!geclausuleerdDomein) {
        return {
          status: "Manueel controleren",
          titel: "Manueel controleren",
          reden:
            "Er is een clausulering op studiedomein, maar er werd nog geen domein gekozen.",
          aandachtspunt:
            "Zonder domein kan de app niet vergelijken met het domein van de gewenste richting.",
          volgendeStap: "Kies het geclausuleerde studiedomein en controleer opnieuw.",
          datumTekst: infoDatum?.tekst,
        };
      }

      if (gewensteRichting.domein === geclausuleerdDomein) {
        return {
          status: "Niet mogelijk",
          titel: "Niet mogelijk",
          reden:
            "De gewenste richting valt binnen het geclausuleerde studiedomein.",
          aandachtspunt:
            "De clausulering lijkt deze overstap uit te sluiten. " + tekstTkr,
          volgendeStap:
            "Controleer de exacte formulering en bekijk mogelijke richtingen buiten dit domein.",
          datumTekst: infoDatum?.tekst,
        };
      }

      return {
        status: "Voorlopig mogelijk",
        titel: "Voorlopig mogelijk",
        reden:
          "De gewenste richting valt niet binnen het geclausuleerde studiedomein.",
        aandachtspunt:
          "Controleer wel nog of de clausulering niet ruimer geformuleerd is. " +
          tekstTkr,
        volgendeStap:
          "Controleer de officiële voorwaarden en bevestig daarna de overstap.",
        datumTekst: infoDatum?.tekst,
      };
    }

    if (clausuleringType === "finaliteit") {
      if (!geclausuleerdeFinaliteit) {
        return {
          status: "Manueel controleren",
          titel: "Manueel controleren",
          reden:
            "Er is een clausulering op finaliteit, maar er werd nog geen finaliteit gekozen.",
          aandachtspunt:
            "Zonder finaliteit kan de app niet vergelijken met de gewenste richting.",
          volgendeStap: "Kies de geclausuleerde finaliteit en controleer opnieuw.",
          datumTekst: infoDatum?.tekst,
        };
      }

      if (gewensteRichting.finaliteit === geclausuleerdeFinaliteit) {
        return {
          status: "Niet mogelijk",
          titel: "Niet mogelijk",
          reden:
            "De gewenste richting valt binnen de geclausuleerde finaliteit.",
          aandachtspunt:
            "De clausulering lijkt deze overstap uit te sluiten. " + tekstTkr,
          volgendeStap:
            "Controleer de exacte formulering en bekijk richtingen buiten deze finaliteit.",
          datumTekst: infoDatum?.tekst,
        };
      }

      return {
        status: "Voorlopig mogelijk",
        titel: "Voorlopig mogelijk",
        reden:
          "De gewenste richting valt niet binnen de geclausuleerde finaliteit.",
        aandachtspunt:
          "Controleer nog de exacte formulering van het attest. " + tekstTkr,
        volgendeStap:
          "Controleer de officiële voorwaarden en bevestig daarna de overstap.",
        datumTekst: infoDatum?.tekst,
      };
    }

    if (clausuleringType === "onderwijsvorm") {
      if (!geclausuleerdeOnderwijsvorm) {
        return {
          status: "Manueel controleren",
          titel: "Manueel controleren",
          reden:
            "Er is een clausulering op onderwijsvorm, maar er werd nog geen onderwijsvorm gekozen.",
          aandachtspunt:
            "Zonder onderwijsvorm kan de app niet vergelijken met de gewenste richting.",
          volgendeStap:
            "Kies de geclausuleerde onderwijsvorm en controleer opnieuw.",
          datumTekst: infoDatum?.tekst,
        };
      }

      if (gewensteRichting.onderwijsvorm === geclausuleerdeOnderwijsvorm) {
        return {
          status: "Niet mogelijk",
          titel: "Niet mogelijk",
          reden:
            "De gewenste richting valt binnen de geclausuleerde onderwijsvorm.",
          aandachtspunt:
            "De clausulering lijkt deze overstap uit te sluiten. " + tekstTkr,
          volgendeStap:
            "Controleer de exacte formulering en bekijk richtingen buiten deze onderwijsvorm.",
          datumTekst: infoDatum?.tekst,
        };
      }

      return {
        status: "Voorlopig mogelijk",
        titel: "Voorlopig mogelijk",
        reden:
          "De gewenste richting valt niet binnen de geclausuleerde onderwijsvorm.",
        aandachtspunt:
          "Controleer nog de exacte formulering van het attest. " + tekstTkr,
        volgendeStap:
          "Controleer de officiële voorwaarden en bevestig daarna de overstap.",
        datumTekst: infoDatum?.tekst,
      };
    }

    return {
      status: "Manueel controleren",
      titel: "Manueel controleren",
      reden:
        "Er is een B-attest met clausulering, maar het type clausulering werd nog niet gekozen.",
      aandachtspunt:
        "De app kan pas vergelijken wanneer duidelijk is of de clausulering gaat over richting, domein, finaliteit of onderwijsvorm.",
      volgendeStap:
        "Kies het type clausulering en controleer opnieuw.",
      datumTekst: infoDatum?.tekst,
    };
  }

  return {
    status: "Manueel controleren",
    titel: "Manueel controleren",
    reden:
      "Deze situatie vraagt een manuele controle door directie of leerlingbegeleiding.",
    aandachtspunt: tekstTkr,
    volgendeStap:
      "Controleer het attest, de regelgeving en de eventuele beslissing van de toelatingsklassenraad.",
    datumTekst: infoDatum?.tekst,
  };
}

export default async function CheckerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const zoekParams = await searchParams;

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
    (program) => program.id === zoekParams.huidige_richting
  );

  const gewensteRichting = alleProgrammas.find(
    (program) => program.id === zoekParams.gewenste_richting
  );

  const geclausuleerdeRichting = alleProgrammas.find(
    (program) => program.id === zoekParams.geclausuleerde_richting
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
    zoekParams.overstapmoment,
    zoekParams.overstapdatum
  );

  const resultaat = bepaalResultaat({
    overstapmoment: zoekParams.overstapmoment,
    overstapdatum: zoekParams.overstapdatum,
    attest: zoekParams.attest,
    clausulering: zoekParams.clausulering,
    clausuleringType: zoekParams.clausulering_type,
    gewensteRichting,
    geclausuleerdeRichting,
    geclausuleerdDomein: zoekParams.geclausuleerd_domein,
    geclausuleerdeFinaliteit: zoekParams.geclausuleerde_finaliteit,
    geclausuleerdeOnderwijsvorm: zoekParams.geclausuleerde_onderwijsvorm,
    tkr: zoekParams.tkr,
  });

  return (
    <main style={{ padding: "40px", fontFamily: "Arial", maxWidth: "850px" }}>
      <h1>Overstapchecker</h1>

      <p>
        Deze testversie vergelijkt richting, domein, finaliteit, onderwijsvorm,
        overstapmoment en eventuele beslissing van de toelatingsklassenraad.
      </p>

      <form method="GET" style={{ marginTop: "30px" }}>
        <h2>1. Overstapmoment</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Wanneer gebeurt de overstap?
        </label>

        <select
          name="overstapmoment"
          defaultValue={zoekParams.overstapmoment || ""}
          required
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Kies overstapmoment</option>
          <option value="volgend_schooljaar">
            Bij de start van volgend schooljaar
          </option>
          <option value="tijdens_schooljaar">Tijdens het schooljaar</option>
        </select>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Datum van overstap, alleen nodig tijdens het schooljaar
        </label>

        <input
          type="date"
          name="overstapdatum"
          defaultValue={zoekParams.overstapdatum || ""}
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
          defaultValue={zoekParams.huidige_richting || ""}
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
          defaultValue={zoekParams.gewenste_richting || ""}
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
          defaultValue={zoekParams.attest || ""}
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
          defaultValue={zoekParams.clausulering || ""}
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
          defaultValue={zoekParams.clausulering_type || ""}
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
          defaultValue={zoekParams.geclausuleerde_richting || ""}
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
          defaultValue={zoekParams.geclausuleerd_domein || ""}
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
          defaultValue={zoekParams.geclausuleerde_finaliteit || ""}
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
          defaultValue={zoekParams.geclausuleerde_onderwijsvorm || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Niet van toepassing of nog niet gekozen</option>
          {onderwijsvormen.map((onderwijsvorm) => (
            <option key={onderwijsvorm} value={onderwijsvorm}>
              {onderwijsvorm}
            </option>
          ))}
        </select>

        <h2>6. Toelatingsklassenraad</h2>

        <label style={{ display: "block", marginBottom: "8px" }}>
          Stand van zaken toelatingsklassenraad
        </label>

        <select
          name="tkr"
          defaultValue={zoekParams.tkr || ""}
          style={{ width: "100%", padding: "10px", marginBottom: "18px" }}
        >
          <option value="">Nog niet aangeduid</option>
          <option value="niet_nodig">Niet nodig</option>
          <option value="gunstig">Gunstige beslissing</option>
          <option value="ongunstig">Ongunstige beslissing</option>
          <option value="twijfel">Twijfel, nog te bespreken</option>
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

          <p>
            <strong>Status:</strong> {resultaat.status}
          </p>

          {huidigeRichting && (
            <p>
              <strong>Huidige richting:</strong> {naam(huidigeRichting)}
            </p>
          )}

          {gewensteRichting && (
            <p>
              <strong>Gewenste richting:</strong> {naam(gewensteRichting)}
            </p>
          )}

          <p>
            <strong>Reden:</strong> {resultaat.reden}
          </p>

          <p>
            <strong>Aandachtspunt:</strong> {resultaat.aandachtspunt}
          </p>

          <p>
            <strong>Volgende stap:</strong> {resultaat.volgendeStap}
          </p>

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