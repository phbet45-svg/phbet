import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function parseGamesWithGemini(buffer: Buffer, mimeType: string) {
  const prompt = `
    Analyze this image of betting games. Extract the games into a JSON array of objects.
    Each object must matching the specified responseSchema.
    If hours are not provided, default to '18:00'. If league is not stated, infer it.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: buffer.toString("base64"),
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      prompt,
      imagePart,
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            homeTeam: { type: Type.STRING },
            awayTeam: { type: Type.STRING },
            league: { type: Type.STRING, description: "Sport league, e.g. Copa Libertadores, Brasileirão Série A, Champions League, etc." },
            time: { type: Type.STRING, description: "Time of match, e.g., '18:00' or '21:30'" },
            odds: {
              type: Type.OBJECT,
              properties: {
                homeWins: { type: Type.NUMBER },
                draw: { type: Type.NUMBER },
                awayWins: { type: Type.NUMBER }
              },
              required: ["homeWins", "draw", "awayWins"]
            }
          },
          required: ["homeTeam", "awayTeam", "league", "time", "odds"]
        }
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No text returned from Gemini");
  }

  return JSON.parse(text);
}

// API: Parse Games from Image (File)
app.post("/api/parse-games", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded" });
  }

  try {
    const matches = await parseGamesWithGemini(req.file.buffer, req.file.mimetype);
    res.json({ matches });
  } catch (error) {
    console.error("Gemini Parsing Error (File):", error);
    res.status(500).json({ error: "Failed to parse games from image" });
  }
});

// API: Parse Games from Image (Base64 URL)
app.post("/api/parse-games-base64", async (req, res) => {
  const { base64 } = req.body;
  if (!base64 || typeof base64 !== "string") {
    return res.status(400).json({ error: "No base64 data provided" });
  }

  try {
    // base64 is something like "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    const parts = base64.split(";base64,");
    if (parts.length !== 2) throw new Error("Invalid base64 string");
    
    const mimeType = parts[0].split(":")[1] || "image/jpeg";
    const buffer = Buffer.from(parts[1], "base64");
    
    const matches = await parseGamesWithGemini(buffer, mimeType);
    res.json({ matches });
  } catch (error) {
    console.error("Gemini Parsing Error (Base64):", error);
    res.status(500).json({ error: "Failed to parse games from image base64" });
  }
});

// API: Parse Games from Image (URL)
app.post("/api/parse-games-url", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch image from URL");
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type") || "image/jpeg";
    
    const matches = await parseGamesWithGemini(buffer, mimeType);
    res.json({ matches });
  } catch (error) {
    console.error("Gemini Parsing Error (URL):", error);
    res.status(500).json({ error: "Failed to parse games from image URL" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Fallback JSON error handler for express
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error("Global Express Error:", err);
      res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
    } else {
      next();
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
