import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, MapPin, Phone, Mail, CheckCircle, MessageSquare } from 'lucide-react';
import { companyDetails } from '../data';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  syncUserRecord, 
  recordUserActivity, 
  triggerOwnerEmailNotification,
  triggerOwnerWhatsAppNotification,
  getWhatsAppServiceSettings,
  sanitizeNameInput,
  isValidName,
  isValidEmail,
  sanitizePhoneInput,
  isValidPhone,
  handlePhoneKeyDown,
  handlePhonePaste,
  CONTAINS_DIGITS_OR_SYMBOLS_REGEX,
  handleNameKeyDown,
  handleNamePaste
} from '../utils';
import { useSectionContent, ContactContent, defaultContactContent } from '../siteContent';
import GoldSpinner from './GoldSpinner';

export default function Contact() {
  const { content } = useSectionContent<ContactContent>('contact', defaultContactContent);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [directWhatsAppUrl, setDirectWhatsAppUrl] = useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = sanitizeNameInput(raw);
    if (CONTAINS_DIGITS_OR_SYMBOLS_REGEX.test(raw) || (raw && raw !== clean)) {
      setNameError('Name must contain letters only (no numbers, digits or symbols).');
    } else {
      setNameError('');
    }
    setName(clean);
    if (formError) setFormError('');
  };

  const handleNameBlur = () => {
    if (name.trim() && !isValidName(name)) {
      setNameError('Please enter a valid full name (letters only, at least 2 characters).');
    } else {
      setNameError('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = sanitizePhoneInput(e.target.value);
    setPhone(clean);
    if (phoneError) setPhoneError('');
    if (formError) setFormError('');
  };

  const handlePhoneBlur = () => {
    if (phone.trim() && !isValidPhone(phone)) {
      setPhoneError('Please enter a valid phone number (at least 7 digits, e.g. +256 700 000 000).');
    } else {
      setPhoneError('');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
    if (formError) setFormError('');
  };

  const handleEmailBlur = () => {
    if (email.trim() && !isValidEmail(email)) {
      setEmailError('Please enter a valid email address (e.g. name@domain.com).');
    } else {
      setEmailError('');
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (messageError) setMessageError('');
    if (formError) setFormError('');
  };

  const handleMessageBlur = () => {
    if (message.trim() && message.trim().length < 5) {
      setMessageError('Message must be at least 5 characters long.');
    } else {
      setMessageError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Strict validation
    if (!name.trim() || !isValidName(name)) {
      setNameError('Name must contain letters only (no numbers, digits or symbols) and be at least 2 characters.');
      setFormError('Please enter a valid full name with letters only.');
      return;
    }

    if (!email.trim() || !isValidEmail(email)) {
      setEmailError('Please enter a valid email address.');
      setFormError('Please enter a valid email address.');
      return;
    }

    if (phone.trim() && !isValidPhone(phone)) {
      setPhoneError('Please enter a valid phone number (at least 7 digits).');
      setFormError('Please enter a valid phone number.');
      return;
    }

    if (!message.trim() || message.trim().length < 5) {
      setMessageError('Please enter a message of at least 5 characters describing your project.');
      setFormError('Please enter your project message.');
      return;
    }

    const leadData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      service: 'General Inquiry',
      details: message.trim(),
      source: 'Contact Form',
      createdAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      let createdDocId = 'lead_' + Date.now();
      try {
        const docRef = await addDoc(collection(db, 'leads'), {
          ...leadData,
          createdAt: serverTimestamp()
        });
        createdDocId = docRef.id;
      } catch (fbErr) {
        console.warn("Firestore leads sync error:", fbErr);
      }

      const currentLocal = JSON.parse(localStorage.getItem('natal_local_leads') || '[]');
      localStorage.setItem('natal_local_leads', JSON.stringify([{ id: createdDocId, ...leadData }, ...currentLocal]));

      await syncUserRecord({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
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
            phone: phone.trim(),
            message: message.trim()
          }
        }
      });

      // Automatically queue notification for owner inbox and trigger WhatsApp notification
      triggerOwnerEmailNotification({
        leadType: 'Contact Form',
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        service: 'General Inquiry',
        details: message.trim()
      }).catch(mailErr => console.warn('Email trigger note:', mailErr));

      triggerOwnerWhatsAppNotification({
        leadType: 'Contact Form',
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        service: 'General Inquiry',
        details: message.trim()
      }).then(waRes => {
        if (waRes?.directWhatsAppUrl) {
          setDirectWhatsAppUrl(waRes.directWhatsAppUrl);
        }
      }).catch(waErr => console.warn('WhatsApp trigger note:', waErr));

      // Dispatch global window events to immediately wake up notifications tab and users directory
      window.dispatchEvent(new CustomEvent('natal_lead_submitted', { detail: { id: createdDocId, ...leadData } }));
      window.dispatchEvent(new CustomEvent('natal_users_updated'));
      window.dispatchEvent(new CustomEvent('natal_activity_recorded'));

      setSubmitted(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      setTimeout(() => setSubmitted(false), 12000);
    } catch (err) {
      console.error(err);
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <section id="contact" className="py-4 sm:py-6 md:py-8 bg-black-pure relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-gold/5 to-transparent pointer-events-none"></div>

      <div className="w-full max-w-[98vw] xl:max-w-[95vw] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-5 sm:mb-7">
          <h2 className="text-gold tracking-[0.2em] uppercase text-[11px] sm:text-xs font-semibold mb-1.5">{content.subtitle || 'Contact Us'}</h2>
          <h3 className="font-heading text-xl sm:text-2xl md:text-3xl text-white font-bold uppercase tracking-wider mb-2">{content.title || "Let's Discuss Your Project"}</h3>
          <p className="text-gray-400 font-light text-xs sm:text-sm">
            {content.description}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-start w-full">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="bg-black-rich/50 backdrop-blur-md p-4 sm:p-6 border border-white/5 shadow-2xl"
          >
            {submitted ? (
              <div className="py-8 text-center space-y-3 bg-black-pure/90 border border-gold/40 p-6">
                <CheckCircle size={36} className="text-gold mx-auto" />
                <h4 className="text-white font-heading text-lg font-bold uppercase tracking-wider">Inquiry Received</h4>
                <p className="text-gray-300 text-xs leading-relaxed max-w-sm mx-auto">
                  Thank you for reaching out. Your project inquiry has been recorded and an executive notification has been dispatched to the studio owner's WhatsApp and email.
                </p>
                {directWhatsAppUrl && (
                  <div className="pt-2 max-w-sm mx-auto">
                    <a
                      href={directWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs transition-all shadow-md rounded-sm"
                    >
                      <MessageSquare size={14} />
                      <span>👉 Chat on WhatsApp With Studio Owner ({getWhatsAppServiceSettings().ownerWhatsAppNumber})</span>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <form className="space-y-3 sm:space-y-3.5" onSubmit={handleSubmit}>
                {formError && (
                  <div className="p-2.5 bg-red-950/80 border border-red-500/70 text-red-200 text-xs font-mono flex items-center gap-1.5">
                    <span className="text-red-400 font-bold">⚠</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="name" className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Full Name *</label>
                  </div>
                  <input 
                    type="text" 
                    id="name" 
                    value={name}
                    onChange={handleNameChange}
                    onKeyDown={(e) => handleNameKeyDown(e, setNameError)}
                    onPaste={(e) => handleNamePaste(e, setName, setNameError)}
                    onBlur={handleNameBlur}
                    inputMode="text"
                    autoComplete="name"
                    className={`w-full bg-white/[0.03] border ${nameError ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-gold/50'} text-white px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white/[0.05] transition-colors`}
                    placeholder="e.g. John Kasule"
                    required
                  />
                  {nameError && (
                    <p className="text-[10px] font-mono text-red-400 mt-1 flex items-center gap-1">
                      <span>⚠</span> {nameError}
                    </p>
                  )}
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="email" className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Email Address *</label>
                  </div>
                  <input 
                    type="email" 
                    id="email" 
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    autoComplete="email"
                    className={`w-full bg-white/[0.03] border ${emailError ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-gold/50'} text-white px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white/[0.05] transition-colors`}
                    placeholder="john@example.com"
                    required
                  />
                  {emailError && (
                    <p className="text-[10px] font-mono text-red-400 mt-1 flex items-center gap-1">
                      <span>⚠</span> {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="phone" className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold flex items-center justify-between">
                      <span>Phone / WhatsApp (Optional)</span>
                      <span className="text-gold text-[9px] lowercase font-mono">For instant WhatsApp updates</span>
                    </label>
                  </div>
                  <input 
                    type="tel" 
                    id="phone" 
                    value={phone}
                    onChange={handlePhoneChange}
                    onKeyDown={(e) => handlePhoneKeyDown(e, setPhoneError)}
                    onPaste={(e) => handlePhonePaste(e, setPhone, setPhoneError)}
                    onBlur={handlePhoneBlur}
                    inputMode="tel"
                    autoComplete="tel"
                    className={`w-full bg-white/[0.03] border ${phoneError ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-gold/50'} text-white px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white/[0.05] transition-colors`}
                    placeholder="e.g. +256 700 000 000"
                  />
                  {phoneError && (
                    <p className="text-[10px] font-mono text-red-400 mt-1 flex items-center gap-1">
                      <span>⚠</span> {phoneError}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="message" className="block text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Your Message *</label>
                  </div>
                  <textarea 
                    id="message" 
                    rows={3}
                    value={message}
                    onChange={handleMessageChange}
                    onBlur={handleMessageBlur}
                    minLength={5}
                    className={`w-full bg-white/[0.03] border ${messageError ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-gold/50'} text-white px-3.5 py-2.5 text-sm focus:outline-none focus:bg-white/[0.05] transition-colors resize-none`}
                    placeholder="Tell us about your project requirements..."
                    required
                  ></textarea>
                  {messageError && (
                    <p className="text-[10px] font-mono text-red-400 mt-1 flex items-center gap-1">
                      <span>⚠</span> {messageError}
                    </p>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 sm:h-12 bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure px-6 uppercase tracking-wider text-xs sm:text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.35)] active:scale-95 cursor-pointer group mt-1.5 rounded-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <GoldSpinner size="sm" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
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
