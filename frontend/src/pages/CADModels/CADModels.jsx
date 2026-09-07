import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import ModelsCatalog from '../../components/models/ModelsCatalog/ModelsCatalog.jsx'
import './CADModels.css'

function CADModels() {
  useEffect(() => { const previousTitle = document.title; document.title = 'CAD Models | CadTech Solution'; return () => { document.title = previousTitle } }, [])
  return <main className="cad-models-page"><div className="site-container"><div className="catalog-page-heading"><nav className="catalog-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span>/</span><span aria-current="page">CAD Models</span></nav><span className="categories-eyebrow">EXPLORE PROFESSIONAL DESIGNS</span><h1>Browse CAD Models</h1><p>Discover organized CAD models for mechanical engineering, architecture, electrical design, and product development.</p></div><ModelsCatalog /></div></main>
}

export default CADModels