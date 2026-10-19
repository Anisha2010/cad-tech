export const requireCourseSlug = (courseSlug) => {
  if (typeof courseSlug !== 'string' || !courseSlug.trim() || courseSlug.trim().toLowerCase() === 'undefined') {
    throw new Error('A valid course slug is required.')
  }
  return courseSlug.trim()
}
