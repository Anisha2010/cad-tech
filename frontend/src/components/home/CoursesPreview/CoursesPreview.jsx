import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CourseCard from '../../courses/CourseCard/CourseCard.jsx'
import { fetchPublicCourses } from '../../../services/courseService.js'
import './CoursesPreview.css'

const previewLimit = 3

function CoursesPreview() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    fetchPublicCourses({ sort: 'featured', page: 1, limit: previewLimit })
      .then((result) => {
        if (!active) return
        const list = Array.isArray(result?.courses) ? result.courses : []
        setCourses(list.slice(0, previewLimit))
      })
      .catch(() => {
        if (active) setCourses([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [])

  return (
    <section className="courses-preview-section" aria-labelledby="courses-preview-heading">
      <div className="site-container">
        <div className="courses-preview-heading-row">
          <div>
            <span className="categories-eyebrow">LEARN PROFESSIONAL SKILLS</span>
            <h2 className="section-heading" id="courses-preview-heading">Professional Courses</h2>
            <p className="section-description">Build industry-ready CAD and engineering skills through practical, expert-led training.</p>
          </div>
          <Link className="view-all-link" to="/courses">View All Courses <ArrowRight size={17} /></Link>
        </div>

        {loading ? (
          <p className="dashboard-status" role="status">Loading courses...</p>
        ) : courses.length ? (
          <div className="courses-preview-grid">
            {courses.map((course) => <CourseCard key={course.id} course={course} />)}
          </div>
        ) : (
          <div className="courses-preview-grid">
            <div className="course-preview-card course-preview-card-placeholder" aria-live="polite">
              <div className="course-card-content">
                <h3>No courses published yet.</h3>
                <p>Courses added and published in the admin portal appear here automatically.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default CoursesPreview
