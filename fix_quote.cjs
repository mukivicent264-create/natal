const fs = require('fs');
let code = fs.readFileSync('src/components/QuotePage.tsx', 'utf8');

code = code.replace(
    /                          <form onSubmit={handleSubmit} className="space-y-7">\s*<form onSubmit={handleSubmit} className="space-y-7">/,
    `<form onSubmit={handleSubmit} className="space-y-7">`
);

code = code.replace(
    /          <\/div>\s*<\/div>\s*<\/div>\s*<\/div>/,
    `          </div>
        </div>
      </div>`
);


fs.writeFileSync('src/components/QuotePage.tsx', code);
