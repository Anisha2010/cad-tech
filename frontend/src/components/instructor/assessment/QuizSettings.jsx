import { SlidersHorizontal } from 'lucide-react'

function QuizSettings({ values, validationErrors = {}, onChange, onValidationChange = () => { } }) {
  return (
    <section className="instructor-quiz-panel instructor-quiz-settings-panel">
      <div className="instructor-quiz-panel-title"><span><SlidersHorizontal size={18} /></span><div><h2>Quiz Settings</h2><p>Choose scoring and attempt rules.</p></div></div>
      <div className="instructor-quiz-settings-fields">
        <label className={`instructor-quiz-field${validationErrors.passingPercentage ? ' has-error' : ''}`} htmlFor="quiz-passing-percentage">
          <span>Passing percentage (%) <b aria-hidden="true">*</b></span>
          <input id="quiz-passing-percentage" type="number" min="0" max="100" required aria-invalid={Boolean(validationErrors.passingPercentage)} aria-describedby={validationErrors.passingPercentage ? 'quiz-passing-percentage-error' : undefined} value={values.passingPercentage ?? 70} onChange={(event) => { onChange('passingPercentage', Number(event.target.value)); onValidationChange('passingPercentage') }} />
          {validationErrors.passingPercentage ? <small id="quiz-passing-percentage-error" className="instructor-quiz-field-error">{validationErrors.passingPercentage}</small> : <small>Set a value from 0 to 100.</small>}
        </label>
        <label className={`instructor-quiz-field${validationErrors.maximumAttempts ? ' has-error' : ''}`} htmlFor="quiz-maximum-attempts">
          <span>Maximum attempts <b aria-hidden="true">*</b></span>
          <input id="quiz-maximum-attempts" type="number" min="1" required aria-invalid={Boolean(validationErrors.maximumAttempts)} aria-describedby={validationErrors.maximumAttempts ? 'quiz-maximum-attempts-error' : undefined} value={values.maximumAttempts ?? 1} onChange={(event) => { onChange('maximumAttempts', Number(event.target.value) || 1); onValidationChange('maximumAttempts') }} />
          {validationErrors.maximumAttempts && <small id="quiz-maximum-attempts-error" className="instructor-quiz-field-error">{validationErrors.maximumAttempts}</small>}
        </label>
        <label className={`instructor-quiz-field${validationErrors.timeLimitMinutes ? ' has-error' : ''}`} htmlFor="quiz-time-limit">
          <span>Time limit (minutes)</span>
          <input id="quiz-time-limit" type="number" min="1" aria-invalid={Boolean(validationErrors.timeLimitMinutes)} aria-describedby={validationErrors.timeLimitMinutes ? 'quiz-time-limit-error' : undefined} value={values.timeLimitMinutes ?? ''} onChange={(event) => { onChange('timeLimitMinutes', event.target.value === '' ? null : Number(event.target.value)); onValidationChange('timeLimitMinutes') }} />
          {validationErrors.timeLimitMinutes ? <small id="quiz-time-limit-error" className="instructor-quiz-field-error">{validationErrors.timeLimitMinutes}</small> : <small>Leave empty for an untimed quiz.</small>}
        </label>
        <label className="instructor-quiz-switch" htmlFor="quiz-shuffle-questions">
          <input id="quiz-shuffle-questions" type="checkbox" checked={Boolean(values.shuffleQuestions)} onChange={(event) => onChange('shuffleQuestions', event.target.checked)} />
          <span><strong>Shuffle questions</strong><small>Show questions in a different order for each attempt.</small></span>
        </label>
      </div>
    </section>
  )
}

export default QuizSettings
