const curriculum = [
  { title: 'Getting Started', lessons: ['Introduction to the software.', 'Understanding the workspace.'] },
  { title: 'Core Design Tools', lessons: ['Basic commands.', 'Practical drawing exercises.'] },
  { title: 'Project Practice', lessons: ['Applying the learned concepts.', 'Reviewing the completed design.'] },
]

const courseTopics = {
  autocad: ['AutoCAD interface.', 'Basic drawing commands.', 'Layers and dimensions.', 'Technical drawing fundamentals.'],
  solidworksPart: ['Sketch creation.', 'Part modeling.', 'Design features.', 'Mechanical components.'],
  revitArchitecture: ['Building information modeling.', 'Architectural layouts.', 'Walls and structural elements.', 'Project documentation.'],
  autocadElectrical: ['Electrical drawing basics.', 'Wiring diagrams.', 'Electrical symbols.', 'Panel documentation.'],
  solidworksAssembly: ['Assembly creation.', 'Component relationships.', 'Mechanical movement.', 'Assembly documentation.'],
  product: ['Design thinking.', 'Product sketching.', 'Basic 3D modeling.', 'Prototype preparation.'],
  revitInterior: ['Interior planning.', 'Room layouts.', 'Furniture placement.', 'Presentation drawings.'],
  mechanicalDrawing: ['Engineering drawing basics.', 'Dimensions and annotations.', 'Orthographic views.', 'Mechanical component drawings.'],
}

const courses = [
  { id: 1, title: 'AutoCAD Essential Training', slug: 'autocad-essential-training', software: 'AutoCAD', category: '2D Drafting', description: 'Learn AutoCAD fundamentals, 2D drafting, technical drawing, and essential design tools.', level: 'Beginner', duration: '6 hours', durationMinutes: 360, lessons: 12, image: '/images/courses/autocad-essential-training.webp', featured: true, topics: courseTopics.autocad, curriculum },
  { id: 2, title: 'SolidWorks Part Modeling', slug: 'solidworks-part-modeling', software: 'SolidWorks', category: 'Mechanical Design', description: 'Create professional mechanical parts, assemblies, and 3D models using SolidWorks.', level: 'Intermediate', duration: '8 hours', durationMinutes: 480, lessons: 18, image: '/images/courses/solidworks-part-modeling.webp', featured: true, topics: courseTopics.solidworksPart, curriculum },
  { id: 3, title: 'Revit Architecture Mastery', slug: 'revit-architecture-mastery', software: 'Revit', category: 'Architecture', description: 'Design architectural structures and building information models with Autodesk Revit.', level: 'Advanced', duration: '10 hours', durationMinutes: 600, lessons: 20, image: '/images/courses/revit-architecture-mastery.webp', featured: true, topics: courseTopics.revitArchitecture, curriculum },
  { id: 4, title: 'AutoCAD Electrical Fundamentals', slug: 'autocad-electrical-fundamentals', software: 'AutoCAD Electrical', category: 'Electrical Design', description: 'Build a foundation in electrical drawings, wiring layouts, and panel documentation.', level: 'Beginner', duration: '5 hours', durationMinutes: 300, lessons: 10, image: '/images/courses/autocad-electrical-fundamentals.webp', featured: false, topics: courseTopics.autocadElectrical, curriculum },
  { id: 5, title: 'SolidWorks Assembly Design', slug: 'solidworks-assembly-design', software: 'SolidWorks', category: 'Mechanical Design', description: 'Develop assemblies, component relationships, and mechanical movement in SolidWorks.', level: 'Intermediate', duration: '7 hours', durationMinutes: 420, lessons: 15, image: '/images/courses/solidworks-assembly-design.webp', featured: false, topics: courseTopics.solidworksAssembly, curriculum },
  { id: 6, title: 'Product Design Fundamentals', slug: 'product-design-fundamentals', software: 'General CAD', category: 'Product Design', description: 'Learn design thinking, product sketching, 3D modeling, and prototype preparation.', level: 'Beginner', duration: '4 hours', durationMinutes: 240, lessons: 9, image: '/images/courses/product-design-fundamentals.webp', featured: false, topics: courseTopics.product, curriculum },
  { id: 7, title: 'Revit Interior Layouts', slug: 'revit-interior-layouts', software: 'Revit', category: 'Architecture', description: 'Plan interior spaces, rooms, furniture placement, and presentation drawings in Revit.', level: 'Intermediate', duration: '6 hours', durationMinutes: 360, lessons: 13, image: '/images/courses/revit-interior-layouts.webp', featured: false, topics: courseTopics.revitInterior, curriculum },
  { id: 8, title: 'Mechanical Drawing Essentials', slug: 'mechanical-drawing-essentials', software: 'AutoCAD', category: 'Mechanical Design', description: 'Practice engineering drawings, annotations, orthographic views, and component documentation.', level: 'Beginner', duration: '5 hours', durationMinutes: 300, lessons: 11, image: '/images/courses/mechanical-drawing-essentials.webp', featured: false, topics: courseTopics.mechanicalDrawing, curriculum },
]

export default courses
