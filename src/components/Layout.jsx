import React, { useEffect, useState, useRef } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import Logo from './Logo';

const Nav = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(null);
  const navRef = useRef(null);
  
  const isOnHome = location.pathname === '/';

  
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
      className="w-full z-50 py-6 sticky top-0 bg-[#080808]/80 backdrop-blur-md border-b border-transparent transition-colors"
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
          <a href="/blog/" className={getLinkClass(false)}>Blog</a>

        </div>
      </div>
    </nav>
  );
};

import logoWhiteSquare from '../assets/logo-white-square.svg';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-[#070707]">
      {/* Main Footer Content */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Left Section - Logo + Email Signup (Vast.ai style) */}
          <div className="flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
              {/* Logo Box */}
              <img 
                src={logoWhiteSquare} 
                alt="LLoyal Labs" 
                className="w-16 h-16 rounded-xl flex-shrink-0"
              />
              
              {/* Subscribe Section */}
              <div className="w-full sm:w-[280px]">
                <h4 className="font-utility text-white font-medium text-sm mb-4">
                  Subscribe for our product updates.
                </h4>
                <form className="flex items-center gap-4 border-b border-stone-600 pb-2 mb-6 group focus-within:border-white transition-colors">
                  <input 
                    type="email" 
                    placeholder="Enter your email"
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none font-utility placeholder:text-stone-500"
                  />
                  <button 
                    type="submit"
                    className="text-stone-400 hover:text-white transition-colors flex-shrink-0"
                    aria-label="Subscribe"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>
                <p className="font-utility text-stone-600 text-xs">
                  &copy; 2026 LLoyal AI. All rights reserved.
                </p>
              </div>
            </div>
          </div>

          {/* Right Section - Link Columns with wider gaps like Vast.ai */}
          <div className="flex-1 flex flex-wrap gap-y-8 justify-between lg:justify-end lg:gap-x-16">
            {/* Engineering */}
            <div className="w-[45%] sm:w-auto">
              <h4 className="font-utility text-xs text-white font-medium mb-4">Engineering</h4>
              <ul className="space-y-2 text-sm text-stone-500 font-utility">
                <li><a href="https://hdk.lloyal.ai" className="hover:text-white transition-colors">HDK</a></li>
                <li><a href="https://reasoning.run" className="hover:text-white transition-colors">reasoning.run</a></li>
                <li><a href="https://lloyal-ai.github.io/lloyal.node/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">lloyal.node</a></li>
                <li><a href="https://lloyal-ai.github.io/liblloyal/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">liblloyal</a></li>
                <li><a href="https://www.npmjs.com/package/@lloyal-labs/tsampler" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">TSampler</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="w-[45%] sm:w-auto">
              <h4 className="font-utility text-xs text-white font-medium mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-stone-500 font-utility">
                <li><a href="https://docs.lloyal.ai" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="/blog/" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="/#research" className="hover:text-white transition-colors">Research</a></li>
              </ul>
            </div>

            {/* Community */}
            <div className="w-[45%] sm:w-auto">
              <h4 className="font-utility text-xs text-white font-medium mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-stone-500 font-utility">
                <li><a href="https://github.com/lloyal-ai/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
                <li><a href="https://www.npmjs.com/org/lloyal-labs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">npm</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="w-[45%] sm:w-auto">
              <h4 className="font-utility text-xs text-white font-medium mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-stone-500 font-utility">
                <li><a href="mailto:research@lloyal.ai" className="hover:text-white transition-colors">Get in touch</a></li>

                <li><span className="text-stone-600">Melbourne, AU</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Giant Brand Wordmark - Full container width */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 pb-8">
        <svg viewBox="0 0 100 28" className="w-full h-auto font-sans" aria-hidden="true">
          <text 
            x="0" 
            y="24" 
            textLength="100" 
            lengthAdjust="spacing"
            className="fill-white/[0.04]"
            style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            LLoyal
          </text>
        </svg>
      </div>
    </footer>
  );
};

const Layout = () => {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#080808';
    document.body.style.color = '#f0f0f0';
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-serif selection:bg-emerald-500/30 selection:text-emerald-200">
      <a href="#main" className="skip">Skip to content</a>
      <Nav />
      <main id="main" className="flex-grow overflow-x-hidden">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
export { Nav, Footer };
