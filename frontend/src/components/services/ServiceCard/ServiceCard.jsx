import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import './ServiceCard.css'

function ServiceCard({ service }) {
  const Icon = service.icon
  return <Link className="service-card" to={`/services/${service.slug}`} aria-label={`View details for ${service.title}`}><div className="service-card-icon"><Icon size={28} aria-hidden="true" /></div><h3>{service.title}</h3><p>{service.shortDescription || service.description}</p><ul>{service.features.slice(0, 3).map((feature) => <li key={feature}>{feature}</li>)}</ul><span className="service-card-link">View Details <ArrowRight size={16} /></span></Link>
}

export default ServiceCard