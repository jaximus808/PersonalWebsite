'use client'
import Header from "../components/header"
export default function PDFPage() {
  return (
    
    <div className="flex flex-col h-screen">
        <Header/>
        <iframe className="mt-4 w-full flex-grow" src='./resume_norm_swe_Jaxon_Poentis-07-29-2025.pdf' />
    </div>
    
  )
}