const express = require("express");
const cors = require("cors");
const pdfParse = require("pdf-parse");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

function summarize(text) {
  const lines = text.split(/\n+/).filter((line) => line.trim() !== "");
  const importantLines = lines.filter(
    (line) => line.includes(":") || line.length > 80 || /^[A-Z]/.test(line)
  );
  return importantLines.slice(0, 10);
}

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

app.post("/upload", async (req, res) => {
  try {
    const { file: base64File, name } = req.body;

    if (!base64File || !name) {
      return res.status(400).json({ error: "Fichier manquant" });
    }

    const pdfBuffer = Buffer.from(base64File, "base64");
    const data = await pdfParse(pdfBuffer);

    const summaryLines = extractImportantInfo(data.text);

    const cards = summaryLines.map((line, index) => ({
      title: `Carte ${index + 1}`,
      content: line,
    }));

    res.json({ cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du traitement du fichier." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur http://0.0.0.0:${port}`);
});
