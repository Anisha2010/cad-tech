import { Outlet } from 'react-router-dom'
import StudentSidebar from '../../components/student/StudentSidebar/StudentSidebar.jsx'
import StudentTopbar from '../../components/student/StudentTopbar/StudentTopbar.jsx'
import './StudentLayout.css'

function StudentLayout() {
  return (
    <div className="student-layout">
      <StudentSidebar />
      <div className="student-layout-main">
        <StudentTopbar />
        <main className="student-layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default StudentLayout
