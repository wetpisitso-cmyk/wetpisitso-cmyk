/*
  RMUTI GitHub Pages Frontend
  นำ URL /exec จาก Google Apps Script มาใส่แทนค่าด้านล่าง
*/
const API_URL = 'https://script.google.com/macros/s/AKfycbwj5kPzF3v4yTvN0rv2n92egktw-CNeYPU0NAh7VN9ZXQQrO2lU98QwnDwwkm93HmZj/exec';

const $ = s => document.querySelector(s);
const jobsEl = $('#jobs');
const jobSelect = $('#jobId');
const apiStatus = $('#apiStatus');
const heroStatus = $('#heroStatus');
const heroDetail = $('#heroDetail');
const applyForm = $('#applyForm');
const submitBtn = $('#submitBtn');
const formAlert = $('#formAlert');
const apiFrame = $('#apiFrame');

function uid(){
  return 'REQ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
}
function setOnline(ok,detail=''){
  apiStatus.textContent = ok ? 'ระบบออนไลน์' : 'เชื่อมต่อไม่ได้';
  heroStatus.textContent = ok ? 'พร้อมใช้งาน' : 'ยังไม่พร้อม';
  heroDetail.textContent = detail || (ok ? 'Apps Script API ทำงานปกติ' : 'ตรวจสอบ API URL / Deployment');
}
function showAlert(message,type='ok'){
  formAlert.hidden=false;
  formAlert.className='alert '+type;
  formAlert.textContent=message;
}
function escapeHtml(v=''){
  return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function escapeAttr(v=''){return escapeHtml(v)}
function jsonp(params={},timeout=12000){
  if(!API_URL.startsWith('https://script.google.com/macros/s/')){
    return Promise.reject(new Error('ยังไม่ได้ใส่ Apps Script /exec URL ใน app.js'));
  }
  return new Promise((resolve,reject)=>{
    const callback='__rmuti_cb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const timer=setTimeout(()=>cleanup(new Error('API timeout')),timeout);
    function cleanup(error,data){
      clearTimeout(timer);
      try{delete window[callback]}catch(_){}
      script.remove();
      error?reject(error):resolve(data);
    }
    window[callback]=data=>cleanup(null,data);
    const qs=new URLSearchParams({...params,prefix:callback,_t:Date.now()});
    script.onerror=()=>cleanup(new Error('โหลด API ไม่สำเร็จ'));
    script.src=API_URL+'?'+qs.toString();
    document.head.appendChild(script);
  });
}
async function loadJobs(){
  jobsEl.innerHTML='<div class="skeleton"></div><div class="skeleton"></div>';
  jobSelect.innerHTML='<option value="">กำลังโหลดตำแหน่ง…</option>';
  try{
    const res=await jsonp({action:'listJobs'});
    if(!res||!res.ok) throw new Error(res?.message||'API response ไม่ถูกต้อง');
    const jobs=Array.isArray(res.jobs)?res.jobs:[];
    setOnline(true,'โหลดข้อมูลตำแหน่งแล้ว');
    if(!jobs.length){
      jobsEl.innerHTML='<div class="job"><div><strong>ยังไม่มีตำแหน่งเปิดรับ</strong><small>กรุณาตรวจสอบอีกครั้งภายหลัง</small></div></div>';
      jobSelect.innerHTML='<option value="">ยังไม่มีตำแหน่งเปิดรับ</option>';
      return;
    }
    jobsEl.innerHTML=jobs.map(j=>`
      <div class="job">
        <div><strong>${escapeHtml(j.title)}</strong><small>${escapeHtml(j.department||'')}</small></div>
        <span class="badge">${escapeHtml(j.status||'เปิดรับ')}</span>
      </div>`).join('');
    jobSelect.innerHTML='<option value="">เลือกตำแหน่ง</option>'+jobs.map(j=>`<option value="${escapeAttr(j.id)}">${escapeHtml(j.title)}</option>`).join('');
  }catch(err){
    setOnline(false,err.message);
    jobsEl.innerHTML=`<div class="alert error">${escapeHtml(err.message)}</div>`;
    jobSelect.innerHTML='<option value="">โหลดตำแหน่งไม่สำเร็จ</option>';
  }
}
applyForm.addEventListener('submit',e=>{
  e.preventDefault();
  formAlert.hidden=true;
  if(!API_URL.startsWith('https://script.google.com/macros/s/')){
    showAlert('กรุณาใส่ Apps Script /exec URL ในไฟล์ app.js ก่อน','error');
    return;
  }
  $('#requestId').value=uid();
  applyForm.action=API_URL;
  applyForm.method='POST';
  applyForm.target='apiFrame';
  submitBtn.disabled=true;
  submitBtn.querySelector('span').textContent='กำลังส่งข้อมูล…';
  HTMLFormElement.prototype.submit.call(applyForm);
  window.__submitTimer=setTimeout(()=>{
    submitBtn.disabled=false;
    submitBtn.querySelector('span').textContent='ส่งใบสมัคร';
    showAlert('ยังไม่ได้รับคำตอบจากระบบ กรุณาตรวจสอบ Deployment แล้วลองใหม่','error');
  },20000);
});
window.addEventListener('message',event=>{
  if(event.source!==apiFrame.contentWindow)return;
  const data=event.data;
  if(!data||data.source!=='RMUTI_APPS_SCRIPT')return;
  clearTimeout(window.__submitTimer);
  submitBtn.disabled=false;
  submitBtn.querySelector('span').textContent='ส่งใบสมัคร';
  if(data.ok){
    showAlert(data.message||'บันทึกใบสมัครเรียบร้อย','ok');
    applyForm.reset();
    $('#requestId').value='';
  }else{
    showAlert(data.message||'บันทึกไม่สำเร็จ','error');
  }
});
$('#reloadJobs').addEventListener('click',loadJobs);
loadJobs();