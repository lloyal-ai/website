import React from 'react';
import ArrowGrid from '../components/ArrowGrid';

const Careers = () => {
  return (
    <>
      {/* Hero Section */}
      <section className="pt-24 pb-32 px-6 md:px-12 max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Text Content */}
          <div className="w-full lg:w-[60%] lg:pr-8">
            <div>
              <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-light text-white leading-[0.9] mb-10 tracking-tight">
                In a world of agents, <br />
                <span className="italic text-stone-400">it's people that matter most.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-stone-300 leading-relaxed font-light max-w-2xl">
                Intelligence gets sharper when the world pushes back&mdash;we are that layer. Our work spans from unlocking latent potential of open-weight models to continuous learning loops.
              </p>
            </div>
          </div>
          
          {/* Interactive Arrow Grid - aligned with page edge */}
          <div className="hidden lg:flex w-[40%] h-[500px] items-center justify-end">
             <ArrowGrid />
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="px-6 md:px-12 max-w-[1400px] mx-auto mb-24">
        <div className="border-t border-white/20 pt-4 mb-8 flex justify-between items-center">
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">About Us</span>
          <span className="font-utility text-xs uppercase tracking-widest text-stone-500">01</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left Column - The Lab + Culture Grid */}
          <div>
            <h2 className="font-utility font-bold text-2xl text-white mb-6">The Lab</h2>
            <div className="space-y-6 text-stone-400 text-xl leading-relaxed mb-12">
              <p>
                The field is moving fast, but the grounding problem is wide open. Everyone's chasing capability. We're engineering correspondence.
              </p>
              <p>
                We want people who believe their work will shape how artificial intelligence meets reality for decades to come.
              </p>
            </div>

            {/* Culture Grid - 2x2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-utility font-bold text-lg text-white mb-2">Async-first</h3>
                <p className="text-stone-400 text-xl leading-relaxed">
                  Deep work matters more than calendar presence.
                </p>
              </div>
              <div>
                <h3 className="font-utility font-bold text-lg text-white mb-2">Substance over performance.</h3>
                <p className="text-stone-400 text-xl leading-relaxed">
                  We don't do daily WIPs for the sake of it.
                </p>
              </div>
              <div>
                <h3 className="font-utility font-bold text-lg text-white mb-2">Strong opinions, loosely held.</h3>
                <p className="text-stone-400 text-xl leading-relaxed">
                  Disagree, commit, learn, adapt.
                </p>
              </div>
              <div>
                <h3 className="font-utility font-bold text-lg text-white mb-2">Global from day one.</h3>
                <p className="text-stone-400 text-xl leading-relaxed">
                  Melbourne. San Francisco. Wherever the right people are.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div>
            <h2 className="font-utility font-bold text-2xl text-white mb-6">Get in Touch</h2>
            <div className="bg-white/[0.02] rounded-lg p-8 border border-white/10">
              <form 
                action="https://gmail.us16.list-manage.com/subscribe/post?u=3aaa79d3d26f27bb92f3a3ab7&amp;id=5dd98e73fa&amp;f_id=00f0c2e1f0" 
                method="post" 
                id="mc-embedded-subscribe-form" 
                name="mc-embedded-subscribe-form" 
                target="_self" 
                noValidate
                className="space-y-6"
              >
                <p className="text-stone-500 text-sm font-utility mb-6">
                  <span className="text-emerald-500">*</span> indicates required
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="mce-FNAME" className="block text-stone-300 text-sm font-utility mb-2">
                      Given Name <span className="text-emerald-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="FNAME" 
                      id="mce-FNAME" 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors font-utility"
                    />
                  </div>
                  <div>
                    <label htmlFor="mce-LNAME" className="block text-stone-300 text-sm font-utility mb-2">
                      Last Name <span className="text-emerald-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="LNAME" 
                      id="mce-LNAME" 
                      required 
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors font-utility"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="mce-EMAIL" className="block text-stone-300 text-sm font-utility mb-2">
                    Email Address <span className="text-emerald-500">*</span>
                  </label>
                  <input 
                    type="email" 
                    name="EMAIL" 
                    id="mce-EMAIL" 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors font-utility"
                  />
                </div>

                <div>
                  <label htmlFor="mce-MMERGE5" className="block text-stone-300 text-sm font-utility mb-2">
                    About you
                  </label>
                  <textarea 
                    name="MMERGE5" 
                    id="mce-MMERGE5" 
                    rows="4"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors font-utility resize-none"
                  />
                </div>

                {/* Honeypot field for spam protection */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-5000px' }}>
                  <input type="text" name="b_3aaa79d3d26f27bb92f3a3ab7_5dd98e73fa" tabIndex="-1" defaultValue="" />
                </div>

                <button 
                  type="submit" 
                  name="subscribe" 
                  id="mc-embedded-subscribe"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-utility font-bold py-3 px-6 rounded-lg transition-colors uppercase tracking-wide text-sm"
                >
                  Contact
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Careers;
