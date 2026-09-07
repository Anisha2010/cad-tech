import { Box, Building2, Cuboid, PenTool, Settings, Zap } from 'lucide-react'

const services = [
  {
    id: 1,
    title: 'CAD Design Services',
    slug: 'cad-design',
    description: 'High-quality 2D drafting and 3D CAD modeling for accurate engineering documentation.',
    shortDescription: 'Professional 2D drafting and 3D CAD modeling for engineering projects.',
    icon: Settings,
    features: ['Mechanical component design.', 'Detailed technical drawings.', 'Manufacturing-ready documentation.', 'Design revisions and refinement.'],
  },
  {
    id: 2,
    title: 'Product Development',
    slug: 'product-development',
    description: 'Transform concepts into production-ready designs through professional product engineering.',
    shortDescription: 'Convert product ideas into practical design concepts and detailed CAD models.',
    icon: Box,
    features: ['Concept development.', 'Product modeling.', 'Design visualization.', 'Prototype-ready documentation.'],
  },
  {
    id: 3,
    title: 'Drafting Services',
    slug: 'drafting-services',
    description: 'Detailed technical drawings and documentation prepared to professional standards.',
    shortDescription: 'Create clear technical drawings and organized engineering documentation.',
    icon: PenTool,
    features: ['2D technical drawings.', 'Layout preparation.', 'Drawing updates.', 'Documentation support.'],
  },
  {
    id: 4,
    title: '3D Modeling',
    slug: '3d-modeling',
    description: 'Develop detailed three-dimensional models for components, assemblies, and product concepts.',
    shortDescription: 'Develop detailed three-dimensional models for components, assemblies, and product concepts.',
    icon: Cuboid,
    features: ['Part modeling.', 'Assembly modeling.', 'Product visualization.', 'CAD file preparation.'],
  },
  {
    id: 5,
    title: 'Architectural Design Support',
    slug: 'architectural-design',
    description: 'Support architectural planning through organized building layouts and technical design documentation.',
    shortDescription: 'Support architectural planning through organized building layouts and technical design documentation.',
    icon: Building2,
    features: ['Floor plan drafting.', 'Building layout modeling.', 'Architectural visualization.', 'Drawing documentation.'],
  },
  {
    id: 6,
    title: 'Electrical Design Support',
    slug: 'electrical-design',
    description: 'Prepare electrical layouts and supporting technical design documents.',
    shortDescription: 'Prepare electrical layouts and supporting technical design documents.',
    icon: Zap,
    features: ['Panel layout planning.', 'Wiring diagram documentation.', 'Electrical drawing organization.', 'Design revisions.'],
  },
]

export default services
