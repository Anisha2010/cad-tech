import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import './CourseCurriculum.css'

function CourseCurriculum({ curriculum }) {
  const [openIndex, setOpenIndex] = useState(0)
  return <div className="course-curriculum">{curriculum.map((module, index) => { const isOpen = openIndex === index; const buttonId = `curriculum-module-${index}`; const panelId = `curriculum-panel-${index}`; return <div className={`curriculum-module ${isOpen ? 'is-open' : ''}`} key={module.title}><h3><button type="button" id={buttonId} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenIndex(isOpen ? -1 : index)}><span>{module.title}</span><ChevronDown size={19} aria-hidden="true" /></button></h3><div className="curriculum-panel" id={panelId} role="region" aria-labelledby={buttonId} aria-hidden={!isOpen}><ul>{module.lessons.map((lesson) => <li key={lesson}>{lesson}</li>)}</ul></div></div> })}</div>
}

export default CourseCurriculum