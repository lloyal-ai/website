import React, { useEffect, useState, useRef } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import Logo from './Logo';

const Nav = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(null);
  const navRef = useRef(null);
  
  const isOnHome = location.pathname === '/';
  const isOnCareers = location.pathname === '/careers';
  
  useEffect(() => {
    if (!isOnHome) {
      setActiveSection(null);
      return;
    }
    
    // Get the nav height to use as the rootMargin offset
    const navHeight = navRef.current?.offsetHeight || 80;
    
    const observerOptions = {
      // Trigger when section top reaches the bottom of the sticky nav
      rootMargin: `-${navHeight}px 0px -80% 0px`,
      threshold: 0
    };
    
    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };
    
    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    // Observe the sections
    const projectsSection = document.getElementById('projects');
    const researchSection = document.getElementById('research');
    
    if (projectsSection) observer.observe(projectsSection);
    if (researchSection) observer.observe(researchSection);
    
    // Handle scroll to top - clear active section when at top
    const handleScroll = () => {
      if (window.scrollY < 100) {
        setActiveSection(null);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOnHome, location.pathname]);
  
  const isOnProjects = isOnHome && activeSection === 'projects';
  const isOnResearch = isOnHome && activeSection === 'research';
  
  const getLinkClass = (isActive) => 
    `transition-colors underline-offset-4 ${isActive ? 'text-white underline' : 'hover:text-white hover:underline'}`;
  
  return (
    <nav 
      ref={navRef}
      className="w-full z-50 py-6 sticky top-0 bg-[#111111]/80 backdrop-blur-md border-b border-transparent transition-colors"
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={24} className="text-white md:hidden" />
            <span className="font-sans text-xl tracking-tight text-white hidden md:block hover:text-stone-300 transition-colors">LLoyal Labs</span>
          </Link>
          
          <div className="hidden lg:flex items-center gap-4 h-6">
            <div className="h-4 w-px bg-stone-700"></div>
            <span className="font-utility text-stone-500 text-base font-light">Engineering AI's contact with reality.</span>
          </div>
        </div>
        <div className="flex items-center gap-8 text-base font-medium text-stone-400 font-utility">
          <a href="/#projects" className={getLinkClass(isOnProjects)}>Projects</a>
          <a href="/#research" className={getLinkClass(isOnResearch)}>Research</a>
          <Link to="/careers" className={getLinkClass(isOnCareers)}>
            Careers
          </Link>
        </div>
      </div>
    </nav>
  );
};

const Footer = () => {
  return (
    <footer className="py-16 border-t border-white/10 bg-[#0a0a0a]">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="font-sans text-2xl tracking-tight text-white block mb-6 hover:text-stone-300 transition-colors">LLoyal Labs</Link>
            <p className="font-utility text-stone-500 text-base max-w-sm">
              Engineering AI's contact with reality.
            </p>
          </div>
          <div>
            <h4 className="font-utility text-xs text-stone-400 uppercase tracking-widest mb-4">Projects</h4>
            <ul className="space-y-3 text-sm text-stone-500 font-utility">
              <li><a href="https://reasoning.run" className="hover:text-white transition-colors">reasoning.run</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-utility text-xs text-stone-400 uppercase tracking-widest mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-stone-500 font-utility">
              <li><a href="https://github.com/lloyal-ai/" className="hover:text-white transition-colors">GitHub</a></li>
              <li><a href="mailto:research@lloyal.ai" className="hover:text-white transition-colors">Email</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/5 flex justify-between items-center text-sm text-stone-600 font-utility">
          <div>&copy; 2025 LLoyal Labs</div>
          <div className="flex gap-4">
            <span>Melbourne, AU</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const Layout = () => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#111111';
    document.body.style.color = '#f0f0f0';
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-serif selection:bg-emerald-500/30 selection:text-emerald-200">
      <Nav />
      <main className="flex-grow overflow-x-hidden">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
export { Nav, Footer };
