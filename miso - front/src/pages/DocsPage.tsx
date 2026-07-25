import React, { useEffect } from 'react';
import Navbar from '../components/Navbar';
import DocsPreview from '../components/DocsPreview';
import Footer from '../components/Footer';

export default function DocsPage() {
  // Scroll to top or specific hash on mount
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
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  const handleNavigate = (id: string) => {
    if (id === 'docs') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // If navigating to other sections, redirect to home page with hash
    window.location.href = `/#${id}`;
  };

  return (
    <div className="bg-[#000000] min-h-screen text-white relative">
      <Navbar activeSection="docs" onNavigate={handleNavigate} />
      <main className="pt-16">
        <DocsPreview />
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
