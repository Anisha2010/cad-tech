import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import './ContinueLearning.css'

function ContinueLearning({ courses }) {
  if (!courses || courses.length === 0) {
    return (
      <section className="student-panel" aria-labelledby="continue-learning-heading">
        <div className="empty-state">
          <BookOpen size={26} />
          <h3 id="continue-learning-heading">No courses in progress</h3>
          <p>Explore available CAD courses to start learning.</p>
          <Link className="button button-primary" to="/courses">
            <BookOpen size={16} /> Browse Courses
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="student-panel" aria-labelledby="continue-learning-heading">
      <div className="panel-header">
        <h3 id="continue-learning-heading">Continue Learning</h3>
      </div>

      <div className="student-card-grid continue-grid">
        {courses.map((course) => {
          const progressPercentage = Math.min(100, Math.max(0, Number(course.progressPercentage) || 0))
          const label = `Progress for ${course.courseTitle}`

          return (
            <article key={course.courseSlug} className="student-card course-card">
              <div className="card-image-wrap">
                {course.courseImage ? (
                  <img
                    src={course.courseImage}
                    alt={course.courseTitle}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none'
                      event.currentTarget.nextSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div className={`fallback-image ${course.courseImage ? 'hidden' : ''}`} aria-hidden="true">
                  <GraduationCap size={28} />
                </div>
              </div>

              <div className="card-body">
                <div className="card-topline">
                  <span>{course.software}</span>
                  <span>{course.level}</span>
                </div>
                <h4>{course.courseTitle}</h4>
                <div className="progress-meta" aria-label={label}>
                  <span>{progressPercentage}%</span>
                  <span>{course.completedLessons || 0}/{course.totalLessons || 0} lessons</span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={progressPercentage}
                  aria-label={label}
                >
                  <span style={{ width: `${progressPercentage}%` }} />
                </div>
                <Link className="button button-outline card-button" to={`/courses/${course.courseSlug}`}>
                  Continue Course <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default ContinueLearning
