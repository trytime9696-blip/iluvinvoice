import http from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import QRCode from 'qrcode';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const dataDir = path.join(root, 'data');
const usersFile = path.join(dataDir, 'users.json');
const waterFile = user => path.join(dataDir, `water-${String(user.id).replace(/[^a-zA-Z0-9_-]/g,'')}.json`);
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) throw new Error('SESSION_SECRET must be configured');
const routes = new Map([
  ['/','landing.html'],['/app','index.html'],['/water-plant','water-plant.html'],['/ro-water-plant-billing','ro-water-plant-billing.html'],['/login','auth.html'],['/signup','auth.html'],['/landing','landing.html'],['/privacy','privacy.html'],['/terms','terms.html'],['/refunds','refunds.html'],['/contact','contact.html'],
  ['/blog','blog.html'],['/blog/how-to-create-gst-invoice-india','how-to-create-gst-invoice-india.html'],['/blog/free-invoice-generator-india','free-invoice-generator-india.html'],['/blog/freelancer-invoice-format-india','freelancer-invoice-format-india.html'],['/blog/how-to-follow-up-unpaid-invoice','how-to-follow-up-unpaid-invoice.html']
]);
const publicFiles = new Set(['index.html','water-plant.html','water-plant.js','water-plant.css','water-manifest.json','water-sw.js','landing.html','ro-water-plant-billing.html','ro-water-plant-billing.css','ro-water-jar.png','auth.html','privacy.html','terms.html','refunds.html','contact.html','blog.html','how-to-create-gst-invoice-india.html','free-invoice-generator-india.html','freelancer-invoice-format-india.html','how-to-follow-up-unpaid-invoice.html','app.js','auth.js','styles.css','auth.css','landing.css','landing.js','blog.css','legal.css','logo.svg','favicon.svg','sitemap.xml','robots.txt','domain/gst.js','domain/payment.js']);
const mime = new Map([
  ['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],['.xml','application/xml; charset=utf-8'],['.txt','text/plain; charset=utf-8'],['.svg','image/svg+xml'],['.png','image/png'],['.jpg','image/jpeg'],['.webp','image/webp']
]);
const attempts = new Map();
const hashPassword = password => { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; };
const verifyPassword = (password, stored='') => { try { const [salt,key]=stored.split(':'); return timingSafeEqual(Buffer.from(key,'hex'),scryptSync(password,salt,64)); } catch { return false; } };
const sign = value => createHmac('sha256',sessionSecret).update(value).digest('base64url');
const sessionToken = user => { const body=Buffer.from(JSON.stringify({id:user.id,email:user.email,name:user.name,exp:Date.now()+7*86400000})).toString('base64url'); return `${body}.${sign(body)}`; };
const sessionUser = req => { try { const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('iluv_session='))?.split('=')[1]; if(!raw)return null; const [body,sig]=raw.split('.'); const expected=sign(body); if(!body||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null; const value=JSON.parse(Buffer.from(body,'base64url')); return value.exp>Date.now()?value:null; } catch{return null;} };
const json = (res,status,payload) => { const body=JSON.stringify(payload); res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(body); };
const readBody = (req,maxBytes=25000) => new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>maxBytes){reject(new Error('too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(body||'{}'))}catch{reject(new Error('invalid json'))}});req.on('error',reject)});
async function readUsers(){try{return JSON.parse(await readFile(usersFile,'utf8'))}catch{return []}}
async function saveUsers(users){await mkdir(dataDir,{recursive:true});await writeFile(usersFile,JSON.stringify(users,null,2),{mode:0o600})}
function limited(ip){const now=Date.now(),entry=attempts.get(ip)||{count:0,until:now+15*60000};if(now>entry.until){entry.count=0;entry.until=now+15*60000}entry.count++;attempts.set(ip,entry);return entry.count>20}
const server = http.createServer(async (req,res)=>{
  const method = req.method || 'GET';
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname); }
  catch { return json(res,400,{ok:false,error:'Bad request'}); }
  if(pathname==='/api/me'&&method==='GET'){const user=sessionUser(req);return json(res,user?200:401,user?{ok:true,user}:{ok:false,error:'Not signed in'})}
  if(pathname==='/api/signup'&&method==='POST'){
    if(limited(req.socket.remoteAddress||''))return json(res,429,{ok:false,error:'Too many attempts. Try again later.'});
    try{const {name='',email='',password=''}=await readBody(req),cleanEmail=String(email).trim().toLowerCase(),cleanName=String(name).trim();if(cleanName.length<2)return json(res,400,{ok:false,error:'Enter your full name.'});if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))return json(res,400,{ok:false,error:'Enter a valid email address.'});if(String(password).length<8)return json(res,400,{ok:false,error:'Password must be at least 8 characters.'});const users=await readUsers();if(users.some(x=>x.email===cleanEmail))return json(res,409,{ok:false,error:'An account with this email already exists.'});const user={id:`USR-${Date.now()}`,name:cleanName,email:cleanEmail,password:hashPassword(String(password)),role:'user',createdAt:new Date().toISOString()};users.push(user);await saveUsers(users);res.setHeader('Set-Cookie',`iluv_session=${sessionToken(user)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);return json(res,201,{ok:true,user:{id:user.id,name:user.name,email:user.email}})}catch{return json(res,400,{ok:false,error:'Could not create account.'})}
  }
  if(pathname==='/api/login'&&method==='POST'){
    if(limited(req.socket.remoteAddress||''))return json(res,429,{ok:false,error:'Too many attempts. Try again later.'});
    try{const {email='',password=''}=await readBody(req),users=await readUsers(),user=users.find(x=>x.email===String(email).trim().toLowerCase());if(!user||!verifyPassword(String(password),user.password))return json(res,401,{ok:false,error:'Incorrect email or password.'});res.setHeader('Set-Cookie',`iluv_session=${sessionToken(user)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);return json(res,200,{ok:true,user:{id:user.id,name:user.name,email:user.email}})}catch{return json(res,400,{ok:false,error:'Could not sign in.'})}
  }
  if(pathname==='/api/logout'&&method==='POST'){res.setHeader('Set-Cookie','iluv_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');return json(res,200,{ok:true})}
  if(pathname==='/api/water-data'&&method==='GET'){
    const user=sessionUser(req);if(!user)return json(res,401,{ok:false,error:'Not signed in'});
    try{const value=JSON.parse(await readFile(waterFile(user),'utf8'));return json(res,200,{ok:true,data:value})}catch{return json(res,200,{ok:true,data:null})}
  }
  if(pathname==='/api/water-data'&&method==='PUT'){
    const user=sessionUser(req);if(!user)return json(res,401,{ok:false,error:'Not signed in'});
    try{const value=await readBody(req,2_000_000);if(!value||typeof value!=='object'||Array.isArray(value))return json(res,400,{ok:false,error:'Invalid data'});await mkdir(dataDir,{recursive:true});const file=waterFile(user),tmp=`${file}.tmp`;await writeFile(tmp,JSON.stringify(value),{mode:0o600});await import('node:fs/promises').then(x=>x.rename(tmp,file));return json(res,200,{ok:true,savedAt:new Date().toISOString()})}catch(e){return json(res,400,{ok:false,error:e.message==='too large'?'Water Plant data is too large':'Could not save Water Plant data'})}
  }
  if(pathname==='/api/upi-qr'&&method==='GET'){
    const url=new URL(req.url||'/', 'http://localhost'),upi=(url.searchParams.get('upi')||'').trim(),name=(url.searchParams.get('name')||'Business').trim().slice(0,80),invoice=(url.searchParams.get('invoice')||'Invoice').trim().slice(0,40),amount=Number(url.searchParams.get('amount')||0);
    if(!/^[\w.+-]{2,128}@[\w.-]{2,64}$/.test(upi)||!Number.isFinite(amount)||amount<0||amount>10000000){res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});return res.end('Invalid UPI payment details')}
    const payment=`upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoice)}`;
    try{const svg=await QRCode.toString(payment,{type:'svg',errorCorrectionLevel:'M',margin:1,width:220,color:{dark:'#173d35',light:'#ffffff'}});res.writeHead(200,{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff'});return res.end(svg)}catch{return json(res,500,{ok:false,error:'Could not create QR code'})}
  }
  if (method !== 'GET' && method !== 'HEAD') { res.writeHead(405,{'Allow':'GET, HEAD'}); return res.end('Method not allowed'); }
  if((pathname==='/app'||pathname==='/water-plant')&&!sessionUser(req)){res.writeHead(302,{Location:'/login'});return res.end()}
  let relative = routes.get(pathname) || pathname.replace(/^\/+/, '');
  if (!relative || !publicFiles.has(relative) || relative.includes('..') || relative.includes('\\') || relative.startsWith('.')) { res.writeHead(404); return res.end('Not found'); }
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(404); return res.end('Not found'); }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not file');
    const body = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200,{
      'Content-Type': mime.get(ext) || 'application/octet-stream',
      'Content-Length': body.length,
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'",
      'Cache-Control': ['.html','.js','.css'].includes(ext) ? 'no-cache, must-revalidate' : 'public, max-age=300'
    });
    if (method === 'HEAD') return res.end();
    res.end(body);
  } catch {
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});
    res.end('Not found');
  }
});
server.listen(port,'0.0.0.0',()=>console.log(`iluvinvoice.net listening on 0.0.0.0:${port}`));
