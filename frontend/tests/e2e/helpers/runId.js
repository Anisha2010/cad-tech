import { randomUUID } from 'node:crypto'

export function createRunId(testInfo) {
  return [
    'E2E',
    Date.now(),
    testInfo?.workerIndex ?? 0,
    randomUUID().slice(0, 8),
  ].join('-')
}