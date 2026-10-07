import { ArrowLeft, ArrowRight, BookOpen, Clock, GraduationCap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CourseCard from '../../components/courses/CourseCard/CourseCard.jsx'
import CourseCurriculum from '../../components/courses/CourseCurriculum/CourseCurriculum.jsx'
import CourseCheckoutButton from '../../components/payment/CourseCheckoutButton.jsx'
import { fetchCourseBySlug, fetchPublicCourses } from '../../services/courseService.js'
import './CourseDetails.css'

function CourseDetails() {
  const { slug } = useParams()
  const [course, setCourse] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    fetchCourseBySlug(slug)
      .then((result) => {
        if (!active) return
        const nextCourse = result.course ?? null
        setCourse(nextCourse)

        if (nextCourse) {
          fetchPublicCourses({ page: 1, limit: 6 })
            .then((catalog) => {
              if (!active) return
              const list = catalog.courses ?? []
              const relatedList = list
                .filter((item) => item.id !== nextCourse.id && (item.software === nextCourse.software || item.category === nextCourse.category))
                .slice(0, 3)
              setRelated(relatedList)
            })
            .catch(() => setRelated([]))
        }
      })
      .catch(() => {
        if (active) setCourse(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [slug])

  useEffect(() => {
    const previousTitle = document.title
    document.title = course ? `${course.title} | CadTech Solution` : 'Course Not Found | CadTech Solution'
    return () => { document.title = previousTitle }
  }, [course])

  if (loading) return <main className="course-details page-placeholder"><h1>Loading course...</h1></main>
  if (!course) return <main className="course-details page-placeholder"><h1>Course not found</h1><Link className="button button-primary" to="/courses">Browse All Courses</Link></main>

  const curriculum = Array.isArray(course.curriculum) ? course.curriculum : []
  const image = course.thumbnailUrl || course.image || ''

  return (
    <main className="course-details">
      <div className="site-container">
        <nav className="course-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/courses">Courses</Link>
          <span>/</span>
          <span aria-current="page">{course.title}</span>
        </nav>

        <div className="course-detail-grid">
          <div className="course-detail-image">
            <div className="course-detail-grid-bg" aria-hidden="true" />
            <GraduationCap className="course-detail-fallback" size={72} aria-hidden="true" />
            <img src={image} alt={`${course.title} course preview`} width="720" height="540" onError={(event) => { event.currentTarget.style.display = 'none' }} />
          </div>

          <div className="course-detail-copy">
            <span className={`course-level course-level-${course.level.toLowerCase()}`}>{course.level}</span>
            <h1>{course.title}</h1>
            <div className="course-detail-tags">
              <span>{course.software}</span>
              <span>{course.category}</span>
            </div>
            <p>{course.shortDescription || course.description}</p>
            <div className="course-detail-meta">
              <span><Clock size={18} /> {course.duration || 'Self-paced'}</span>
              <span><BookOpen size={18} /> {Number(course.lessonCount ?? 0)} lessons</span>
            </div>
            <div className="course-detail-actions">
              <CourseCheckoutButton key={course.slug} course={course} courseSlug={course.slug} />
              <Link className="button button-outline" to={`/contact?course=${course.slug}`}>Ask About This Course <ArrowRight size={17} /></Link>
              <Link className="button button-outline" to="/courses"><ArrowLeft size={17} /> Browse All Courses</Link>
            </div>
          </div>
        </div>

        {course.description && (
          <section className="course-detail-section" aria-labelledby="overview-heading">
            <div className="course-detail-section-heading">
              <span className="categories-eyebrow">OVERVIEW</span>
              <h2 className="section-heading" id="overview-heading">About This Course</h2>
            </div>
            <p>{course.description}</p>
          </section>
        )}

        {curriculum.length > 0 && (
          <section className="course-detail-section" aria-labelledby="curriculum-heading">
            <div className="course-detail-section-heading">
              <span className="categories-eyebrow">CURRICULUM</span>
              <h2 className="section-heading" id="curriculum-heading">Course Curriculum</h2>
            </div>
            <CourseCurriculum curriculum={curriculum} />
          </section>
        )}

        {related.length > 0 && (
          <section className="course-detail-section" aria-labelledby="related-heading">
            <div className="course-detail-section-heading">
              <span className="categories-eyebrow">RELATED COURSES</span>
              <h2 className="section-heading" id="related-heading">Continue Learning</h2>
            </div>
            <div className="related-course-grid">
              {related.map((item) => <CourseCard key={item.id} course={item} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

export default CourseDetails
