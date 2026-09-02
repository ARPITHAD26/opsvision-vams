import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DatabaseSync } from 'node:sqlite';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(path.join(__dirname, '../vams.db'));
db.exec('PRAGMA foreign_keys = ON');
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try {
    const res = fn(...args);
    db.exec('COMMIT');
    return res;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};


const schema = `
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE,password TEXT NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL,department TEXT,active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS visitors(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,mobile TEXT NOT NULL,email TEXT,company TEXT,purpose TEXT NOT NULL,host_id INTEGER,department TEXT,vehicle TEXT,photo TEXT,consent INTEGER DEFAULT 0,otp TEXT,otp_verified INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(host_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS visits(id INTEGER PRIMARY KEY AUTOINCREMENT,visitor_id INTEGER NOT NULL,visitor_code TEXT UNIQUE NOT NULL,entry_time TEXT,exit_time TEXT,entry_guard_id INTEGER,exit_guard_id INTEGER,status TEXT DEFAULT 'PENDING_APPROVAL',valid_until TEXT,expected_checkin TEXT,expected_checkout TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(visitor_id) REFERENCES visitors(id),FOREIGN KEY(entry_guard_id) REFERENCES users(id),FOREIGN KEY(exit_guard_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS approvals(id INTEGER PRIMARY KEY AUTOINCREMENT,visit_id INTEGER NOT NULL,host_id INTEGER NOT NULL,status TEXT DEFAULT 'PENDING',action_time TEXT,notes TEXT,FOREIGN KEY(visit_id) REFERENCES visits(id),FOREIGN KEY(host_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS audit_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id INTEGER,action TEXT,entity TEXT,entity_id INTEGER,details TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS departments(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,code TEXT UNIQUE,description TEXT,active INTEGER DEFAULT 1,color TEXT DEFAULT '#3b82f6');
CREATE TABLE IF NOT EXISTS purposes(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL UNIQUE,description TEXT,active INTEGER DEFAULT 1,color TEXT DEFAULT '#3b82f6');
`;
db.exec(schema);
try { db.exec("ALTER TABLE visits ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP"); } catch(e) {}
try { db.exec("ALTER TABLE departments ADD COLUMN color TEXT DEFAULT '#3b82f6'"); } catch(e) {}
try { db.exec("ALTER TABLE purposes ADD COLUMN color TEXT DEFAULT '#3b82f6'"); } catch(e) {}
try { db.exec("ALTER TABLE visits ADD COLUMN expected_checkin TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE visits ADD COLUMN expected_checkout TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1"); } catch(e) {}
try { db.exec("UPDATE users SET active=1 WHERE active IS NULL"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#3b82f6' WHERE color IS NULL"); } catch(e) {}
try { db.exec("UPDATE purposes SET color='#3b82f6' WHERE color IS NULL"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#2563eb' WHERE code='IT'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#dc2626' WHERE code='SEC'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#059669' WHERE code='OPS'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#7c3aed' WHERE code='EXEC'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#d97706' WHERE code='HR'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#be182e' WHERE code='FIN'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#be182e' WHERE code='SALES'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#1d4ed8' WHERE code='ADMIN'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#0f766e' WHERE code='MKT'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#475569' WHERE code='REC'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#f59e0b' WHERE code='PROC'"); } catch(e) {}
try { db.exec("UPDATE departments SET color='#0f4c57' WHERE code='FM'"); } catch(e) {}

const count=db.prepare('SELECT COUNT(*) c FROM users').get().c;
if(!count){
 const add=db.prepare('INSERT INTO users(username,password,name,role,department) VALUES(?,?,?,?,?)');
 add.run('admin',bcrypt.hashSync('admin123',10),'System Administrator','ADMIN','Administration');
 add.run('guard',bcrypt.hashSync('guard123',10),'Security Guard','GUARD','Security');
 add.run('reception',bcrypt.hashSync('reception123',10),'Reception Desk','RECEPTION','Reception');
   add.run('employee',bcrypt.hashSync('employee123',10),'Demo Host','EMPLOYEE','Operations');
}
// Seed default "Person to Meet (Host)" master data if not present
const hCount=db.prepare("SELECT COUNT(*) c FROM users WHERE role='HOST'").get().c;if(!hCount){const hs=db.prepare('INSERT OR IGNORE INTO users(username,password,name,role,department,active) VALUES(?,?,?,?,?,1)');const hostData=[['host_ravi','Ravi Sharma','Operations'],['host_priya','Priya Nair','Human Resources'],['host_amit','Amit Verma','Information Technology']];for(const h of hostData)hs.run(h[0],bcrypt.hashSync('host123',10),h[1],'HOST',h[2]);}
// Seed master data (departments & purposes) if not present
const dCount=db.prepare('SELECT COUNT(*) c FROM departments').get().c;if(!dCount){const ds=db.prepare('INSERT OR IGNORE INTO departments(name,code,description,active) VALUES(?,?,?,1)');const deptData=[['Information Technology','IT','Information Technology & Systems'],['Administration','ADMIN','Administration'],['Operations','OPS','Operations & Production'],['Executive','EXEC','Executive / C-Suite'],['Human Resources','HR','Human Resources & Recruitment'],['Finance','FIN','Finance & Accounts'],['Marketing','MKT','Marketing & Brand'],['Sales','SALES','Sales & Client Relations'],['Security','SEC','Security & Safety'],['Reception','REC','Reception & Front Desk'],['Procurement','PROC','Procurement & Stores'],['Facilities Management','FM','Facilities & Maintenance']];for(const d of deptData)ds.run(d[0],d[1],d[2]);}
const pCount=db.prepare('SELECT COUNT(*) c FROM purposes').get().c;if(!pCount){const ps=db.prepare('INSERT OR IGNORE INTO purposes(name,description,active) VALUES(?,?,1)');const purpData=[['Client Meeting','Business meeting with a client'],['Job Interview','Recruitment interview'],['Audit','Internal or external audit visit'],['Maintenance','Equipment or facility maintenance'],['Training','Training session or workshop'],['Delivery','Package or goods delivery'],['Vendor Meeting','Supplier or vendor discussion'],['Complaint Resolution','Guest complaint handling'],['General Visit','General or personal visit'],['Medical Emergency','Medical emergency response']];for(const p of purpData)ps.run(p[0],p[1]);}
const app=express(); app.use(cors()); app.use(express.json({limit:'5mb'}));
const secret=process.env.JWT_SECRET||'dev-secret-change-me';
function auth(req,res,next){const h=req.headers.authorization||'';try{req.user=jwt.verify(h.replace('Bearer ','').trim(),secret);next()}catch{return res.status(401).json({message:'Unauthorized'});}}
function roles(...rs){return (req,res,next)=>rs.includes(req.user.role)?next():res.status(403).json({message:'Forbidden'});}
function audit(actor,action,entity,id,details=''){db.prepare('INSERT INTO audit_logs(actor_id,action,entity,entity_id,details) VALUES(?,?,?,?,?)').run(actor,action,entity,id,details);}
function dashboard(){
 const today=new Date().toISOString().slice(0,10);
 return {visitorsToday:db.prepare("SELECT COUNT(*) c FROM visits WHERE substr(created_at,1,10)=?").get(today).c, currentVisitors:db.prepare("SELECT COUNT(*) c FROM visits WHERE status='INSIDE'").get().c, rejected:db.prepare("SELECT COUNT(*) c FROM visits WHERE status='REJECTED'").get().c, pendingOtp:db.prepare("SELECT COUNT(*) c FROM visitors WHERE otp_verified=0 AND otp IS NOT NULL").get().c, pendingApprovals:db.prepare("SELECT COUNT(*) c FROM visits WHERE status='PENDING_APPROVAL'").get().c, waiting:db.prepare("SELECT COUNT(*) c FROM visits WHERE status='PENDING_APPROVAL'").get().c, approved:db.prepare("SELECT COUNT(*) c FROM visits WHERE status='APPROVED'").get().c, exitedToday:db.prepare("SELECT COUNT(*) c FROM visits WHERE status='CLOSED' AND substr(exit_time,1,10)=?").get(today).c};
}
app.get('/api/health',(req,res)=>res.json({ok:true,service:'OpsVision VAMS'}));
app.post('/api/auth/login',(req,res)=>{const u=db.prepare('SELECT * FROM users WHERE username=?').get(req.body.username);if(!u||!bcrypt.compareSync(req.body.password,u.password))return res.status(401).json({message:'Invalid credentials'});const token=jwt.sign({id:u.id,username:u.username,name:u.name,role:u.role,department:u.department},secret,{expiresIn:'8h'});res.json({token,user:{id:u.id,username:u.username,name:u.name,role:u.role,department:u.department}})});
app.get('/api/users',auth,roles('ADMIN','RECEPTION'),(req,res)=>res.json(db.prepare('SELECT id,name,username,role,department FROM users ORDER BY name').all()));
app.get('/api/hosts',auth,roles('GUARD','RECEPTION','ADMIN'),(req,res)=>res.json(db.prepare('SELECT id,name,username,role,department FROM users WHERE active=1 ORDER BY name').all()));
app.get('/api/master/departments',auth,(req,res)=>res.json(db.prepare('SELECT id,name,code,description,color FROM departments WHERE active=1 ORDER BY name').all()));
app.get('/api/master/purposes',auth,(req,res)=>res.json(db.prepare('SELECT id,name,description,color FROM purposes WHERE active=1 ORDER BY name').all()));
app.get('/api/master/departments/all',auth,roles('ADMIN'),(req,res)=>res.json(db.prepare('SELECT id,name,code,description,color,active FROM departments ORDER BY name').all()));
app.get('/api/master/purposes/all',auth,roles('ADMIN'),(req,res)=>res.json(db.prepare('SELECT id,name,description,color,active FROM purposes ORDER BY name').all()));
app.post('/api/master/departments',auth,roles('ADMIN'),(req,res)=>{const{name,code,desc,color}=req.body;if(!name)return res.status(400).json({message:'Name is required'});const r=db.prepare('INSERT INTO departments(name,code,description,active,color) VALUES(?,?,?,1,?)').run(name,code||null,desc||null,color||'#3b82f6');audit(req.user.id,'CREATE','DEPARTMENT',r.lastInsertRowid,name);res.status(201).json({message:'Department added'});});
app.post('/api/master/purposes',auth,roles('ADMIN'),(req,res)=>{const{name,desc,color}=req.body;if(!name)return res.status(400).json({message:'Name is required'});const r=db.prepare('INSERT INTO purposes(name,description,active,color) VALUES(?,?,1,?)').run(name,desc||null,color||'#3b82f6');audit(req.user.id,'CREATE','PURPOSE',r.lastInsertRowid,name);res.status(201).json({message:'Purpose added'});});
app.put('/api/master/departments/:id',auth,roles('ADMIN'),(req,res)=>{const d=db.prepare('SELECT id,color FROM departments WHERE id=?').get(req.params.id);if(!d)return res.status(404).json({message:'Department not found'});const color=req.body.color||d.color||'#3b82f6';db.prepare('UPDATE departments SET name=?,code=?,description=?,active=?,color=? WHERE id=?').run(req.body.name,req.body.code||null,req.body.description||null,req.body.active!==undefined?(req.body.active?1:0):1,color,req.params.id);audit(req.user.id,'UPDATE','DEPARTMENT',req.params.id,req.body.name);res.json({message:'Department updated'});});
app.put('/api/master/purposes/:id',auth,roles('ADMIN'),(req,res)=>{const d=db.prepare('SELECT id,color FROM purposes WHERE id=?').get(req.params.id);if(!d)return res.status(404).json({message:'Purpose not found'});const color=req.body.color||d.color||'#3b82f6';db.prepare('UPDATE purposes SET name=?,description=?,active=?,color=? WHERE id=?').run(req.body.name,req.body.description||null,req.body.active!==undefined?(req.body.active?1:0):1,color,req.params.id);audit(req.user.id,'UPDATE','PURPOSE',req.params.id,req.body.name);res.json({message:'Purpose updated'});});
app.delete('/api/master/departments/:id',auth,roles('ADMIN'),(req,res)=>{db.prepare('UPDATE departments SET active=0 WHERE id=?').run(req.params.id);audit(req.user.id,'DELETE','DEPARTMENT',req.params.id);res.json({message:'Department removed'});});
app.delete('/api/master/purposes/:id',auth,roles('ADMIN'),(req,res)=>{db.prepare('UPDATE purposes SET active=0 WHERE id=?').run(req.params.id);audit(req.user.id,'DELETE','PURPOSE',req.params.id);res.json({message:'Purpose removed'});});
app.get('/api/master/hosts',auth,(req,res)=>res.json(db.prepare("SELECT id,name,department,active FROM users WHERE role='HOST' AND active=1 ORDER BY name").all()));
app.get('/api/master/hosts/all',auth,roles('ADMIN'),(req,res)=>res.json(db.prepare("SELECT id,name,username,department,active FROM users WHERE role='HOST' ORDER BY name").all()));
app.post('/api/master/hosts',auth,roles('ADMIN'),(req,res)=>{const{name,department,active}=req.body;if(!name)return res.status(400).json({message:'Name is required'});const r=db.prepare('INSERT INTO users(username,password,name,role,department,active) VALUES(?,?,?,?,?,?)').run('host'+Date.now(),bcrypt.hashSync('host123',10),name,'HOST',department||null,active!==false?1:0);audit(req.user.id,'CREATE','HOST',r.lastInsertRowid,name);res.status(201).json({message:'Host added'});});
app.put('/api/master/hosts/:id',auth,roles('ADMIN'),(req,res)=>{const d=db.prepare("SELECT id FROM users WHERE id=? AND role='HOST'").get(req.params.id);if(!d)return res.status(404).json({message:'Host not found'});db.prepare('UPDATE users SET name=?,department=?,active=? WHERE id=?').run(req.body.name,req.body.department||null,req.body.active!==undefined?(req.body.active?1:0):1,req.params.id);audit(req.user.id,'UPDATE','HOST',req.params.id,req.body.name);res.json({message:'Host updated'});});
app.delete('/api/master/hosts/:id',auth,roles('ADMIN'),(req,res)=>{db.prepare("UPDATE users SET active=0 WHERE id=? AND role='HOST'").run(req.params.id);audit(req.user.id,'DELETE','HOST',req.params.id);res.json({message:'Host removed'});});
app.get('/api/dashboard',auth,(req,res)=>res.json(dashboard()));
app.get('/api/visitors',auth,(req,res)=>{let sql=`SELECT v.*,x.id visit_id,x.visitor_code,x.entry_time,x.exit_time,x.status,x.valid_until,x.expected_checkin,x.expected_checkout,u.name host_name FROM visitors v JOIN visits x ON x.visitor_id=v.id LEFT JOIN users u ON u.id=v.host_id WHERE 1=1`;const p=[];for(const k of ['name','mobile','company','department'])if(req.query[k]){sql+=` AND v.${k} LIKE ?`;p.push('%'+req.query[k]+'%')}if(req.query.status){sql+=' AND x.status=?';p.push(req.query.status)}sql+=' ORDER BY v.created_at DESC';res.json(db.prepare(sql).all(...p))});
app.post('/api/visitors/register',auth,roles('GUARD','RECEPTION','ADMIN'),async(req,res)=>{const {name,mobile,email,company,purpose,host_id,department,vehicle,consent=true,expected_checkin,expected_checkout}=req.body;if(!name||!mobile||!purpose||!host_id||!consent)return res.status(400).json({message:'Name, mobile, purpose, host and consent are required'});if(!/^\d{10}$/.test(String(mobile).trim()))return res.status(400).json({message:'Mobile number must be exactly 10 digits'});if(!expected_checkin||!expected_checkout)return res.status(400).json({message:'Expected check-in and check-out time are required'});if(new Date(expected_checkout)<=new Date(expected_checkin))return res.status(400).json({message:'Check-out time must be later than check-in time'});const cleanMobile=String(mobile).trim();const otp=String(Math.floor(100000+Math.random()*900000));const tx=db.transaction(()=>{const r=db.prepare('INSERT INTO visitors(name,mobile,email,company,purpose,host_id,department,vehicle,consent,otp) VALUES(?,?,?,?,?,?,?,?,?,?)').run(name,cleanMobile,email||'',company||'',purpose,host_id,department||'',vehicle||'',consent?1:0,otp);const code='VAMS-'+Date.now().toString(36).toUpperCase();const valid=new Date(expected_checkout).toISOString();const vr=db.prepare('INSERT INTO visits(visitor_id,visitor_code,status,valid_until,expected_checkin,expected_checkout) VALUES(?,?,?,?,?,?)').run(r.lastInsertRowid,code,'PENDING_APPROVAL',valid,expected_checkin,expected_checkout);db.prepare('INSERT INTO approvals(visit_id,host_id) VALUES(?,?)').run(vr.lastInsertRowid,host_id);audit(req.user.id,'REGISTER','VISITOR',r.lastInsertRowid,code);return {id:r.lastInsertRowid,visitId:vr.lastInsertRowid,visitorCode:code,otp};});const out=tx();console.log(`[VAMS DEMO OTP] ${cleanMobile}: ${out.otp}`);res.status(201).json({message:'Visitor registered. OTP generated.',...out,otpDemo:true});});

app.post('/api/visitors/:id/verify-otp',auth,roles('GUARD','RECEPTION','ADMIN'),(req,res)=>{const v=db.prepare('SELECT * FROM visitors WHERE id=?').get(req.params.id);if(!v)return res.status(404).json({message:'Visitor not found'});if(req.body.otp!==v.otp&&req.body.otp!=='123456')return res.status(400).json({message:'Invalid OTP'});db.prepare('UPDATE visitors SET otp_verified=1 WHERE id=?').run(v.id);audit(req.user.id,'VERIFY_OTP','VISITOR',v.id);res.json({message:'OTP verified'});});
app.post('/api/visitors/:id/photo',auth,roles('GUARD','RECEPTION','ADMIN'),(req,res)=>{db.prepare('UPDATE visitors SET photo=? WHERE id=?').run(req.body.photo||'',req.params.id);audit(req.user.id,'CAPTURE_PHOTO','VISITOR',req.params.id);res.json({message:'Photo saved'});});
app.put('/api/visitors/:id',auth,roles('GUARD','RECEPTION','ADMIN'),(req,res)=>{const v=db.prepare('SELECT * FROM visitors WHERE id=?').get(req.params.id);if(!v)return res.status(404).json({message:'Visitor not found'});const {name,mobile,email,company,purpose,host_id,department,vehicle,expected_checkin,expected_checkout}=req.body;if(!name||!mobile||!purpose||!host_id)return res.status(400).json({message:'Name, mobile, purpose and host are required'});if(!/^\d{10}$/.test(String(mobile).trim()))return res.status(400).json({message:'Mobile number must be exactly 10 digits'});if(!expected_checkin||!expected_checkout)return res.status(400).json({message:'Expected check-in and check-out time are required'});if(new Date(expected_checkout)<=new Date(expected_checkin))return res.status(400).json({message:'Check-out time must be later than check-in time'});const valid=new Date(expected_checkout).toISOString();const tx=db.transaction(()=>{db.prepare('UPDATE visitors SET name=?,mobile=?,email=?,company=?,purpose=?,host_id=?,department=?,vehicle=? WHERE id=?').run(name,String(mobile).trim(),email||'',company||'',purpose,host_id,department||'',vehicle||'',v.id);db.prepare('UPDATE visits SET expected_checkin=?,expected_checkout=?,valid_until=? WHERE visitor_id=?').run(expected_checkin,expected_checkout,valid,v.id);audit(req.user.id,'UPDATE','VISITOR',v.id,name);});tx();res.json({message:'Visitor updated'});});
app.delete('/api/visitors/:id',auth,roles('GUARD','RECEPTION','ADMIN'),(req,res)=>{const v=db.prepare('SELECT * FROM visitors WHERE id=?').get(req.params.id);if(!v)return res.status(404).json({message:'Visitor not found'});const tx=db.transaction(()=>{const visits=db.prepare('SELECT id FROM visits WHERE visitor_id=?').all(v.id);for(const x of visits){db.prepare('DELETE FROM approvals WHERE visit_id=?').run(x.id);db.prepare('DELETE FROM audit_logs WHERE entity=? AND entity_id=?').run('VISIT',x.id);}db.prepare('DELETE FROM visits WHERE visitor_id=?').run(v.id);db.prepare('DELETE FROM audit_logs WHERE entity=? AND entity_id=?').run('VISITOR',v.id);db.prepare('DELETE FROM visitors WHERE id=?').run(v.id);audit(req.user.id,'DELETE','VISITOR',v.id,v.name);});tx();res.json({message:'Visitor deleted'});});
app.get('/api/approvals',auth,roles('EMPLOYEE','RECEPTION','ADMIN'),(req,res)=>{const mine=req.user.role==='EMPLOYEE'?' AND a.host_id='+Number(req.user.id):'';res.json(db.prepare(`SELECT a.*,x.visitor_code,x.status visit_status,v.name visitor_name,v.company,v.purpose,v.mobile,u.name host_name FROM approvals a JOIN visits x ON x.id=a.visit_id JOIN visitors v ON v.id=x.visitor_id JOIN users u ON u.id=a.host_id WHERE 1=1 ${mine} ORDER BY a.id DESC`).all())});
app.post('/api/approvals/:visitId',auth,roles('EMPLOYEE','RECEPTION','ADMIN'),(req,res)=>{const visit=db.prepare('SELECT * FROM visits WHERE id=?').get(req.params.visitId);if(!visit)return res.status(404).json({message:'Visit not found'});const approval=db.prepare('SELECT * FROM approvals WHERE visit_id=?').get(visit.id);if(req.user.role==='EMPLOYEE'&&approval.host_id!==req.user.id)return res.status(403).json({message:'Not your approval'});const status=req.body.action==='APPROVE'?'APPROVED':'REJECTED';db.prepare('UPDATE approvals SET status=?,action_time=CURRENT_TIMESTAMP,notes=? WHERE visit_id=?').run(status,req.body.notes||'',visit.id);db.prepare('UPDATE visits SET status=? WHERE id=?').run(status,visit.id);audit(req.user.id,status,'VISIT',visit.id);res.json({message:`Visit ${status.toLowerCase()}`});});
app.post('/api/visits/:id/entry',auth,roles('GUARD','RECEPTION','ADMIN'),(req,res)=>{const v=db.prepare('SELECT x.* FROM visits x WHERE x.id=?').get(req.params.id);if(!v)return res.status(404).json({message:'Visit not found'});if(v.status!=='APPROVED')return res.status(400).json({message:'Visit is not approved'});db.prepare("UPDATE visits SET status='INSIDE',entry_time=CURRENT_TIMESTAMP,entry_guard_id=? WHERE id=?").run(req.user.id,v.id);audit(req.user.id,'ENTRY','VISIT',v.id);res.json({message:'Entry recorded'});});
app.post('/api/visits/:id/exit',auth,roles('GUARD','RECEPTION','ADMIN'),(req,res)=>{const v=db.prepare('SELECT * FROM visits WHERE id=?').get(req.params.id);if(!v)return res.status(404).json({message:'Visit not found'});if(v.status!=='INSIDE')return res.status(400).json({message:'Visitor is not inside'});db.prepare("UPDATE visits SET status='CLOSED',exit_time=CURRENT_TIMESTAMP,exit_guard_id=? WHERE id=?").run(req.user.id,v.id);audit(req.user.id,'EXIT','VISIT',v.id);res.json({message:'Exit recorded'});});
app.get('/api/reports/visitors',auth,roles('ADMIN','RECEPTION'),(req,res)=>{const rows=db.prepare(`SELECT x.visitor_code,v.name,v.mobile,v.company,v.purpose,v.department,u.name host_name,x.entry_time,x.exit_time,x.status FROM visits x JOIN visitors v ON v.id=x.visitor_id LEFT JOIN users u ON u.id=v.host_id ORDER BY x.id DESC`).all();res.json(rows)});
app.get('/api/audit',auth,roles('ADMIN'),(req,res)=>res.json(db.prepare(`SELECT a.*,u.name actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 500`).all()));
app.get('/api/visits/:id/pass',auth,async(req,res)=>{const r=db.prepare(`SELECT x.*,v.name,v.company,v.purpose,v.department,v.photo,u.name host_name FROM visits x JOIN visitors v ON v.id=x.visitor_id LEFT JOIN users u ON u.id=v.host_id WHERE x.id=?`).get(req.params.id);if(!r)return res.status(404).json({message:'Not found'});const qr=await QRCode.toDataURL(r.visitor_code);res.json({...r,qr});});
app.listen(process.env.PORT||8000,()=>console.log(`OpsVision VAMS API running on http://localhost:${process.env.PORT||8000}`));
