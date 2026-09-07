import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar/Navbar.jsx'
import Footer from './components/layout/Footer/Footer.jsx'
import Home from './pages/Home/Home.jsx'
import CategoryDetails from './pages/CategoryDetails/CategoryDetails.jsx'
import ModelDetails from './pages/ModelDetails/ModelDetails.jsx'
import CourseDetails from './pages/CourseDetails/CourseDetails.jsx'
import About from './pages/About/About.jsx'
import CADModels from './pages/CADModels/CADModels.jsx'
import Services from './pages/Services/Services.jsx'
import ServiceDetails from './pages/ServiceDetails/ServiceDetails.jsx'
import Courses from './pages/Courses/Courses.jsx'
import Contact from './pages/Contact/Contact.jsx'
import Login from './pages/auth/Login/Login.jsx'
import Register from './pages/auth/Register/Register.jsx'
import OAuthCallback from './pages/auth/OAuthCallback/OAuthCallback.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import StudentDashboard from './pages/student/StudentDashboard/StudentDashboard.jsx'
import InstructorDashboard from './pages/instructor/InstructorDashboard/InstructorDashboard.jsx'
import MyCourses from './pages/student/MyCourses/MyCourses.jsx'

function AppLayout() {
  const location = useLocation()
  const isStudentRoute = location.pathname.startsWith('/student/')

  return (
    <>
      {!isStudentRoute && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/cad-models" element={<CADModels />} />
        <Route path="/cad-models/:category" element={<CategoryDetails />} />
        <Route path="/model/:slug" element={<ModelDetails />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:slug" element={<ServiceDetails />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:slug" element={<CourseDetails />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/my-courses" element={<ProtectedRoute allowedRoles={['student']}><MyCourses /></ProtectedRoute>} />
        <Route path="/instructor/dashboard" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isStudentRoute && <Footer />}
    </>
  )
}

function App() {
  return <AppLayout />
}

export default App
