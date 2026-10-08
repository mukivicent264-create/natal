import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import Showcase from './components/Showcase';
import Services from './components/Services';
import Projects from './components/Projects';
import BeforeAfterSection from './components/BeforeAfterSection';
import WhyChooseUs from './components/WhyChooseUs';
import Process from './components/Process';
import Stats from './components/Stats';
import Testimonials from './components/Testimonials';
import Contact from './components/Contact';
import Footer from './components/Footer';
import FeaturedCreationsPage from './components/FeaturedCreationsPage';
import ServicesPage from './components/ServicesPage';
import AuthPage from './components/AuthPage';
import QuotePage from './components/QuotePage';
import AdminDashboard from './components/AdminDashboard';
import ProjectSpecsPage from './components/ProjectSpecsPage';
import GoldSpinner from './components/GoldSpinner';
import { Project } from './types';
import { projectsData } from './data';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { seedInitialDatabaseIfEmpty } from './utils';

export default function App() {
  const [isAuthPage, setIsAuthPage] = useState(false);
  const [isQuotePage, setIsQuotePage] = useState(false);
  const [isCreationsPage, setIsCreationsPage] = useState(false);
  const [isServicesPage, setIsServicesPage] = useState(false);
  const [isAdminDashboard, setIsAdminDashboard] = useState(false);
  const [isSpecsPage, setIsSpecsPage] = useState(false);
  const [specsProject, setSpecsProject] = useState<Project | null>(null);

  // Automatically initialize database with baseline records if collections are empty
  useEffect(() => {
    seedInitialDatabaseIfEmpty().catch((err) => {
      console.warn("Database initialization check:", err);
    });
  }, []);

  // Sync state with window hash for bookmarking & browser navigation
  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.replace('#', '');
      const hash = rawHash.split('?')[0].split('/')[0];
      
      if (hash === 'admin' || rawHash.startsWith('admin?') || rawHash.startsWith('admin/')) {
        setIsAdminDashboard(true);
        setIsAuthPage(false);
        setIsQuotePage(false);
        setIsCreationsPage(false);
        setIsServicesPage(false);
        setIsSpecsPage(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (hash === 'auth' || hash === 'register' || hash === 'signup' || hash === 'login') {
        setIsAuthPage(true);
        setIsAdminDashboard(false);
        setIsQuotePage(false);
        setIsCreationsPage(false);
        setIsServicesPage(false);
        setIsSpecsPage(false);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
      }

      if (hash === 'creations' || hash === 'featured-creations' || hash === 'products' || hash === 'main-products') {
        setIsCreationsPage(true);
        setIsAuthPage(false);
        setIsAdminDashboard(false);
        setIsQuotePage(false);
        setIsServicesPage(false);
        setIsSpecsPage(false);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if ((window as any).__lenis) {
          (window as any).__lenis.resize();
          (window as any).__lenis.scrollTo(0, { immediate: true });
        }
        return;
      }

      if (hash === 'all-services' || hash === 'services-page' || hash === 'services-all') {
        setIsServicesPage(true);
        setIsCreationsPage(false);
        setIsAuthPage(false);
        setIsAdminDashboard(false);
        setIsQuotePage(false);
        setIsSpecsPage(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (hash === 'quote') {
        setIsQuotePage(true);
        setIsAuthPage(false);
        setIsAdminDashboard(false);
        setIsCreationsPage(false);
        setIsServicesPage(false);
        setIsSpecsPage(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (hash.startsWith('project-specs') || hash.startsWith('specs')) {
        setIsSpecsPage(true);
        setIsAdminDashboard(false);
        setIsAuthPage(false);
        setIsQuotePage(false);
        setIsCreationsPage(false);
        setIsServicesPage(false);

        let projId = '';
        if (rawHash.includes('id=')) {
          const match = rawHash.match(/id=([^&]+)/);
          if (match) projId = decodeURIComponent(match[1]);
        } else if (rawHash.includes('/')) {
          projId = decodeURIComponent(rawHash.split('/')[1]);
        }

        let found: Project | undefined = undefined;
        if (projId) {
          found = projectsData.find(p => p.id === projId);
          if (!found) {
            try {
              const localProjects = JSON.parse(localStorage.getItem('natal_local_projects') || '[]');
              const matchLocal = localProjects.find((lp: any) => lp.id === projId);
              if (matchLocal) {
                found = {
                  id: matchLocal.id,
                  title: matchLocal.title,
                  category: matchLocal.category,
                  description: matchLocal.desc || matchLocal.description,
                  image: matchLocal.image,
                  beforeImage: matchLocal.beforeImage,
                  servicesUsed: matchLocal.tags || [matchLocal.category]
                };
              }
            } catch (e) {
              console.warn(e);
            }
          }
        }

        if (!found) {
          try {
            const saved = sessionStorage.getItem('natal_active_specs_project');
            if (saved) {
              const parsed = JSON.parse(saved);
              if (!projId || parsed.id === projId) {
                found = parsed;
              }
            }
          } catch (e) {}
        }

        if (!found && projId) {
          try {
            const docRef = doc(db, 'projects', projId);
            getDoc(docRef).then((snap) => {
              if (snap.exists()) {
                const data = snap.data();
                const fetchedProject: Project = {
                  id: snap.id,
                  title: data.title || 'Untitled Creation',
                  category: data.category || 'Interior Design',
                  description: data.desc || data.description || '',
                  image: data.image || '',
                  beforeImage: data.beforeImage || '',
                  servicesUsed: data.tags || (data.servicesUsed ? data.servicesUsed : [data.category || 'Interior Fit-Out'])
                };
                setSpecsProject(fetchedProject);
                try {
                  sessionStorage.setItem('natal_active_specs_project', JSON.stringify(fetchedProject));
                } catch (err) {}
              }
            }).catch(() => {});
          } catch (e) {}
        }

        if (!found && projectsData.length > 0) {
          found = projectsData[0];
        }

        if (found) {
          setSpecsProject(found);
          try {
            sessionStorage.setItem('natal_active_specs_project', JSON.stringify(found));
          } catch (e) {}
        }

        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        return;
      }
      
      setIsAdminDashboard(false);
      setIsAuthPage(false);
      setIsQuotePage(false);
      setIsCreationsPage(false);
      setIsServicesPage(false);
      setIsSpecsPage(false);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Enable Lenis smooth scrolling only on desktop
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth < 768;
    
    if (isTouchDevice) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
    });

    (window as any).__lenis = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    return () => {
      (window as any).__lenis = null;
      lenis.destroy();
    };
  }, []);

  // Guarantee that navigating to subpages always starts from the top
  useEffect(() => {
    if (isCreationsPage || isServicesPage || isQuotePage || isAuthPage || isAdminDashboard || isSpecsPage) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if ((window as any).__lenis) {
        (window as any).__lenis.resize();
        (window as any).__lenis.scrollTo(0, { immediate: true });
      }
      const t1 = setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        if ((window as any).__lenis) {
          (window as any).__lenis.scrollTo(0, { immediate: true });
        }
      }, 30);
      return () => clearTimeout(t1);
    }
  }, [isCreationsPage, isServicesPage, isQuotePage, isAuthPage, isAdminDashboard, isSpecsPage]);

  const handleNavigateHome = (sectionId?: string) => {
    setIsAdminDashboard(false);
    setIsAuthPage(false);
    setIsQuotePage(false);
    setIsCreationsPage(false);
    setIsServicesPage(false);
    setIsSpecsPage(false);
    setSpecsProject(null);
    if (sectionId) {
      window.location.hash = `#${sectionId}`;
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    } else {
      window.location.hash = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenProjectSpecs = (project: Project) => {
    setSpecsProject(project);
    setIsSpecsPage(true);
    setIsAdminDashboard(false);
    setIsAuthPage(false);
    setIsQuotePage(false);
    setIsCreationsPage(false);
    setIsServicesPage(false);
    try {
      sessionStorage.setItem('natal_active_specs_project', JSON.stringify(project));
    } catch (e) {}
    window.location.hash = `#project-specs?id=${encodeURIComponent(project.id)}`;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  const handleNavigateToAuth = (mode: 'login' | 'register' = 'login') => {
    setIsAuthPage(true);
    setIsAdminDashboard(false);
    setIsQuotePage(false);
    setIsCreationsPage(false);
    setIsServicesPage(false);
    setIsSpecsPage(false);
    window.location.hash = mode === 'register' ? '#register' : '#auth';
  };

  if (isAdminDashboard) {
    const match = window.location.hash.match(/[?&]tab=([a-zA-Z_-]+)/);
    const initialTab = match ? (match[1] as any) : undefined;
    return <AdminDashboard onNavigateHome={() => handleNavigateHome()} initialTab={initialTab} />;
  }

  return (
    <div className="bg-black-rich min-h-screen selection:bg-gold selection:text-black-pure text-white relative font-body overflow-x-hidden">
      {!isAuthPage && !isQuotePage && !isCreationsPage && !isServicesPage && !isSpecsPage && (
        <Navbar 
          onNavigateHome={handleNavigateHome} 
          onNavigateToAuth={handleNavigateToAuth}
        />
      )}

      <main className="w-full overflow-x-hidden">
        {isSpecsPage ? (
          specsProject ? (
            <ProjectSpecsPage 
              project={specsProject} 
              onNavigateHome={(sectionId) => handleNavigateHome(sectionId)}
              onSelectOtherProject={handleOpenProjectSpecs}
            />
          ) : (
            <div className="min-h-screen bg-black-rich flex flex-col items-center justify-center p-6 text-center">
              <GoldSpinner size="xl" label="Loading Architectural Specifications..." />
              <p className="text-gray-400 font-mono text-xs mt-4">Retrieving project blueprints & technical data...</p>
            </div>
          )
        ) : isAuthPage ? (
          <AuthPage 
            onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} 
            initialMode={
              window.location.hash.toLowerCase().includes('register') || window.location.hash.toLowerCase().includes('signup')
                ? 'register'
                : 'login'
            }
          />
        ) : isQuotePage ? (
          <QuotePage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />
        ) : isCreationsPage ? (
          <FeaturedCreationsPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />
        ) : isServicesPage ? (
          <ServicesPage onNavigateHome={(sectionId) => handleNavigateHome(sectionId)} />
        ) : (
          <>
            <Hero />
            <About />
            <Showcase />
            <Services  />
            <Projects onViewProjectSpecs={handleOpenProjectSpecs} />
            <BeforeAfterSection />
            <WhyChooseUs />
            <Process />
            <Stats />
            <Testimonials />
            <Contact />
          </>
        )}
      </main>

      {!isAuthPage && <Footer />}
    </div>
  );
}
