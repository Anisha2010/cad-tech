import { ArrowRight, BookOpen, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import './EnrolledCourses.css'

function EnrolledCourses({ courses }) {
  if (!courses || courses.length === 0) {
    return (
      <section className="student-panel" aria-labelledby="enrolled-courses-heading">
        <div className="empty-state">
          <BookOpen size={26} />
          <h3 id="enrolled-courses-heading">No enrolled courses yet</h3>
          <p>Courses you enroll in will appear here.</p>
          <Link className="button button-primary" to="/courses">
            <BookOpen size={16} /> Explore Courses
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="student-panel" aria-labelledby="enrolled-courses-heading">
      <div className="panel-header">
        <h3 id="enrolled-courses-heading">My Courses</h3>
      </div>

      <div className="student-card-grid">
        {courses.slice(0, 3).map((course) => (
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
              <div className="progress-meta">
                <span>{course.progressPercentage || 0}%</span>
                <span>{course.completedLessons || 0} lessons</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={course.progressPercentage || 0}
                aria-label={`Progress for ${course.courseTitle}`}
              >
                <span style={{ width: `${course.progressPercentage || 0}%` }} />
              </div>
              <Link className="button button-outline card-button" to={`/courses/${course.courseSlug}`}>
                View Course <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default EnrolledCourses
