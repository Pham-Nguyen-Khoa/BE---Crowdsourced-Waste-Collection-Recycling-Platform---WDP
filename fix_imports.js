const fs = require('fs');
const path = require('path');

function walk(d) {
    let results = [];
    const list = fs.readdirSync(d);
    list.forEach(file => {
        const p = path.join(d, file);
        const stat = fs.statSync(p);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(p));
        } else if (p.endsWith('.ts')) {
            results.push(p);
        }
    });
    return results;
}

const files = walk('src');
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('generated/prisma')) {
        let updated = content.replace(/from\s+['"].*generated\/prisma(\/[^'"]*)?['"]/g, "from '@prisma/client'");
        if (content !== updated) {
            fs.writeFileSync(f, updated, 'utf8');
            console.log('Fixed ' + f);
        }
    }
});
