/* Minimal JavaScript implementing localStorage-backed users, loans and admin features.
   This is intentionally lightweight so it can run as a static site for demo and grading.
*/
(function(){
  // Utilities
  function qs(s,el=document){return el.querySelector(s)}
  function qsa(s,el=document){return [...el.querySelectorAll(s)]}
  function $(id){return document.getElementById(id)}

  // =========================
  // COMPANY-CONTROLLED INTEREST RULES
  // =========================
  function getInterestRate(amount, term){
    if(amount <= 20000){
      return term <= 6 ? 12 : 18; // annual %
    }
    if(amount <= 50000){
      return term <= 6 ? 24 : 30;
    }
    return 36;
  }

  // Initialize sample admin account and data
  let db = JSON.parse(localStorage.getItem('nadalend_db')||'null');
  if(!db){
    db = {users:[],loans:[],transactions:[],nextLoanId:1};
    db.users.push({id:1,name:'Administrator',email:'admin@nadia.local',phone:'',password:'admin123',role:'admin'});
    localStorage.setItem('nadalend_db',JSON.stringify(db));
  }

  function save(){localStorage.setItem('nadalend_db',JSON.stringify(db))}

  // Public API
  window.App = {
    registerUser(data){
      if(db.users.some(u=>u.email===data.email)) throw new Error('Email already registered');
      const id = db.users.length?Math.max(...db.users.map(u=>u.id))+1:2;
      const user = {id,name:data.name,email:data.email,phone:data.phone,password:data.password,role:'customer'};
      db.users.push(user); save(); return user;
    },
    login(email,password){
      const u = db.users.find(x=>x.email===email && x.password===password);
      if(!u) return null;
      sessionStorage.setItem('nadalend_session',JSON.stringify({id:u.id,role:u.role}));
      return u;
    },
    logout(){sessionStorage.removeItem('nadalend_session')},
    currentUser(){
      const s = JSON.parse(sessionStorage.getItem('nadalend_session')||'null');
      if(!s) return null;
      return db.users.find(u=>u.id===s.id)||null;
    },

    // =========================
    // UPDATED LOAN APPLICATION
    // =========================
    applyLoan({amount,term}){
      const user = this.currentUser();
      if(!user) throw new Error('Not logged in');

      const rate = getInterestRate(amount, term); // SYSTEM-CONTROLLED
      const monthlyRate = rate / 100 / 12;
      const n = term;

      const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1+monthlyRate, -n));

      const schedule = [];
      let balance = amount;

      for(let i=1;i<=n;i++){
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance = Math.max(0, balance - principal);
        schedule.push({
          month:i,
          interest:Number(interest.toFixed(2)),
          principal:Number(principal.toFixed(2)),
          balance:Number(balance.toFixed(2))
        });
      }

      const loan = {
        id: db.nextLoanId++,
        applicantId: user.id,
        amount,
        term,
        rate,
        monthlyPayment:Number(monthlyPayment.toFixed(2)),
        schedule,
        status:'pending',
        appliedAt:new Date().toISOString()
      };

      db.loans.push(loan);
      save();
      return loan;
    },

    adminApprove(loanId){
      const loan = db.loans.find(l=>l.id===loanId);
      if(!loan) throw new Error('Loan not found');
      loan.status='approved'; save();
    },

    getUserLoans(userId){return db.loans.filter(l=>l.applicantId===userId)}
  };

  // =========================
  // PAGE WIRING
  // =========================
  document.addEventListener('DOMContentLoaded',()=>{
    const yearEl = qs('#year');
    if(yearEl) yearEl.textContent = new Date().getFullYear();

    // Dashboard
    if(location.pathname.endsWith('dashboard.html')){
      const user = App.currentUser();
      if(!user){location.href='login.html';return;}

      qs('#userName').textContent = user.name;
      qs('#logoutBtn')?.addEventListener('click',()=>{App.logout();location.href='index.html'});

      function renderLoans(){
        const loans = App.getUserLoans(user.id);
        qs('#activeCount').textContent = loans.filter(l=>l.status==='approved').length;

        const outstanding = loans
          .filter(l=>l.status==='approved')
          .reduce((t,l)=>t+(l.monthlyPayment*l.term),0);

        qs('#outstanding').textContent = outstanding.toFixed(2);

        const list = qs('#loansList');
        list.innerHTML = loans.length ? '' : '<p>No loans yet.</p>';

        loans.forEach(l=>{
          const el = document.createElement('div');
          el.className='panel';
          el.innerHTML = `
            <h4>Loan #${l.id} (${l.status.toUpperCase()})</h4>
            <p>Amount: ₱${l.amount.toFixed(2)}</p>
            <p>Term: ${l.term} months</p>
            <p>Interest Rate: ${l.rate}% (annual)</p>
            <p>Monthly Payment: ₱${l.monthlyPayment}</p>
          `;
          list.appendChild(el);
        });
      }

      renderLoans();

      qs('#applyLoanBtn').addEventListener('click',()=>qs('#loanModal').setAttribute('aria-hidden','false'));
      qs('#closeModal').addEventListener('click',()=>qs('#loanModal').setAttribute('aria-hidden','true'));

      qs('#loanForm').addEventListener('submit',e=>{
        e.preventDefault();
        const amount = Number(qs('#amount').value);
        const term = Number(qs('#term').value);

        try{
          App.applyLoan({amount,term});
          alert('Loan application submitted');
          qs('#loanModal').setAttribute('aria-hidden','true');
          location.reload();
        }catch(err){alert(err.message);}
      });

      // Auto-calc rate preview
      qs('#amount').addEventListener('input',updateRate);
      qs('#term').addEventListener('input',updateRate);

      function updateRate(){
        const a = Number(qs('#amount').value);
        const t = Number(qs('#term').value);
        if(a>0 && t>0) qs('#rate').value = getInterestRate(a,t);
      }
    }

    // app.js (Add this code around line 208, after the dashboard '}' bracket)

    // =========================
    // LOGIN PAGE WIRING
    // =========================
    const loginForm = qs('#loginForm');
    if(loginForm){
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            // Assuming input IDs are 'email' and 'password' in login.html
            const email = qs('#email', loginForm).value;
            const password = qs('#password', loginForm).value;

            try {
                const user = App.login(email, password);
                if (user) {
                    location.href = 'dashboard.html';
                } else {
                    alert('Login failed: Invalid email or password.');
                }
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // =========================
    // REGISTRATION PAGE WIRING
    // =========================
    const registerForm = qs('#registerForm');
    if(registerForm){
        registerForm.addEventListener('submit', e => {
            e.preventDefault();
            
            // Assuming input IDs are 'name', 'email', 'phone', and 'password' in register.html
            const data = {
                name: qs('#name', registerForm).value,
                email: qs('#email', registerForm).value,
                phone: qs('#phone', registerForm).value,
                password: qs('#password', registerForm).value
            };

            try {
                App.registerUser(data);
                alert('Registration successful! You can now log in.');
                location.href = 'login.html';
            } catch (err) {
                alert(err.message);
            }
        });
    }
    
    // NOTE: The closing '});' for document.addEventListener('DOMContentLoaded',...) 
    // and the closing '})()' for the IIFE must be after this new code.
  });
})();
