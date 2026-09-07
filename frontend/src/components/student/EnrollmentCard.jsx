import { Link } from 'react-router-dom'
import './EnrollmentCard.css'

function EnrollmentCard({ enrollment }) {
  return <article className="enrollment-card"><div className="enrollment-image"><img src={enrollment.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} /><span aria-hidden="true">CAD</span></div><div className="enrollment-card-body"><h2>{enrollment.courseTitle}</h2><p>{enrollment.software} · {enrollment.level}</p><p>Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}</p><label htmlFor={`progress-${enrollment.id}`}>Progress: {enrollment.progressPercentage}%</label><progress id={`progress-${enrollment.id}`} max="100" value={enrollment.progressPercentage}>{enrollment.progressPercentage}%</progress><Link className="button button-outline" to={`/courses/${enrollment.courseSlug}`}>Open Course</Link></div></article>
}

export default EnrollmentCard