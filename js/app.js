/* Minimal JavaScript implementing localStorage-backed users, loans and admin features.
   This is intentionally lightweight so it can run as a static site for demo and grading.
*/
(function(){
  // Utilities
  function qs(s,el=document){return el.querySelector(s)}
  function qsa(s,el=document){return [...el.querySelectorAll(s)]}
  function $(id){return document.getElementById(id)}

  // Initialize sample admin account and data
  let db = JSON.parse(localStorage.getItem('nadalend_db')||'null');
  if(!db){
    db = {users:[],loans:[],transactions:[],nextLoanId:1};
    // admin default
    db.users.push({id:1,name:'Administrator',email:'admin@nadia.local',phone:'',password:'admin123',role:'admin'});
    localStorage.setItem('nadalend_db',JSON.stringify(db));
  }

  function save(){localStorage.setItem('nadalend_db',JSON.stringify(db))}

  // Public functions that pages will call
  window.App = {
    registerUser(data){
      if(db.users.some(u=>u.email===data.email)) throw new Error('Email already registered');
      const id = db.users.length?Math.max(...db.users.map(u=>u.id))+1:2;
      const user = {id,name:data.name,email:data.email,phone:data.phone,password:data.password,role:'customer'};
      user.id = id; db.users.push(user); save(); return user;
    },
    login(email,password){
      const u = db.users.find(x=>x.email===email && x.password===password);
      if(!u) return null; sessionStorage.setItem('nadalend_session',JSON.stringify({id:u.id,role:u.role}));
      return u;
    },
    logout(){sessionStorage.removeItem('nadalend_session')},
    currentUser(){
      const s = JSON.parse(sessionStorage.getItem('nadalend_session')||'null');
      if(!s) return null; return db.users.find(u=>u.id===s.id)||null;
    },
    applyLoan({amount,term,rate}){
      const user = this.currentUser(); if(!user) throw new Error('Not logged in');
      const id = db.nextLoanId++;
      const monthlyRate = rate/100/12;
      const n = term;
      // amortization (standard annuity formula)
      const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1+monthlyRate, -n));
      const schedule = [];
      let balance = amount;
      for(let i=1;i<=n;i++){
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance = Math.max(0, balance - principal);
        schedule.push({month:i,interest:Number(interest.toFixed(2)),principal:Number(principal.toFixed(2)),balance:Number(balance.toFixed(2))});
      }
      const loan = {id,applicantId:user.id,amount,term,rate,monthlyPayment:Number(monthlyPayment.toFixed(2)),schedule,status:'pending',appliedAt:new Date().toISOString()};
      db.loans.push(loan); save(); return loan;
    },
    adminApprove(loanId){
      const loan = db.loans.find(l=>l.id===loanId); if(!loan) throw new Error('Loan not found'); loan.status='approved'; save();
    },
    getUserLoans(userId){return db.loans.filter(l=>l.applicantId===userId)}
  }

  // Page specific wiring
  document.addEventListener('DOMContentLoaded',()=>{
n    // set year in footer
    const yr = new Date().getFullYear(); const yel = qs('#year'); if(yel) yel.textContent = yr;

    // Navbar toggle for small screens
    qs('.nav-toggle')?.addEventListener('click',()=>{const nav = qs('.main-nav');nav.style.display = nav.style.display==='block'?'':'block'})

    // Register page
    const regForm = qs('#registerForm');
    if(regForm){
      regForm.addEventListener('submit',e=>{
        e.preventDefault();
        const data = {name:qs('#name').value.trim(),email:qs('#email').value.trim(),phone:qs('#phone').value.trim(),password:qs('#password').value};
        try{const user=App.registerUser(data); alert('Account created. Please login.'); location.href='login.html'}catch(err){alert(err.message)}
      })
    }

    // Login page
    const loginForm = qs('#loginForm');
    if(loginForm){
      loginForm.addEventListener('submit',e=>{
        e.preventDefault();
        const email = qs('#loginEmail').value.trim(); const pw = qs('#loginPassword').value;
        const user = App.login(email,pw);
        if(!user){alert('Invalid credentials');return}
        if(user.role==='admin') location.href='admin.html'; else location.href='dashboard.html';
      })
    }

    // Dashboard page wiring
    if(location.pathname.endsWith('dashboard.html')){
      const user = App.currentUser(); if(!user){location.href='login.html';return}
      qs('#userName').textContent = user.name;
      qs('#logoutBtn')?.addEventListener('click',()=>{App.logout(); location.href='index.html'})
      // loans list
      function renderLoans(){
        const loans = App.getUserLoans(user.id);
        qs('#activeCount').textContent = loans.filter(l=>l.status==='approved').length;
        const out = loans.reduce((s,l)=>s + (l.status==='approved'? l.monthlyPayment*l.term : 0),0);
        qs('#outstanding').textContent = out.toFixed(2);
        const container = qs('#loansList'); container.innerHTML='';
        if(!loans.length) container.innerHTML='<p>No loans yet.</p>';
        loans.forEach(l=>{
          const el = document.createElement('div'); el.className='panel';
          el.innerHTML = `<h4>Loan #${l.id} - ${l.status.toUpperCase()}</h4><p>Amount: ₱${Number(l.amount).toFixed(2)} | Term: ${l.term} months | Monthly: ₱${l.monthlyPayment}</p>`;
          if(l.status==='approved'){
            const view = document.createElement('a'); view.href='transactions.html'; view.textContent='View Transactions'; el.appendChild(view);
          }
          container.appendChild(el);
        })
      }
      renderLoans();

      // loan modal
      qs('#applyLoanBtn')?.addEventListener('click',()=>{qs('#loanModal').setAttribute('aria-hidden','false')})
      qs('#closeModal')?.addEventListener('click',()=>{qs('#loanModal').setAttribute('aria-hidden','true')})
      qs('#loanForm')?.addEventListener('submit',e=>{
        e.preventDefault();
        const amount = Number(qs('#amount').value); const term = Number(qs('#term').value); const rate = Number(qs('#rate').value);
        try{const loan = App.applyLoan({amount,term,rate}); alert('Application submitted'); qs('#loanModal').setAttribute('aria-hidden','true'); location.reload()}catch(err){alert(err.message)}
      })
    }

    // Transactions page
    if(location.pathname.endsWith('transactions.html')){
      const user = App.currentUser(); if(!user){location.href='login.html';return}
      qs('#logoutBtn2')?.addEventListener('click',()=>{App.logout(); location.href='index.html'})
      const transContainer = qs('#transactionsList');
      const loans = App.getUserLoans(user.id);
      if(!loans.length) transContainer.innerHTML='<p>No transactions found.</p>';
      loans.forEach(l=>{
        const root = document.createElement('div'); root.className='panel';
        root.innerHTML = `<h3>Loan #${l.id} - ${l.status}</h3><p>Monthly Payment: ₱${l.monthlyPayment}</p>`;
        const table = document.createElement('table'); table.style.width='100%'; table.innerHTML = '<thead><tr><th>Month</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>';
        const tbody = document.createElement('tbody'); l.schedule.forEach(s=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${s.month}</td><td>₱${s.principal}</td><td>₱${s.interest}</td><td>₱${s.balance}</td>`;tbody.appendChild(tr)});
        table.appendChild(tbody); root.appendChild(table); transContainer.appendChild(root);
      })
    }

    // Admin page
    if(location.pathname.endsWith('admin.html')){
      const user = App.currentUser(); if(!user || user.role!=='admin'){location.href='login.html';return}
      qs('#logoutAdmin')?.addEventListener('click',()=>{App.logout(); location.href='index.html'})
      const pending = qs('#pendingList'); const pendLoans = db.loans.filter(l=>l.status==='pending');
      if(!pendLoans.length) pending.innerHTML='<p>No pending applications.</p>';
      pendLoans.forEach(l=>{
        const userRec = db.users.find(u=>u.id===l.applicantId);
        const el = document.createElement('div'); el.className='panel';
        el.innerHTML = `<h4>Loan #${l.id}</h4><p>Applicant: ${userRec?.name||'Unknown'} (${userRec?.email||''})</p><p>Amount: ₱${l.amount} | Term: ${l.term} months | Monthly: ₱${l.monthlyPayment}</p>`;
        const approve = document.createElement('button'); approve.className='button'; approve.textContent='Approve'; approve.addEventListener('click',()=>{App.adminApprove(l.id); alert('Approved'); location.reload()});
        el.appendChild(approve); pending.appendChild(el);
      })

      // Export CSV
      qs('#exportBtn')?.addEventListener('click',()=>{
        const rows = [['LoanID','Applicant','Amount','Term','Rate','Status','AppliedAt']];
        db.loans.forEach(l=>{const u = db.users.find(x=>x.id===l.applicantId); rows.push([l.id,u?.name||'',l.amount,l.term,l.rate,l.status,l.appliedAt])});
        const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob([csv],{type:'text/csv'});
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='loans_report.csv'; a.click(); URL.revokeObjectURL(url);
      })
    }

    // Contact form handler
    const contact = qs('#contactForm'); if(contact){contact.addEventListener('submit',e=>{e.preventDefault();alert('Message sent — for demo it uses local simulation.');contact.reset()})}

  })

  // paste to end of js/app.js or as js/theme.js (included in HTML)
document.addEventListener('DOMContentLoaded', function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  document.querySelectorAll('.btn-like').forEach(btn => {
    btn.addEventListener('click', function () {
      const liked = this.getAttribute('data-liked') === 'true';
      this.setAttribute('data-liked', String(!liked));
      this.setAttribute('aria-pressed', String(!liked));
      this.classList.toggle('liked', !liked);
      const icon = this.querySelector('i');
      if (icon) {
        if (!liked) {
          icon.classList.remove('fa-regular');
          icon.classList.add('fa-solid');
        } else {
          icon.classList.remove('fa-solid');
          icon.classList.add('fa-regular');
        }
      }
    });
  });

  const subscribeForm = document.getElementById('subscribeForm');
  const subMsg = document.getElementById('subMsg');
  subscribeForm?.addEventListener('submit', function (e) {
    e.preventDefault();
    const email = document.getElementById('subEmail')?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      if(subMsg){ subMsg.textContent = 'Please enter a valid email address.'; subMsg.classList.add('text-danger'); }
      return;
    }
    if(subMsg){ subMsg.classList.remove('text-danger'); subMsg.textContent = `Thanks — ${email} added (demo).`; }
    this.reset();
    setTimeout(()=> subMsg && (subMsg.textContent = ''), 4000);
  });
});


})();