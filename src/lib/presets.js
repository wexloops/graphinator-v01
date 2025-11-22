/**
 * Preset management using localStorage
 */

const STORAGE_KEY = 'graphinator_presets';

export function getPresets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load presets:', error);
    return [];
  }
}

export function savePreset(name, data) {
  try {
    const presets = getPresets();
    const timestamp = new Date().toISOString();

    const newPreset = {
      id: Date.now().toString(),
      name,
      timestamp,
      data: {
        nodes: data.nodes,
        edges: data.edges,
        breakdown: data.breakdown
      }
    };

    // Check if preset with same name exists
    const existingIndex = presets.findIndex(p => p.name === name);

    if (existingIndex >= 0) {
      presets[existingIndex] = newPreset;
    } else {
      presets.push(newPreset);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return newPreset;
  } catch (error) {
    console.error('Failed to save preset:', error);
    throw new Error('Failed to save preset');
  }
}

export function deletePreset(id) {
  try {
    const presets = getPresets();
    const filtered = presets.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Failed to delete preset:', error);
    throw new Error('Failed to delete preset');
  }
}

export function loadPreset(id) {
  const presets = getPresets();
  return presets.find(p => p.id === id);
}
