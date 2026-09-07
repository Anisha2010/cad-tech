import { CheckCircle2, ClipboardCheck, MessageSquare, PenTool } from 'lucide-react'
import './ServiceProcess.css'

const steps = [
  { id: '01', title: 'Share Requirements', description: 'Explain your project, design goals, and available reference material.', icon: MessageSquare },
  { id: '02', title: 'Review the Project', description: 'Discuss the expected scope and suitable design approach.', icon: ClipboardCheck },
  { id: '03', title: 'Develop the Design', description: 'Prepare the required drawings, models, or supporting documentation.', icon: PenTool },
  { id: '04', title: 'Review and Refine', description: 'Evaluate the work and discuss relevant revisions.', icon: CheckCircle2 },
]

function ServiceProcess() { return <section className="service-process" aria-labelledby="service-process-heading"><div className="service-section-heading centered-heading"><span className="categories-eyebrow">WORK PROCESS</span><h2 className="section-heading" id="service-process-heading">How We Approach Your Project</h2></div><div className="service-process-grid">{steps.map(({ id, title, description, icon: Icon }) => <div className="service-process-step" key={id}><span>{id}</span><div className="service-process-icon"><Icon size={22} /></div><h3>{title}</h3><p>{description}</p></div>)}</div></section> }

export default ServiceProcess