const fs=require('fs'); 
const pages = ['Home','Shop','Product','Cart','Orders','OrderDetail','Wishlist','Profile','Login','Register','NotFound'];
pages.forEach(p => fs.writeFileSync('shopwave-frontend/src/pages/'+p+'.js', 'import React from "react";\nexport default function '+p+'() { return <div className="page"><h1>'+p+'</h1></div>; }')); 

const comps = ['Navbar','Footer','Spinner','Toast'];
comps.forEach(c => fs.writeFileSync('shopwave-frontend/src/components/'+c+'.js', 'import React from "react";\nexport default function '+c+'() { return <div className="component">'+c+'</div>; }')); 

fs.writeFileSync('shopwave-frontend/src/hooks.js', 'export const emitToast = (msg, type) => console.log(type, msg);');
