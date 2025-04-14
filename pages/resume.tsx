'use client'
import Header from "../components/header"
export default function PDFPage() {
  return (
    
    <div className="flex flex-col h-screen">
        <Header/>
        <iframe className="mt-4 w-full flex-grow" src='./SWE_Resume_Jaxon_4_9_2025.pdf' />
    </div>
    
  )
}