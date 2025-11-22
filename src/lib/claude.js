import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true
});

const DIAGRAM_TYPE_PROMPTS = {
  flowchart: {
    description: 'flowchart with sequential processes',
    rules: `- Use node types: "input" (start), "output" (end), "default" (process/decision)
- Position nodes in a logical flow (top to bottom, left to right)
- Space nodes at least 100px apart vertically, 200px horizontally
- Create a linear or branching process flow
- Include edge labels for conditions/transitions`
  },
  decision: {
    description: 'decision tree with branching logic',
    rules: `- Use node types: "input" (root decision), "default" (decision points), "output" (leaf outcomes)
- Position nodes in a tree structure (top to bottom, branching outward)
- Space nodes at least 120px apart vertically, 250px horizontally for branches
- Each decision node should branch to 2+ child nodes
- Label edges with decision criteria (Yes/No, conditions, choices)
- Create clear parent-child hierarchical relationships`
  },
  neural: {
    description: 'neural network diagram with interconnected nodes',
    rules: `- Use node types: "input" (input layer), "default" (hidden/processing), "output" (output layer)
- Position nodes in layers (left to right or circular patterns)
- Space nodes at least 100px apart, create multiple layers
- Show rich interconnections between nodes across layers
- Label edges with weights, signals, or relationship types
- Create network-like structure with multiple paths between nodes`
  }
};

/**
 * Generate a diagram structure from a text prompt
 */
export async function generateFlowchart(prompt, diagramType = 'flowchart') {
  const typeConfig = DIAGRAM_TYPE_PROMPTS[diagramType] || DIAGRAM_TYPE_PROMPTS.flowchart;

  const systemPrompt = `You are a ${typeConfig.description} generation assistant. Generate a ${typeConfig.description} based on the user's prompt.

Return ONLY valid JSON in this exact format:
{
  "nodes": [
    {"id": "1", "type": "input", "data": {"label": "Start"}, "position": {"x": 250, "y": 0}},
    {"id": "2", "type": "default", "data": {"label": "Process/Decision"}, "position": {"x": 250, "y": 100}}
  ],
  "edges": [
    {"id": "e1-2", "source": "1", "target": "2", "label": "condition/relationship"}
  ],
  "breakdown": {
    "overview": "Brief description of the diagram",
    "steps": ["Step 1 description", "Step 2 description"],
    "key_decisions": ["Decision 1", "Decision 2"],
    "outcomes": ["Outcome 1", "Outcome 2"]
  }
}

Rules for ${typeConfig.description}:
${typeConfig.rules}
- Make the breakdown clear and actionable
- Return ONLY the JSON, no markdown, no code blocks, no explanations`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: prompt
    }],
    system: systemPrompt
  });

  const content = response.content[0].text.trim();

  // Parse JSON from response
  let jsonStr = content;

  // Remove markdown code blocks if present
  if (content.startsWith('```')) {
    jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse Claude response:', content);
    throw new Error('Failed to parse flowchart data from Claude');
  }
}

/**
 * Update an existing diagram based on a modification prompt
 */
export async function updateFlowchart(currentData, modificationPrompt, diagramType = 'flowchart') {
  const typeConfig = DIAGRAM_TYPE_PROMPTS[diagramType] || DIAGRAM_TYPE_PROMPTS.flowchart;

  const systemPrompt = `You are a ${typeConfig.description} modification assistant. The user will provide an existing diagram and a modification request.

Return ONLY valid JSON with the updated diagram in this exact format:
{
  "nodes": [...],
  "edges": [...],
  "breakdown": {...}
}

Rules for ${typeConfig.description}:
${typeConfig.rules}
- Preserve existing structure where possible
- Apply the requested modifications
- Maintain logical flow and spacing
- Update breakdown to reflect changes
- Return ONLY the JSON, no markdown, no code blocks`;

  const userPrompt = `Current flowchart:
${JSON.stringify(currentData, null, 2)}

Modification request: ${modificationPrompt}

Return the updated flowchart.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: userPrompt
    }],
    system: systemPrompt
  });

  const content = response.content[0].text.trim();
  let jsonStr = content;

  if (content.startsWith('```')) {
    jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Failed to parse Claude response:', content);
    throw new Error('Failed to parse updated flowchart data from Claude');
  }
}
