import { ChevronLeft, ChevronRight } from 'lucide-react'
import './ModelPagination.css'

function ModelPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  return <nav className="model-pagination" aria-label="Model catalog pagination"><button type="button" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => <button type="button" key={page} className={page === currentPage ? 'is-current' : ''} aria-current={page === currentPage ? 'page' : undefined} onClick={() => onPageChange(page)}>{page}</button>)}<button type="button" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="Next page"><ChevronRight size={17} /></button></nav>
}

export default ModelPagination