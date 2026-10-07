import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/layout/Navbar/Navbar.jsx'
import Footer from './components/layout/Footer/Footer.jsx'
import BackToTop from './components/common/BackToTop/BackToTop.jsx'
import ScrollToTop from './components/common/ScrollToTop/ScrollToTop.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'

const Home = lazy(() => import('./pages/Home/Home.jsx'))
const CategoryDetails = lazy(() => import('./pages/CategoryDetails/CategoryDetails.jsx'))
const ModelDetails = lazy(() => import('./pages/ModelDetails/ModelDetails.jsx'))
const CourseDetails = lazy(() => import('./pages/CourseDetails/CourseDetails.jsx'))
const About = lazy(() => import('./pages/About/About.jsx'))
const CADModels = lazy(() => import('./pages/CADModels/CADModels.jsx'))
const Services = lazy(() => import('./pages/Services/Services.jsx'))
const ServiceDetails = lazy(() => import('./pages/ServiceDetails/ServiceDetails.jsx'))
const CADServiceCatalog = lazy(() => import('./pages/CADServiceCatalog/CADServiceCatalog.jsx'))
const CADServiceDetail = lazy(() => import('./pages/CADServiceDetail/CADServiceDetail.jsx'))
const Courses = lazy(() => import('./pages/Courses/Courses.jsx'))
const Contact = lazy(() => import('./pages/Contact/Contact.jsx'))
const Login = lazy(() => import('./pages/auth/Login/Login.jsx'))
const Register = lazy(() => import('./pages/auth/Register/Register.jsx'))
const CheckEmail = lazy(() => import('./pages/auth/CheckEmail/CheckEmail.jsx'))
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail/VerifyEmail.jsx'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword/ResetPassword.jsx'))
const Account = lazy(() => import('./pages/Account/Account.jsx'))
const OAuthCallback = lazy(() => import('./pages/auth/OAuthCallback/OAuthCallback.jsx'))
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard/StudentDashboard.jsx'))
const StudentPortalLayout = lazy(() => import('./components/student/StudentPortalLayout.jsx'))
const InstructorLayout = lazy(() => import('./layouts/InstructorLayout/InstructorLayout.jsx'))
const InstructorDashboard = lazy(() => import('./pages/instructor/InstructorDashboard/InstructorDashboard.jsx'))
const InstructorCourses = lazy(() => import('./pages/instructor/InstructorCourses.jsx'))
const InstructorCourseForm = lazy(() => import('./pages/instructor/InstructorCourseForm.jsx'))
const InstructorCurriculumBuilder = lazy(() => import('./pages/instructor/InstructorCurriculumBuilder.jsx'))
const InstructorAssessments = lazy(() => import('./pages/instructor/InstructorAssessments/InstructorAssessments.jsx'))
const QuizBuilder = lazy(() => import('./pages/instructor/QuizBuilder/QuizBuilder.jsx'))
const AssignmentBuilder = lazy(() => import('./pages/instructor/AssignmentBuilder/AssignmentBuilder.jsx'))
const MyCourses = lazy(() => import('./pages/student/MyCourses/MyCourses.jsx'))
const LearningPlayer = lazy(() => import('./pages/student/LearningPlayer/LearningPlayer.jsx'))
const QuizAttempt = lazy(() => import('./pages/student/QuizAttempt/QuizAttempt.jsx'))
const QuizResult = lazy(() => import('./pages/student/QuizResult/QuizResult.jsx'))
const QuizHistory = lazy(() => import('./pages/student/QuizHistory/QuizHistory.jsx'))
const AssignmentDetails = lazy(() => import('./pages/student/AssignmentDetails/AssignmentDetails.jsx'))
const MySubmissions = lazy(() => import('./pages/student/MySubmissions/MySubmissions.jsx'))
const SubmissionDetails = lazy(() => import('./pages/student/SubmissionDetails/SubmissionDetails.jsx'))
const MyDownloads = lazy(() => import('./pages/student/MyDownloads/MyDownloads.jsx'))
const StudentCertificates = lazy(() => import('./pages/student/StudentCertificates/StudentCertificates.jsx'))
const StudentCertificateDetail = lazy(() => import('./pages/student/StudentCertificateDetail/StudentCertificateDetail.jsx'))
const ServiceRequests = lazy(() => import('./pages/student/ServiceRequests/ServiceRequests.jsx'))
const ServiceRequestDetail = lazy(() => import('./pages/student/ServiceRequestDetail/ServiceRequestDetail.jsx'))
const PublicCertificateVerification = lazy(() => import('./pages/public/PublicCertificateVerification/PublicCertificateVerification.jsx'))
const LegalPage = lazy(() => import('./pages/Legal/LegalPage.jsx'))
const CourseSubmissions = lazy(() => import('./pages/instructor/CourseSubmissions/CourseSubmissions.jsx'))
const SubmissionReview = lazy(() => import('./pages/instructor/SubmissionReview/SubmissionReview.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminWebsiteContent = lazy(() => import('./pages/admin/AdminWebsiteContent.jsx'))
const AdminUserManagement = lazy(() => import('./pages/admin/AdminUserManagement.jsx'))
const AdminUserDetail = lazy(() => import('./pages/admin/AdminUserDetail.jsx'))
const AdminRecords = lazy(() => import('./pages/admin/AdminRecords.jsx'))
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile.jsx'))
const AdminProfileEdit = lazy(() => import('./pages/admin/AdminProfileEdit.jsx'))
const AdminChangePassword = lazy(() => import('./pages/admin/AdminChangePassword.jsx'))
const AdminCourses = lazy(() => import('./pages/admin/AdminCourses.jsx'))
const AdminCertificates = lazy(() => import('./pages/admin/AdminCertificates.jsx'))
const AdminCourseForm = lazy(() => import('./pages/admin/AdminCourseForm.jsx'))
const AdminCurriculumBuilder = lazy(() => import('./pages/admin/AdminCurriculumBuilder.jsx'))
const AdminAssessments = lazy(() => import('./pages/admin/AdminAssessments/AdminAssessments.jsx'))
const AdminQuizReview = lazy(() => import('./pages/admin/AdminQuizReview/AdminQuizReview.jsx'))
const AdminAssignmentReview = lazy(() => import('./pages/admin/AdminAssignmentReview/AdminAssignmentReview.jsx'))
const AdminCadCategories = lazy(() => import('./pages/admin/AdminCadCategories.jsx'))
const AdminCadProducts = lazy(() => import('./pages/admin/AdminCadProducts.jsx'))
const AdminCadProductForm = lazy(() => import('./pages/admin/AdminCadProductForm.jsx'))
const AdminCadServices = lazy(() => import('./pages/admin/AdminCadServices.jsx'))
const AdminCadServiceForm = lazy(() => import('./pages/admin/AdminCadServiceForm.jsx'))
const AdminServiceRequests = lazy(() => import('./pages/admin/AdminServiceRequests.jsx'))
const AdminServiceRequestDetail = lazy(() => import('./pages/admin/AdminServiceRequestDetail.jsx'))
const AdminCadOrders = lazy(() => import('./pages/admin/AdminCadOrders.jsx'))
const AdminSiteContent = lazy(() => import('./pages/admin/AdminSiteContent.jsx'))
const AdminContactEnquiries = lazy(() => import('./pages/admin/AdminContactEnquiries.jsx'))
const AdminLayout = lazy(() => import('./layouts/AdminLayout/AdminLayout.jsx'))

function AppLayout() {
  const location = useLocation()
  const isStudentRoute = location.pathname.startsWith('/student/')
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isInstructorRoute = location.pathname.startsWith('/instructor')

  return (
    <>
      <ScrollToTop />
      {!isStudentRoute && !isAdminRoute && !isInstructorRoute && <Navbar />}
      <Suspense fallback={<div className="site-container py-5 text-center">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/cad-models" element={<CADModels />} />
          <Route path="/cad-models/:category" element={<CategoryDetails />} />
          <Route path="/model/:slug" element={<ModelDetails />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:slug" element={<ServiceDetails />} />
          <Route path="/cad-services" element={<CADServiceCatalog />} />
          <Route path="/cad-services/:slug" element={<CADServiceDetail />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:slug" element={<CourseDetails />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/privacy-policy" element={<LegalPage />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/digital-item-policy" element={<LegalPage />} />
          <Route path="/refund-policy" element={<LegalPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
          <Route path="/student/account" element={<ProtectedRoute allowedRoles={['student']}><StudentPortalLayout pageTitle="Account Settings"><Account /></StudentPortalLayout></ProtectedRoute>} />
          <Route path="/student/my-courses" element={<ProtectedRoute allowedRoles={['student']}><MyCourses /></ProtectedRoute>} />
          <Route path="/student/learn/:courseSlug" element={<ProtectedRoute allowedRoles={['student']}><LearningPlayer /></ProtectedRoute>} />
          <Route path="/student/learn/:courseSlug/quiz/:quizId" element={<ProtectedRoute allowedRoles={['student']}><QuizAttempt /></ProtectedRoute>} />
          <Route path="/student/assignments/:assignmentId" element={<ProtectedRoute allowedRoles={['student']}><AssignmentDetails /></ProtectedRoute>} />
          <Route path="/student/submissions" element={<ProtectedRoute allowedRoles={['student']}><MySubmissions /></ProtectedRoute>} />
          <Route path="/student/submissions/:submissionId" element={<ProtectedRoute allowedRoles={['student']}><SubmissionDetails /></ProtectedRoute>} />
          <Route path="/student/downloads" element={<ProtectedRoute allowedRoles={['student']}><MyDownloads /></ProtectedRoute>} />
          <Route path="/student/quizzes/:quizId/attempt/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><QuizAttempt /></ProtectedRoute>} />
          <Route path="/student/quizzes/:quizId/results/:attemptId" element={<ProtectedRoute allowedRoles={['student']}><QuizResult /></ProtectedRoute>} />
          <Route path="/student/quiz-history" element={<ProtectedRoute allowedRoles={['student']}><QuizHistory /></ProtectedRoute>} />
          <Route path="/student/certificates" element={<ProtectedRoute allowedRoles={['student']}><StudentCertificates /></ProtectedRoute>} />
          <Route path="/student/certificates/:certificateId" element={<ProtectedRoute allowedRoles={['student']}><StudentCertificateDetail /></ProtectedRoute>} />
          <Route path="/student/service-requests" element={<ProtectedRoute allowedRoles={['student']}><ServiceRequests /></ProtectedRoute>} />
          <Route path="/student/service-requests/:enquiryId" element={<ProtectedRoute allowedRoles={['student']}><ServiceRequestDetail /></ProtectedRoute>} />
          <Route path="/certificates/verify/:verificationCode" element={<PublicCertificateVerification />} />
          <Route path="/instructor" element={<ProtectedRoute allowedRoles={['instructor']}><InstructorLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="account" element={<Navigate to="/instructor/profile" replace />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="profile/edit" element={<AdminProfileEdit />} />
            <Route path="profile/change-password" element={<AdminChangePassword />} />
            <Route path="dashboard" element={<InstructorDashboard />} />
            <Route path="courses" element={<InstructorCourses />} />
            <Route path="courses/:courseId/edit" element={<InstructorCourseForm />} />
            <Route path="courses/:courseId/curriculum" element={<InstructorCurriculumBuilder />} />
            <Route path="assessments" element={<InstructorAssessments />} />
            <Route path="courses/:courseId/assessments" element={<InstructorAssessments />} />
            <Route path="courses/:courseId/quizzes/new" element={<QuizBuilder />} />
            <Route path="courses/:courseId/quizzes/:quizId/edit" element={<QuizBuilder />} />
            <Route path="courses/:courseId/assignments/new" element={<AssignmentBuilder />} />
            <Route path="courses/:courseId/assignments/:assignmentId/edit" element={<AssignmentBuilder />} />
            <Route path="courses/:courseId/submissions" element={<CourseSubmissions />} />
            <Route path="submissions/:submissionId/review" element={<SubmissionReview />} />
          </Route>
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="account" element={<Account />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="profile/edit" element={<AdminProfileEdit />} />
            <Route path="profile/change-password" element={<AdminChangePassword />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="courses/new" element={<AdminCourseForm />} />
            <Route path="courses/:courseId/edit" element={<AdminCourseForm />} />
            <Route path="courses/:courseId/curriculum" element={<AdminCurriculumBuilder />} />
            <Route path="cad-categories" element={<AdminCadCategories />} />
            <Route path="cad-products" element={<AdminCadProducts />} />
            <Route path="cad-products/new" element={<AdminCadProductForm />} />
            <Route path="cad-products/:productId/edit" element={<AdminCadProductForm />} />
            <Route path="cad-services" element={<AdminCadServices />} />
            <Route path="cad-services/new" element={<AdminCadServiceForm />} />
            <Route path="cad-services/:serviceId/edit" element={<AdminCadServiceForm />} />
            <Route path="service-requests" element={<AdminServiceRequests />} />
            <Route path="service-requests/:enquiryId" element={<AdminServiceRequestDetail />} />
            <Route path="cad-orders" element={<AdminCadOrders />} />
            <Route path="site-content" element={<AdminWebsiteContent />} />
            <Route path="website-content" element={<AdminWebsiteContent />} />
            <Route path="settings" element={<AdminSiteContent />} />
            <Route path="contact-enquiries" element={<AdminContactEnquiries />} />
            <Route path="assessments" element={<AdminAssessments />} />
            <Route path="certificates" element={<AdminCertificates />} />
            <Route path="quizzes/:quizId/review" element={<AdminQuizReview />} />
            <Route path="assignments/:assignmentId/review" element={<AdminAssignmentReview />} />
            <Route path="students" element={<AdminUserManagement key="student-management" role="student" />} />
            <Route path="students/:userId" element={<AdminUserDetail key="student-detail" />} />
            <Route path="instructors" element={<AdminUserManagement key="instructor-management" role="instructor" />} />
            <Route path="instructors/:userId" element={<AdminUserDetail key="instructor-detail" />} />
            <Route path="enrollments" element={<AdminRecords type="enrollments" />} />
            <Route path="payments" element={<AdminRecords type="payments" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <BackToTop />
      {!isStudentRoute && !isAdminRoute && !isInstructorRoute && <Footer />}
    </>
  )
}

function App() {
  return <AppLayout />
}

export default App
