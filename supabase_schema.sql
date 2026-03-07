-- Create the production_records table
CREATE TABLE IF NOT EXISTS production_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_date DATE NOT NULL,
    day_month TEXT,
    month INTEGER,
    year INTEGER,
    material TEXT,
    unit TEXT, -- Mapping: GLY 2, GLY, Bio, etc.
    crude_glycerin_planning NUMERIC,
    crude_glycerin_actual NUMERIC,
    crude_glycerin_feed NUMERIC,
    diff_wip NUMERIC,
    lg_kg NUMERIC,
    lg_percent NUMERIC,
    naoh_consumption NUMERIC,
    naoh_consumption_per_ton NUMERIC,
    hcl_kg NUMERIC,
    hcl_kg_per_ton NUMERIC,
    refined_glycerine NUMERIC,
    yield_refined_glycerine NUMERIC,
    yellow_glycerine NUMERIC,
    yield_yellow_glycerine NUMERIC,
    pitch_residu NUMERIC,
    yield_pitch_residu NUMERIC,
    salt NUMERIC,
    yield_salt NUMERIC,
    kwh_electricity NUMERIC,
    kwh_per_ton NUMERIC,
    steam_kg NUMERIC,
    steam_kg_per_ton NUMERIC,
    total_water NUMERIC,
    m3_per_ton NUMERIC,
    waste_water_kg NUMERIC,
    waste_water_percent NUMERIC,
    calculation_yield_rg NUMERIC,
    feed_cg_purity NUMERIC,
    moisture_feed_cg NUMERIC,
    ph_feed_cg NUMERIC,
    soap_feed_cg NUMERIC,
    fae_product_rg NUMERIC,
    purity_product_rg NUMERIC,
    color_product_rg NUMERIC,
    actual_wh NUMERIC,
    target_wh NUMERIC,
    total_dt_hour NUMERIC,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_production_records_date ON production_records(record_date);
CREATE INDEX IF NOT EXISTS idx_production_records_unit ON production_records(unit);

-- Example Insert (GLY 2 data from the provided sheet)
-- Note: You can import the full CSV using Supabase Dashboard's "Import Data" feature.
-- Below are the first few rows converted to SQL.

INSERT INTO production_records (
    record_date, day_month, month, year, material, unit, 
    crude_glycerin_planning, crude_glycerin_actual, crude_glycerin_feed, diff_wip,
    lg_kg, lg_percent, naoh_consumption, naoh_consumption_per_ton,
    refined_glycerine, yield_refined_glycerine, yellow_glycerine, yield_yellow_glycerine,
    pitch_residu, yield_pitch_residu, salt, yield_salt,
    kwh_electricity, kwh_per_ton, steam_kg, steam_kg_per_ton,
    total_water, m3_per_ton, calculation_yield_rg, feed_cg_purity,
    moisture_feed_cg, ph_feed_cg, soap_feed_cg, fae_product_rg,
    purity_product_rg, color_product_rg, actual_wh, target_wh, total_dt_hour
) VALUES 
('2023-12-30', '30-12', 1, 2024, 'USP Glycerin 2', 'GLY 2', 250000, 231899, 231022.4, 876.6, 48085.25, 20.81, 754.12, 3.26, 161321, 69.83, 0, 0, 3674, 1.59, 800, 3.46, 15413.33, 66.72, 74400, 322.05, 108, 0.47, 0.91, 76.75, 18.88, 2.5, 3593.33, 0.24, 99.86, 3.88, 24, 24, 0),
('2023-12-31', '31-12', 1, 2024, 'USP Glycerin 2', 'GLY 2', 250000, 220904, 223505.35, -2601.35, 56343.81, 25.21, 828.95, 3.71, 143239, 64.09, 1992, 0.89, 8459, 3.78, 1500, 6.71, 15463.33, 69.19, 174200, 779.4, 162, 0.72, 0.86, 74.88, 20.75, 2.52, 4661.33, 0.13, 0, 3.78, 24, 24, 0),
('2024-01-01', '01-1', 1, 2024, 'USP Glycerin 2', 'GLY 2', 250000, 251301, 250758.34, 542.66, 71377.94, 28.46, 787.27, 3.14, 175106, 69.83, 1207, 0.48, 21553, 8.6, 3000, 11.96, 15433.33, 61.55, 174500, 695.89, 0, 0, 0, 0, 18.67, 2.53, 3790.33, 0.16, 99.91, 3.52, 24, 24, 0);
