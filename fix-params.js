const fs = require('fs');
const path = require('path');

const filesToFix = [
  path.join(process.cwd(), 'app/classes/[id]/page.tsx'),
  path.join(process.cwd(), 'app/equipment/[id]/page.tsx'),
  path.join(process.cwd(), 'app/trainers/[id]/page.tsx')
];

for (const file of filesToFix) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Change interface
    content = content.replace(/params:\s*\{\s*id:\s*string;?\s*\}/, 'params: Promise<{ id: string }>');
    
    // Import use from react
    if (!content.includes('import { use } from "react"')) {
      content = content.replace(/import /, 'import { use } from "react";\nimport ');
    }
    
    // Change function body to unwrap params
    content = content.replace(/(export default function [a-zA-Z]+\(\{\s*params\s*\}:\s*[a-zA-Z]+\)\s*\{)/, '$1\n  const resolvedParams = use(params);');
    
    // Replace params.id with resolvedParams.id
    content = content.replace(/getClassById\(params\.id\)/g, 'getClassById(resolvedParams.id)');
    content = content.replace(/getEquipmentById\(params\.id\)/g, 'getEquipmentById(resolvedParams.id)');
    content = content.replace(/getTrainerById\(params\.id\)/g, 'getTrainerById(resolvedParams.id)');
    
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed params in ' + file);
  }
}
