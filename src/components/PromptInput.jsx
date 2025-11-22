import React, { useState, useRef, useEffect } from 'react';

export default function PromptInput({ onSubmit, loading }) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [prompt]);

  const handleSubmit = () => {
    if (prompt.trim() && !loading) {
      onSubmit(prompt.trim());
      setPrompt('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="prompt-container">
      <div className="prompt-wrapper">
        <div className="prompt-input-wrapper">
          <textarea
            ref={textareaRef}
            className="prompt-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe a process or decision tree... (e.g., 'Create a user authentication flow' or 'Add a payment verification step after login')"
            disabled={loading}
          />
        </div>
        <button
          className="prompt-button"
          onClick={handleSubmit}
          disabled={!prompt.trim() || loading}
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
}
