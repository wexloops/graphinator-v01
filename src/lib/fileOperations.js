/**
 * Export diagram to JSON file
 */
export function exportToJSON(nodes, edges, breakdown, filename = 'graphinator-diagram') {
  const data = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    nodes,
    edges,
    breakdown
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import diagram from JSON file
 */
export function importFromJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Validate structure
        if (!data.nodes || !data.edges) {
          reject(new Error('Invalid Graphinator file format. Missing nodes or edges.'));
          return;
        }

        // Validate version (optional)
        if (data.version && data.version !== '1.0') {
          console.warn('File version mismatch. Some features may not work correctly.');
        }

        resolve({
          nodes: data.nodes,
          edges: data.edges,
          breakdown: data.breakdown || null
        });
      } catch (error) {
        reject(new Error('Failed to parse JSON file. Please check file format.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };

    reader.readAsText(file);
  });
}

/**
 * Trigger file input dialog
 */
export function triggerFileUpload(onFileSelected) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelected(file);
    }
  };

  input.click();
}
