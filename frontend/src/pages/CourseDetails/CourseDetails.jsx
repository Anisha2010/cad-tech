import { ArrowLeft, ArrowRight, BookOpen, Clock, GraduationCap } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import CourseCard from '../../components/courses/CourseCard/CourseCard.jsx'
import CourseCurriculum from '../../components/courses/CourseCurriculum/CourseCurriculum.jsx'
import CourseCheckoutButton from '../../components/payment/CourseCheckoutButton.jsx'
import courses from '../../data/courses.js'
import './CourseDetails.css'

function CourseDetails() {
  const { slug } = useParams()
  const course = courses.find((item) => item.slug === slug)
  useEffect(() => { const previousTitle = document.title; document.title = course ? `${course.title} | CadTech Solution` : 'Course Not Found | CadTech Solution'; return () => { document.title = previousTitle } }, [course])
  if (!course) return <main className="course-details page-placeholder"><h1>Course not found</h1><Link className="button button-primary" to="/courses">Browse All Courses</Link></main>
  const related = courses.filter((item) => item.id !== course.id && (item.software === course.software || item.category === course.category)).slice(0, 3)
  return <main className="course-details"><div className="site-container"><nav className="course-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><Link to="/courses">Courses</Link><span>/</span><span aria-current="page">{course.title}</span></nav><div className="course-detail-grid"><div className="course-detail-image"><div className="course-detail-grid-bg" aria-hidden="true" /><GraduationCap className="course-detail-fallback" size={72} aria-hidden="true" /><img src={course.image} alt={`${course.title} course preview`} width="720" height="540" onError={(event) => { event.currentTarget.style.display = 'none' }} /></div><div className="course-detail-copy"><span className={`course-level course-level-${course.level.toLowerCase()}`}>{course.level}</span><h1>{course.title}</h1><div className="course-detail-tags"><span>{course.software}</span><span>{course.category}</span></div><p>{course.description}</p><div className="course-detail-meta"><span><Clock size={18} /> {course.duration}</span><span><BookOpen size={18} /> {course.lessons} lessons</span></div><div className="course-detail-actions"><CourseCheckoutButton course={course} /><Link className="button button-outline" to={`/contact?course=${course.slug}`}>Ask About This Course <ArrowRight size={17} /></Link><Link className="button button-outline" to="/courses"><ArrowLeft size={17} /> Browse All Courses</Link></div></div></div><section className="course-detail-section" aria-labelledby="topics-heading"><div className="course-detail-section-heading"><span className="categories-eyebrow">COURSE TOPICS</span><h2 className="section-heading" id="topics-heading">What You Will Explore</h2></div><ul className="course-topics">{course.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul></section><section className="course-detail-section" aria-labelledby="curriculum-heading"><div className="course-detail-section-heading"><span className="categories-eyebrow">CURRICULUM</span><h2 className="section-heading" id="curriculum-heading">Course Curriculum</h2></div><CourseCurriculum curriculum={course.curriculum} /></section><section className="course-detail-section" aria-labelledby="related-heading"><div className="course-detail-section-heading"><span className="categories-eyebrow">KEEP EXPLORING</span><h2 className="section-heading" id="related-heading">Related Courses</h2></div><div className="related-courses-grid">{related.map((item) => <CourseCard key={item.id} course={item} />)}</div></section></div></main>
}

export default CourseDetails
