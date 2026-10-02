const fs = require('fs');
let code = fs.readFileSync('src/components/QuotePage.tsx', 'utf8');

code = code.replace(
    /\{submitted \? \([\s\S]*?\) : \(/,
    `
              <form onSubmit={handleSubmit} className="space-y-7">`
);

code = code.replace(
    /<\/form>\s*\)\}\s*<\/div>/,
    `</form>
          </div>`
);

code = code.replace(
    /<\/div>\s*<\/div>\s*\);\s*\}\s*$/,
    `</div>
      </div>
      <AnimatePresence>
        {submitted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black-pure/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-black-rich border border-gold/30 p-8 md:p-12 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] max-w-lg w-full text-center relative"
            >
              <div className="w-24 h-24 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold mx-auto mb-6 shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                <CheckCircle size={48} />
              </div>
              <h4 className="font-heading text-3xl md:text-4xl text-white font-bold mb-4">Request Received!</h4>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed mb-8">
                Thank you for reaching out. Our project engineer will review your details and contact you via call or WhatsApp within the next 2 hours.
              </p>
              <button 
                onClick={() => setSubmitted(false)}
                className="w-full py-4 px-6 bg-gold hover:bg-gold-light text-black-pure uppercase tracking-widest font-bold text-sm transition-all rounded-xl shadow-[0_10px_30px_rgba(212,175,55,0.25)] hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                Close Message
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
`
);

fs.writeFileSync('src/components/QuotePage.tsx', code);
