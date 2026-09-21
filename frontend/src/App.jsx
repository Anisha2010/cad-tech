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
import InstructorLayout from './layouts/InstructorLayout/InstructorLayout.jsx'
import InstructorDashboard from './pages/instructor/InstructorDashboard/InstructorDashboard.jsx'
import InstructorCourses from './pages/instructor/InstructorCourses.jsx'
import InstructorCourseForm from './pages/instructor/InstructorCourseForm.jsx'
import InstructorCurriculumBuilder from './pages/instructor/InstructorCurriculumBuilder.jsx'
import InstructorAssessments from './pages/instructor/InstructorAssessments/InstructorAssessments.jsx'
import QuizBuilder from './pages/instructor/QuizBuilder/QuizBuilder.jsx'
import AssignmentBuilder from './pages/instructor/AssignmentBuilder/AssignmentBuilder.jsx'
import MyCourses from './pages/student/MyCourses/MyCourses.jsx'
import LearningPlayer from './pages/student/LearningPlayer/LearningPlayer.jsx'
import QuizAttempt from './pages/student/QuizAttempt/QuizAttempt.jsx'
import QuizResult from './pages/student/QuizResult/QuizResult.jsx'
import QuizHistory from './pages/student/QuizHistory/QuizHistory.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminCourses from './pages/admin/AdminCourses.jsx'
import AdminCourseForm from './pages/admin/AdminCourseForm.jsx'
import AdminCurriculumBuilder from './pages/admin/AdminCurriculumBuilder.jsx'
import AdminAssessments from './pages/admin/AdminAssessments/AdminAssessments.jsx'
import AdminQuizReview from './pages/admin/AdminQuizReview/AdminQuizReview.jsx'
import AdminAssignmentReview from './pages/admin/AdminAssignmentReview/AdminAssignmentReview.jsx'
import AdminLayout from './layouts/AdminLayout/AdminLayout.jsx'
import ComingSoon from './pages/admin/ComingSoon/ComingSoon.jsx'

function AppLayout() {
  const location = useLocation()
  const isStudentRoute = location.pathname.startsWith('/student/')
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isInstructorRoute = location.pathname.startsWith('/instructor')

  return (
    <>
      {!isStudentRoute && !isAdminRoute && !isInstructorRoute && <Navbar />}
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
        <Route path="/student/learn/:courseSlug" element={<ProtectedRoute allowedRoles={['student']}><LearningPlayer /></ProtectedRoute>} />
        <Route path="/student/quizzes/:quizId/attempt/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><QuizAttempt /></ProtectedRoute>} />
        <Route path="/student/quizzes/:quizId/results/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><QuizResult /></ProtectedRoute>} />
        <Route path="/student/quiz-history" element={<ProtectedRoute allowedRoles={['student']}><QuizHistory /></ProtectedRoute>} />
        <Route path="/instructor" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<InstructorDashboard />} />
          <Route path="courses" element={<InstructorCourses />} />
          <Route path="courses/:courseId/edit" element={<InstructorCourseForm />} />
          <Route path="courses/:courseId/curriculum" element={<InstructorCurriculumBuilder />} />
          <Route path="courses/:courseId/assessments" element={<InstructorAssessments />} />
          <Route path="courses/:courseId/quizzes/new" element={<QuizBuilder />} />
          <Route path="courses/:courseId/quizzes/:quizId/edit" element={<QuizBuilder />} />
          <Route path="courses/:courseId/assignments/new" element={<AssignmentBuilder />} />
          <Route path="courses/:courseId/assignments/:assignmentId/edit" element={<AssignmentBuilder />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="courses/new" element={<AdminCourseForm />} />
          <Route path="courses/:courseId/edit" element={<AdminCourseForm />} />
          <Route path="courses/:courseId/curriculum" element={<AdminCurriculumBuilder />} />
          <Route path="assessments" element={<AdminAssessments />} />
          <Route path="quizzes/:quizId/review" element={<AdminQuizReview />} />
          <Route path="assignments/:assignmentId/review" element={<AdminAssignmentReview />} />
          <Route path="students" element={<ComingSoon title="Students" />} />
          <Route path="instructors" element={<ComingSoon title="Instructors" />} />
          <Route path="enrollments" element={<ComingSoon title="Enrollments" />} />
          <Route path="payments" element={<ComingSoon title="Payments" />} />
          <Route path="settings" element={<ComingSoon title="Settings" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isStudentRoute && !isAdminRoute && !isInstructorRoute && <Footer />}
    </>
  )
}

function App() {
  return <AppLayout />
}

export default App
