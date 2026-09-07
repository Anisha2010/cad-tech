const courses = [
  { slug: 'autocad-essential-training', title: 'AutoCAD Essential Training', software: 'AutoCAD', level: 'Beginner', duration: '6 hours', lessons: 12, image: '/images/courses/autocad-essential-training.webp', priceInPaise: null, currency: 'INR', enrollmentOpen: false },
  { slug: 'solidworks-part-modeling', title: 'SolidWorks Part Modeling', software: 'SolidWorks', level: 'Intermediate', duration: '8 hours', lessons: 18, image: '/images/courses/solidworks-part-modeling.webp', priceInPaise: null, currency: 'INR', enrollmentOpen: false },
  { slug: 'revit-architecture-mastery', title: 'Revit Architecture Mastery', software: 'Revit', level: 'Advanced', duration: '10 hours', lessons: 20, image: '/images/courses/revit-architecture-mastery.webp', priceInPaise: null, currency: 'INR', enrollmentOpen: false },
  { slug: 'autocad-electrical-fundamentals', title: 'AutoCAD Electrical Fundamentals', software: 'AutoCAD Electrical', level: 'Beginner', duration: '5 hours', lessons: 10, image: '/images/courses/autocad-electrical-fundamentals.webp', priceInPaise: null, currency: 'INR', enrollmentOpen: false },
  { slug: 'solidworks-assembly-design', title: 'SolidWorks Assembly Design', software: 'SolidWorks', level: 'Intermediate', duration: '7 hours', lessons: 15, image: '/images/courses/solidworks-assembly-design.webp', priceInPaise: null, currency: 'INR', enrollmentOpen: false },
  { slug: 'product-design-fundamentals', title: 'Product Design Fundamentals', software: 'General CAD', level: 'Beginner', duration: '4 hours', lessons: 9, image: '/images/courses/product-design-fundamentals.webp', priceInPaise: null, currency: 'INR', enrollmentOpen: false },
  { slug: 'revit-interior-layouts', title: 'Revit Interior Layouts', software: 'Revit', level: 'Intermediate', duration: '6 hours', lessons: 13, image: '/images/courses/revit-interior-layouts.webp', priceInPaise: null, currency: 'INR', enrollmentOpen: false },
  { slug: 'mechanical-drawing-essentials', title: 'Mechanical Drawing Essentials', software: 'AutoCAD', level: 'Beginner', duration: '5 hours', lessons: 11, image: '/images/courses/mechanical-drawing-essentials.webp', priceInPaise: null, currency: 'INR', enrollmentOpen: false },
]

export const getCourseBySlug = (slug) => courses.find((course) => course.slug === slug) || null

export default courses