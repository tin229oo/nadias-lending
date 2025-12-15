/* Minimal JavaScript implementing localStorage-backed users, loans and admin features */
(function () {

  /* ---------- Utilities ---------- */
  function qs(s, el = document) { return el.querySelector(s); }

  /* ---------- COMPANY INTEREST RULES ---------- */
  function getInterestRate(amount, term) {
    if (amount <= 20000) return term <= 6 ? 12 : 18;
    if (amount <= 50000) return term <= 6 ? 24 : 30;
    return 36;
  }

  /* ---------- DATABASE ---------- */
  let db = JSON.parse(localStorage.getItem('nadalend_db') || 'null');
  if (!db) {
    db = { users: [], loans: [], nextLoanId: 1 };
    db.users.push({
      id: 1,
      name: 'Administrator',
      email: 'admin@nadia.local',
      password: 'admin123',
      role: 'admin'
    });
    localStorage.setItem('nadalend_db', JSON.stringify(db));
  }

  function save() {
    localStorage.setItem('nadalend_db', JSON.stringify(db));
  }

  /* ---------- PUBLIC API ---------- */
  window.App = {
    registerUser(data) {
      if (db.users.some(u => u.email === data.email))
        throw new Error('Email already registered');

      const id = db.users.length
        ? Math.max(...db.users.map(u => u.id)) + 1
        : 2;

      const user = { id, ...data, role: 'customer' };
      db.users.push(user);
      save();
      return user;
    },

    login(email, password) {
      const u = db.users.find(x => x.email === email && x.password === password);
      if (!u) return null;
      sessionStorage.setItem('nadalend_session', JSON.stringify({ id: u.id }));
      return u;
    },

    logout() {
      sessionStorage.removeItem('nadalend_session');
    },

    currentUser() {
      const s = JSON.parse(sessionStorage.getItem('nadalend_session') || 'null');
      if (!s) return null;
      return db.users.find(u => u.id === s.id) || null;
    },

    applyLoan({ amount, term }) {
      const user = this.currentUser();
      if (!user) throw new Error('Not logged in');

      const rate = getInterestRate(amount, term);
      const monthlyRate = rate / 100 / 12;
      const n = term;

      const monthlyPayment =
        (amount * monthlyRate) /
        (1 - Math.pow(1 + monthlyRate, -n));

      let balance = amount;
      const schedule = [];

      for (let i = 1; i <= n; i++) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance = Math.max(0, balance - principal);
        schedule.push({
          month: i,
          interest: +interest.toFixed(2),
          principal: +principal.toFixed(2),
          balance: +balance.toFixed(2)
        });
      }

      const loan = {
        id: db.nextLoanId++,
        applicantId: user.id,
        amount,
        term,
        rate,
        monthlyPayment: +monthlyPayment.toFixed(2),
        schedule,
        status: 'pending',
        appliedAt: new Date().toISOString()
      };

      db.loans.push(loan);
      save();
      return loan;
    },

    getUserLoans(userId) {
      return db.loans.filter(l => l.applicantId === userId);
    }
  };

  /* ---------- PAGE WIRING ---------- */
  document.addEventListener('DOMContentLoaded', () => {

    /* Dashboard only */
    if (!location.pathname.endsWith('dashboard.html')) return;

    const user = App.currentUser();
    if (!user) {
      location.href = 'login.html';
      return;
    }

    qs('#userName').textContent = user.name;
    qs('#logoutBtn')?.addEventListener('click', () => {
      App.logout();
      location.href = 'index.html';
    });

    function renderLoans() {
      const loans = App.getUserLoans(user.id);
      qs('#activeCount').textContent =
        loans.filter(l => l.status === 'approved').length;

      const outstanding = loans
        .filter(l => l.status === 'approved')
        .reduce((t, l) => t + l.monthlyPayment * l.term, 0);

      qs('#outstanding').textContent = outstanding.toFixed(2);

      const list = qs('#loansList');
      list.innerHTML = loans.length ? '' : '<p>No loans yet.</p>';

      loans.forEach(l => {
        const el = document.createElement('div');
        el.className = 'panel';
        el.innerHTML = `
          <h4>Loan #${l.id} (${l.status.toUpperCase()})</h4>
          <p>Amount: ₱${l.amount.toFixed(2)}</p>
          <p>Term: ${l.term} months</p>
          <p>Interest Rate: ${l.rate}%</p>
          <p>Monthly Payment: ₱${l.monthlyPayment}</p>
        `;
        list.appendChild(el);
      });
    }

    renderLoans();

    /* Modal */
    qs('#applyLoanBtn')?.addEventListener('click', () =>
      qs('#loanModal')?.setAttribute('aria-hidden', 'false')
    );

    qs('#closeModal')?.addEventListener('click', () =>
      qs('#loanModal')?.setAttribute('aria-hidden', 'true')
    );

    qs('#loanForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const amount = Number(qs('#amount').value);
      const term = Number(qs('#term').value);

      try {
        App.applyLoan({ amount, term });
        alert('Loan application submitted');
        location.reload();
      } catch (err) {
        alert(err.message);
      }
    });

    /* Auto rate preview */
    function updateRate() {
      const a = Number(qs('#amount')?.value);
      const t = Number(qs('#term')?.value);
      if (a > 0 && t > 0 && qs('#rate')) {
        qs('#rate').value = getInterestRate(a, t);
      }
    }

    qs('#amount')?.addEventListener('input', updateRate);
    qs('#term')?.addEventListener('input', updateRate);
  });

})();
