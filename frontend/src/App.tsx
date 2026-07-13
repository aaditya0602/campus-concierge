import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lenis from 'lenis'

import { Github } from 'lucide-react'

import Navbar from '@/components/layout/Navbar'
import ChatWidget from '@/components/layout/ChatWidget'
import Home from '@/pages/Home'
import Bus from '@/pages/Bus'
import Dining from '@/pages/Dining'
import Events from '@/pages/Events'

function useLenis() {
  useEffect(() => {
    const lenis = new Lenis()
    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])
}

function Footer() {
  return (
    <footer className="mt-12 border-t border-border">
      <div className="container flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>
          Developed by{' '}
          {/* TODO: replace # with real portfolio URL */}
          <a href="#" className="font-medium text-primary hover:underline">
            Aaditya Arora
          </a>
        </p>
        <a
          href="https://github.com/aaditya0602/campus-concierge"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 hover:text-foreground"
        >
          <Github className="h-4 w-4" />
          Source on GitHub
        </a>
      </div>
    </footer>
  )
}

function App() {
  useLenis()

  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col bg-background">
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/bus" element={<Bus />} />
            <Route path="/dining" element={<Dining />} />
            <Route path="/events" element={<Events />} />
          </Routes>
        </div>
        <Footer />
        <ChatWidget />
      </div>
    </BrowserRouter>
  )
}

export default App
