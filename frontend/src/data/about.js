import { BookOpen, Box, GraduationCap, Layers, PenTool, Search, Settings, Target, TrendingUp, Eye } from 'lucide-react'

const missionVision = [
  { id: 1, title: 'Our Mission', description: 'Make professional CAD knowledge, organized design resources, and engineering support easier to access for learners and businesses.', icon: Target },
  { id: 2, title: 'Our Vision', description: 'Build a practical digital platform where engineering education, design resources, and project solutions work together.', icon: Eye },
]

const supportAreas = [
  { id: 1, title: 'CAD Models', description: 'Explore structured mechanical, architectural, electrical, and product design models.', icon: Box, path: '/cad-models' },
  { id: 2, title: 'Engineering Services', description: 'Find support for CAD drafting, 3D modeling, product design, and engineering documentation.', icon: Settings, path: '/services' },
  { id: 3, title: 'Professional Training', description: 'Develop practical software skills through structured CAD and engineering courses.', icon: GraduationCap, path: '/courses' },
]

const approachSteps = [
  { id: '01', title: 'Explore', description: 'Browse categories, courses, and engineering resources.', icon: Search },
  { id: '02', title: 'Learn', description: 'Build practical knowledge through structured training.', icon: BookOpen },
  { id: '03', title: 'Design', description: 'Apply your skills to CAD projects and real design challenges.', icon: PenTool },
  { id: '04', title: 'Grow', description: 'Develop stronger technical skills through consistent practice.', icon: TrendingUp },
]

const coreValues = [
  { id: 1, title: 'Practical Learning', description: 'Focus on useful design skills and hands-on understanding.', icon: GraduationCap },
  { id: 2, title: 'Accessible Resources', description: 'Keep models, learning materials, and services easy to discover.', icon: Layers },
  { id: 3, title: 'Quality Design', description: 'Present engineering information and design resources clearly.', icon: Settings },
  { id: 4, title: 'Continuous Improvement', description: 'Encourage ongoing learning and better technical workflows.', icon: TrendingUp },
]

export { missionVision, supportAreas, approachSteps, coreValues }