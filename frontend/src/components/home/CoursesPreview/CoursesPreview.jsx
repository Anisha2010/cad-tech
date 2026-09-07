import { ArrowRight, BookOpen, Clock, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import courses from '../../../data/courses.js'
import './CoursesPreview.css'

function CourseImage({ course }) {
  return (
    <div className="course-image-wrap">
      <div className="course-blueprint" aria-hidden="true" />
      <GraduationCap className="course-fallback-icon" size={60} strokeWidth={1.25} aria-hidden="true" />
      <img className="course-card-image" src={course.image} alt={`${course.title} course preview`} loading="lazy" width="640" height="480" onError={(event) => { event.currentTarget.style.display = 'none' }} />
    </div>
  )
}

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
          {courses.map((course) => (
            <Link className="course-preview-card" to={`/courses/${course.slug}`} key={course.id} aria-label={`View course: ${course.title}`}>
              <CourseImage course={course} />
              <div className="course-card-content">
                <span className={`course-level course-level-${course.level.toLowerCase()}`}>{course.level}</span>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <div className="course-meta"><span><Clock size={15} /> {course.duration}</span><span><BookOpen size={15} /> {course.lessons} lessons</span></div>
                <span className="course-action">View Course <ArrowRight size={16} /></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export default CoursesPreview
