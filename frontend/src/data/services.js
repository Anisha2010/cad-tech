import { Cuboid, Factory, Layers3, Printer, ScanLine } from 'lucide-react'

const services = [
  {
    id: 7,
    title: '3D Printing',
    slug: '3d-printing',
    description: 'We support rapid prototyping and product development by helping turn digital 3D models into physical parts. Our solutions can help evaluate product form, fit, and design concepts before production.',
    shortDescription: 'Rapid prototyping that turns digital 3D models into physical parts.',
    icon: Printer,
    thumbnail: '/images/service/3D%20Printing.jpg',
    features: ['Rapid prototyping.', 'Form and fit evaluation.', 'Design concept validation.', 'Pre-production parts.'],
  },
  {
    id: 8,
    title: '3D Product Design',
    slug: '3d-product-design',
    description: 'We develop detailed 3D CAD models and engineering designs for mechanical components, assemblies, and new product concepts. Our design approach focuses on functionality, accuracy, and manufacturing considerations.',
    shortDescription: 'Detailed 3D CAD models and engineering designs for components, assemblies, and new products.',
    icon: Cuboid,
    thumbnail: '/images/service/3D%20Product%20Design.jpg',
    features: ['Mechanical component design.', 'Assembly modeling.', 'New product concepts.', 'Manufacturing-ready design.'],
  },
  {
    id: 9,
    title: '3D Scanning',
    slug: '3d-scanning',
    description: "3D scanning can help capture the geometry of physical objects for digital documentation, inspection, and reverse engineering. The appropriate scanning method depends on the object's size, surface, and required accuracy.",
    shortDescription: 'Capture physical object geometry for documentation, inspection, and reverse engineering.',
    icon: ScanLine,
    thumbnail: '/images/service/3D%20Scan%201.jpg',
    features: ['Digital documentation.', 'Inspection support.', 'Reverse engineering.', 'Geometry capture.'],
  },
  {
    id: 10,
    title: 'CNC Machinery Supply',
    slug: 'cnc-machinery-supply',
    description: 'We help customers explore CNC machinery options suited to their machining requirements, production needs, and applications. Equipment specifications and availability should be confirmed for each project.',
    shortDescription: 'Explore CNC machinery options matched to your machining and production needs.',
    icon: Factory,
    thumbnail: '/images/service/CNC%20Machine.jpg',
    features: ['Machining requirement matching.', 'Production needs assessment.', 'Application guidance.', 'Specification confirmation.'],
  },
  {
    id: 11,
    title: 'Product Fabrication',
    slug: 'product-fabrication',
    description: 'We support product realization by helping translate engineering designs into fabrication requirements. Project scope, materials, tolerances, and manufacturing arrangements are confirmed according to customer needs.',
    shortDescription: 'Translate engineering designs into clear, production-ready fabrication requirements.',
    icon: Layers3,
    thumbnail: '/images/service/fabriction.jpg',
    features: ['Design-to-fabrication translation.', 'Material and tolerance confirmation.', 'Project scope definition.', 'Manufacturing arrangements.'],
  },
]

export default services
