import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, Copy, Plus, Trash2 } from 'lucide-react'

function makeOption(text = '') {
  const id = crypto.randomUUID
    ? crypto.randomUUID().replaceAll('-', '').slice(0, 24)
    : `${Date.now().toString(16).padStart(12, '0')}${Math.random().toString(16).slice(2, 14)}`
  return { id, text }
}

function QuestionEditor({ question, index, questionCount, canReorder, isSaving, isSaved, isEditing = false, onSave, onCancel = () => { }, validationErrors = {}, onValidationChange = () => { }, onChange, onDelete, onMoveUp, onMoveDown, onDuplicate }) {
  const [collapsed, setCollapsed] = useState(false)
  const update = (field, value) => onChange({ ...question, [field]: value })
  const questionType = question.type || 'multiple_choice'
  const isTrueFalse = questionType === 'true_false'
  const isShortAnswer = questionType === 'short_answer'
  const options = question.options || []

  const changeType = (type) => {
    if (type === questionType) return
    if (type === 'true_false') {
      const trueOption = makeOption('True')
      const falseOption = makeOption('False')
      onChange({ ...question, type, options: [trueOption, falseOption], correctOptionId: trueOption.id })
      return
    }
    if (type === 'short_answer') {
      onChange({ ...question, type, options: [], correctOptionId: null, correctAnswer: question.correctAnswer || '' })
      return
    }
    const nextOptions = [makeOption(), makeOption()]
    onChange({ ...question, type, options: nextOptions, correctOptionId: null })
  }

  const removeOption = (optionId) => {
    if (options.length <= 2) return
    const nextOptions = options.filter((option) => String(option.id) !== String(optionId))
    const nextCorrectId = String(question.correctOptionId) === String(optionId) ? nextOptions[0]?.id : question.correctOptionId
    onChange({ ...question, options: nextOptions, correctOptionId: nextCorrectId })
  }

  return (
    <section className={`instructor-question-card${collapsed ? ' is-collapsed' : ''}`} role="region" aria-label={`Question ${index + 1} editor`}>
      <header className="instructor-question-card-header">
        <div className="instructor-question-card-title">
          <span className="instructor-question-number">{String(index + 1).padStart(2, '0')}</span>
          <div><strong>Question {index + 1}</strong><span className={`instructor-question-type-badge is-${questionType}`}>{isTrueFalse ? 'True / False' : isShortAnswer ? 'Short Answer' : 'Multiple Choice'}</span></div>
          <span className="instructor-question-marks-badge">{question.marks || 1} {Number(question.marks || 1) === 1 ? 'mark' : 'marks'}</span>
        </div>
        <div className="instructor-question-actions">
          {canReorder && index > 0 && <button type="button" onClick={onMoveUp} aria-label={`Move question ${index + 1} up`} title="Move up"><ArrowUp size={16} /></button>}
          {canReorder && index < questionCount - 1 && <button type="button" onClick={onMoveDown} aria-label={`Move question ${index + 1} down`} title="Move down"><ArrowDown size={16} /></button>}
          <button type="button" onClick={onDuplicate} aria-label={`Duplicate question ${index + 1}`} title="Duplicate"><Copy size={16} /></button>
          <button type="button" onClick={onDelete} aria-label={`Delete question ${index + 1}`} title="Delete" className="is-danger"><Trash2 size={16} /></button>
          <button type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} aria-label={`${collapsed ? 'Expand' : 'Collapse'} question ${index + 1}`} title={collapsed ? 'Expand' : 'Collapse'} className="instructor-question-collapse"><ChevronDown size={17} /></button>
        </div>
      </header>

      {!collapsed && <div className="instructor-question-fields">
        <label className="instructor-quiz-field" htmlFor={`question-type-${question.id}`}>
          <span>Question type</span>
          <select id={`question-type-${question.id}`} value={questionType} onChange={(event) => changeType(event.target.value)}>
            <option value="multiple_choice">Multiple choice</option>
            <option value="true_false">True / False</option>
            <option value="short_answer">Short answer</option>
          </select>
        </label>

        <label className={`instructor-quiz-field${validationErrors[`question-${question.id}-prompt`] ? ' has-error' : ''}`} htmlFor={`question-prompt-${question.id}`}>
          <span>Question prompt <b aria-hidden="true">*</b></span>
          <textarea id={`question-prompt-${question.id}`} required aria-invalid={Boolean(validationErrors[`question-${question.id}-prompt`])} aria-describedby={validationErrors[`question-${question.id}-prompt`] ? `question-prompt-error-${question.id}` : undefined} value={question.prompt || ''} onChange={(event) => { update('prompt', event.target.value); onValidationChange(`question-${question.id}-prompt`) }} rows={3} placeholder="Write the question learners will answer." />
          {validationErrors[`question-${question.id}-prompt`] && <small id={`question-prompt-error-${question.id}`} className="instructor-quiz-field-error">{validationErrors[`question-${question.id}-prompt`]}</small>}
        </label>

        {isShortAnswer ? (
          <label className={`instructor-quiz-field${validationErrors[`question-${question.id}-correctAnswer`] ? ' has-error' : ''}`} htmlFor={`question-correct-answer-${question.id}`}>
            <span>Expected answer <b aria-hidden="true">*</b></span>
            <input id={`question-correct-answer-${question.id}`} required value={question.correctAnswer || ''} aria-invalid={Boolean(validationErrors[`question-${question.id}-correctAnswer`])} aria-describedby={validationErrors[`question-${question.id}-correctAnswer`] ? `question-answer-error-${question.id}` : undefined} onChange={(event) => { update('correctAnswer', event.target.value); onValidationChange(`question-${question.id}-correctAnswer`) }} placeholder="Enter the expected answer" />
            {validationErrors[`question-${question.id}-correctAnswer`] && <small id={`question-answer-error-${question.id}`} className="instructor-quiz-field-error">{validationErrors[`question-${question.id}-correctAnswer`]}</small>}
            <small>Student answers are checked without case or repeated-whitespace differences.</small>
          </label>
        ) : <fieldset className={`instructor-question-options${validationErrors[`question-${question.id}-options`] || validationErrors[`question-${question.id}-correct`] ? ' has-error' : ''}`}>
          <legend>{isTrueFalse ? 'Correct answer' : 'Answer options'}</legend>
          <div className="instructor-question-option-list">
            {options.map((option, optionIndex) => {
              const isCorrect = String(question.correctOptionId) === String(option.id) || (isTrueFalse && String(question.correctOptionId) === String(option.text).toLowerCase())
              const optionLabel = isTrueFalse ? option.text : String.fromCharCode(65 + optionIndex)
              return (
                <div className={`instructor-question-option${isCorrect ? ' is-correct' : ''}`} key={option.id || `${optionIndex}-option`}>
                  <label className="instructor-question-correct-control" htmlFor={`correct-${question.id}-${option.id}`}>
                    <input id={`correct-${question.id}-${option.id}`} type="radio" checked={isCorrect} onChange={() => { update('correctOptionId', option.id); onValidationChange(`question-${question.id}-correct`) }} name={`correct-${question.id || 'question'}`} />
                    <span className="instructor-question-option-label">{optionLabel}</span>
                  </label>
                  {isTrueFalse ? <span className="instructor-question-fixed-option">{option.text}</span> : (
                    <label className="instructor-quiz-field instructor-question-option-text" htmlFor={`option-${question.id}-${option.id}`}>
                      <span className="sr-only">Option {optionLabel}</span>
                      <input id={`option-${question.id}-${option.id}`} value={option.text || ''} onChange={(event) => {
                        const nextOptions = options.map((item) => String(item.id) === String(option.id) ? { ...item, text: event.target.value } : item)
                        update('options', nextOptions)
                        onValidationChange(`question-${question.id}-options`)
                      }} placeholder={`Answer option ${optionLabel}`} />
                    </label>
                  )}
                  {isCorrect && <span className="instructor-question-correct-label"><Check size={14} aria-hidden="true" /> Correct answer</span>}
                  {!isTrueFalse && <button type="button" className="instructor-question-remove-option" onClick={() => removeOption(option.id)} disabled={options.length <= 2} aria-label={`Remove option ${optionLabel}`} title={options.length <= 2 ? 'At least two options are required' : `Remove option ${optionLabel}`}><Trash2 size={16} /></button>}
                </div>
              )
            })}
          </div>
          {validationErrors[`question-${question.id}-options`] && <p className="instructor-quiz-field-error" role="alert">{validationErrors[`question-${question.id}-options`]}</p>}
          {validationErrors[`question-${question.id}-correct`] && <p className="instructor-quiz-field-error" role="alert">{validationErrors[`question-${question.id}-correct`]}</p>}
          {!isTrueFalse && <button type="button" className="instructor-question-add-option" onClick={() => { update('options', [...options, makeOption()]); onValidationChange(`question-${question.id}-options`) }}><Plus size={15} /> Add option</button>}
        </fieldset>}

        <div className="instructor-question-bottom-fields">
          <label className={`instructor-quiz-field${validationErrors[`question-${question.id}-marks`] ? ' has-error' : ''}`} htmlFor={`question-marks-${question.id}`}>
            <span>Marks <b aria-hidden="true">*</b></span>
            <input id={`question-marks-${question.id}`} type="number" min="1" required aria-invalid={Boolean(validationErrors[`question-${question.id}-marks`])} aria-describedby={validationErrors[`question-${question.id}-marks`] ? `question-marks-error-${question.id}` : undefined} value={question.marks || 1} onChange={(event) => { update('marks', Number(event.target.value) || 1); onValidationChange(`question-${question.id}-marks`) }} />
            {validationErrors[`question-${question.id}-marks`] && <small id={`question-marks-error-${question.id}`} className="instructor-quiz-field-error">{validationErrors[`question-${question.id}-marks`]}</small>}
          </label>
          <label className="instructor-quiz-field" htmlFor={`question-explanation-${question.id}`}>
            <span>Explanation</span>
            <textarea id={`question-explanation-${question.id}`} value={question.explanation || ''} onChange={(event) => update('explanation', event.target.value)} rows={2} placeholder="Optional explanation shown after an attempt." />
          </label>
        </div>

        <div className="instructor-question-editor-actions">
          <button type="button" className="instructor-quiz-button is-secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
          <button type="button" className={`instructor-quiz-button is-primary${isSaved ? ' is-saved' : ''}`} onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving Question...' : isEditing ? 'Update Question' : 'Save Question'}
          </button>
        </div>
      </div>}

    </section>
  )
}

export default QuestionEditor
