import { supabase } from '../lib/supabase';

export interface DrugRegistryEntry {
  id: string;
  name: string;
  category: string | null;
  usage_count: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Add a drug name to the global registry
 */
export async function addDrugToRegistry(
  drugName: string,
  category?: string | null
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const { data, error } = await supabase.rpc('add_drug_to_registry', {
      drug_name: drugName,
      drug_category: category || null,
    });

    if (error) {
      console.error('Error adding drug to registry:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data };
  } catch (error) {
    console.error('Error adding drug to registry:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all drug names from the registry
 */
export async function getAllDrugNames(): Promise<{
  success: boolean;
  data?: DrugRegistryEntry[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('drug_registry')
      .select('*')
      .order('usage_count', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching drug names:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching drug names:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search drug names in the registry
 */
export async function searchDrugNames(
  searchTerm: string
): Promise<{
  success: boolean;
  data?: DrugRegistryEntry[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('drug_registry')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .order('usage_count', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error searching drug names:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error searching drug names:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get popular drug names (most frequently used)
 */
export async function getPopularDrugNames(
  limit: number = 20
): Promise<{
  success: boolean;
  data?: DrugRegistryEntry[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('drug_registry')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching popular drug names:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching popular drug names:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recently used drug names
 */
export async function getRecentDrugNames(
  limit: number = 20
): Promise<{
  success: boolean;
  data?: DrugRegistryEntry[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('drug_registry')
      .select('*')
      .order('last_used_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent drug names:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching recent drug names:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
