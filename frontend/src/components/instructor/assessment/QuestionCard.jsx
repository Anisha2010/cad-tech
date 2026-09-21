function QuestionCard({ question, index }) {
  return (
    <article className="assessment-question-card">
      <div className="assessment-question-meta">
        <span>Question {index + 1}</span>
        <span>{question.type === 'true_false' ? 'True / False' : 'Multiple choice'}</span>
      </div>
      <strong>{question.prompt || 'Untitled question'}</strong>
      <ul>
        {(question.options || []).map((option) => <li key={option.id}>{option.text || 'Empty option'}</li>)}
      </ul>
      <small>{question.marks || 0} marks</small>
    </article>
  )
}

export default QuestionCard
