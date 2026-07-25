import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Workflow from './components/Workflow';
import WhyMiso from './components/WhyMiso';
import CodeWindow from './components/CodeWindow';
import CTA from './components/CTA';
import Footer from './components/Footer';
import Preloader from './components/Preloader';
import DocsPage from './pages/DocsPage';
import HubPage from './pages/HubPage';

// Component that displays the main SaaS Landing Page
function LandingPage() {
  const [activeSection, setActiveSection] = useState('home');

  // Handle smooth scroll navigation
  const handleNavigate = (id: string) => {
    if (id === 'docs') {
      window.location.href = '/docs';
      return;
    }
    if (id === 'hub') {
      window.location.href = '/hub';
      return;
    }
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Check URL hashes on mount to jump to sections (e.g. from /docs redirect)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, []);

  // Monitor scrolling to dynamically update active navbar indicator
  useEffect(() => {
    const sections = ['home', 'why-miso'];
    
    const observers = sections.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(id);
            }
          });
        },
        { threshold: 0.35, rootMargin: '-80px 0px -20% 0px' }
      );

      observer.observe(el);
      return { el, observer };
    });

    return () => {
      observers.forEach((obs) => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, []);

  return (
    <div className="bg-black text-white relative min-h-screen">
      {/* Dynamic Header */}
      <Navbar activeSection={activeSection} onNavigate={handleNavigate} />
      
      {/* Main SaaS Sections */}
      <main>
        <Hero onNavigate={handleNavigate} />
        <Features />
        <Workflow />
        <WhyMiso />
        <CodeWindow />
        <CTA onNavigate={handleNavigate} />
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  // Handle global mouse coordinates tracking for cursor-spotlight glow
  useEffect(() => {
    const updateMouseCoords = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', updateMouseCoords);
    return () => {
      window.removeEventListener('mousemove', updateMouseCoords);
    };
  }, []);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <Router>
        {/* Global Monochrome Ambient Glow Spotlight */}
        <div 
          className="pointer-events-none fixed inset-0 z-40 transition-all duration-300 hidden md:block"
          style={{
            background: `radial-gradient(500px at ${mousePos.x}px ${mousePos.y}px, rgba(255, 255, 255, 0.03), transparent 75%)`
          }}
        />
        
        {/* Global Background Grid Lines */}
        <div className="fixed inset-0 pointer-events-none bg-dot-grid opacity-20 -z-50" />

        {/* Route Switchboard */}
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/hub" element={<HubPage />} />
        </Routes>
      </Router>
    </>
  );
}
