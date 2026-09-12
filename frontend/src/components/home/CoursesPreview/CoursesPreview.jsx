import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import './CoursesPreview.css'

function CoursesPreview() {
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
        <div className="courses-preview-grid">
          <div className="course-preview-card course-preview-card-placeholder" aria-live="polite">
            <div className="course-card-content">
              <h3>Course catalog is managed in the admin portal.</h3>
              <p>New course pricing and availability are loaded from MongoDB and appear on the public catalog automatically.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CoursesPreview
