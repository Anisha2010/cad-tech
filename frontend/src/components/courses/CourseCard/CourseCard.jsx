import { ArrowRight, BookOpen, Clock, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import './CourseCard.css'

function CourseCard({ course }) {
  return <Link className="catalog-course-card" to={`/courses/${course.slug}`} aria-label={`View course: ${course.title}`}><div className="catalog-course-image"><div className="course-catalog-grid" aria-hidden="true" /><GraduationCap className="course-catalog-fallback" size={60} aria-hidden="true" /><img src={course.image} alt={`${course.title} course preview`} loading="lazy" width="640" height="480" onError={(event) => { event.currentTarget.style.display = 'none' }} /><span className={`catalog-course-level level-${course.level.toLowerCase()}`}>{course.level}</span></div><div className="catalog-course-content"><span className="catalog-course-software">{course.software}</span><h3>{course.title}</h3><p>{course.description}</p><div className="catalog-course-category">{course.category}</div><div className="catalog-course-meta"><span><Clock size={15} /> {course.duration}</span><span><BookOpen size={15} /> {course.lessons} lessons</span></div><span className="catalog-course-action">View Course <ArrowRight size={16} /></span></div></Link>
}

export default CourseCard