import { supabase } from '../lib/supabase';
import { ProductionRecord } from '../types/production';

export const productionService = {
  async getRecords(unit?: string): Promise<ProductionRecord[]> {
    let query = supabase
      .from('production_records')
      .select('*')
      .order('record_date', { ascending: true });

    if (unit) {
      query = query.eq('unit', unit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching production records:', error);
      return this.getMockRecords();
    }

    return data as ProductionRecord[];
  },

  getMockRecords(): ProductionRecord[] {
    // Return some initial data based on the provided CSV
    return [
      {
        record_date: '2023-12-30',
        material: 'USP Glycerin 2',
        unit: 'GLY 2',
        crude_glycerin_planning: 250000,
        crude_glycerin_actual: 231899,
        refined_glycerine: 161321,
        yield_refined_glycerine: 69.83,
        kwh_electricity: 15413.33,
        steam_kg: 74400,
      },
      {
        record_date: '2023-12-31',
        material: 'USP Glycerin 2',
        unit: 'GLY 2',
        crude_glycerin_planning: 250000,
        crude_glycerin_actual: 220904,
        refined_glycerine: 143239,
        yield_refined_glycerine: 64.09,
        kwh_electricity: 15463.33,
        steam_kg: 174200,
      },
      {
        record_date: '2024-01-01',
        material: 'USP Glycerin 2',
        unit: 'GLY 2',
        crude_glycerin_planning: 250000,
        crude_glycerin_actual: 251301,
        refined_glycerine: 175106,
        yield_refined_glycerine: 69.83,
        kwh_electricity: 15433.33,
        steam_kg: 174500,
      },
      {
        record_date: '2024-01-02',
        material: 'USP Glycerin 2',
        unit: 'GLY 2',
        crude_glycerin_planning: 250000,
        crude_glycerin_actual: 241150,
        refined_glycerine: 173167,
        yield_refined_glycerine: 71.26,
        kwh_electricity: 15600,
        steam_kg: 174600,
      },
      {
        record_date: '2024-01-03',
        material: 'USP Glycerin 2',
        unit: 'GLY 2',
        crude_glycerin_planning: 250000,
        crude_glycerin_actual: 206413,
        refined_glycerine: 145398,
        yield_refined_glycerine: 69.80,
        kwh_electricity: 15010,
        steam_kg: 174400,
      }
    ];
  }
};
