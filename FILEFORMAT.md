# Graphinator V01 File Format

## JSON Structure

Graphinator uses a simple JSON format for importing and exporting diagrams.

### Format Specification

```json
{
  "version": "1.0",
  "timestamp": "2025-11-22T05:00:00.000Z",
  "nodes": [
    {
      "id": "1",
      "type": "input",
      "position": { "x": 250, "y": 0 },
      "data": {
        "label": "Start",
        "color": "#6a9"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "label": "condition"
    }
  ],
  "breakdown": {
    "overview": "Process description",
    "steps": ["Step 1", "Step 2"],
    "key_decisions": ["Decision 1"],
    "outcomes": ["Outcome 1"]
  }
}
```

## Field Descriptions

### Root Object
- `version` (string, required) - File format version ("1.0")
- `timestamp` (string, optional) - ISO 8601 timestamp of creation
- `nodes` (array, required) - Array of node objects
- `edges` (array, required) - Array of edge objects
- `breakdown` (object, optional) - Text breakdown data

### Node Object
- `id` (string, required) - Unique node identifier
- `type` (string, required) - Node type: "input", "output", or "default"
- `position` (object, required) - Node position with `x` and `y` coordinates
- `data` (object, required) - Node data
  - `label` (string, required) - Display text
  - `color` (string, optional) - Hex color code (default: type-specific)

### Edge Object
- `id` (string, required) - Unique edge identifier
- `source` (string, required) - Source node ID
- `target` (string, required) - Target node ID
- `label` (string, optional) - Edge label text

### Breakdown Object
- `overview` (string, optional) - Overall process description
- `steps` (array, optional) - Array of step descriptions
- `key_decisions` (array, optional) - Array of decision points
- `outcomes` (array, optional) - Array of possible outcomes

## Export Behavior

When exporting:
- Filename format: `graphinator-YYYY-MM-DD.json`
- All node positions, colors, and labels are preserved
- Edge connections and labels are maintained
- Breakdown data is included if available

## Import Behavior

When importing:
- File must be valid JSON
- Must contain `nodes` and `edges` arrays (minimum requirement)
- Missing optional fields are handled gracefully
- Invalid structure shows error message
- Version mismatch shows warning but attempts import

## Example Files

### Minimal Valid File
```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "1",
      "type": "input",
      "position": { "x": 100, "y": 50 },
      "data": { "label": "Start" }
    }
  ],
  "edges": []
}
```

### Complete Example
See exported files for full examples with all optional fields populated.
