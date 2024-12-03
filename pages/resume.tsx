'use client'
import Header from "../components/header"
export default function PDFPage() {
  return (
    
    <div className="flex flex-col h-screen">
        <Header/>
        <iframe className="mt-4 w-full flex-grow" src='./resume_current_jaxon_p.pdf' />
    </div>
    
  )
}