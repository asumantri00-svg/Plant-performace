import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("performance.db");
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Initialize Database with mock data
db.exec(`
  CREATE TABLE IF NOT EXISTS plants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS performance_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plant_id TEXT,
    date TEXT,
    rbd_po_yield REAL,
    pfad_yield REAL,
    total_production REAL,
    target_production REAL,
    electrical_consumption REAL,
    steam_consumption REAL,
    cng_consumption REAL,
    demin_water REAL,
    soft_water REAL,
    solar_consumption REAL,
    bleaching_earth REAL,
    phosphoric_acid REAL,
    efficiency REAL,
    utilization REAL,
    downtime_hours REAL,
    working_hours REAL,
    FOREIGN KEY(plant_id) REFERENCES plants(id)
  );
`);

try {
  db.exec("ALTER TABLE performance_data ADD COLUMN solar_consumption REAL");
} catch (e) {
  // Column might already exist
}

const plants = [
  "Refinery 1", "Refinery 2", "Refinery 3", "PTR", 
  "Fraksinasi 1", "Fraksinasi 2", "Fraksinasi 3", "Fraksinasi 3A", 
  "Biodiesel", "Glycerine 1", "Glycerine 2", "Clarification"
];

const insertPlant = db.prepare("INSERT OR IGNORE INTO plants (id, name) VALUES (?, ?)");
plants.forEach(p => insertPlant.run(p.toLowerCase().replace(/\s+/g, '_'), p));

// Generate some mock data for the last 30 days if empty
const count = db.prepare("SELECT COUNT(*) as count FROM performance_data").get() as { count: number };
if (count.count === 0) {
  const insertData = db.prepare(`
    INSERT INTO performance_data (
      plant_id, date, rbd_po_yield, pfad_yield, total_production, target_production,
      electrical_consumption, steam_consumption, cng_consumption, demin_water, soft_water, solar_consumption,
      bleaching_earth, phosphoric_acid, efficiency, utilization, downtime_hours, working_hours
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  plants.forEach(plant => {
    const plantId = plant.toLowerCase().replace(/\s+/g, '_');
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      insertData.run(
        plantId,
        dateStr,
        90 + Math.random() * 5, // rbd_po_yield
        4 + Math.random() * 2,  // pfad_yield
        15000 + Math.random() * 2000, // total_production
        24000, // target_production
        120 + Math.random() * 30, // electrical
        800 + Math.random() * 100, // steam
        80 + Math.random() * 20, // cng
        1000 + Math.random() * 200, // demin
        1500 + Math.random() * 300, // soft water
        50 + Math.random() * 10, // solar
        200 + Math.random() * 50, // bleaching
        5 + Math.random() * 3, // phosphoric
        95 + Math.random() * 10, // efficiency
        60 + Math.random() * 30, // utilization
        Math.random() * 5, // downtime
        24 - Math.random() * 2 // working hours
      );
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/plants", (req, res) => {
    const rows = db.prepare("SELECT * FROM plants").all();
    res.json(rows);
  });

  app.get("/api/performance/:plantId", (req, res) => {
    const { plantId } = req.params;
    const { date } = req.query;
    
    let query = "SELECT * FROM performance_data WHERE plant_id = ?";
    const params = [plantId];
    
    if (date) {
      query += " AND date = ?";
      params.push(date as string);
    } else {
      query += " ORDER BY date DESC LIMIT 30";
    }
    
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  });

  app.get("/api/stats/summary", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        plant_id,
        AVG(rbd_po_yield) as avg_rbd_yield,
        AVG(efficiency) as avg_efficiency,
        SUM(total_production) as total_prod
      FROM performance_data 
      GROUP BY plant_id
    `).all();
    res.json(stats);
  });

  app.post("/api/ai/openai", async (req, res) => {
    if (!openai) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    const { data, query } = req.body;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert industrial performance analyst for a refinery and chemical plant complex.
            You will be provided with performance data for various plants (Refinery, Fractionation, Biodiesel, etc.).
            Your task is to analyze the data and provide insights, reports, and recommendations based on the user's query.
            Focus on:
            - Production Yields (RBD PO, PFAD)
            - Utility and Chemical Consumption efficiency
            - Quality metrics
            - Downtime and Utilization
            
            Provide concise, professional reports in Markdown format.
            If the user asks for daily, monthly, or annual reports, use the provided data to synthesize a summary.`
          },
          {
            role: "user",
            content: `Data: ${JSON.stringify(data)}\n\nQuery: ${query}`
          }
        ],
      });

      res.json({ text: completion.choices[0].message.content });
    } catch (error: any) {
      console.error("OpenAI Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze with OpenAI" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
