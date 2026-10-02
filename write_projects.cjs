const fs = require('fs');

const code = `import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { projectsData, Project } from '../data';
import { ArrowRight, Sparkles, CheckCircle2, SlidersHorizontal, ArrowUpRight } from 'lucide-react';

export default function Projects() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeBeforeAfterId, setActiveBeforeAfterId] = useState<string | null>(null);
  const [modalProject, setModalProject] = useState<Project | null>(null);

  const categories = ['All', 'Residential', 'Commercial Offices', 'Hospitality'];

  const filteredProjects = projectsData.filter((project) =>
    selectedCategory === 'All' ? true : project.category === selectedCategory
  );

  return (
    <section id="projects" className="py-24 sm:py-32 bg-black-pure border-b border-gold/20 relative">
      <div className="max-w-[1920px] mx-auto px-6 lg:px-16">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 sm:mb-16 gap-8">
          <div>
            <div className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.3em] font-semibold mb-3">
              <Sparkles size={14} />
              <span>Our Portfolio</span>
            </div>
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white font-bold">
              Featured <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold via-yellow-300 to-amber-500 italic">Projects</span>
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={\`px-4 py-2 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer rounded-none \${
                    selectedCategory === cat
                      ? 'bg-gold text-black-pure shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                      : 'bg-black-rich text-gray-300 border border-gold/30 hover:border-gold hover:text-white'
                  }\`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <a
              href="#quote"
              className="inline-flex items-center gap-2 text-gold hover:text-white transition-colors text-xs uppercase tracking-widest font-bold group whitespace-nowrap pt-2 sm:pt-0"
            >
              <span>Start Your Project</span>
              <ArrowRight className="group-hover:translate-x-1.5 transition-transform" size={16} />
            </a>
          </div>
        </div>

        {/* 2-Column Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {filteredProjects.map((project, index) => {
            const isShowingBefore = activeBeforeAfterId === project.id && project.beforeImage;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group bg-black-rich border border-gold/30 hover:border-gold transition-all duration-500 flex flex-col justify-between overflow-hidden shadow-2xl relative rounded-none"
              >
                {/* Gold Top Accent Line */}
                <div className="h-1 bg-gradient-to-r from-gold via-yellow-200 to-amber-600 shrink-0"></div>

                {/* Project Image Container */}
                <div className="relative aspect-[16/10] overflow-hidden shrink-0 bg-black-pure">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={isShowingBefore ? 'before' : 'after'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      src={isShowingBefore ? project.beforeImage : project.image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 filter brightness-90 group-hover:brightness-100"
                    />
                  </AnimatePresence>

                  <div className="absolute inset-0 bg-gradient-to-t from-black-pure via-black-pure/20 to-transparent"></div>

                  {/* Category Badge */}
                  <span className="absolute top-4 left-4 bg-black-pure/90 border border-gold/40 text-gold text-[10px] uppercase tracking-[0.2em] font-mono font-bold px-3 py-1 z-10">
                    {project.category}
                  </span>

                  {/* Before/After Toggle Pill if beforeImage available */}
                  {project.beforeImage && (
                    <button
                      onClick={() =>
                        setActiveBeforeAfterId(isShowingBefore ? null : project.id)
                      }
                      className={\`absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1 text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer border \${
                        isShowingBefore
                          ? 'bg-amber-500 text-black-pure border-amber-400 font-extrabold'
                          : 'bg-black-pure/80 text-gold border-gold/40 hover:bg-gold hover:text-black-pure'
                      }\`}
                    >
                      <SlidersHorizontal size={12} />
                      <span>{isShowingBefore ? 'Viewing Before' : 'View Before'}</span>
                    </button>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6 sm:p-8 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="font-heading text-2xl sm:text-3xl text-white font-bold mb-3 group-hover:text-gold transition-colors flex items-start justify-between gap-3">
                      <span>{project.title}</span>
                      <ArrowUpRight
                        size={20}
                        className="text-gold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1"
                      />
                    </h3>

                    <p className="text-gray-300 text-sm font-light leading-relaxed mb-6">
                      {project.description}
                    </p>
                  </div>

                  <div>
                    {/* Services Used Tags */}
                    <div className="flex flex-wrap gap-2 mb-6 pt-4 border-t border-white/10">
                      {project.servicesUsed.map((service, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] px-3 py-1 border border-gold/25 text-gray-300 uppercase tracking-wider font-mono bg-white/5"
                        >
                          {service}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setModalProject(project)}
                        className="flex-1 border border-gold/50 text-gold hover:bg-gold/10 hover:border-gold py-3 text-xs font-bold uppercase tracking-widest transition-all text-center cursor-pointer rounded-none"
                      >
                        Project Specs
                      </button>
                      <a
                        href="#quote"
                        className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-3 text-xs font-bold uppercase tracking-widest transition-all text-center cursor-pointer rounded-none shadow-[0_0_15px_rgba(212,175,55,0.25)] font-extrabold"
                      >
                        Get Quote
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Project Spec Lightbox Modal */}
      <AnimatePresence>
        {modalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black-pure/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-black-pure border border-gold max-w-3xl w-full p-6 sm:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setModalProject(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gold text-xs uppercase font-mono tracking-widest border border-white/20 px-3 py-1 cursor-pointer"
              >
                Close ✕
              </button>

              <div className="aspect-video w-full overflow-hidden border border-gold/30 mb-6 relative">
                <img
                  src={modalProject.image}
                  alt={modalProject.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <span className="text-gold text-xs font-mono uppercase tracking-widest block mb-2">
                {modalProject.category}
              </span>
              <h2 className="text-2xl sm:text-4xl font-heading font-bold text-white mb-4">
                {modalProject.title}
              </h2>
              <p className="text-gray-300 text-sm font-light leading-relaxed mb-6">
                {modalProject.description}
              </p>

              <div className="border-t border-gold/30 pt-4 mb-6">
                <h4 className="text-xs uppercase tracking-widest text-gold font-bold mb-3">
                  Scope of Work & Services Included
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-200">
                  {modalProject.servicesUsed.map((svc, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-gold" />
                      <span>{svc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <a
                  href="#quote"
                  onClick={() => setModalProject(null)}
                  className="flex-1 bg-gold hover:bg-gold-light text-black-pure py-4 font-bold uppercase tracking-widest text-xs transition-colors text-center cursor-pointer rounded-none shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                >
                  Request Quote for Similar Scope
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
`;

fs.writeFileSync('src/components/Projects.tsx', code);
console.log('Successfully written updated 2-column Projects component.');
