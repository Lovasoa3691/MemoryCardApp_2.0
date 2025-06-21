const express = require("express");
const cors = require("cors");
const pdfParse = require("pdf-parse");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const axios = require("axios");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function summarizeText(text) {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-70b-8192",
        messages: [
          {
            role: "system",
            content:
              "Tu es un assistant intelligent qui résume des documents en français.",
          },
          {
            role: "user",
            content: `Voici un texte :\n\n${text}\n\nFais un résumé clair et structuré en quelques phrases.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(
      "Erreur avec Groq API :",
      error.response?.data || error.message
    );
    throw error;
  }
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

app.get("/cartes", async (req, res) => {
  const { data, error } = await supabase
    .from("Carte")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error });
  res.json(data);
});

app.get("/cartes/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("Carte")
    .select("*")
    .eq("titre", id)
    .single();

  if (error) return res.status(400).json({ error });
  res.json(data);
});

app.delete("/cartes/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("Carte").delete().eq("idCarte", id);

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
    const dataInfo = await pdfParse(pdfBuffer);

    const importantInfo = await summarizeText(dataInfo.text);

    const { data, error } = await supabase
      .from("Carte")
      .insert([
        {
          titre: name,
          contenu: importantInfo,
        },
      ])
      .select();

    if (error) {
      console.error("Erreur Supabase :", error);
      return res
        .status(500)
        .json({ error: "Erreur lors de l'enregistrement." });
    }

    res.json({
      message: "Information enregistrée avec succès",
      resultat: importantInfo,
      fichier: name,
    });

    // res.json({ resultat: importantInfo, fichier: name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors du traitement du fichier." });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Serveur démarré sur http://0.0.0.0:${port}`);
});
