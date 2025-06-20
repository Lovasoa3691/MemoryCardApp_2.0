const express = require("express");
const cors = require("cors");
const pdfParse = require("pdf-parse");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function extractImportantInfo(text) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const info = {
    definitions: [],
    avantages: [],
    inconvenients: [],
    astuces: [],
  };

  const patterns = {
    definitions: [
      /\b(définition|c'est quoi|il s'agit de|se définit|peut être défini|désigne|est un|on entend par)\b/i,
    ],
    avantages: [
      /\b(avantage|bénéfice|utile|positif|efficace|intérêt|gain|atout|amélioration|fiabilité|performance)\b/i,
    ],
    inconvenients: [
      /\b(inconvénient|problème|limite|faiblesse|risque|négatif|contrainte|complexité|désavantage|instabilité)\b/i,
    ],
    astuces: [
      /\b(astuce|conseil|recommandation|bon à savoir|truc|pratique|à retenir|il est conseillé|meilleure pratique)\b/i,
    ],
  };

  for (let line of lines) {
    if (patterns.definitions.some((r) => r.test(line)))
      info.definitions.push(line);
    if (patterns.avantages.some((r) => r.test(line))) info.avantages.push(line);
    if (patterns.inconvenients.some((r) => r.test(line)))
      info.inconvenients.push(line);
    if (patterns.astuces.some((r) => r.test(line))) info.astuces.push(line);
  }

  return info;
}

app.get("/cartes", async (req, res) => {
  const { data, error } = await supabase
    .from("Carte")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error });
  res.json(data);
});

app.delete("/cartes/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("Carte").delete().eq("id", id);

  if (error) return res.status(400).json({ error });
  res.json({ message: "Carte supprimée" });
});

app.post("/upload", async (req, res) => {
  try {
    const { file: base64File, name } = req.body;

    if (!base64File || !name) {
      return res.status(400).json({ error: "Fichier manquant" });
    }

    const pdfBuffer = Buffer.from(base64File, "base64");
    const data = await pdfParse(pdfBuffer);

    const importantInfo = extractImportantInfo(data.text);

    const cards = importantInfo.map((line, index) => ({
      title: `Carte ${index + 1}`,
      content: line,
    }));

    // const cards = [];

    // Object.entries(importantInfo).forEach(([category, lines]) => {
    //   lines.forEach((line) => {
    //     cards.push({
    //       titre: category.charAt(0).toUpperCase() + category.slice(1),
    //       contenu: line,
    //     });
    //   });
    // });

    // const { data: savedCards, error } = await supabase
    //   .from("Carte")
    //   .insert(cards);

    // if (error) {
    //   console.error("Erreur Supabase :", error);
    //   return res
    //     .status(500)
    //     .json({ error: "Erreur lors de l'enregistrement." });
    // }

    // res.json({ cards: savedCards });

    res.json({ cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du traitement du fichier." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur http://0.0.0.0:${port}`);
});
