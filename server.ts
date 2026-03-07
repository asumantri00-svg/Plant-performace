import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const db = new Database("performance.db");

// Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Initialize Database (Local fallback)
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/plants", (req, res) => {
    const rows = db.prepare("SELECT * FROM plants").all();
    res.json(rows);
  });

  app.get("/api/performance/:plantId", async (req, res) => {
    const { plantId } = req.params;
    const { date } = req.query;
    
    // Try Supabase first
    if (supabase) {
      let query = supabase.from('performance_data').select('*').eq('plant_id', plantId);
      if (date) {
        query = query.eq('date', date);
      } else {
        query = query.order('date', { ascending: false }).limit(30);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return res.json(data);
      }
    }

    // Fallback to SQLite
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

  app.post("/api/performance", async (req, res) => {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: "Data must be an array" });
    }

    // Save to Supabase
    let supabaseSuccess = false;
    if (supabase) {
      try {
        const { error } = await supabase.from('performance_data').insert(data);
        if (!error) {
          supabaseSuccess = true;
        } else {
          console.error("Supabase Insert Error:", error);
        }
      } catch (err) {
        console.error("Supabase Connection Error:", err);
      }
    }

    // Always save to SQLite as local cache/fallback
    const insertData = db.prepare(`
      INSERT INTO performance_data (
        plant_id, date, rbd_po_yield, pfad_yield, total_production, target_production,
        electrical_consumption, steam_consumption, cng_consumption, demin_water, soft_water, solar_consumption,
        bleaching_earth, phosphoric_acid, efficiency, utilization, downtime_hours, working_hours
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((items) => {
      for (const item of items) {
        insertData.run(
          item.plant_id,
          item.date,
          item.rbd_po_yield || 0,
          item.pfad_yield || 0,
          item.total_production || 0,
          item.target_production || 0,
          item.electrical_consumption || 0,
          item.steam_consumption || 0,
          item.cng_consumption || 0,
          item.demin_water || 0,
          item.soft_water || 0,
          item.solar_consumption || 0,
          item.bleaching_earth || 0,
          item.phosphoric_acid || 0,
          item.efficiency || 0,
          item.utilization || 0,
          item.downtime_hours || 0,
          item.working_hours || 0
        );
      }
    });

    try {
      transaction(data);
      res.json({ success: true, count: data.length, supabase: supabaseSuccess });
    } catch (error: any) {
      console.error("Database Error:", error);
      res.status(500).json({ error: error.message });
    }
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
