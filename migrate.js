const fs = require('fs');
const path = require('path');

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      if (content.includes('react-router-dom')) {
        content = content.replace(/import\s+{([^}]+)}\s+from\s+['"]react-router-dom['"];?/g, (match, imports) => {
          let nextImports = [];
          let linkImport = '';
          const hasLink = imports.includes('Link');
          const hasNavigate = imports.includes('useNavigate');
          const hasLocation = imports.includes('useLocation');
          const hasParams = imports.includes('useParams');
          
          if (hasLink) linkImport = "import Link from 'next/link';\n";
          if (hasNavigate) nextImports.push('useRouter');
          if (hasLocation) nextImports.push('usePathname', 'useSearchParams');
          if (hasParams) nextImports.push('useParams');
          
          let navImport = nextImports.length > 0 ? `import { ${nextImports.join(', ')} } from 'next/navigation';\n` : '';
          return navImport + linkImport;
        });

        content = content.replace(/useNavigate\(\)/g, 'useRouter()');
        content = content.replace(/const navigate =/g, 'const router =');
        content = content.replace(/navigate\(/g, 'router.push(');
        content = content.replace(/<Link\s+to=/g, '<Link href=');
        changed = true;
      }

      const needsUseClient = content.includes('useState') || 
                             content.includes('useEffect') || 
                             content.includes('useRouter') || 
                             content.includes('usePathname') || 
                             content.includes('useParams');

      if (needsUseClient && !content.includes('"use client"') && !content.includes("'use client'")) {
        content = '"use client";\n\n' + content;
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated ' + fullPath);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src', 'pages'));
processDir(path.join(process.cwd(), 'src', 'components'));
processDir(path.join(process.cwd(), 'src', 'contexts'));
processDir(path.join(process.cwd(), 'app'));
