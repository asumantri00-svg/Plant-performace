export interface ProductionRecord {
  id?: string;
  record_date: string;
  day_month?: string;
  month?: number;
  year?: number;
  material: string;
  unit: string;
  crude_glycerin_planning?: number;
  crude_glycerin_actual?: number;
  crude_glycerin_feed?: number;
  diff_wip?: number;
  lg_kg?: number;
  lg_percent?: number;
  naoh_consumption?: number;
  naoh_consumption_per_ton?: number;
  refined_glycerine?: number;
  yield_refined_glycerine?: number;
  yellow_glycerine?: number;
  yield_yellow_glycerine?: number;
  pitch_residu?: number;
  yield_pitch_residu?: number;
  salt?: number;
  yield_salt?: number;
  kwh_electricity?: number;
  kwh_per_ton?: number;
  steam_kg?: number;
  steam_kg_per_ton?: number;
  total_water?: number;
  m3_per_ton?: number;
  waste_water_kg?: number;
  waste_water_percent?: number;
  calculation_yield_rg?: number;
  feed_cg_purity?: number;
  moisture_feed_cg?: number;
  ph_feed_cg?: number;
  soap_feed_cg?: number;
  fae_product_rg?: number;
  purity_product_rg?: number;
  color_product_rg?: number;
  actual_wh?: number;
  target_wh?: number;
  total_dt_hour?: number;
  description?: string;
}

export const UNIT_MAPPINGS: Record<string, string> = {
  'ref 1': 'Refinery 1',
  'ref 2': 'Refinery 2',
  'ref 3': 'Refinery 3',
  'PTR': 'PTR',
  'FRAK 1': 'Fractionation 1',
  'Frak 2': 'Fractionation 2',
  'Bio': 'Biodiesel',
  'CLR': 'Clarification',
  'GLY': 'Glycerine 1',
  'GLY 2': 'Glycerine 2',
};
