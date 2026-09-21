function QuestionEditor({ question, onChange, onDelete, onMoveUp, onMoveDown, onDuplicate }) {
  const update = (field, value) => onChange({ ...question, [field]: value })

  return (
    <section className="assessment-question-editor" aria-label="Question editor">
      <div className="assessment-question-header">
        <label>
          Question type
          <select value={question.type || 'multiple_choice'} onChange={(event) => update('type', event.target.value)}>
            <option value="multiple_choice">Multiple choice</option>
            <option value="true_false">True / False</option>
          </select>
        </label>
        <div className="assessment-question-actions">
          <button type="button" onClick={onMoveUp}>Move up</button>
          <button type="button" onClick={onMoveDown}>Move down</button>
          <button type="button" onClick={onDuplicate}>Duplicate</button>
          <button type="button" onClick={onDelete}>Remove</button>
        </div>
      </div>

      <label>
        Question prompt
        <textarea value={question.prompt || ''} onChange={(event) => update('prompt', event.target.value)} rows={3} />
      </label>

      {question.type === 'true_false' ? (
        <div className="assessment-option-list">
          <label>
            Correct answer
            <select value={question.correctOptionId || 'true'} onChange={(event) => update('correctOptionId', event.target.value)}>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          </label>
        </div>
      ) : (
        <div className="assessment-option-list">
          {(question.options || []).map((option, index) => (
            <div className="assessment-option-row" key={option.id || `${index}-option`}>
              <label>
                Option {index + 1}
                <input value={option.text || ''} onChange={(event) => {
                  const nextOptions = [...(question.options || [])]
                  nextOptions[index] = { ...nextOptions[index], text: event.target.value }
                  update('options', nextOptions)
                }} />
              </label>
              <label className="assessment-radio-row">
                <input type="radio" checked={String(question.correctOptionId) === String(option.id)} onChange={() => update('correctOptionId', option.id)} name={`correct-${question.id || 'question'}`} />
                Correct
              </label>
            </div>
          ))}
          <button type="button" className="button button-secondary" onClick={() => update('options', [...(question.options || []), { id: crypto.randomUUID ? crypto.randomUUID() : `opt-${Date.now()}`, text: '' }])}>Add option</button>
        </div>
      )}

      <label>
        Marks
        <input type="number" min="1" value={question.marks || 1} onChange={(event) => update('marks', Number(event.target.value) || 1)} />
      </label>

      <label>
        Explanation
        <textarea value={question.explanation || ''} onChange={(event) => update('explanation', event.target.value)} rows={2} />
      </label>
    </section>
  )
}

export default QuestionEditor
