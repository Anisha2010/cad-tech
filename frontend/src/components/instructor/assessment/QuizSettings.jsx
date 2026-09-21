function QuizSettings({ values, onChange }) {
  return (
    <div className="assessment-form-grid">
      <label>
        Quiz title
        <input value={values.title || ''} onChange={(event) => onChange('title', event.target.value)} />
      </label>
      <label>
        Passing percentage
        <input type="number" min="0" max="100" value={values.passingPercentage ?? 70} onChange={(event) => onChange('passingPercentage', Number(event.target.value))} />
      </label>
      <label>
        Time limit (minutes)
        <input type="number" min="1" value={values.timeLimitMinutes ?? ''} onChange={(event) => onChange('timeLimitMinutes', event.target.value === '' ? null : Number(event.target.value))} />
      </label>
      <label>
        Maximum attempts
        <input type="number" min="1" value={values.maximumAttempts ?? 1} onChange={(event) => onChange('maximumAttempts', Number(event.target.value) || 1)} />
      </label>
      <label className="assessment-checkbox-row">
        <input type="checkbox" checked={Boolean(values.shuffleQuestions)} onChange={(event) => onChange('shuffleQuestions', event.target.checked)} />
        Shuffle questions
      </label>
      <label className="assessment-full-width">
        Description
        <textarea value={values.description || ''} onChange={(event) => onChange('description', event.target.value)} rows={3} />
      </label>
      <label className="assessment-full-width">
        Instructions
        <textarea value={values.instructions || ''} onChange={(event) => onChange('instructions', event.target.value)} rows={3} />
      </label>
    </div>
  )
}

export default QuizSettings
