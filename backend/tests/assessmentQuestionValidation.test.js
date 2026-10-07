import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { normalizeQuizQuestion } from '../src/services/assessmentReviewService.js'
import { createQuestion } from '../src/services/quizService.js'
import { errorHandlerMiddleware } from '../src/middleware/errorHandler.js'
import { AppError } from '../src/utils/AppError.js'
import { serializeQuizPublic } from '../src/models/Quiz.js'

const option = (text) => ({ id: new mongoose.Types.ObjectId().toString(), text })

test('normalizes valid MCQ with one option-backed correct answer', () => {
  const first = option('First')
  const second = option('Second')
  const question = normalizeQuizQuestion({
    type: 'multiple_choice',
    prompt: '  Pick one  ',
    options: [first, second],
    correctOptionId: first.id,
    marks: '2',
    order: 0
  }, 0)

  assert.equal(question.prompt, 'Pick one')
  assert.equal(question.options.length, 2)
  assert.equal(String(question.correctOptionId), first.id)
  assert.equal(question.marks, 2)
})

test('rejects MCQ with empty options and an invalid correct option', () => {
  assert.throws(() => normalizeQuizQuestion({
    type: 'multiple_choice',
    prompt: 'Choose one',
    options: [option(''), option('Second')],
    correctOptionId: new mongoose.Types.ObjectId().toString(),
    marks: 1,
    order: 0
  }, 0), (error) => {
    assert.equal(error.statusCode, 422)
    assert.equal(error.message, 'Question 1 validation failed.')
    assert.match(error.errors.options, /cannot be empty/i)
    assert.match(error.errors.correctOptionId, /match one/i)
    return true
  })
})

test('preserves True/False option identifiers and requires the selected ID to belong', () => {
  const trueOption = option('True')
  const falseOption = option('False')
  const question = normalizeQuizQuestion({
    type: 'true_false',
    prompt: 'The statement is true.',
    options: [trueOption, falseOption],
    correctOptionId: falseOption.id,
    marks: 1,
    order: 0
  }, 0)

  assert.deepEqual(question.options.map((item) => String(item._id)), [trueOption.id, falseOption.id])
  assert.equal(String(question.correctOptionId), falseOption.id)

  assert.throws(() => normalizeQuizQuestion({
    type: 'true_false',
    prompt: 'The statement is true.',
    options: [trueOption, falseOption],
    correctOptionId: new mongoose.Types.ObjectId().toString(),
    marks: 1,
    order: 0
  }, 0), (error) => error.errors.correctOptionId === 'Correct answer must match True or False.')
})

test('accepts short answer without MCQ options and rejects a blank answer key', () => {
  const question = normalizeQuizQuestion({
    type: 'short_answer',
    prompt: 'Name the process.',
    options: [],
    correctAnswer: '  extrusion  ',
    marks: 3,
    order: 0
  }, 0)

  assert.deepEqual(question.options, [])
  assert.equal(question.correctAnswer, 'extrusion')

  assert.throws(() => normalizeQuizQuestion({
    type: 'short_answer',
    prompt: 'Name the process.',
    options: [],
    correctAnswer: '   ',
    marks: 3,
    order: 0
  }, 0), (error) => error.errors.correctAnswer === 'Enter the expected short answer.')
})

test('public quiz serialization never returns a short-answer key', () => {
  const quiz = serializeQuizPublic({
    _id: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    questions: [{
      _id: new mongoose.Types.ObjectId(),
      type: 'short_answer',
      prompt: 'Name the process.',
      options: [],
      correctAnswer: 'extrusion',
      marks: 1,
      order: 0
    }]
  })

  assert.equal(quiz.questions[0].correctAnswer, null)
})

test('rejects whitespace-only prompt and non-positive marks with field details', () => {
  assert.throws(() => normalizeQuizQuestion({
    type: 'short_answer',
    prompt: '  ',
    correctAnswer: 'valid answer',
    marks: 0,
    order: 0
  }, 0), (error) => {
    assert.equal(error.errors.prompt, 'Question text cannot be empty.')
    assert.equal(error.errors.marks, 'Marks must be a positive whole number.')
    return true
  })
})

test('returns structured field errors from the shared error middleware', () => {
  const response = {
    statusCode: null,
    payload: null,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return this }
  }
  errorHandlerMiddleware(new AppError('Question validation failed', 422, { options: 'Add at least two options.' }), {}, response, () => { })

  assert.equal(response.statusCode, 422)
  assert.deepEqual(response.payload, {
    success: false,
    message: 'Question validation failed',
    errors: { options: 'Add at least two options.' }
  })
})

test('rejects malformed course and quiz IDs before database access', async () => {
  await assert.rejects(
    createQuestion({ courseId: new mongoose.Types.ObjectId().toString(), instructorId: new mongoose.Types.ObjectId().toString(), quizId: 'not-an-id', payload: {} }),
    (error) => error.statusCode === 400 && /Invalid course or quiz reference/.test(error.message)
  )
})