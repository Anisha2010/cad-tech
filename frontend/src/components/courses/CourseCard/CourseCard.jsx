import { ArrowRight, BookOpen, Clock, GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'
import './CourseCard.css'

const formatPrice = (paise) => `₹${(Number(paise) / 100).toFixed(2)}`

function CourseCard({ course }) {
  const image = course.thumbnailUrl || course.image || ''
  const durationLabel = course.duration || 'Self-paced'
  const lessonCount = Number(course.lessonCount ?? 0)
  const level = course.level || 'Course'
  const salePrice = Number.isInteger(course.priceInPaise) && course.priceInPaise > 0 ? course.priceInPaise : null
  const originalPrice = Number.isInteger(course.originalPriceInPaise) && course.originalPriceInPaise > (salePrice ?? 0)
    ? course.originalPriceInPaise
    : null

  return (
    <Link className="catalog-course-card" to={`/courses/${course.slug}`} aria-label={`View course: ${course.title}`}>
      <div className="catalog-course-image">
        <div className="course-catalog-grid" aria-hidden="true" />
        <GraduationCap className="course-catalog-fallback" size={60} aria-hidden="true" />
        <img src={image} alt={`${course.title} course preview`} loading="lazy" width="640" height="480" onError={(event) => { event.currentTarget.style.display = 'none' }} />
        <span className={`catalog-course-level level-${String(level).toLowerCase()}`}>{level}</span>
      </div>
      <div className="catalog-course-content">
        <span className="catalog-course-software">{course.software}</span>
        <h3>{course.title}</h3>
        <p>{course.shortDescription || course.description}</p>
        <div className="catalog-course-category">{course.category}</div>
        <div className="catalog-course-meta">
          <span><Clock size={15} /> {durationLabel}</span>
          <span><BookOpen size={15} /> {lessonCount} lessons</span>
        </div>
        {salePrice !== null && (
          <div className="catalog-course-price">
            {originalPrice !== null && <span className="catalog-course-price-original">{formatPrice(originalPrice)}</span>}
            <span className="catalog-course-price-sale">{formatPrice(salePrice)}</span>
          </div>
        )}
        <span className="catalog-course-action">View Course <ArrowRight size={16} /></span>
      </div>
    </Link>
  )
}

export default CourseCard
