import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, MapPin, Phone, Mail, CheckCircle, MessageSquare } from 'lucide-react';
import { companyDetails } from '../data';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { syncUserRecord, recordUserActivity } from '../utils';
import { useSectionContent, ContactContent, defaultContactContent } from '../siteContent';

export default function Contact() {
  const { content } = useSectionContent<ContactContent>('contact', defaultContactContent);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const leadData = {
      name: name.trim(),
      email: email.trim(),
      phone: '',
      service: 'General Inquiry',
      details: message.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      try {
        await addDoc(collection(db, 'leads'), {
          ...leadData,
          createdAt: serverTimestamp()
        });
      } catch (fbErr) {
        console.warn("Firestore leads sync error:", fbErr);
      }

      const currentLocal = JSON.parse(localStorage.getItem('natal_local_leads') || '[]');
      localStorage.setItem('natal_local_leads', JSON.stringify([{ id: 'lead_' + Date.now(), ...leadData }, ...currentLocal]));

      await syncUserRecord({
        name: name.trim(),
        email: email.trim(),
        source: 'Contact Form',
        service: 'General Inquiry',
        details: message.trim(),
        role: 'Client Lead',
        status: 'New Lead',
        initialActivity: {
          type: 'contact',
          title: 'Direct Consultation Message Sent',
          description: `Submitted message: "${message.trim()}"`,
          metadata: {
            channel: 'Contact Form',
            message: message.trim()
          }
        }
      });

      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error(err);
      setSubmitted(true);
    }
  };
  return (
    <section id="contact" className="py-4 sm:py-6 md:py-8 bg-black-pure relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gold/5 to-transparent pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-5 sm:mb-7">
          <h2 className="text-gold tracking-[0.25em] uppercase text-xs sm:text-sm font-semibold mb-1.5">{content.subtitle || 'Contact Us'}</h2>
          <h3 className="font-heading text-2xl sm:text-3xl md:text-4xl text-white font-bold uppercase tracking-wider mb-2">{content.title || "Let's Discuss Your Project"}</h3>
          <p className="text-gray-400 font-light text-xs sm:text-sm">
            {content.description}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start max-w-6xl mx-auto">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="bg-black-rich/50 backdrop-blur-md p-4 sm:p-6 border border-white/5 shadow-2xl"
          >
            {submitted ? (
              <div className="py-8 text-center space-y-3 bg-black-pure/80 border border-gold/40 p-6">
                <CheckCircle size={36} className="text-gold mx-auto" />
                <h4 className="text-white font-heading text-lg font-bold uppercase tracking-wider">Message Received</h4>
                <p className="text-gray-300 text-xs leading-relaxed max-w-sm mx-auto">
                  Thank you for reaching out. Your project inquiry has been saved directly to our client portal. Our master designers will get back to you shortly.
                </p>
              </div>
            ) : (
              <form className="space-y-3 sm:space-y-3.5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="name" className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5 font-semibold">Full Name *</label>
                  <input 
                    type="text" 
                    id="name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 text-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 focus:bg-white/[0.05] transition-colors"
                    placeholder="John Doe"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5 font-semibold">Email Address *</label>
                  <input 
                    type="email" 
                    id="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 text-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 focus:bg-white/[0.05] transition-colors"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5 font-semibold">Your Message *</label>
                  <textarea 
                    id="message" 
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 text-white px-3.5 py-2.5 text-sm focus:outline-none focus:border-gold/50 focus:bg-white/[0.05] transition-colors resize-none"
                    placeholder="Tell us about your project requirements..."
                    required
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure py-3 px-6 uppercase tracking-widest text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] active:scale-95 cursor-pointer group mt-1"
                >
                  <span>Send Message</span>
                  <Send size={15} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </form>
            )}
          </motion.div>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col justify-center h-full space-y-4 sm:space-y-5"
          >
            <div>
              <h4 className="text-lg font-heading mb-2 text-white border-l-2 border-gold pl-3">Get In Touch</h4>
              <p className="text-gray-400 font-light text-xs sm:text-sm mb-4">
                Our team is ready to answer your questions and help you bring your vision to life. Feel free to contact us through any of the channels below.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0 mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-0.5">Office Location</h5>
                  <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{content.location || content.address || companyDetails.location}</p>
                </div>
              </div>

              <a 
                href={`tel:${(content.phoneNumbers?.[0] || content.phone || companyDetails.phoneNumbers[0]).replace(/\s/g, '')}`} 
                onClick={() => {
                  const phoneNum = content.phoneNumbers?.[0] || content.phone || companyDetails.phoneNumbers[0];
                  recordUserActivity({
                    type: 'call',
                    title: 'Phone Consultation Dialed',
                    description: `User clicked to call ${phoneNum} directly from Contact Section.`,
                    metadata: { phoneNumber: phoneNum, section: 'Contact' }
                  });
                }}
                className="flex items-start gap-3.5 group active:scale-[0.98] transition-transform p-1 rounded-sm"
              >
                <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0 mt-0.5 group-hover:bg-gold group-hover:text-black-pure group-active:bg-gold-dark transition-colors">
                  <Phone size={18} />
                </div>
                <div>
                  <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-0.5 group-hover:text-gold transition-colors">Direct Phone Lines</h5>
                  <p className="text-gray-400 text-xs sm:text-sm group-hover:text-gray-200 break-words">
                    {content.phoneNumbers && content.phoneNumbers.length > 0 ? content.phoneNumbers.join(' / ') : (content.phone || companyDetails.phoneNumbers.join(' / '))}
                  </p>
                </div>
              </a>

              <a 
                href={`https://wa.me/256${(content.whatsappNumbers?.[0] || companyDetails.whatsappNumbers[0]).replace(/[^0-9]/g, '').replace(/^0/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const waNum = content.whatsappNumbers?.[0] || companyDetails.whatsappNumbers[0];
                  recordUserActivity({
                    type: 'whatsapp',
                    title: 'WhatsApp Inquiry Initiated',
                    description: `User opened direct WhatsApp chat with ${waNum} from Contact Section.`,
                    metadata: { whatsappNumber: waNum, section: 'Contact' }
                  });
                }}
                className="flex items-start gap-3.5 group active:scale-[0.98] transition-transform p-1 rounded-sm"
              >
                <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0 mt-0.5 group-hover:bg-gold group-hover:text-black-pure group-active:bg-gold-dark transition-colors">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-0.5 group-hover:text-gold transition-colors">WhatsApp Chat</h5>
                  <p className="text-gold/90 text-xs sm:text-sm group-hover:text-gold break-words font-mono font-medium">
                    {content.whatsappNumbers && content.whatsappNumbers.length > 0 ? content.whatsappNumbers.join(' / ') : (content.whatsapp || companyDetails.whatsappNumbers.join(' / '))}
                  </p>
                </div>
              </a>

              <a 
                href={`mailto:${content.email || companyDetails.email}`} 
                className="flex items-start gap-3.5 group active:scale-[0.98] transition-transform p-1 rounded-sm"
              >
                <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0 mt-0.5 group-hover:bg-gold group-hover:text-black-pure group-active:bg-gold-dark transition-colors">
                  <Mail size={18} />
                </div>
                <div>
                  <h5 className="text-white text-xs font-bold uppercase tracking-widest mb-0.5 group-hover:text-gold transition-colors">Email Address</h5>
                  <p className="text-gray-400 text-xs sm:text-sm group-hover:text-gray-200 break-all">{content.email || companyDetails.email}</p>
                </div>
              </a>

              {content.workingHours && (
                <div className="p-3 bg-white/5 border border-gold/20 text-xs text-gray-300">
                  <span className="text-gold font-bold uppercase tracking-wider block mb-0.5">Operating Hours:</span>
                  {content.workingHours}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
