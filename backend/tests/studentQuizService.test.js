import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { QuizAttempt } from '../src/models/QuizAttempt.js'
import { buildAttemptSummary, computeAttemptGrade, isAnswerReviewAllowed } from '../src/services/studentQuizService.js'

test('grades only from the server question snapshot', () => {
  const correctId = new mongoose.Types.ObjectId()
  const incorrectId = new mongoose.Types.ObjectId()
  const firstQuestionId = new mongoose.Types.ObjectId()
  const secondQuestionId = new mongoose.Types.ObjectId()
  const thirdQuestionId = new mongoose.Types.ObjectId()
  const grade = computeAttemptGrade({
    quiz: { totalMarks: 999, passingPercentage: 50 },
    snapshotQuestions: [
      { questionId: firstQuestionId, correctOptionId: correctId, marks: 2 },
      { questionId: secondQuestionId, correctOptionId: correctId, marks: 3 },
      { questionId: thirdQuestionId, correctOptionId: correctId, marks: 5 }
    ],
    answersMap: new Map([
      [String(firstQuestionId), { selectedOptionId: correctId }],
      [String(secondQuestionId), { selectedOptionId: incorrectId }]
    ])
  })

  assert.equal(grade.totalMarks, 10)
  assert.equal(grade.earnedMarks, 2)
  assert.equal(grade.percentage, 20)
  assert.equal(grade.passed, false)
})

test('grades short answers case-insensitively after normalizing surrounding and repeated whitespace', () => {
  const questionId = new mongoose.Types.ObjectId()
  const grade = computeAttemptGrade({
    quiz: { passingPercentage: 100 },
    snapshotQuestions: [{ questionId, type: 'short_answer', correctAnswer: 'sheet metal forming', marks: 4 }],
    answersMap: new Map([[String(questionId), { textAnswer: '  SHEET   METAL FORMING ' }]])
  })

  assert.equal(grade.earnedMarks, 4)
  assert.equal(grade.totalMarks, 4)
  assert.equal(grade.passed, true)
})

test('active attempt DTO excludes answer keys and explanations', () => {
  const questionId = new mongoose.Types.ObjectId()
  const correctOptionId = new mongoose.Types.ObjectId()
  const wrongOptionId = new mongoose.Types.ObjectId()
  const dto = buildAttemptSummary({
    _id: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    quizId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    attemptNumber: 1,
    status: 'in_progress',
    questionSnapshot: [{
      questionId,
      type: 'multiple_choice',
      prompt: 'Question',
      options: [{ optionId: correctOptionId, text: 'A' }, { optionId: wrongOptionId, text: 'B' }],
      correctOptionId,
      explanation: 'Private explanation',
      marks: 2,
      order: 0
    }],
    answers: []
  }, { title: 'Quiz', maximumAttempts: 2, totalMarks: 2 })

  assert.equal('correctOptionId' in dto.questions[0], false)
  assert.equal('explanation' in dto.questions[0], false)
  assert.equal(dto.questions[0].options[0].text, 'A')
})

test('active short-answer attempt does not expose the expected answer', () => {
  const questionId = new mongoose.Types.ObjectId()
  const dto = buildAttemptSummary({
    _id: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    quizId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    attemptNumber: 1,
    status: 'in_progress',
    questionSnapshot: [{ questionId, type: 'short_answer', prompt: 'Name the process.', options: [], correctAnswer: 'extrusion', marks: 2, order: 0 }],
    answers: []
  }, { title: 'Quiz', maximumAttempts: 1, totalMarks: 2 })

  assert.equal(dto.questions[0].type, 'short_answer')
  assert.equal('correctAnswer' in dto.questions[0], false)
})

test('answer review waits for a pass or exhaustion of attempts', () => {
  assert.equal(isAnswerReviewAllowed({ passed: false, usedAttempts: 1, maximumAttempts: 3 }), false)
  assert.equal(isAnswerReviewAllowed({ passed: true, usedAttempts: 1, maximumAttempts: 3 }), true)
  assert.equal(isAnswerReviewAllowed({ passed: false, usedAttempts: 3, maximumAttempts: 3 }), true)
})

test('attempt number index prevents duplicate numbers per student and quiz', () => {
  const index = QuizAttempt.schema.indexes().find(([fields, options]) =>
    fields.studentId === 1 && fields.quizId === 1 && fields.attemptNumber === 1 && options.unique
  )
  assert.ok(index)
})