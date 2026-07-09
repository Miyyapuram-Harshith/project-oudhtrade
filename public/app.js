// OudhTrade Global Marketplace SPA Frontend Module

const state = {
  user: null,
  token: localStorage.getItem('token') || null,
  currentView: 'marketplace', // 'auth', 'onboarding', 'marketplace', 'dashboard', 'chat', 'internal'
  authMode: 'login', // 'login', 'signup', 'otp'
  simulatedOtp: '',
  loginEmail: '',
  loginPassword: '',
  loginRole: 'buyer',
  signupWarningChecked: false,

  // Dashboard & Marketplace state
  listings: [],
  requirements: [],
  myListings: [],
  myRequirements: [],
  searchCategory: '',
  searchRegion: '',
  searchKeyword: '',
  searchSpecies: '',
  searchType: 'listings', // 'listings', 'requirements'

  // Messaging state
  threads: [],
  activeThreadId: null,

  // Internal Staff state
  moderationUsers: [],
  moderationListings: [],
  grievances: [],
  analyticsOverview: null,
  activeStaffTab: 'moderation-users', // 'moderation-users', 'moderation-listings', 'grievances', 'dpo', 'analytics'

  // Company team member switcher state (for multi-user testing in our mockup)
  companyTeam: [],
  activeCompanyMemberId: null,

  theme: localStorage.getItem('theme') || 'dark'
};

// Apply UI Theme
document.body.className = state.theme === 'light' ? 'light-theme' : '';

// Helper Toast Alert
function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast`;
  toast.style.cssText = `
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 4px solid ${isError ? 'var(--accent-crimson)' : 'var(--accent-gold)'};
    padding: 16px 20px;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow);
    color: var(--primary);
    font-size: 0.9rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-width: 320px;
  `;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="color: var(--secondary); background:none; border:none; cursor:pointer;" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// Fetch helper injecting token headers
async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(state.token ? { 'Authorization': `Bearer ${state.token}` } : {}),
    ...options.headers
  };
  try {
    const res = await fetch(endpoint, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server Request failed.');
    }
    return data;
  } catch (error) {
    showToast(error.message, true);
    throw error;
  }
}

// Client router
function navigate(view) {
  state.currentView = view;
  render();

  // Trigger data fetches corresponding to views
  if (view === 'marketplace') {
    fetchMarketplaceData();
  } else if (view === 'dashboard') {
    fetchDashboardData();
  } else if (view === 'chat') {
    fetchChatThreads();
  } else if (view === 'internal') {
    fetchInternalStaffData();
  }
}

// Verify active session on load
async function checkAuthSession() {
  if (state.token) {
    try {
      const data = await apiCall('/api/v1/auth/profile');
      state.user = data.user;
      state.companyTeam = data.companyTeam || [];
      state.activeCompanyMemberId = data.user.id;

      // If user profile displayName/businessName is blank, force Onboarding setup
      if (isProfileEmpty(data.user)) {
        state.currentView = 'onboarding';
      } else {
        state.currentView = 'marketplace';
      }
    } catch (e) {
      localStorage.removeItem('token');
      state.token = null;
      state.user = null;
      state.currentView = 'marketplace';
    }
  } else {
    state.currentView = 'marketplace';
  }
  render();
  if (state.currentView === 'marketplace') {
    fetchMarketplaceData();
  }
}

function isProfileEmpty(user) {
  if (user.role === 'ceo' || user.role === 'ops_lead' || user.role === 'moderator' || user.role === 'support_agent') {
    return false; // internal staff do not require onboarding
  }
  const prof = user.profile || {};
  if (user.role === 'buyer') return !prof.display_name;
  if (user.role === 'seller') return !prof.business_name;
  if (user.role === 'company') return !prof.legal_company_name;
  if (user.role === 'farmer') return !prof.plantation_name;
  if (user.role === 'inoculation_provider') return !prof.provider_business_name;
  if (user.role === 'nursery') return !prof.nursery_business_name;
  return true;
}

window.addEventListener('DOMContentLoaded', () => {
  checkAuthSession();
});

// MAIN UI RENDER PIPELINE
function render() {
  const root = document.getElementById('app-root');
  if (!root) return;

  if (state.currentView === 'auth') {
    root.innerHTML = renderAuthView();
    bindAuthEvents();
  } else if (state.currentView === 'onboarding') {
    root.innerHTML = renderOnboardingView();
    bindOnboardingEvents();
  } else {
    root.innerHTML = `
      <div class="app-container">
        ${renderSidebar()}
        <div class="main-view">
          ${renderHeader()}
          <main class="main-content">
            ${renderContentView()}
          </main>
        </div>
      </div>
    `;
    bindAppEvents();
  }
}

// 1. AUTHENTICATION & LOCK ROLE INTERFACE
function renderAuthView() {
  if (state.authMode === 'otp') {
    return `
      <div style="display:flex; align-items:center; justify-content:center; width:100%; min-height:100vh; background-color: var(--bg-app);">
        <div class="card" style="width:100%; max-width:440px; padding:40px;">
          <h2 style="font-family: var(--font-display); font-size:1.8rem; font-weight:700; margin-bottom:10px; color:var(--accent-gold);">Verify Security Code</h2>
          <p style="color:var(--secondary); font-size:0.9rem; margin-bottom:24px;">Enter the 6-digit verification code sent to verify your email.</p>
          
          <form id="otp-verify-form">
            <div class="form-group" style="margin-bottom:20px;">
              <label style="display:block; font-size:0.85rem; color:var(--secondary); margin-bottom:8px;">6-Digit OTP</label>
              <input type="text" id="otp-code-input" placeholder="e.g. 123456" class="form-input" style="width:100%; padding:12px; font-size:1.1rem; text-align:center; letter-spacing:4px;" required maxlength="6">
              
              <div style="background-color:rgba(212, 175, 55, 0.05); border:1px dashed var(--border); padding:12px; border-radius:var(--radius-sm); font-size:0.85rem; color:var(--accent-gold); text-align:center; margin-top:16px;">
                🔑 Simulated registration verification code: <strong>${state.simulatedOtp}</strong>
              </div>
            </div>
            <button type="submit" class="btn btn-gold" style="width:100%; padding:12px;">Confirm Registration</button>
          </form>
        </div>
      </div>
    `;
  }

  const isLogin = state.authMode === 'login';

  return `
    <div style="display:flex; align-items:center; justify-content:center; width:100%; min-height:100vh; background-color: var(--bg-app); background: radial-gradient(circle at top left, rgba(212, 175, 55, 0.04), transparent 45%);">
      <div class="card" style="width:100%; max-width:480px; padding:40px;">
        <div style="text-align:center; margin-bottom:30px;">
          <div style="width: 48px; height: 48px; border-radius: 10px; background: linear-gradient(135deg, var(--accent-gold), var(--accent-green)); display: inline-flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:1.4rem; margin-bottom:16px;">O</div>
          <h1 style="font-family:var(--font-display); font-size:1.8rem; font-weight:700; color:var(--primary);">OudhTrade</h1>
          <p style="color:var(--secondary); font-size:0.9rem; margin-top:6px;">Global Agarwood Listing & Requirement Platform</p>
        </div>

        <form id="auth-submit-form">
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" id="auth-email-input" class="form-input" placeholder="e.g. partner@oudh.com" required value="${state.loginEmail}">
          </div>

          <div class="form-group" style="margin-bottom:24px;">
            <label>Password</label>
            <input type="password" id="auth-password-input" class="form-input" placeholder="Your account password" required value="${state.loginPassword}">
          </div>

          ${!isLogin ? `
            <div class="form-group" style="margin-bottom:20px;">
              <label>Select Marketplace Locked Role</label>
              <select id="auth-role-select" class="form-select" style="height:46px;">
                <option value="buyer">Buyer (Discover supply & post buying requirements)</option>
                <option value="seller">Seller / Trader (Publish product listings)</option>
                <option value="company">Company Account (Multi-user corporate listings)</option>
                <option value="farmer">Farmer / Grower (Publish plants & by-products)</option>
                <option value="inoculation_provider">Inoculation Specialist (Publish services)</option>
                <option value="nursery">Nursery Operator (Publish saplings & seeds)</option>
              </select>
            </div>

            <div style="background-color:rgba(166, 63, 63, 0.08); border:1px solid rgba(166, 63, 63, 0.25); padding:16px; border-radius:var(--radius-md); margin-bottom:24px;">
              <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; font-size:0.85rem; color:var(--primary); font-weight:600;">
                <input type="checkbox" id="auth-warning-check" style="margin-top:3px;" ${state.signupWarningChecked ? 'checked' : ''}>
                <span>I understand that <strong style="color:var(--accent-gold);">my selected role cannot be changed later</strong> once registered. The platform strictly enforces immutable account roles.</span>
              </label>
            </div>
          ` : ''}

          <button type="submit" class="btn btn-gold" style="width:100%; padding:12px;">
            ${isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        <div style="text-align:center; margin-top:24px; font-size:0.88rem;">
          <a href="#" style="color:var(--accent-gold); text-decoration:none;" id="auth-toggle-btn">
            ${isLogin ? "Need a new account? Register here" : "Already have an account? Log in"}
          </a>
        </div>
      </div>
    </div>
  `;
}

function bindAuthEvents() {
  const toggleBtn = document.getElementById('auth-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.authMode = state.authMode === 'login' ? 'signup' : 'login';
      render();
    });
  }

  const form = document.getElementById('auth-submit-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email-input').value;
      const password = document.getElementById('auth-password-input').value;
      state.loginEmail = email;
      state.loginPassword = password;

      if (state.authMode === 'signup') {
        const role = document.getElementById('auth-role-select').value;
        const warning = document.getElementById('auth-warning-check').checked;
        state.signupWarningChecked = warning;

        if (!warning) {
          showToast('Rule lock check: You must check and acknowledge that role switching is disabled.', true);
          return;
        }

        try {
          const res = await apiCall('/api/v1/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, role })
          });
          state.simulatedOtp = res.simulatedOtp;
          state.authMode = 'otp';
          showToast(res.message);
          render();
        } catch (e) { }
      } else {
        // Login Flow
        try {
          const res = await apiCall('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
          });
          localStorage.setItem('token', res.token);
          state.token = res.token;
          state.user = res.user;
          state.activeCompanyMemberId = res.user.id;

          showToast(res.message);
          if (isProfileEmpty(res.user)) {
            navigate('onboarding');
          } else {
            navigate('marketplace');
          }
        } catch (e) { }
      }
    });
  }

  const verifyForm = document.getElementById('otp-verify-form');
  if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otp = document.getElementById('otp-code-input').value;
      try {
        const res = await apiCall('/api/v1/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ email: state.loginEmail, otp })
        });
        localStorage.setItem('token', res.token);
        state.token = res.token;
        state.user = res.user;
        state.activeCompanyMemberId = res.user.id;
        showToast(res.message);
        navigate('onboarding');
      } catch (e) { }
    });
  }
}

// 2. DYNAMIC ROLE-SPECIFIC ONBOARDING PANEL
function renderOnboardingView() {
  const role = state.user.role;
  let fieldsHtml = '';

  if (role === 'buyer') {
    fieldsHtml = `
      <div class="form-group">
        <label>Public Display Name *</label>
        <input type="text" id="ob-display-name" class="form-input" placeholder="e.g. Perfume House Inc" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Country *</label>
          <input type="text" id="ob-country" class="form-input" placeholder="e.g. India" required>
        </div>
        <div class="form-group">
          <label>Buyer Category *</label>
          <select id="ob-buyer-type" class="form-select">
            <option value="perfumer">Perfumer</option>
            <option value="trader">Trader</option>
            <option value="distillery">Distillery</option>
            <option value="retailer">Retailer</option>
            <option value="collector">Collector</option>
            <option value="investor">Investor</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Organization Name (Optional)</label>
        <input type="text" id="ob-org-name" class="form-input" placeholder="e.g. Aroma Perfumes Co.">
      </div>
      <div class="form-group">
        <label>Areas of Interest (Comma separated)</label>
        <input type="text" id="ob-areas-interest" class="form-input" placeholder="e.g. oud oil, chips, saplings">
      </div>
    `;
  } else if (role === 'seller') {
    fieldsHtml = `
      <div class="form-group">
        <label>Business / Trade Name *</label>
        <input type="text" id="ob-business-name" class="form-input" placeholder="e.g. Assam Agarwood Traders" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Country & Region *</label>
          <input type="text" id="ob-country-region" class="form-input" placeholder="e.g. India (Assam)" required>
        </div>
        <div class="form-group">
          <label>Years in Trade (Optional)</label>
          <input type="number" id="ob-years-trade" class="form-input" min="0" max="99" placeholder="e.g. 5">
        </div>
      </div>
      <div class="form-group">
        <label>Product Categories Offered * (Comma separated)</label>
        <input type="text" id="ob-categories" class="form-input" placeholder="e.g. chips, oud oil, raw wood" required>
      </div>
      <div class="form-group">
        <label>Seller / Business Bio *</label>
        <textarea id="ob-bio" class="form-textarea" rows="4" placeholder="Describe your business and trading history..." required minlength="20" maxlength="1000"></textarea>
      </div>
    `;
  } else if (role === 'company') {
    fieldsHtml = `
      <div class="form-group">
        <label>Legal Corporate Name *</label>
        <input type="text" id="ob-company-name" class="form-input" placeholder="e.g. AgarCorp International Pte Ltd" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Business Registration Number *</label>
          <input type="text" id="ob-reg-num" class="form-input" placeholder="e.g. 201988123K" required>
        </div>
        <div class="form-group">
          <label>Corporate Telephone *</label>
          <input type="text" id="ob-comp-phone" class="form-input" placeholder="e.g. +6567890123" required>
        </div>
      </div>
      <div class="form-group">
        <label>Registered Head Office Address *</label>
        <input type="text" id="ob-comp-address" class="form-input" placeholder="e.g. 10 Anson Rd, Singapore" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Primary Contact Name & Title *</label>
          <input type="text" id="ob-contact-role" class="form-input" placeholder="e.g. Mark Chen (Director)" required>
        </div>
        <div class="form-group">
          <label>Corporate Contact Work Email *</label>
          <input type="email" id="ob-work-email" class="form-input" placeholder="e.g. admin@company.com" required>
        </div>
      </div>
      <div class="form-group">
        <label>Company Portfolio Description *</label>
        <textarea id="ob-comp-desc" class="form-textarea" rows="4" placeholder="Detail your enterprise operations..." required minlength="20" maxlength="1500"></textarea>
      </div>
    `;
  } else if (role === 'farmer') {
    fieldsHtml = `
      <div class="form-group">
        <label>Plantation / Farm Name *</label>
        <input type="text" id="ob-farm-name" class="form-input" placeholder="e.g. Trat Province Aquilaria Estate" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Country & Region *</label>
          <input type="text" id="ob-country-region" class="form-input" placeholder="e.g. Thailand (Trat)" required>
        </div>
        <div class="form-group">
          <label>Plantation Size (approx) *</label>
          <input type="text" id="ob-farm-size" class="form-input" placeholder="e.g. 15 Acres" required>
        </div>
      </div>
      <div class="form-group">
        <label>Exact Cultivation Address / Geo-location *</label>
        <input type="text" id="ob-farm-location" class="form-input" placeholder="GPS points or physical coordinates" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Cultivated Offerings * (Comma separated)</label>
          <input type="text" id="ob-farm-offerings" class="form-input" placeholder="e.g. plants, harvest, by-products" required>
        </div>
        <div class="form-group">
          <label>Years Farming (Optional)</label>
          <input type="number" id="ob-years-farming" class="form-input" min="0" placeholder="e.g. 8">
        </div>
      </div>
      <div class="form-group">
        <label>Plantation Profile Description *</label>
        <textarea id="ob-farm-desc" class="form-textarea" rows="4" placeholder="Describe tree count, species, inoculation age, etc..." required minlength="20" maxlength="1000"></textarea>
      </div>
    `;
  } else if (role === 'inoculation_provider') {
    fieldsHtml = `
      <div class="form-group">
        <label>Inoculation Specialist Business Name *</label>
        <input type="text" id="ob-inoc-name" class="form-input" placeholder="e.g. Bio-Induce Inoculators" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Country & Region *</label>
          <input type="text" id="ob-country-region" class="form-input" placeholder="e.g. Malaysia" required>
        </div>
        <div class="form-group">
          <label>Years of Experience *</label>
          <input type="number" id="ob-years-exp" class="form-input" placeholder="e.g. 10" required min="0">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Service types offered * (Comma separated)</label>
          <input type="text" id="ob-service-types" class="form-input" placeholder="e.g. service, material supply, consulting" required>
        </div>
        <div class="form-group">
          <label>Coverage Areas * (Comma separated)</label>
          <input type="text" id="ob-coverage" class="form-input" placeholder="e.g. Malaysia, Indonesia" required>
        </div>
      </div>
      <div class="form-group">
        <label>Inoculation Methodologies & Bio-tech summary *</label>
        <textarea id="ob-service-desc" class="form-textarea" rows="4" placeholder="Detail your inoculation formulas, drill injection patterns, and track record..." required minlength="20" maxlength="1000"></textarea>
      </div>
    `;
  } else if (role === 'nursery') {
    fieldsHtml = `
      <div class="form-group">
        <label>Nursery Business Name *</label>
        <input type="text" id="ob-nursery-name" class="form-input" placeholder="e.g. Hanoi Green Aquilaria Nursery" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Country & Region *</label>
          <input type="text" id="ob-country-region" class="form-input" placeholder="e.g. Vietnam" required>
        </div>
        <div class="form-group">
          <label>Annual Stock Capacity Scale *</label>
          <input type="text" id="ob-capacity" class="form-input" placeholder="e.g. 40,000 saplings/year" required>
        </div>
      </div>
      <div class="form-group">
        <label>Nursery Physical Address *</label>
        <input type="text" id="ob-nursery-location" class="form-input" placeholder="Exact nursery greenhouse address" required>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Plant Varieties Offered * (Comma separated)</label>
          <input type="text" id="ob-plant-types" class="form-input" placeholder="e.g. saplings, seeds, young plants" required>
        </div>
        <div class="form-group">
          <label>Years in Operation (Optional)</label>
          <input type="number" id="ob-years-op" class="form-input" min="0" placeholder="e.g. 4">
        </div>
      </div>
      <div class="form-group">
        <label>Nursery Operations Description *</label>
        <textarea id="ob-nursery-desc" class="form-textarea" rows="4" placeholder="Cultivation standards, shipping protocols, and species verification..." required minlength="20" maxlength="1000"></textarea>
      </div>
    `;
  }

  return `
    <div style="display:flex; align-items:center; justify-content:center; width:100%; min-height:100vh; background-color: var(--bg-app); padding:40px 20px;">
      <div class="card" style="width:100%; max-width:680px;">
        <h2 style="font-family: var(--font-display); font-size:1.8rem; font-weight:700; color:var(--accent-gold); margin-bottom:8px;">Complete Onboarding Profile</h2>
        <p style="color:var(--secondary); font-size:0.92rem; margin-bottom:28px;">Specify your trade details for locked role: <span class="role-tag" style="background-color:rgba(212,175,55,0.1); color:var(--accent-gold); padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem; text-transform:uppercase;">${role}</span></p>
        
        <form id="onboarding-profile-form">
          ${fieldsHtml}
          <button type="submit" class="btn btn-gold" style="width:100%; padding:14px; margin-top:20px; font-size:1rem;">Finalize Profile Registration</button>
        </form>
      </div>
    </div>
  `;
}

function bindOnboardingEvents() {
  const form = document.getElementById('onboarding-profile-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const role = state.user.role;
      let profile = {};

      if (role === 'buyer') {
        profile = {
          display_name: document.getElementById('ob-display-name').value,
          country: document.getElementById('ob-country').value,
          buyer_type: document.getElementById('ob-buyer-type').value,
          organization_name: document.getElementById('ob-org-name').value,
          areas_of_interest: document.getElementById('ob-areas-interest').value.split(',').map(s => s.trim()).filter(Boolean)
        };
      } else if (role === 'seller') {
        profile = {
          business_name: document.getElementById('ob-business-name').value,
          country_region: document.getElementById('ob-country-region').value,
          years_in_trade: parseInt(document.getElementById('ob-years-trade').value) || 0,
          product_categories: document.getElementById('ob-categories').value.split(',').map(s => s.trim()).filter(Boolean),
          seller_description: document.getElementById('ob-bio').value
        };
      } else if (role === 'company') {
        profile = {
          legal_company_name: document.getElementById('ob-company-name').value,
          business_registration_number: document.getElementById('ob-reg-num').value,
          company_phone: document.getElementById('ob-comp-phone').value,
          registered_country_address: document.getElementById('ob-comp-address').value,
          primary_contact_name_role: document.getElementById('ob-contact-role').value,
          work_email: document.getElementById('ob-work-email').value,
          company_description: document.getElementById('ob-comp-desc').value,
          company_categories: ['products']
        };
      } else if (role === 'farmer') {
        profile = {
          plantation_name: document.getElementById('ob-farm-name').value,
          country_region: document.getElementById('ob-country-region').value,
          plantation_size_approx: document.getElementById('ob-farm-size').value,
          plantation_location: document.getElementById('ob-farm-location').value,
          offerings: document.getElementById('ob-farm-offerings').value.split(',').map(s => s.trim()).filter(Boolean),
          years_farming: parseInt(document.getElementById('ob-years-farming').value) || 0,
          plantation_description: document.getElementById('ob-farm-desc').value
        };
      } else if (role === 'inoculation_provider') {
        profile = {
          provider_business_name: document.getElementById('ob-inoc-name').value,
          country_region: document.getElementById('ob-country-region').value,
          years_of_experience: parseInt(document.getElementById('ob-years-exp').value) || 0,
          service_types: document.getElementById('ob-service-types').value.split(',').map(s => s.trim()).filter(Boolean),
          coverage_areas: document.getElementById('ob-coverage').value.split(',').map(s => s.trim()).filter(Boolean),
          service_description: document.getElementById('ob-service-desc').value
        };
      } else if (role === 'nursery') {
        profile = {
          nursery_business_name: document.getElementById('ob-nursery-name').value,
          country_region: document.getElementById('ob-country-region').value,
          capacity_stock_scale: document.getElementById('ob-capacity').value,
          nursery_location: document.getElementById('ob-nursery-location').value,
          plant_types_offered: document.getElementById('ob-plant-types').value.split(',').map(s => s.trim()).filter(Boolean),
          years_in_operation: parseInt(document.getElementById('ob-years-op').value) || 0,
          nursery_description: document.getElementById('ob-nursery-desc').value
        };
      }

      try {
        const res = await apiCall('/api/v1/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ profile })
        });
        state.user = res.user;
        showToast(res.message);
        navigate('marketplace');
      } catch (e) { }
    });
  }
}

// 3. NAVIGATION & COMMON LAYOUTS
function renderSidebar() {
  const role = state.user ? state.user.role : '';
  const isStaff = ['ceo', 'ops_lead', 'moderator', 'support_agent'].includes(role);

  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="logo-box">O</div>
        <h2>OudhTrade</h2>
      </div>

      <ul class="nav-menu">
        <li class="nav-item ${state.currentView === 'marketplace' ? 'active' : ''}">
          <a href="#" onclick="window.navTo('marketplace')">🌍 Directory Hub</a>
        </li>
        ${state.user ? `
          <li class="nav-item ${state.currentView === 'dashboard' ? 'active' : ''}">
            <a href="#" onclick="window.navTo('dashboard')">💼 My Dashboard</a>
          </li>
          <li class="nav-item ${state.currentView === 'chat' ? 'active' : ''}">
            <a href="#" onclick="window.navTo('chat')">💬 Inbox Chat</a>
          </li>
        ` : ''}
        ${isStaff ? `
          <li class="nav-item ${state.currentView === 'internal' ? 'active' : ''}">
            <a href="#" onclick="window.navTo('internal')">🛡️ Compliance Hub</a>
          </li>
        ` : ''}
      </ul>

      <div style="margin-top:auto; border-top:1px solid var(--border); padding-top:20px;">
        ${state.user ? `
          <div style="font-weight:600; font-size:0.9rem; overflow:hidden; text-overflow:ellipsis; max-width:230px; color:var(--accent-gold);" title="${state.user.email}">
            👤 ${state.user.profile?.display_name || state.user.profile?.business_name || state.user.profile?.legal_company_name || state.user.profile?.plantation_name || state.user.email}
          </div>
          <div style="font-size:0.75rem; color:var(--secondary); display:flex; align-items:center; gap:8px; margin-top:4px;">
            <span class="role-tag" style="background-color:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; text-transform:uppercase;">${state.user.role.replace(/_/g, ' ')}</span>
            <button onclick="window.toggleTheme()" style="font-size:0.9rem; display:inline-flex; margin-left:auto; cursor:pointer;">🌓</button>
          </div>
          <button class="btn" style="width:100%; margin-top:15px; padding:8px 12px; font-size:0.85rem;" onclick="window.logoutApp()">Sign Out</button>
        ` : `
          <button class="btn btn-gold" style="width:100%; padding:10px;" onclick="window.navTo('auth')">Sign In / Register</button>
        `}
      </div>
    </aside>
  `;
}

window.navTo = (view) => {
  if (view === 'auth') {
    state.authMode = 'login';
  }
  navigate(view);
};

window.toggleTheme = () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  document.body.className = state.theme === 'light' ? 'light-theme' : '';
  render();
};

window.logoutApp = () => {
  localStorage.removeItem('token');
  state.token = null;
  state.user = null;
  state.currentView = 'marketplace';
  showToast('Signed out from OudhTrade.');
  render();
  fetchMarketplaceData();
};

function renderHeader() {
  return `
    <header class="main-header">
      <h1 style="font-family:var(--font-display); font-size:1.35rem; font-weight:600; text-transform:capitalize;">${state.currentView === 'chat' ? 'Conversation Inbox' : state.currentView + ' Panel'}</h1>
      <div style="display:flex; align-items:center; gap:16px;">
        <span style="font-size:0.85rem; color:var(--secondary);">Agarwood Registry</span>
      </div>
    </header>
  `;
}

function renderContentView() {
  switch (state.currentView) {
    case 'marketplace':
      return renderMarketplaceView();
    case 'dashboard':
      return renderDashboardView();
    case 'chat':
      return renderChatView();
    case 'internal':
      return renderInternalView();
    default:
      return `<p>Panel Not Found.</p>`;
  }
}

// 4. MARKETPLACE DIRECTORY HUB (symmetric search & post contact)
function renderMarketplaceView() {
  const isListings = state.searchType === 'listings';

  return `
    <div>
      <div class="custom-alert alert-info">
        <span>🌿</span>
        <div>
          <strong>Symmetric Contact Guarantee:</strong> Under Appendix II specifications, any active email-verified member can directly contact any other member. Role switching is disabled.
        </div>
      </div>

      <div class="card" style="margin-bottom:30px; padding:24px;">
        <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; align-items:flex-end;">
          <div class="form-group" style="margin-bottom:0;">
            <label>Search Keyword</label>
            <input type="text" id="search-keyword-input" class="form-input" placeholder="e.g. Assam, Cambodi..." value="${state.searchKeyword}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Category Filter</label>
            <select id="search-category-select" class="form-select">
              <option value="">All Categories</option>
              <option value="chips" ${state.searchCategory === 'chips' ? 'selected' : ''}>Oud Wood Chips</option>
              <option value="oud oil" ${state.searchCategory === 'oud oil' ? 'selected' : ''}>Oud Essential Oil</option>
              <option value="raw wood" ${state.searchCategory === 'raw wood' ? 'selected' : ''}>Raw Aquilaria Wood</option>
              <option value="saplings" ${state.searchCategory === 'saplings' ? 'selected' : ''}>Saplings / Seedlings</option>
              <option value="seeds" ${state.searchCategory === 'seeds' ? 'selected' : ''}>Seeds</option>
              <option value="service" ${state.searchCategory === 'service' ? 'selected' : ''}>Inoculation Service</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Region</label>
            <input type="text" id="search-region-input" class="form-input" placeholder="e.g. India, Thailand..." value="${state.searchRegion}">
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label>Agarwood Species</label>
            <input type="text" id="search-species-input" class="form-input" placeholder="e.g. Crassna, Malaccensis" value="${state.searchSpecies}">
          </div>
          <button class="btn btn-gold" style="height:44px;" onclick="window.applyMarketplaceSearch()">Search Directory</button>
        </div>
      </div>

      <div class="tabs-nav">
        <button class="tab-btn ${isListings ? 'active' : ''}" onclick="window.toggleSearchType('listings')">Supply Listings</button>
        <button class="tab-btn ${!isListings ? 'active' : ''}" onclick="window.toggleSearchType('requirements')">Buying Requirements (RFQs)</button>
      </div>

      <div id="marketplace-results">
        Loading directory records...
      </div>
    </div>
  `;
}

async function fetchMarketplaceData() {
  const container = document.getElementById('marketplace-results');
  if (!container) return;

  try {
    const params = new URLSearchParams();
    if (state.searchCategory) params.append('category', state.searchCategory);
    if (state.searchRegion) params.append('region', state.searchRegion);
    if (state.searchKeyword) params.append('keyword', state.searchKeyword);
    if (state.searchSpecies) params.append('species', state.searchSpecies);

    if (state.searchType === 'listings') {
      const data = await apiCall(`/api/v1/listings?${params.toString()}`);
      state.listings = data;

      if (data.length === 0) {
        container.innerHTML = `<p style="color:var(--secondary); text-align:center; padding:40px;">No supply listings found matching criteria.</p>`;
        return;
      }

      container.innerHTML = data.map(l => {
        const typeBadge = l.listing_type.replace(/_/g, ' ');
        const badgesHtml = (l.trust_badges || []).map(b => `<span class="trust-badge badge-gold">${b}</span>`).join(' ');

        return `
          <div class="card" style="margin-bottom:16px; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
              <div>
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                  <span class="role-tag" style="background-color:var(--accent-green); color:#fff; font-size:0.7rem; padding:2px 6px; border-radius:4px; text-transform:uppercase;">${typeBadge}</span>
                  <h3 style="font-size:1.2rem; font-weight:600; font-family:var(--font-display);">${l.title}</h3>
                </div>
                <p style="color:var(--secondary); font-size:0.9rem; margin-bottom:12px;">Owner: <strong>${l.owner_name}</strong> ${badgesHtml}</p>
                <p style="color:var(--primary); font-size:0.95rem; margin-bottom:16px; line-height:1.5;">${l.description}</p>
                <div style="display:flex; flex-wrap:wrap; gap:20px; font-size:0.85rem; color:var(--secondary);">
                  <span>📦 Quantity: <strong>${l.attributes.quantity || 'N/A'}</strong></span>
                  <span>🧬 Species: <strong>${l.attributes.species || 'Cultivated'}</strong></span>
                  <span>💰 Guidance Price: <strong style="color:var(--accent-gold);">${l.attributes.price_guidance || 'Contact'}</strong></span>
                </div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:12px; flex-shrink:0;">
                <button class="btn btn-gold" style="font-size:0.85rem; padding:8px 16px;" onclick="window.initiateContact('${l.owner_id}', '${l.id}', null, 'service_inquiry')">Contact Partner</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      // Requirements RFQs
      const data = await apiCall(`/api/v1/requirements?${params.toString()}`);
      state.requirements = data;

      if (data.length === 0) {
        container.innerHTML = `<p style="color:var(--secondary); text-align:center; padding:40px;">No active buying requirements posted.</p>`;
        return;
      }

      container.innerHTML = data.map(r => {
        return `
          <div class="card" style="margin-bottom:16px; padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
              <div>
                <h3 style="font-size:1.2rem; font-weight:600; font-family:var(--font-display); margin-bottom:6px; color:var(--accent-gold);">${r.title}</h3>
                <p style="color:var(--secondary); font-size:0.88rem; margin-bottom:12px;">Posted by: <strong>${r.owner_name}</strong></p>
                <p style="color:var(--primary); font-size:0.95rem; margin-bottom:16px; line-height:1.5;">${r.description}</p>
                <div style="display:flex; gap:20px; font-size:0.85rem; color:var(--secondary);">
                  <span>📂 Category: <strong>${r.category}</strong></span>
                  <span>📍 Target Region: <strong>${r.region}</strong></span>
                </div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:12px; flex-shrink:0;">
                <button class="btn btn-gold" style="font-size:0.85rem; padding:8px 16px;" onclick="window.initiateContact('${r.owner_id}', null, '${r.id}', 'requirement')">Send Offer</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  } catch (e) { }
}

window.applyMarketplaceSearch = () => {
  state.searchKeyword = document.getElementById('search-keyword-input').value;
  state.searchCategory = document.getElementById('search-category-select').value;
  state.searchRegion = document.getElementById('search-region-input').value;
  state.searchSpecies = document.getElementById('search-species-input').value;
  fetchMarketplaceData();
};

window.toggleSearchType = (type) => {
  state.searchType = type;
  render();
  fetchMarketplaceData();
};

// Start chat modal
window.initiateContact = (receiverId, listingId, requirementId, tag) => {
  if (!state.user) {
    showToast('Please sign in or register to initiate contact.', true);
    navigate('auth');
    return;
  }

  if (state.user.id === receiverId || state.user.company_id === receiverId) {
    showToast('Rules lock: You cannot message yourself.', true);
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-mask';
  modal.id = 'contact-modal';
  modal.innerHTML = `
    <div class="modal-body">
      <h3 style="font-family:var(--font-display); font-size:1.4rem; color:var(--accent-gold); margin-bottom:12px;">Start Symmetric Inquiry</h3>
      <p style="color:var(--secondary); font-size:0.88rem; margin-bottom:20px;">Introduce yourself and outline your trade terms. Safe delivery audit logs will record the reply role.</p>
      
      <div class="form-group">
        <label>Message content</label>
        <textarea id="contact-initial-msg" class="form-textarea" rows="5" placeholder="Specify quantity needed, certifications required, or negotiation details..." required></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button class="btn" onclick="document.getElementById('contact-modal').remove()">Cancel</button>
        <button class="btn btn-gold" id="btn-submit-contact">Send Message</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-submit-contact').addEventListener('click', async () => {
    const text = document.getElementById('contact-initial-msg').value;
    if (!text.trim()) {
      showToast('Message text cannot be empty.', true);
      return;
    }

    try {
      await apiCall('/api/v1/messaging/threads', {
        method: 'POST',
        body: JSON.stringify({
          receiver_id: receiverId,
          listing_id: listingId,
          requirement_id: requirementId,
          tag,
          initial_message: text
        })
      });
      showToast('Conversation initialized. Check your inbox.');
      document.getElementById('contact-modal').remove();
      navigate('chat');
    } catch (e) { }
  });
};

// 5. USER DASHBOARDS (Listing manager + doc uploads + company settings)
function renderDashboardView() {
  const role = state.user.role;
  const isBuyer = role === 'buyer';

  return `
    <div>
      <div class="stats-grid">
        <div class="card metric-card">
          <span class="metric-title">Verification Status</span>
          <span class="metric-val" style="font-size:1.35rem; color:var(--accent-gold); padding-top:10px;">
            ${state.user.id_proof_status === 'approved' ? '✅ ID Fully Verified' : '⚠️ Pending Verification'}
          </span>
        </div>
        <div class="card metric-card">
          <span class="metric-title">Active Badges</span>
          <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:10px;">
            ${state.user.trust_badges.map(b => `<span class="trust-badge badge-gold">${b}</span>`).join(' ') || '<span style="color:var(--secondary); font-size:0.85rem;">None</span>'}
          </div>
        </div>
        ${!isBuyer ? `
          <div class="card metric-card">
            <span class="metric-title">My Total Listings</span>
            <span class="metric-val" id="my-listings-count">...</span>
          </div>
        ` : `
          <div class="card metric-card">
            <span class="metric-title">My Posted RFQs</span>
            <span class="metric-val" id="my-reqs-count">...</span>
          </div>
        `}
      </div>

      <div class="tabs-nav" style="margin-top:30px;">
        ${!isBuyer ? `<button class="tab-btn active" id="db-tab-listings" onclick="window.switchDbTab('listings')">Manage Listings</button>` : ''}
        <button class="tab-btn ${isBuyer ? 'active' : ''}" id="db-tab-reqs" onclick="window.switchDbTab('reqs')">My RFQs</button>
        <button class="tab-btn" id="db-tab-verif" onclick="window.switchDbTab('verif')">Verification Documents</button>
        ${role === 'company' ? `<button class="tab-btn" id="db-tab-team" onclick="window.switchDbTab('team')">Team Members</button>` : ''}
      </div>

      <div id="db-tab-content">
        <!-- Rendered dynamically -->
      </div>
    </div>
  `;
}

window.switchDbTab = (tab) => {
  const tabs = ['listings', 'reqs', 'verif', 'team'];
  tabs.forEach(t => {
    const el = document.getElementById(`db-tab-${t}`);
    if (el) el.classList.remove('active');
  });

  const activeEl = document.getElementById(`db-tab-${tab}`);
  if (activeEl) activeEl.classList.add('active');

  const content = document.getElementById('db-tab-content');
  if (!content) return;

  if (tab === 'listings') {
    renderMyListingsSection(content);
  } else if (tab === 'reqs') {
    renderMyRequirementsSection(content);
  } else if (tab === 'verif') {
    renderVerificationDocumentsSection(content);
  } else if (tab === 'team') {
    renderCompanyTeamSection(content);
  }
};

async function fetchDashboardData() {
  const role = state.user.role;
  const initialTab = role === 'buyer' ? 'reqs' : 'listings';
  window.switchDbTab(initialTab);

  // Fetch count statistics
  try {
    if (role !== 'buyer') {
      const data = await apiCall('/api/v1/listings/my-listings');
      state.myListings = data;
      const countEl = document.getElementById('my-listings-count');
      if (countEl) countEl.innerText = data.length;
      if (initialTab === 'listings') {
        window.switchDbTab('listings');
      }
    }

    const reqs = await apiCall('/api/v1/requirements/my-requirements');
    state.myRequirements = reqs;
    const reqsCountEl = document.getElementById('my-reqs-count');
    if (reqsCountEl) reqsCountEl.innerText = reqs.length;
    if (initialTab === 'reqs') {
      window.switchDbTab('reqs');
    }
  } catch (e) { }
}

// Sub-Tab 1: Listings manager
function renderMyListingsSection(container) {
  container.innerHTML = `
    <div style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:center;">
      <h3 style="font-family:var(--font-display); font-size:1.2rem; font-weight:600;">My Listings Catalog</h3>
      <button class="btn btn-gold" onclick="window.openCreateListingModal()">+ Add Supply Listing</button>
    </div>
    
    <div class="enterprise-table-container">
      <table class="enterprise-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>CITES Audit Status</th>
            <th>Status</th>
            <th>Details</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.myListings.map(l => {
    const auditBadge = l.compliance_passed
      ? `<span class="trust-badge badge-green">Passed</span>`
      : `<span class="trust-badge badge-grey" style="background-color:rgba(166,63,63,0.1); border-color:var(--accent-crimson); color:var(--accent-crimson);" title="${l.compliance_summary}">Flagged (CITES)</span>`;

    const statusBadge = l.status === 'published'
      ? `<span class="trust-badge badge-green">Live</span>`
      : l.status === 'pending_verification'
        ? `<span class="trust-badge badge-grey" style="color:var(--accent-gold); border-color:var(--accent-gold);">Pending Verify</span>`
        : `<span class="trust-badge badge-grey">Draft</span>`;

    return `
              <tr>
                <td><strong>${l.title}</strong></td>
                <td><span class="role-tag" style="background-color:rgba(255,255,255,0.05); text-transform:uppercase; font-size:0.75rem; padding:2px 6px;">${l.listing_type}</span></td>
                <td>${auditBadge}</td>
                <td>${statusBadge}</td>
                <td><small style="color:var(--secondary);">${l.attributes.price_guidance || 'N/A'} • ${l.attributes.quantity || 'N/A'}</small></td>
                <td>
                  <button class="btn" style="padding:6px 12px; font-size:0.8rem;" onclick="window.toggleListingStatus('${l.id}', '${l.status === 'published' ? 'paused' : 'published'}')">
                    ${l.status === 'published' ? 'Pause' : 'Publish'}
                  </button>
                  <button class="btn btn-crimson" style="padding:6px 12px; font-size:0.8rem;" onclick="window.deleteListing('${l.id}')">Delete</button>
                </td>
              </tr>
            `;
  }).join('')}
          ${state.myListings.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:var(--secondary);">No listings created yet. Click Add Supply Listing.</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
}

window.openCreateListingModal = () => {
  const role = state.user.role;
  let typeOptions = '';

  if (role === 'seller' || role === 'company') {
    typeOptions = `<option value="product">Product (Oud oil, chips, logs)</option>`;
  } else if (role === 'farmer') {
    typeOptions = `
      <option value="plant">Plant (Live trees, roots)</option>
      <option value="by_product">By-product (Waste, leaf derivatives)</option>
    `;
  } else if (role === 'inoculation_provider') {
    typeOptions = `
      <option value="service">Service (Inoculation work, drills)</option>
      <option value="by_product">By-product</option>
    `;
  } else if (role === 'nursery') {
    typeOptions = `
      <option value="plant">Plant (Saplings, seeds, young plants)</option>
      <option value="by_product">By-product</option>
    `;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-mask';
  modal.id = 'create-listing-modal';
  modal.innerHTML = `
    <div class="modal-body" style="max-width: 600px;">
      <h3 style="font-family:var(--font-display); font-size:1.45rem; color:var(--accent-gold); margin-bottom:16px;">Publish Supply Offer</h3>
      <form id="create-listing-form">
        <div class="form-group">
          <label>Listing Title</label>
          <input type="text" id="lst-title" class="form-input" placeholder="e.g. Ultra Rich Organic Cambodi Oud Oil" required>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Listing Type</label>
            <select id="lst-type" class="form-select">${typeOptions}</select>
          </div>
          <div class="form-group">
            <label>Species Name (e.g. Aquilaria Crassna)</label>
            <input type="text" id="lst-species" class="form-input" placeholder="Aquilaria species">
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Quantity / Availability</label>
            <input type="text" id="lst-quantity" class="form-input" placeholder="e.g. 5 Liters, 400 trees" required>
          </div>
          <div class="form-group">
            <label>Guidance Price</label>
            <input type="text" id="lst-price" class="form-input" placeholder="e.g. $120/Tola, $50/sapling" required>
          </div>
        </div>
        <div class="form-group">
          <label>Description Details</label>
          <textarea id="lst-desc" class="form-textarea" rows="4" placeholder="Detail the legal origin, cultivation history, and certificate numbers if any..." required></textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
          <button type="button" class="btn" onclick="document.getElementById('create-listing-modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-gold">Submit Listing</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = document.getElementById('create-listing-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      title: document.getElementById('lst-title').value,
      listing_type: document.getElementById('lst-type').value,
      description: document.getElementById('lst-desc').value,
      attributes: {
        species: document.getElementById('lst-species').value || 'Cultivated',
        quantity: document.getElementById('lst-quantity').value,
        price_guidance: document.getElementById('lst-price').value
      },
      publishNow: true
    };

    try {
      const res = await apiCall('/api/v1/listings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(res.message);
      document.getElementById('create-listing-modal').remove();
      fetchDashboardData();
    } catch (e) { }
  });
};

window.toggleListingStatus = async (id, newStatus) => {
  try {
    const res = await apiCall(`/api/v1/listings/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(res.message);
    fetchDashboardData();
  } catch (e) { }
};

window.deleteListing = async (id) => {
  if (!confirm('Are you sure you want to delete this listing permanently?')) return;
  try {
    const res = await apiCall(`/api/v1/listings/${id}`, {
      method: 'DELETE'
    });
    showToast(res.message);
    fetchDashboardData();
  } catch (e) { }
};

// Sub-Tab 2: Requirements (RFQs)
function renderMyRequirementsSection(container) {
  container.innerHTML = `
    <div style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:center;">
      <h3 style="font-family:var(--font-display); font-size:1.2rem; font-weight:600;">My Posted Buying Requirements (RFQs)</h3>
      <button class="btn btn-gold" onclick="window.openCreateReqModal()">+ Post Requirement</button>
    </div>
    
    <div class="enterprise-table-container">
      <table class="enterprise-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Target Region</th>
            <th>Status</th>
            <th>Date Posted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.myRequirements.map(r => {
    const statusBadge = r.status === 'active'
      ? `<span class="trust-badge badge-green">Active</span>`
      : `<span class="trust-badge badge-grey">Closed</span>`;

    return `
              <tr>
                <td><strong>${r.title}</strong></td>
                <td>${r.category}</td>
                <td>${r.region}</td>
                <td>${statusBadge}</td>
                <td><small>${new Date(r.created_at).toLocaleDateString()}</small></td>
                <td>
                  ${r.status === 'active'
        ? `<button class="btn" style="padding:6px 12px; font-size:0.8rem;" onclick="window.closeRequirement('${r.id}')">Close RFQ</button>`
        : '<span style="color:var(--secondary); font-size:0.85rem;">Closed</span>'
      }
                </td>
              </tr>
            `;
  }).join('')}
          ${state.myRequirements.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:var(--secondary);">No requirements posted yet. Click Post Requirement.</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `;
}

window.openCreateReqModal = () => {
  const modal = document.createElement('div');
  modal.className = 'modal-mask';
  modal.id = 'create-req-modal';
  modal.innerHTML = `
    <div class="modal-body">
      <h3 style="font-family:var(--font-display); font-size:1.45rem; color:var(--accent-gold); margin-bottom:16px;">Post Buying Need (RFQ)</h3>
      <form id="create-req-form">
        <div class="form-group">
          <label>Requirement Title</label>
          <input type="text" id="req-title" class="form-input" placeholder="Seeking grade B chips for incense production" required>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Category</label>
            <select id="req-cat" class="form-select">
              <option value="chips">Oud Wood Chips</option>
              <option value="oud oil">Oud Essential Oil</option>
              <option value="raw wood">Raw Aquilaria Wood</option>
              <option value="saplings">Saplings / Seedlings</option>
              <option value="service">Inoculation Service</option>
            </select>
          </div>
          <div class="form-group">
            <label>Preferred Sourcing Region</label>
            <input type="text" id="req-region" class="form-input" placeholder="e.g. Global, India, Vietnam" required>
          </div>
        </div>
        <div class="form-group">
          <label>Detailed Specifications</label>
          <textarea id="req-desc" class="form-textarea" rows="4" placeholder="Detail resin density, species, certificate expectations, volume needed..." required></textarea>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
          <button type="button" class="btn" onclick="document.getElementById('create-req-modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-gold">Publish RFQ</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = document.getElementById('create-req-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      title: document.getElementById('req-title').value,
      category: document.getElementById('req-cat').value,
      region: document.getElementById('req-region').value,
      description: document.getElementById('req-desc').value
    };

    try {
      const res = await apiCall('/api/v1/requirements', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(res.message);
      document.getElementById('create-req-modal').remove();
      fetchDashboardData();
    } catch (e) { }
  });
};

window.closeRequirement = async (id) => {
  try {
    const res = await apiCall(`/api/v1/requirements/${id}/close`, {
      method: 'PATCH'
    });
    showToast(res.message);
    fetchDashboardData();
  } catch (e) { }
};

// Sub-Tab 3: Verification uploads
function renderVerificationDocumentsSection(container) {
  const user = state.user;
  const isCompany = user.role === 'company';

  container.innerHTML = `
    <h3 style="font-family:var(--font-display); font-size:1.2rem; font-weight:600; margin-bottom:20px; color:var(--accent-gold);">Marketplace Verification Portal</h3>
    
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
      <div class="card">
        <h4 style="font-size:1.05rem; font-weight:600; margin-bottom:12px;">Step 1: Phone Verification</h4>
        <p style="color:var(--secondary); font-size:0.88rem; margin-bottom:16px;">Verifying your E.164 phone number unlocks higher symmetric contact limits (20-30 threads per day).</p>
        
        ${user.phone_verified
      ? `<p style="color:var(--accent-green-light); font-weight:bold; font-size:0.95rem;">✅ Verified Phone: ${user.phone}</p>`
      : `
            <div class="form-group" style="margin-bottom:12px;">
              <input type="text" id="phone-verify-input" class="form-input" placeholder="e.g. +919876543210" value="${user.phone || ''}">
            </div>
            <button class="btn btn-gold" style="font-size:0.85rem;" onclick="window.submitPhoneVerification()">Verify Phone</button>
          `
    }
      </div>

      <div class="card">
        <h4 style="font-size:1.05rem; font-weight:600; margin-bottom:12px;">Step 2: ID & Business Verification</h4>
        <p style="color:var(--secondary); font-size:0.88rem; margin-bottom:16px;">Mandatory for sellers and nurseries to publish listings. Unlocks the basic trust badge and symmetric messaging.</p>
        
        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:0.9rem;">Identity Proof (Gov ID / License)</span>
            <span class="role-tag" style="background-color:rgba(255,255,255,0.05); font-size:0.75rem;">Status: ${user.id_proof_status.toUpperCase()}</span>
          </div>
          ${user.id_proof_status === 'approved'
      ? '<small style="color:var(--accent-green-light);">Approved</small>'
      : user.id_proof_status === 'pending'
        ? '<small style="color:var(--accent-gold);">Under moderation review</small>'
        : `
              <div style="display:flex; gap:10px;">
                <input type="text" id="id-doc-name" class="form-input" style="padding:6px 12px; font-size:0.85rem;" placeholder="e.g. Passport.pdf">
                <button class="btn" style="padding:6px 12px; font-size:0.85rem;" onclick="window.uploadMockDoc('gov_id')">Upload ID</button>
              </div>
            `
    }
        </div>

        <div style="border-top:1px solid var(--border); padding-top:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:0.9rem;">Extra Proof (Plantation proof / nursery certification)</span>
            <span class="role-tag" style="background-color:rgba(255,255,255,0.05); font-size:0.75rem;">Status: ${user.extra_proof_status.toUpperCase()}</span>
          </div>
          ${user.extra_proof_status === 'approved'
      ? '<small style="color:var(--accent-green-light);">Approved - trust badge unlocked</small>'
      : user.extra_proof_status === 'pending'
        ? '<small style="color:var(--accent-gold);">Under moderation review</small>'
        : `
              <div style="display:flex; gap:10px;">
                <input type="text" id="extra-doc-name" class="form-input" style="padding:6px 12px; font-size:0.85rem;" placeholder="e.g. LandProof.pdf">
                <button class="btn" style="padding:6px 12px; font-size:0.85rem;" onclick="window.uploadMockDoc('extra_proof')">Upload Proof</button>
              </div>
            `
    }
        </div>
      </div>
    </div>
  `;
}

window.submitPhoneVerification = async () => {
  const val = document.getElementById('phone-verify-input').value;
  if (!val.trim()) return;
  try {
    const res = await apiCall('/api/v1/auth/verify-phone', {
      method: 'POST',
      body: JSON.stringify({ phone: val })
    });
    state.user = res.user;
    showToast(res.message);
    fetchDashboardData();
  } catch (e) { }
};

window.uploadMockDoc = async (type) => {
  const inputId = type === 'gov_id' ? 'id-doc-name' : 'extra-doc-name';
  const docName = document.getElementById(inputId).value;
  if (!docName.trim()) {
    showToast('Please specify a mock document filename to upload.', true);
    return;
  }

  try {
    const res = await apiCall('/api/v1/auth/upload-doc', {
      method: 'POST',
      body: JSON.stringify({
        docType: type,
        docName,
        docUrl: `https://mock-oudhtrade-storage.s3.amazonaws.com/docs/${docName}`
      })
    });
    state.user = res.user;
    showToast(res.message);
    fetchDashboardData();
  } catch (e) { }
};

// Sub-Tab 4: Company team configuration
function renderCompanyTeamSection(container) {
  container.innerHTML = `
    <div style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:center;">
      <h3 style="font-family:var(--font-display); font-size:1.2rem; font-weight:600; color:var(--accent-gold);">Company Team & Access Delegation</h3>
      <button class="btn btn-gold" onclick="window.openInviteMemberModal()">+ Add Team Member</button>
    </div>

    <div class="custom-alert alert-info">
      <span>⚙️</span>
      <div>
        <strong>Multi-User Inbox Simulation:</strong> You can switch active team member identities below to test shared assignable inboxes and per-reply reply auditing.
      </div>
    </div>
    
    <div class="enterprise-table-container" style="margin-bottom:24px;">
      <table class="enterprise-table">
        <thead>
          <tr>
            <th>Member Display Name</th>
            <th>Email</th>
            <th>Access Role Level</th>
            <th>Simulate Test Mode</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${state.companyTeam.map(tm => {
    const isMe = state.activeCompanyMemberId === tm.user_id;

    return `
              <tr>
                <td><strong>${tm.display_name}</strong></td>
                <td>${tm.email}</td>
                <td><span class="role-tag" style="background-color:rgba(255,255,255,0.05); text-transform:uppercase; font-size:0.75rem; padding:2px 6px;">${tm.team_role}</span></td>
                <td>
                  ${isMe
        ? `<span class="trust-badge badge-green">Active Simulation</span>`
        : `<button class="btn btn-gold" style="padding:4px 10px; font-size:0.78rem;" onclick="window.switchSimulatedMember('${tm.user_id}')">Switch to this user</button>`
      }
                </td>
                <td>
                  ${tm.team_role !== 'owner'
        ? `<button class="btn btn-crimson" style="padding:6px 12px; font-size:0.8rem;" onclick="window.removeTeamMember('${tm.user_id}')">Remove</button>`
        : '<span style="color:var(--secondary); font-size:0.85rem;">Owner Locked</span>'
      }
                </td>
              </tr>
            `;
  }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.switchSimulatedMember = (userId) => {
  // We mock the user session by fetching user and updating state.token = userId (simulating authorization tokens as user IDs)
  state.token = userId;
  localStorage.setItem('token', userId);
  showToast('Test simulation switched to selected team member.');
  checkAuthSession();
};

window.openInviteMemberModal = () => {
  const modal = document.createElement('div');
  modal.className = 'modal-mask';
  modal.id = 'invite-modal';
  modal.innerHTML = `
    <div class="modal-body">
      <h3 style="font-family:var(--font-display); font-size:1.40rem; color:var(--accent-gold); margin-bottom:16px;">Add Company Representative</h3>
      <form id="invite-member-form">
        <div class="form-group">
          <label>Member Email</label>
          <input type="email" id="inv-email" class="form-input" placeholder="e.g. manager@agarcorp.com" required>
        </div>
        <div class="form-group">
          <label>Access Role Level</label>
          <select id="inv-role" class="form-select">
            <option value="manager">Manager (Manage listings and conversations, no team settings)</option>
            <option value="listing_editor">Listing Editor (Create/edit listings only)</option>
            <option value="support_agent">Support Agent (Respond to conversations only)</option>
          </select>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px;">
          <button type="button" class="btn" onclick="document.getElementById('invite-modal').remove()">Cancel</button>
          <button type="submit" class="btn btn-gold">Add Representative</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = document.getElementById('invite-member-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('inv-email').value;
    const teamRole = document.getElementById('inv-role').value;

    try {
      const res = await apiCall('/api/v1/auth/company/members', {
        method: 'POST',
        body: JSON.stringify({ action: 'invite', email, teamRole })
      });
      showToast(res.message);
      document.getElementById('invite-modal').remove();
      fetchDashboardData();
    } catch (e) { }
  });
};

window.removeTeamMember = async (userId) => {
  if (!confirm('Rule check: Removing member will automatically reassign their open threads to company owner. Proceed?')) return;
  try {
    const res = await apiCall('/api/v1/auth/company/members', {
      method: 'POST',
      body: JSON.stringify({ action: 'remove', userId })
    });
    showToast(res.message);
    fetchDashboardData();
  } catch (e) { }
};

// 6. SYMMETRIC CHAT PANEL (threads with context tags, blocks & reporting)
function renderChatView() {
  return `
    <div class="chat-split-container">
      <div class="chat-threads-sidebar">
        <h4 style="padding:20px; font-family:var(--font-display); font-size:1.1rem; border-bottom:1px solid var(--border); color:var(--accent-gold);">Conversations inbox</h4>
        <div class="chat-threads-list" id="chat-threads-list-container">
          <p style="color:var(--secondary); text-align:center; padding:30px;">Loading threads...</p>
        </div>
      </div>

      <div class="chat-conversation-area" id="chat-conversation-area-container">
        <div style="flex:1; display:flex; align-items:center; justify-content:center; color:var(--secondary);">
          Select a conversation from the sidebar to start symmetric trading chat.
        </div>
      </div>
    </div>
  `;
}

async function fetchChatThreads() {
  const container = document.getElementById('chat-threads-list-container');
  if (!container) return;

  try {
    const data = await apiCall('/api/v1/messaging/threads');
    state.threads = data;

    if (data.length === 0) {
      container.innerHTML = `<p style="color:var(--secondary); text-align:center; padding:30px; font-size:0.9rem;">No message history.</p>`;
      return;
    }

    container.innerHTML = data.map(t => {
      const activeClass = state.activeThreadId === t.id ? 'active' : '';
      const tagLabel = t.tag === 'requirement' ? 'RFQ Inquiry' : t.tag === 'service_inquiry' ? 'Service offer' : 'General chat';

      return `
        <div class="thread-item ${activeClass}" onclick="window.selectChatThread('${t.id}')">
          <div style="font-weight:600; font-size:0.95rem; margin-bottom:4px;">${t.other_party_name}</div>
          <div style="font-size:0.75rem; display:flex; justify-content:space-between; color:var(--secondary);">
            <span>${tagLabel}</span>
            <span class="role-tag" style="font-size:0.68rem; background-color:rgba(255,255,255,0.05);">${t.other_party_role.replace(/_/g, ' ')}</span>
          </div>
        </div>
      `;
    }).join('');

    // If an active thread is selected, refresh its message panel
    if (state.activeThreadId) {
      renderActiveThreadArea();
    }
  } catch (e) { }
}

window.selectChatThread = (threadId) => {
  state.activeThreadId = threadId;
  fetchChatThreads();
};

function renderActiveThreadArea() {
  const container = document.getElementById('chat-conversation-area-container');
  if (!container) return;

  const t = state.threads.find(thread => thread.id === state.activeThreadId);
  if (!t) return;

  const isOtherBlocked = state.user.blocked_users?.includes(t.initiator_id === state.user.company_id || t.initiator_id === state.user.id ? t.receiver_id : t.initiator_id);
  const tagLabel = t.tag === 'requirement' ? 'RFQ Inquiry' : t.tag === 'service_inquiry' ? 'Service offer' : 'General chat';

  let contextHtml = '';
  if (t.listing_context) {
    contextHtml = `<div style="background-color:rgba(212,175,55,0.05); padding:8px 12px; border-radius:4px; font-size:0.8rem; margin-top:8px;">Referenced Listing: <strong>${t.listing_context.title}</strong> (${t.listing_context.attributes.price_guidance || 'Contact'})</div>`;
  } else if (t.requirement_context) {
    contextHtml = `<div style="background-color:rgba(212,175,55,0.05); padding:8px 12px; border-radius:4px; font-size:0.8rem; margin-top:8px;">Referenced RFQ: <strong>${t.requirement_context.title}</strong></div>`;
  }

  // Company assignable selector
  let assignSelectorHtml = '';
  if (state.user.company_id) {
    assignSelectorHtml = `
      <div style="display:flex; align-items:center; gap:8px; font-size:0.8rem;">
        <span style="color:var(--secondary);">Assign Thread:</span>
        <select class="form-select" style="padding:4px 8px; font-size:0.8rem; width:150px; background-color:var(--bg-app);" onchange="window.assignThread('${t.id}', this.value)">
          <option value="">Unassigned</option>
          ${state.companyTeam.map(tm => `<option value="${tm.user_id}" ${t.assigned_to === tm.user_id ? 'selected' : ''}>${tm.display_name} (${tm.team_role})</option>`).join('')}
        </select>
      </div>
    `;
  }

  const otherId = t.initiator_id === (state.user.company_id || state.user.id) ? t.receiver_id : t.initiator_id;

  container.innerHTML = `
    <div class="chat-header">
      <div>
        <div style="font-weight:600; font-family:var(--font-display); font-size:1.1rem; display:flex; align-items:center; gap:8px;">
          ${t.other_party_name}
          <span class="role-tag" style="font-size:0.7rem; background-color:rgba(255,255,255,0.05); text-transform:uppercase;">${t.other_party_role.replace(/_/g, ' ')}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--secondary); margin-top:4px; display:flex; gap:12px; align-items:center;">
          <span>Category tag: <strong style="color:var(--accent-gold);">${tagLabel}</strong></span>
          ${t.assigned_to ? `<span>Assigned to: <strong style="color:var(--accent-green-light);">${state.companyTeam.find(m => m.user_id === t.assigned_to)?.display_name || 'Member'}</strong></span>` : ''}
        </div>
        ${contextHtml}
      </div>

      <div style="display:flex; align-items:center; gap:12px;">
        ${assignSelectorHtml}
        <button class="btn" style="padding:6px 12px; font-size:0.8rem;" onclick="window.toggleBlockUser('${otherId}', ${isOtherBlocked ? "'unblock'" : "'block'"})">
          ${isOtherBlocked ? 'Unblock Partner' : 'Block Partner'}
        </button>
        <button class="btn btn-crimson" style="padding:6px 12px; font-size:0.8rem;" onclick="window.openReportUserModal('${otherId}', '${t.listing_id || ''}')">Report Trade</button>
      </div>
    </div>

    <div class="chat-messages-container" id="chat-messages-box">
      ${t.messages.map(m => {
    const isSentByMe = m.sender_id === state.user.id;
    const senderLabel = isSentByMe ? 'Me' : t.other_party_name;
    const auditRole = m.audit_sender_role ? ` <small style="opacity:0.7; font-size:0.68rem; text-transform:uppercase;">(${m.audit_sender_role})</small>` : '';

    return `
          <div class="msg-bubble ${isSentByMe ? 'sent' : 'received'}">
            <div style="font-weight:700; font-size:0.75rem; margin-bottom:4px;">${senderLabel}${auditRole}</div>
            <div>${m.content}</div>
            <div style="font-size:0.65rem; text-align:right; margin-top:4px; opacity:0.8;">${new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `;
  }).join('')}
    </div>

    <div class="chat-input-area">
      <form id="chat-reply-form" style="display:flex; gap:12px;">
        <input type="text" id="chat-reply-input" class="form-input" placeholder="Type your trade message details..." required autocomplete="off">
        <button type="submit" class="btn btn-gold">Send</button>
      </form>
    </div>
  `;

  // Scroll to bottom
  const box = document.getElementById('chat-messages-box');
  if (box) box.scrollTop = box.scrollHeight;

  // Bind submit
  const replyForm = document.getElementById('chat-reply-form');
  replyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-reply-input');
    const content = input.value;
    if (!content.trim()) return;

    try {
      await apiCall(`/api/v1/messaging/threads/${t.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      input.value = '';
      fetchChatThreads();
    } catch (e) { }
  });
}

window.assignThread = async (threadId, assignToUserId) => {
  try {
    const res = await apiCall(`/api/v1/messaging/threads/${threadId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignToUserId })
    });
    showToast(res.message);
    fetchChatThreads();
  } catch (e) { }
};

window.toggleBlockUser = async (userId, action) => {
  const confirmMsg = action === 'block'
    ? 'Block this user? You will silently ignore all messages from them. They will receive no warning notification.'
    : 'Unblock this user?';
  if (!confirm(confirmMsg)) return;

  try {
    const res = await apiCall('/api/v1/messaging/block', {
      method: 'POST',
      body: JSON.stringify({ userId, action })
    });
    showToast(res.message);

    // Refresh user profile in state
    const pData = await apiCall('/api/v1/auth/profile');
    state.user = pData.user;

    fetchChatThreads();
  } catch (e) { }
};

window.openReportUserModal = (userId, listingId) => {
  const modal = document.createElement('div');
  modal.className = 'modal-mask';
  modal.id = 'report-user-modal';
  modal.innerHTML = `
    <div class="modal-body">
      <h3 style="font-family:var(--font-display); font-size:1.4rem; color:var(--accent-crimson); margin-bottom:12px;">File Trade Grievance (IT Rules 2021)</h3>
      <p style="color:var(--secondary); font-size:0.88rem; margin-bottom:20px;">Provide detailed description of potential wildlife smuggling, uncertified logs, or trade violations. The statutory Grievance Officer will audit this complaint.</p>
      
      <div class="form-group">
        <label>Reason / Description of Grievance *</label>
        <textarea id="rep-complaint-text" class="form-textarea" rows="4" placeholder="Explain the violation..." required></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button class="btn" onclick="document.getElementById('report-user-modal').remove()">Cancel</button>
        <button class="btn btn-crimson" id="btn-submit-report">File Grievance</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-submit-report').addEventListener('click', async () => {
    const text = document.getElementById('rep-complaint-text').value;
    if (!text.trim()) {
      showToast('Grievance reason is required.', true);
      return;
    }

    try {
      const res = await apiCall('/api/v1/messaging/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: userId,
          listingId: listingId || null,
          complaintText: text
        })
      });
      showToast(res.message);
      document.getElementById('report-user-modal').remove();
    } catch (e) { }
  });
};

// 7. INTERNAL STAFF CONTROLS (T&S, Grievance, DPO panels)
function renderInternalView() {
  const tab = state.activeStaffTab;

  return `
    <div>
      <div class="tabs-nav">
        <button class="tab-btn ${tab === 'moderation-users' ? 'active' : ''}" onclick="window.switchStaffTab('moderation-users')">Verification Queue</button>
        <button class="tab-btn ${tab === 'moderation-listings' ? 'active' : ''}" onclick="window.switchStaffTab('moderation-listings')">Listing Reviews</button>
        <button class="tab-btn ${tab === 'grievances' ? 'active' : ''}" onclick="window.switchStaffTab('grievances')">Grievance Logs (IT Rules)</button>
        <button class="tab-btn ${tab === 'dpo' ? 'active' : ''}" onclick="window.switchStaffTab('dpo')">Data Rights requests (DPDP)</button>
        <button class="tab-btn ${tab === 'analytics' ? 'active' : ''}" onclick="window.switchStaffTab('analytics')">Platform Analytics</button>
      </div>

      <div id="staff-tab-content">
        <!-- Rendered based on selected tab -->
      </div>
    </div>
  `;
}

window.switchStaffTab = (tab) => {
  state.activeStaffTab = tab;
  render();
  fetchInternalStaffData();
};

async function fetchInternalStaffData() {
  const tab = state.activeStaffTab;
  const content = document.getElementById('staff-tab-content');
  if (!content) return;

  try {
    if (tab === 'moderation-users') {
      const users = await apiCall('/api/v1/internal/moderation/users');
      state.moderationUsers = users;

      content.innerHTML = `
        <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:600; margin-bottom:16px;">Pending User Onboarding & Badges Approvals</h3>
        <div class="enterprise-table-container">
          <table class="enterprise-table">
            <thead>
              <tr>
                <th>User Profile Info</th>
                <th>Role locked</th>
                <th>Uploaded Verification Docs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => {
        const docLinks = (u.verification_documents || []).map(d =>
          `<div><a href="${d.doc_url}" target="_blank" style="color:var(--accent-gold); font-size:0.85rem;">📄 ${d.doc_type.toUpperCase()}: ${d.doc_name}</a></div>`
        ).join('');

        return `
                  <tr>
                    <td>
                      <strong>${u.email}</strong>
                      <div style="font-size:0.8rem; color:var(--secondary);">${u.profile.business_name || u.profile.plantation_name || u.profile.display_name || 'No Display Name'}</div>
                    </td>
                    <td><span class="role-tag" style="background-color:rgba(255,255,255,0.05);">${u.role}</span></td>
                    <td>${docLinks || '<small style="color:var(--secondary);">No doc uploads found</small>'}</td>
                    <td>
                      <div style="display:flex; gap:6px;">
                        <button class="btn btn-green" style="padding:6px 12px; font-size:0.8rem;" onclick="window.verifyUserDoc('${u.id}', 'gov_id', 'approved')">Approve Identity</button>
                        <button class="btn btn-green" style="padding:6px 12px; font-size:0.8rem;" onclick="window.verifyUserDoc('${u.id}', 'extra_proof', 'approved')">Approve Trust Badge</button>
                        <button class="btn btn-crimson" style="padding:6px 12px; font-size:0.8rem;" onclick="window.verifyUserDoc('${u.id}', 'gov_id', 'rejected')">Reject</button>
                      </div>
                    </td>
                  </tr>
                `;
      }).join('')}
              ${users.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:var(--secondary); padding:20px;">No pending users in verification queue.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      `;
    }

    else if (tab === 'moderation-listings') {
      const listings = await apiCall('/api/v1/internal/moderation/listings');
      state.moderationListings = listings;

      content.innerHTML = `
        <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:600; margin-bottom:16px;">Listing Moderation & CITES Audit Controls</h3>
        <div class="enterprise-table-container">
          <table class="enterprise-table">
            <thead>
              <tr>
                <th>Listing Title</th>
                <th>Type</th>
                <th>CITES Scanner Diagnosis</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${listings.map(l => {
        const flagClass = l.compliance_passed ? 'color:var(--accent-green-light);' : 'color:var(--accent-crimson); font-weight:bold;';

        return `
                  <tr>
                    <td>
                      <strong>${l.title}</strong>
                      <div style="font-size:0.8rem; color:var(--secondary);">${l.description.slice(0, 80)}...</div>
                    </td>
                    <td><span class="role-tag" style="background-color:rgba(255,255,255,0.05);">${l.listing_type}</span></td>
                    <td>
                      <div style="${flagClass} font-size:0.85rem;">${l.compliance_summary}</div>
                      ${(l.compliance_flags || []).map(f => `<div style="font-size:0.75rem; color:var(--secondary);">⚠️ ${f}</div>`).join('')}
                    </td>
                    <td><span class="role-tag">${l.status}</span></td>
                    <td>
                      <div style="display:flex; gap:6px;">
                        <button class="btn btn-green" style="padding:6px 12px; font-size:0.8rem;" onclick="window.moderateListingReview('${l.id}', true)">Approve</button>
                        <button class="btn btn-crimson" style="padding:6px 12px; font-size:0.8rem;" onclick="window.moderateListingReview('${l.id}', false)">Takedown</button>
                      </div>
                    </td>
                  </tr>
                `;
      }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    else if (tab === 'grievances') {
      const grievances = await apiCall('/api/v1/internal/compliance/grievances');
      state.grievances = grievances;

      content.innerHTML = `
        <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:600; margin-bottom:8px;">Statutory Grievance Log (IT Rules 2021)</h3>
        <p style="color:var(--secondary); font-size:0.85rem; margin-bottom:20px;">Grievance officers are legally bound to acknowledge complaints within 24 hours and resolve within 15 days.</p>
        
        <div class="enterprise-table-container">
          <table class="enterprise-table">
            <thead>
              <tr>
                <th>Complaint Details</th>
                <th>Filer</th>
                <th>Accused Party</th>
                <th>SLA Auditing Flags</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${grievances.map(g => {
        const now = Date.now();
        const fileDate = new Date(g.created_at).getTime();

        // SLA checks
        let ackAlert = '';
        if (!g.acknowledged_at) {
          const hours = (now - fileDate) / (1000 * 60 * 60);
          if (hours > 24) ackAlert = `<div style="color:var(--accent-crimson); font-size:0.72rem; font-weight:bold;">⚠️ ACK LATE (>24h)</div>`;
        } else {
          const diffHours = (new Date(g.acknowledged_at).getTime() - fileDate) / (1000 * 60 * 60);
          ackAlert = `<div style="color:var(--secondary); font-size:0.72rem;">Ack in ${diffHours.toFixed(1)}h</div>`;
        }

        let resolveAlert = '';
        if (!g.resolved_at) {
          const days = (now - fileDate) / (1000 * 60 * 60 * 24);
          if (days > 15) resolveAlert = `<div style="color:var(--accent-crimson); font-size:0.72rem; font-weight:bold;">⚠️ SLA VIOLATED (>15d)</div>`;
        } else {
          const diffDays = (new Date(g.resolved_at).getTime() - fileDate) / (1000 * 60 * 60 * 24);
          resolveAlert = `<div style="color:var(--secondary); font-size:0.72rem;">Resolved in ${diffDays.toFixed(1)} days</div>`;
        }

        return `
                  <tr>
                    <td>
                      <div style="font-size:0.9rem; font-weight:600;">"${g.complaint_text}"</div>
                      <small style="color:var(--secondary);">Filed: ${new Date(g.created_at).toLocaleString()}</small>
                      ${g.resolution_notes ? `<div style="background-color:rgba(255,255,255,0.03); padding:8px; border-radius:4px; font-size:0.8rem; margin-top:8px;"><strong>Res notes:</strong> ${g.resolution_notes}</div>` : ''}
                    </td>
                    <td>${g.reporter_email}</td>
                    <td>${g.reported_user_email}</td>
                    <td>
                      ${ackAlert}
                      ${resolveAlert}
                    </td>
                    <td><span class="role-tag">${g.status.toUpperCase()}</span></td>
                    <td>
                      <div style="display:flex; gap:6px;">
                        ${g.status === 'pending'
            ? `<button class="btn btn-gold" style="padding:6px 12px; font-size:0.8rem;" onclick="window.grievanceAction('${g.id}', 'acknowledge')">Acknowledge</button>`
            : ''
          }
                        ${g.status !== 'resolved'
            ? `<button class="btn" style="padding:6px 12px; font-size:0.8rem;" onclick="window.openResolveGrievanceModal('${g.id}')">Resolve Ticket</button>`
            : '<span style="color:var(--secondary);">Closed</span>'
          }
                      </div>
                    </td>
                  </tr>
                `;
      }).join('')}
              ${grievances.length === 0 ? '<tr><td colspan="6" style="text-align:center; color:var(--secondary); padding:20px;">No complaints reported.</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      `;
    }

    else if (tab === 'dpo') {
      content.innerHTML = `
        <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:600; margin-bottom:8px;">Data Protection Officer Registry (DPDP Act 2023)</h3>
        <p style="color:var(--secondary); font-size:0.85rem; margin-bottom:20px;">Manage users' statutory rights to access personal records (Section 11) or execute account erasure (Section 12).</p>
        
        <div class="enterprise-table-container">
          <table class="enterprise-table">
            <thead>
              <tr>
                <th>Member Email</th>
                <th>Locked Role</th>
                <th>Account Status</th>
                <th>DPDP Controls</th>
              </tr>
            </thead>
            <tbody>
              ${state.listings.length ? `
                <!-- Demo users picker from seed databases -->
                <tr>
                  <td>buyer@gmail.com</td>
                  <td>buyer</td>
                  <td>active_verified</td>
                  <td>
                    <button class="btn btn-gold" style="padding:6px 12px; font-size:0.8rem;" onclick="window.dpoExportData('buyer-uuid-1')">Access Export</button>
                    <button class="btn btn-crimson" style="padding:6px 12px; font-size:0.8rem;" onclick="window.dpoEraseUser('buyer-uuid-1')">Erasure Right</button>
                  </td>
                </tr>
                <tr>
                  <td>seller@gmail.com</td>
                  <td>seller</td>
                  <td>active_verified</td>
                  <td>
                    <button class="btn btn-gold" style="padding:6px 12px; font-size:0.8rem;" onclick="window.dpoExportData('seller-uuid-1')">Access Export</button>
                    <button class="btn btn-crimson" style="padding:6px 12px; font-size:0.8rem;" onclick="window.dpoEraseUser('seller-uuid-1')">Erasure Right</button>
                  </td>
                </tr>
                <tr>
                  <td>farmer@gmail.com</td>
                  <td>farmer</td>
                  <td>active_verified</td>
                  <td>
                    <button class="btn btn-gold" style="padding:6px 12px; font-size:0.8rem;" onclick="window.dpoExportData('farmer-uuid-1')">Access Export</button>
                    <button class="btn btn-crimson" style="padding:6px 12px; font-size:0.8rem;" onclick="window.dpoEraseUser('farmer-uuid-1')">Erasure Right</button>
                  </td>
                </tr>
              ` : `<tr><td colspan="4" style="text-align:center; color:var(--secondary);">No active users.</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
    }

    else if (tab === 'analytics') {
      const stats = await apiCall('/api/v1/internal/analytics/overview');
      state.analyticsOverview = stats;

      content.innerHTML = `
        <h3 style="font-family:var(--font-display); font-size:1.25rem; font-weight:600; margin-bottom:20px;">Platform System Activity Metrics</h3>
        
        <div class="stats-grid">
          <div class="card metric-card">
            <span class="metric-title">Total Registered Accounts</span>
            <span class="metric-val">${stats.totalUsers}</span>
          </div>
          <div class="card metric-card">
            <span class="metric-title">Active Live Listings</span>
            <span class="metric-val">${stats.activeListings}</span>
          </div>
          <div class="card metric-card">
            <span class="metric-title">Pending Document Reviews</span>
            <span class="metric-val" style="color:var(--accent-gold);">${stats.pendingVerifications}</span>
          </div>
          <div class="card metric-card">
            <span class="metric-title">Open Grievance Tickets</span>
            <span class="metric-val" style="color:var(--accent-crimson);">${stats.openGrievances}</span>
          </div>
        </div>

        <h4 style="font-size:1.1rem; font-weight:600; margin-bottom:16px;">Listing Inventory Mix</h4>
        <div class="stats-grid" style="grid-template-columns: repeat(4, 1fr);">
          <div class="card text-center" style="padding:16px;">
            <div style="font-size:0.8rem; color:var(--secondary);">Products</div>
            <div style="font-size:1.4rem; font-weight:700; color:var(--accent-gold); margin-top:5px;">${stats.listingsByType.product}</div>
          </div>
          <div class="card text-center" style="padding:16px;">
            <div style="font-size:0.8rem; color:var(--secondary);">Plants</div>
            <div style="font-size:1.4rem; font-weight:700; margin-top:5px;">${stats.listingsByType.plant}</div>
          </div>
          <div class="card text-center" style="padding:16px;">
            <div style="font-size:0.8rem; color:var(--secondary);">Services</div>
            <div style="font-size:1.4rem; font-weight:700; margin-top:5px;">${stats.listingsByType.service}</div>
          </div>
          <div class="card text-center" style="padding:16px;">
            <div style="font-size:0.8rem; color:var(--secondary);">By-products</div>
            <div style="font-size:1.4rem; font-weight:700; margin-top:5px;">${stats.listingsByType.by_product}</div>
          </div>
        </div>
      `;
    }
  } catch (e) { }
}

window.verifyUserDoc = async (userId, docType, status) => {
  const reason = status === 'rejected' ? prompt('Provide rejection reason description:') : null;
  if (status === 'rejected' && !reason) return;

  try {
    const res = await apiCall(`/api/v1/internal/moderation/users/${userId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ docType, status, rejectionReason: reason })
    });
    showToast(res.message);
    fetchInternalStaffData();
  } catch (e) { }
};

window.moderateListingReview = async (listingId, approve) => {
  try {
    const res = await apiCall(`/api/v1/internal/moderation/listings/${listingId}/review`, {
      method: 'POST',
      body: JSON.stringify({ approve })
    });
    showToast(res.message);
    fetchInternalStaffData();
  } catch (e) { }
};

window.grievanceAction = async (id, action) => {
  try {
    const res = await apiCall(`/api/v1/internal/compliance/grievances/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    showToast(res.message);
    fetchInternalStaffData();
  } catch (e) { }
};

window.openResolveGrievanceModal = (id) => {
  const modal = document.createElement('div');
  modal.className = 'modal-mask';
  modal.id = 'resolve-modal';
  modal.innerHTML = `
    <div class="modal-body">
      <h3 style="font-family:var(--font-display); font-size:1.4rem; color:var(--accent-gold); margin-bottom:12px;">Resolve Grievance Ticket</h3>
      <div class="form-group">
        <label>Resolution Summary & Enforcement Notes *</label>
        <textarea id="res-notes" class="form-textarea" rows="4" placeholder="Detail warnings issued, user suspensions, or listings taken down..." required></textarea>
      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:20px;">
        <button class="btn" onclick="document.getElementById('resolve-modal').remove()">Cancel</button>
        <button class="btn btn-gold" id="btn-confirm-resolve">Resolve Grievance</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btn-confirm-resolve').addEventListener('click', async () => {
    const text = document.getElementById('res-notes').value;
    if (!text.trim()) {
      showToast('Resolution notes are required to resolve grievances.', true);
      return;
    }

    try {
      const res = await apiCall(`/api/v1/internal/compliance/grievances/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ action: 'resolve', resolutionNotes: text })
      });
      showToast(res.message);
      document.getElementById('resolve-modal').remove();
      fetchInternalStaffData();
    } catch (e) { }
  });
};

window.dpoExportData = async (userId) => {
  try {
    const data = await apiCall(`/api/v1/internal/compliance/dpo/export/${userId}`);

    // Simulate downloading JSON data
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dpo_access_export_${userId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Personal data package compiled and downloaded successfully.');
  } catch (e) { }
};

window.dpoEraseUser = async (userId) => {
  if (!confirm('Statutory DPDP Erasure Right: This will permanently delete the user account and purge all their listings/requirements. Proceed?')) return;
  try {
    const res = await apiCall(`/api/v1/internal/compliance/dpo/delete/${userId}`, {
      method: 'DELETE'
    });
    showToast(res.message);
    fetchInternalStaffData();
  } catch (e) { }
};

// Event Bindings helpers
function bindAppEvents() { }
