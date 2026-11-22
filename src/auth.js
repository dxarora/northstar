import { supabase, supabaseConfigured } from './lib/supabase.js';
import { migrateLocalData } from './lib/migrate-local-data.js';
import { loadAccountData } from './lib/data.js';

const root=document.querySelector('#authRoot');
const app=document.querySelector('#appShell');
const loading=document.querySelector('#bootLoader');
const q=(selector)=>document.querySelector(selector);
let activeUserId=null;

function message(text,kind='info'){const status=q('#authStatus');if(status){status.textContent=text;status.dataset.kind=kind;}}
function showAuth(){loading.hidden=true;app.hidden=true;root.hidden=false;}
function showApp(){root.hidden=true;loading.hidden=true;app.hidden=false;}

async function signInGoogle(){
  if(!supabaseConfigured)return message('Add your Supabase URL and publishable key to Vercel environment variables first.','error');
  message('Opening Google sign-in…');
  const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin,queryParams:{prompt:'select_account'}}});
  if(error)message(error.message,'error');
}
async function signInEmail(event){
  event.preventDefault();
  const email=q('#email').value.trim(),password=q('#password').value;
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error)message(error.message,'error');
}
async function signUp(event){
  event.preventDefault();
  const email=q('#email').value.trim(),password=q('#password').value;
  if(password.length<10)return message('Use at least 10 characters for your password.','error');
  const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});
  if(error)message(error.message,'error');else message('Check your email to confirm your account.','success');
}
async function recover(){
  const email=q('#email').value.trim();
  if(!email)return message('Enter your email address first.','error');
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
  message(error?error.message:'Password recovery email sent.',error?'error':'success');
}
function renderPasswordRecovery(){
  root.innerHTML='<div class="auth-wrap"><div class="auth-brand"><div class="brand-mark">✳</div><div>NORTHSTAR<small>PERSONAL LIFE OS</small></div></div><div class="auth-card"><div class="eyebrow">ACCOUNT SECURITY</div><h1>Choose a new password<span class="period">.</span></h1><p class="auth-subtitle">Use a strong password you have not used elsewhere.</p><form id="recoveryForm"><label>New password<input id="newPassword" type="password" autocomplete="new-password" minlength="10" required placeholder="At least 10 characters"></label><button class="auth-submit" type="submit">Update password <span>↗</span></button></form><div id="authStatus" class="auth-status" role="status"></div></div><div class="auth-foot">PRIVATE BY DESIGN · BUILT FOR YOUR LIFE</div></div>';
  q('#recoveryForm').addEventListener('submit',async event=>{event.preventDefault();const password=q('#newPassword').value;if(password.length<10)return message('Use at least 10 characters.','error');const {error}=await supabase.auth.updateUser({password});if(error)return message(error.message,'error');message('Password updated. Opening your workspace…','success');const {data:{session}}=await supabase.auth.getSession();if(session)onAuthenticated(session);});
}
function renderAuth(){
  root.innerHTML='<div class="auth-wrap"><div class="auth-brand"><div class="brand-mark">✳</div><div>NORTHSTAR<small>PERSONAL LIFE OS</small></div></div><div class="auth-card"><div class="eyebrow">YOUR SPACE, YOUR PACE</div><h1>Welcome back<span class="period">.</span></h1><p class="auth-subtitle">Sign in to continue building a life that feels like yours.</p><button class="google-button" id="googleLogin"><span class="google-g">G</span>Continue with Google</button><div class="auth-divider"><span>OR CONTINUE WITH EMAIL</span></div><form id="loginForm" data-mode="login"><label>Email address<input id="email" type="email" autocomplete="email" required placeholder="you@example.com"></label><label>Password<input id="password" type="password" autocomplete="current-password" minlength="10" required placeholder="Your password"></label><button class="auth-submit" type="submit">Sign in <span>↗</span></button></form><div class="auth-links"><button id="toggleSignup" type="button">Create an account</button><button id="forgotPassword" type="button">Forgot password?</button></div><div id="authStatus" class="auth-status" role="status"></div></div><div class="auth-foot">PRIVATE BY DESIGN · BUILT FOR YOUR LIFE</div></div>';
  q('#googleLogin').addEventListener('click',signInGoogle);
  q('#loginForm').addEventListener('submit',event=>q('#loginForm').dataset.mode==='signup'?signUp(event):signInEmail(event));
  q('#toggleSignup').addEventListener('click',()=>{
    const form=q('#loginForm'),button=q('#toggleSignup'),signup=form.dataset.mode!=='signup';
    form.dataset.mode=signup?'signup':'login';
    form.querySelector('button[type="submit"]').innerHTML=signup?'Create account <span>↗</span>':'Sign in <span>↗</span>';
    button.textContent=signup?'Back to sign in':'Create an account';
    q('#password').setAttribute('autocomplete',signup?'new-password':'current-password');
  });
  q('#forgotPassword').addEventListener('click',recover);
}
async function onAuthenticated(session){
  if(activeUserId===session.user.id)return;
  activeUserId=session.user.id;
  try{
    loading.hidden=false;root.hidden=true;app.hidden=true;
    await migrateLocalData(session.user.id);
    const account=await loadAccountData(session.user.id);
    showApp();
    document.dispatchEvent(new CustomEvent('northstar:authenticated',{detail:{session,appState:account.appState,profile:account.profile}}));
  }catch(error){
    activeUserId=null;showAuth();message('Could not load your account data: '+error.message,'error');
  }
}
export async function startAuth(){
  renderAuth();
  if(!supabaseConfigured){showAuth();message('Supabase is not configured yet. Add the Vercel environment variables and deploy again.','error');return;}
  supabase.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_IN'&&session)onAuthenticated(session);
    if(event==='SIGNED_OUT'){activeUserId=null;app.hidden=true;renderAuth();showAuth();}
    if(event==='PASSWORD_RECOVERY'){renderPasswordRecovery();showAuth();}
  });
  const {data:{session},error}=await supabase.auth.getSession();
  if(error){showAuth();message(error.message,'error');return;}
  if(session)await onAuthenticated(session);else showAuth();
}
export async function signOut(){
  if(!supabase)return;
  const {error}=await supabase.auth.signOut();
  if(error)message(error.message,'error');
}
