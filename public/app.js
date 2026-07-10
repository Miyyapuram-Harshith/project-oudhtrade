// AuraHire Enterprise AI Recruitment SPA Frontend Module

const state = {
  user: null,
  token: localStorage.getItem('token') || null,
  currentView: 'landing', // 'landing', 'candidate-dashboard', 'hr-dashboard', 'employee-dashboard', 'interview'
  theme: localStorage.getItem('theme') || 'dark',
  activeModal: null, // null, 'login', 'register', 'book-demo', 'certificate'
  
  // Simulated Interactive States
  simulatedAnswers: ['', ''],
  activeQuestionIdx: 0,
  activeCertificateCourse: null,
  activeHrCandidateId: null,
  
  // Form State
  loginEmail: '',
  loginPassword: '',
  registerEmail: '',
  registerPassword: '',
  registerRole: 'candidate',
  
  // Data lists fetched from backend
  jobs: [],
  courses: [],
  applications: [],
  auditLogs: [],
  activeReport: null,
  activePayment: null
};

// Initialize App Theme
document.body.className = state.theme === 'light' ? 'light-theme' : '';

// Toast Notification System
function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast glass`;
  toast.style.cssText = `
    background-color: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 4px solid ${isError ? 'var(--danger)' : 'var(--accent-blue)'};
    padding: 16px 20px;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow);
    color: var(--primary);
    font-size: 0.9rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-width: 320px;
    animation: slideIn 0.3s ease-out;
  `;
  toast.innerHTML = `
    <span style="font-weight: 500;"><i class="${isError ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'}" style="margin-right: 8px; color: ${isError ? 'var(--danger)' : 'var(--success)'};"></i>${message}</span>
    <button style="color: var(--secondary); background:none; border:none; cursor:pointer;" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
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

// Route controller
function navigate(view) {
  state.currentView = view;
  state.activeModal = null;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Handle route-specific data load triggers
  if (view === 'candidate-dashboard') {
    fetchCandidateData();
  } else if (view === 'hr-dashboard') {
    fetchHrData();
  } else if (view === 'employee-dashboard') {
    fetchEmployeeData();
  }
}

// Theme Toggle
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  document.body.className = state.theme === 'light' ? 'light-theme' : '';
  render();
}

// Check Active Session
async function checkAuthSession() {
  if (state.token) {
    try {
      const data = await apiCall('/api/v1/auth/profile');
      state.user = data.user;
      
      // Auto routing based on user role
      if (state.user.role === 'candidate') {
        state.currentView = 'candidate-dashboard';
      } else if (state.user.role === 'hr') {
        state.currentView = 'hr-dashboard';
      } else if (state.user.role === 'employee' || state.user.role === 'admin') {
        state.currentView = 'employee-dashboard';
      }
    } catch (e) {
      localStorage.removeItem('token');
      state.token = null;
      state.user = null;
      state.currentView = 'landing';
    }
  } else {
    state.currentView = 'landing';
  }
  render();
}

// Load Candidate Dashboard Data
async function fetchCandidateData() {
  try {
    const [jobs, courses] = await Promise.all([
      apiCall('/api/v1/jobs'),
      apiCall('/api/v1/courses')
    ]);
    state.jobs = jobs;
    state.courses = courses;
    render();
  } catch (e) {
    console.error('Error loading candidate data:', e);
  }
}

// Load HR Dashboard Data
async function fetchHrData() {
  try {
    const [apps, jobs] = await Promise.all([
      apiCall('/api/v1/jobs/applications'),
      apiCall('/api/v1/jobs')
    ]);
    state.applications = apps;
    state.jobs = jobs;
    render();
  } catch (e) {
    console.error('Error loading HR data:', e);
  }
}

// Load Employee Dashboard Data
async function fetchEmployeeData() {
  try {
    const [courses] = await Promise.all([
      apiCall('/api/v1/courses')
    ]);
    state.courses = courses;
    
    // Fallback load audit logs
    const auditRes = await fetch('/api/v1/internal/audit-logs', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    if (auditRes.ok) {
      const auditData = await auditRes.json();
      state.auditLogs = auditData.logs || [];
    } else {
      // Simulate fallback
      state.auditLogs = [
        { id: '1', action: 'USER_LOGIN', user_id: 'candidate-uuid', ip_address: '127.0.0.1', created_at: new Date().toISOString() },
        { id: '2', action: 'AI_EVALUATION_COMPLETED', user_id: 'candidate-uuid', ip_address: '127.0.0.1', created_at: new Date().toISOString() }
      ];
    }
    render();
  } catch (e) {
    console.error('Error loading employee data:', e);
  }
}

// Submitting Candidate Applications
async function applyToJob(jobId) {
  try {
    await apiCall('/api/v1/jobs/apply', {
      method: 'POST',
      body: JSON.stringify({
        jobId,
        resumeUrl: 'https://assets.hiringplatform.com/resumes/alex_rivera_cv.pdf',
        profileDetails: { skills: ['React', 'CSS', 'Node'] }
      })
    });
    showToast('Applied successfully! Proceeding to AI Assessment interview.');
    
    // Find the application object to take interview
    setTimeout(async () => {
      const apps = await apiCall('/api/v1/jobs/applications');
      const candidateApp = apps.find(a => a.job_id === jobId && a.candidate_id === state.user.id);
      if (candidateApp) {
        startAIInterview(candidateApp.id);
      } else {
        fetchCandidateData();
      }
    }, 1000);
  } catch (e) {
    console.error(e);
  }
}

// Start AI Interview Simulator
function startAIInterview(applicationId) {
  state.currentView = 'interview';
  state.activeApplicationId = applicationId;
  state.activeQuestionIdx = 0;
  state.simulatedAnswers = ['', ''];
  render();
  initMockInterviewAnimation();
}

// Simulated dynamic gauges for interview
let interviewTimer = null;
function initMockInterviewAnimation() {
  if (interviewTimer) clearInterval(interviewTimer);
  
  interviewTimer = setInterval(() => {
    const eyeContact = document.getElementById('gauge-eye-contact');
    const confidence = document.getElementById('gauge-confidence');
    const speechRate = document.getElementById('gauge-speech-rate');
    const emotionVal = document.getElementById('gauge-emotion');
    
    if (eyeContact) {
      const eyeVal = (88 + Math.random() * 10).toFixed(0);
      eyeContact.innerHTML = `<i class="fas fa-eye text-teal"></i> Gaze Fixation: ${eyeVal}%`;
    }
    if (confidence) {
      const confVal = (85 + Math.random() * 12).toFixed(0);
      confidence.innerHTML = `<i class="fas fa-chart-line text-blue"></i> Confidence: ${confVal}%`;
    }
    if (speechRate) {
      const rateVal = (120 + Math.floor(Math.random() * 20));
      speechRate.innerHTML = `<i class="fas fa-microphone text-emerald"></i> Speech: ${rateVal} WPM`;
    }
    if (emotionVal) {
      const emotions = ['Focused', 'Stable', 'Engaged', 'Neutral'];
      const text = emotions[Math.floor(Math.random() * emotions.length)];
      emotionVal.innerHTML = `<i class="fas fa-smile text-amber"></i> Emotion: ${text}`;
    }
  }, 1500);
}

// Complete course
async function updateCourseProgress(courseId) {
  if (state.user && state.user.profile) {
    state.user.profile.course_progress = state.user.profile.course_progress || {};
    state.user.profile.course_progress[courseId] = 100;
    
    if (!state.user.profile.certificates) {
      state.user.profile.certificates = [];
    }
    if (!state.user.profile.certificates.includes(courseId)) {
      state.user.profile.certificates.push(courseId);
    }
    
    showToast('Course completed! You earned a Certificate.');
    render();
  }
}

// Open Certificate Modal
function openCertificate(courseId) {
  state.activeCertificateCourse = state.courses.find(c => c.id === courseId);
  state.activeModal = 'certificate';
  render();
}

// Submit interview responses
async function submitInterviewAnswers() {
  const answers = [
    {
      questionId: 'q1',
      question: 'Describe your experience with CSS grid and responsive layouts.',
      content: state.simulatedAnswers[0] || 'I construct clean grids with flexible column setups and adhere strictly to WCAG color contrast criteria.'
    },
    {
      questionId: 'q2',
      question: 'How do you handle performance bottlenecks in React?',
      content: state.simulatedAnswers[1] || 'I use React Profiler to analyze renders, optimize components with memoization tools, and delay third-party assets.'
    }
  ];

  clearInterval(interviewTimer);

  try {
    showToast('Analyzing media using OpenCV and Whisper NLP models...');
    const result = await apiCall('/api/v1/ai/interview/submit', {
      method: 'POST',
      body: JSON.stringify({
        applicationId: state.activeApplicationId,
        answers
      })
    });
    
    showToast(`AI analysis completed successfully. Relational Score: ${result.overallScore}/100`);
    
    // Return back to dashboard
    setTimeout(() => {
      navigate('candidate-dashboard');
    }, 1500);
  } catch (e) {
    console.error(e);
  }
}

// Razorpay upgrade simulation
async function triggerRazorpayUpgrade() {
  try {
    const orderData = await apiCall('/api/v1/billing/order', {
      method: 'POST',
      body: JSON.stringify({
        planType: 'Enterprise Annual Tier',
        amount: 19999
      })
    });

    // Simulated Razorpay success callback
    showToast(`Opening simulated Razorpay Checkout. Order ID: ${orderData.orderId}`);
    
    setTimeout(async () => {
      const verifyRes = await apiCall('/api/v1/billing/verify', {
        method: 'POST',
        body: JSON.stringify({
          orderId: orderData.orderId,
          paymentId: `pay_${Math.random().toString(36).substring(2, 12)}`
        })
      });
      
      showToast('Payment Verified! Account upgraded to Enterprise.');
      
      // Update local state and re-render HR data
      state.user.company_id = verifyRes.company.id;
      fetchHrData();
    }, 2000);

  } catch (e) {
    console.error(e);
  }
}

// Load AI Report Details inside HR dashboard
async function viewReportDetails(reportId) {
  try {
    const data = await apiCall(`/api/v1/ai/reports/${reportId}`);
    state.activeReport = data;
    render();
  } catch (e) {
    console.error(e);
  }
}

// Add Course (Employee Dashboard)
async function addCourse(event) {
  event.preventDefault();
  const title = document.getElementById('new-course-title').value;
  const description = document.getElementById('new-course-description').value;
  const duration = document.getElementById('new-course-duration').value;

  if (!title || !description || !duration) {
    return showToast('Please fill out all fields.', true);
  }

  // Simulate course add
  const newCourse = {
    id: `course-${Date.now()}`,
    title,
    description,
    duration,
    lectures: 12,
    modules: 3,
    certificate: true
  };

  state.courses.push(newCourse);
  showToast('New course added to catalog successfully.');
  
  document.getElementById('new-course-title').value = '';
  document.getElementById('new-course-description').value = '';
  document.getElementById('new-course-duration').value = '';

  render();
}

// Handle login submissions
async function handleLogin(email, password) {
  try {
    const data = await apiCall('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    state.activeModal = null;
    showToast(`Welcome back, ${data.user.display_name || data.user.email}!`);
    
    if (data.user.role === 'candidate') {
      navigate('candidate-dashboard');
    } else if (data.user.role === 'hr') {
      navigate('hr-dashboard');
    } else if (data.user.role === 'employee' || data.user.role === 'admin') {
      navigate('employee-dashboard');
    }
  } catch (e) {
    console.error(e);
  }
}

// Handle Sign Out
function handleSignOut() {
  localStorage.removeItem('token');
  state.token = null;
  state.user = null;
  navigate('landing');
  showToast('Logged out successfully.');
}

// Main template generator functions
function renderNavbar() {
  const isLight = state.theme === 'light';
  const isLoggedIn = !!state.user;

  return `
    <nav class="navbar scrolled">
      <div class="container nav-container">
        <a href="#" class="logo" onclick="navigate('landing')">
          <i class="fas fa-brain"></i> AuraHire
        </a>
        
        ${state.currentView === 'landing' ? `
          <ul class="nav-links">
            <li><a href="#features">Solutions</a></li>
            <li><a href="#learning">Courses</a></li>
            <li><a href="#ai-modules">AI Interview</a></li>
            <li><a href="#mockups">Pricing</a></li>
            <li><a href="#stats">Companies</a></li>
            <li><a href="#security">Resources</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>
        ` : `
          <ul class="nav-links">
            <li><a href="#" onclick="navigate('${state.user.role === 'candidate' ? 'candidate-dashboard' : state.user.role === 'hr' ? 'hr-dashboard' : 'employee-dashboard'}')">Dashboard Panel</a></li>
          </ul>
        `}
        
        <div class="nav-actions">
          <button class="theme-toggle-btn" onclick="toggleTheme()">
            <i class="fas ${isLight ? 'fa-moon' : 'fa-sun'}"></i>
          </button>
          
          ${isLoggedIn ? `
            <div class="user-badge">
              <div class="user-avatar">${state.user.display_name ? state.user.display_name[0] : 'U'}</div>
              <button class="btn btn-secondary" onclick="handleSignOut()">Sign Out</button>
            </div>
          ` : `
            <button class="btn btn-secondary" onclick="state.activeModal = 'login'; render();">Sign In</button>
            <button class="btn btn-primary" onclick="state.activeModal = 'register'; render();">Get Started</button>
          `}
        </div>
      </div>
    </nav>
  `;
}

function renderLanding() {
  return `
    <!-- Section 1: Hero -->
    <section class="hero-section">
      <div class="radial-glow"></div>
      <div class="container hero-grid">
        <div class="hero-content">
          <div class="section-badge"><i class="fas fa-circle-nodes"></i> Enterprise AI Platform</div>
          <h1 class="gradient-text">AI Powered Recruitment Platform for Modern Enterprises</h1>
          <p>Trusted by companies to evaluate talent using AI-driven interviews, speech analysis, emotion detection, and automated hiring workflows.</p>
          <div class="hero-actions">
            <button class="btn btn-primary" onclick="state.activeModal = 'register'; render();">Get Started <i class="fas fa-arrow-right"></i></button>
            <button class="btn btn-accent" onclick="state.activeModal = 'book-demo'; render();">Book Demo</button>
            <button class="btn btn-secondary" onclick="window.scrollTo({top: document.getElementById('mockups').offsetTop, behavior: 'smooth'})">Watch Demo</button>
          </div>
        </div>
        
        <div class="hero-mockup">
          <div class="mockup-window glass">
            <div class="mockup-header">
              <span class="mockup-dot red"></span>
              <span class="mockup-dot yellow"></span>
              <span class="mockup-dot green"></span>
              <span class="mockup-url">https://aurahire.com/dashboard/hr-analytics</span>
            </div>
            <div class="mockup-body" style="padding:0;">
              <div style="background:#0b0f19; padding:24px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:600; font-family:var(--font-display);"><i class="fas fa-chart-line text-blue" style="margin-right:8px;"></i> HR Applicant Pipeline Analytics</span>
                <span style="font-size:0.75rem; background:rgba(37,99,235,0.1); color:#3b82f6; padding:4px 10px; border-radius:99px;">Enterprise Subscription active</span>
              </div>
              <div style="padding:24px; display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div style="background:rgba(255,255,255,0.02); padding:16px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:0.75rem; color:var(--secondary);">Average AI Score</span>
                  <div style="font-size:1.8rem; font-weight:800; margin:6px 0; font-family:var(--font-display);">84.6<span style="font-size:1rem; color:var(--secondary);">/100</span></div>
                  <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                    <div style="width:84%; height:100%; background:var(--accent-teal);"></div>
                  </div>
                </div>
                <div style="background:rgba(255,255,255,0.02); padding:16px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:0.75rem; color:var(--secondary);">Evaluations Completed</span>
                  <div style="font-size:1.8rem; font-weight:800; margin:6px 0; font-family:var(--font-display);">1,284</div>
                  <span style="font-size:0.7rem; color:var(--success);"><i class="fas fa-chevron-up"></i> +12% this week</span>
                </div>
              </div>
              <div style="padding:0 24px 24px 24px;">
                <div style="background:rgba(255,255,255,0.01); border-radius:12px; border:1px solid rgba(255,255,255,0.04); padding:16px;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.8rem; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:8px;">
                    <span>CANDIDATE</span>
                    <span>AI MATCH SCORE</span>
                    <span>EMOTION STATE</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; padding:8px 0;">
                    <span>Alex Rivera</span>
                    <span style="font-weight:600; color:var(--success);">88% (Excellent)</span>
                    <span style="background:rgba(16,185,129,0.1); color:var(--success); padding:2px 8px; border-radius:4px; font-size:0.7rem;">Stable</span>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; padding:8px 0;">
                    <span>Rohan Sharma</span>
                    <span style="font-weight:600; color:#3b82f6;">76% (Good)</span>
                    <span style="background:rgba(37,99,235,0.1); color:#3b82f6; padding:2px 8px; border-radius:4px; font-size:0.7rem;">Focused</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 2: Trusted Companies Sliding Ticker -->
    <section class="ticker-section">
      <div class="container">
        <h3 class="ticker-title">Trusted by Global Tech Enterprises & Organizations</h3>
        <div class="ticker-wrap">
          <div class="ticker-list">
            <div class="ticker-item"><i class="fab fa-stripe"></i> Stripe</div>
            <div class="ticker-item"><i class="fas fa-check-double"></i> Infosys</div>
            <div class="ticker-item"><i class="fas fa-cubes"></i> TCS</div>
            <div class="ticker-item"><i class="fab fa-accusoft"></i> Wipro</div>
            <div class="ticker-item"><i class="fas fa-network-wired"></i> Accenture</div>
            <div class="ticker-item"><i class="fas fa-shield-alt"></i> Deloitte</div>
            <div class="ticker-item"><i class="fas fa-microchip"></i> Tech Mahindra</div>
            <div class="ticker-item"><i class="fas fa-bezier-curve"></i> Capgemini</div>
            <div class="ticker-item"><i class="fas fa-brain"></i> Cognizant</div>
            <!-- Duplicated list for infinite scrolling -->
            <div class="ticker-item"><i class="fab fa-stripe"></i> Stripe</div>
            <div class="ticker-item"><i class="fas fa-check-double"></i> Infosys</div>
            <div class="ticker-item"><i class="fas fa-cubes"></i> TCS</div>
            <div class="ticker-item"><i class="fab fa-accusoft"></i> Wipro</div>
            <div class="ticker-item"><i class="fas fa-network-wired"></i> Accenture</div>
            <div class="ticker-item"><i class="fas fa-shield-alt"></i> Deloitte</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 3: Platform Overview -->
    <section id="features">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Platform Overview</div>
          <h2 class="section-title">An All-in-One Enterprise Hiring Ecosystem</h2>
          <p>From initial job creation to interactive study modules, mock AI interviews, OpenCV emotion models, and custom learning curricula.</p>
        </div>
        
        <div class="features-grid">
          <div class="card-premium feature-card">
            <div class="feature-icon-wrapper">
              <i class="fas fa-video"></i>
            </div>
            <h3>AI Video Interviewing</h3>
            <p>Conduct automated, conversational mock & actual job interviews. The engine analyzes vocabulary, confidence levels, and technical descriptions using local Whisper NLP fallback nodes.</p>
          </div>
          
          <div class="card-premium feature-card">
            <div class="feature-icon-wrapper">
              <i class="fas fa-face-smile"></i>
            </div>
            <h3>Emotion & Facial Tracking</h3>
            <p>Our custom OpenCV logic calculates gaze direction, nervous blinking ratios, and postural alignment to ensure candidate authenticity and behavioral comfort checks.</p>
          </div>
          
          <div class="card-premium feature-card">
            <div class="feature-icon-wrapper">
              <i class="fas fa-graduation-cap"></i>
            </div>
            <h3>Training & Learning</h3>
            <p>Equip candidate pools with pre-interview video lectures, structured quizzes, and coding study resources. Boost shortlisting success metrics by up to 45%.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 4: How It Works Timeline -->
    <section>
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Workflow Timeline</div>
          <h2 class="section-title">Modern Recruitment Lifecycle</h2>
          <p>A streamlined structure that empowers recruiters to prepare, screen, evaluate, and hire candidates inside a unified platform.</p>
        </div>
        
        <div class="timeline-wrap">
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content-box">
              <div class="timeline-step">01</div>
              <h3>Registration & Verification</h3>
              <p>Candidates sign up with OTP email verification. HR users authenticate using industry standard credentials protected with secure JWT storage guidelines.</p>
            </div>
            <div class="timeline-media-box">
              <i class="fas fa-user-plus text-blue" style="font-size: 4rem; opacity: 0.15; margin-top:20px;"></i>
            </div>
          </div>
          
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-media-box">
              <i class="fas fa-book-open text-teal" style="font-size: 4rem; opacity: 0.15; margin-top:20px;"></i>
            </div>
            <div class="timeline-content-box">
              <div class="timeline-step">02</div>
              <h3>Curriculum Learning</h3>
              <p>Enrolled candidates participate in specific training modules. Courses cover system design, frontend optimization, and specialized corporate topics.</p>
            </div>
          </div>
          
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content-box">
              <div class="timeline-step">03</div>
              <h3>Automated Assessment</h3>
              <p>Candidates select available job vacancies and undergo high-performance interactive cognitive evaluations and specialized coding assignments.</p>
            </div>
            <div class="timeline-media-box">
              <i class="fas fa-file-invoice text-blue" style="font-size: 4rem; opacity: 0.15; margin-top:20px;"></i>
            </div>
          </div>
          
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-media-box">
              <i class="fas fa-brain text-teal" style="font-size: 4rem; opacity: 0.15; margin-top:20px;"></i>
            </div>
            <div class="timeline-content-box">
              <div class="timeline-step">04</div>
              <h3>AI Assessment Evaluation</h3>
              <p>Whisper transcriber extracts speaking keywords. OpenCV maps emotion timelines. A final multidimensional evaluation score card is compiled instantly.</p>
            </div>
          </div>
          
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content-box">
              <div class="timeline-step">05</div>
              <h3>Recruiter shortlisting</h3>
              <p>HR filters candidates based on AI matching thresholds, cognitive capabilities, communication ratings, and system audit verifications.</p>
            </div>
            <div class="timeline-media-box">
              <i class="fas fa-list-check text-blue" style="font-size: 4rem; opacity: 0.15; margin-top:20px;"></i>
            </div>
          </div>
          
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-media-box">
              <i class="fas fa-handshake text-teal" style="font-size: 4rem; opacity: 0.15; margin-top:20px;"></i>
            </div>
            <div class="timeline-content-box">
              <div class="timeline-step">06</div>
              <h3>Enterprise Onboarding</h3>
              <p>Final candidates are extended employment offers, matching skills metrics, and certificate verification records. Complete cycle done inside a single tool.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 5: AI Modules -->
    <section id="ai-modules" class="glass" style="margin: 80px 0; border-radius: 0;">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">AI Microservices</div>
          <h2 class="section-title">Cognitive & Behavioral AI Modules</h2>
          <p>State-of-the-art computer vision models, NLP components, and media extraction pipes operating at real-time speeds.</p>
        </div>
        
        <div class="ai-modules-grid">
          <div class="card-premium ai-module-card">
            <div class="ai-module-icon"><i class="fas fa-file-alt"></i></div>
            <h3>Resume Screening</h3>
            <p>NLP models parse skills, work histories, and verification documents to check relevance indices.</p>
          </div>
          <div class="card-premium ai-module-card">
            <div class="ai-module-icon"><i class="fas fa-comments"></i></div>
            <h3>Group Discussion / JAM</h3>
            <p>Analyzes verbal spontaneity, articulation, argument structure, and speech interruptions.</p>
          </div>
          <div class="card-premium ai-module-card">
            <div class="ai-module-icon"><i class="fas fa-volume-up"></i></div>
            <h3>Speech Analysis</h3>
            <p>Calculates pitch modulations, cadence stability, filler word volumes, and pronunciation ratings.</p>
          </div>
          <div class="card-premium ai-module-card">
            <div class="ai-module-icon"><i class="fas fa-smile-beam"></i></div>
            <h3>Emotion Detection</h3>
            <p>Computes face grid micro-expressions (anger, joy, neutral, fear, anxiety) via OpenCV.</p>
          </div>
          <div class="card-premium ai-module-card">
            <div class="ai-module-icon"><i class="fas fa-eye"></i></div>
            <h3>Eye Contact Ratios</h3>
            <p>Tracks iris center points relative to viewport bounds to calculate candidate attention metrics.</p>
          </div>
          <div class="card-premium ai-module-card">
            <div class="ai-module-icon"><i class="fas fa-microphone-lines"></i></div>
            <h3>Whisper Transcripts</h3>
            <p>Simulates real-time audio chunking, converting raw candidate answers into clean JSON scripts.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 6: Learning Platform -->
    <section id="learning">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Curriculum Builder</div>
          <h2 class="section-title">Learning Management Ecosystem</h2>
          <p>Pre-packaged and customized video materials, references, PDF notes, and micro-assessments supporting skill onboarding.</p>
        </div>
        
        <div class="courses-grid">
          <div class="card-premium course-card">
            <div class="course-banner" style="background: linear-gradient(135deg, #2563EB, #1d4ed8);"><i class="fas fa-code"></i></div>
            <div class="course-content">
              <div class="course-meta">
                <span><i class="far fa-clock"></i> 6 Weeks</span>
                <span><i class="far fa-play-circle"></i> 24 Lectures</span>
              </div>
              <h3 class="course-title">Full-Stack Web Development</h3>
              <p>Master React.js, Node.js, CSS grid layouts, web accessibility, and high performance client routers.</p>
            </div>
          </div>
          
          <div class="card-premium course-card">
            <div class="course-banner" style="background: linear-gradient(135deg, #14B8A6, #0d9488);"><i class="fas fa-microchip"></i></div>
            <div class="course-content">
              <div class="course-meta">
                <span><i class="far fa-clock"></i> 8 Weeks</span>
                <span><i class="far fa-play-circle"></i> 32 Lectures</span>
              </div>
              <h3 class="course-title">AI & Machine Learning Engineering</h3>
              <p>Build real-world vision nodes with OpenCV, integrate Whisper audio APIs, and code basic NLP pipelines.</p>
            </div>
          </div>
          
          <div class="card-premium course-card">
            <div class="course-banner" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><i class="fas fa-cubes"></i></div>
            <div class="course-content">
              <div class="course-meta">
                <span><i class="far fa-clock"></i> 4 Weeks</span>
                <span><i class="far fa-play-circle"></i> 16 Lectures</span>
              </div>
              <h3 class="course-title">System Design & HPC</h3>
              <p>Explore microservice scalability, postgres concurrency handling, redis caching nodes, and cloud buckets.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 7, 8, 9: Interactive Previews (Mockups) -->
    <section id="mockups" class="glass" style="border-radius:0; border-left:none; border-right:none;">
      <div class="radial-glow-bottom"></div>
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Interactive Demos</div>
          <h2 class="section-title">Explore Dashboard Previews</h2>
          <p>Select a dashboard tab to review visual representations of our enterprise HR suite, applicant scoring profiles, and curriculum logs.</p>
        </div>
        
        <div style="display:flex; justify-content:center; gap:16px; margin-bottom:48px;">
          <button class="btn btn-primary" onclick="state.activeModal = 'login'; render();"><i class="fas fa-user-tie"></i> Launch HR Suite</button>
          <button class="btn btn-secondary" onclick="state.activeModal = 'login'; render();"><i class="fas fa-user-graduate"></i> Launch Candidate Dashboard</button>
          <button class="btn btn-secondary" onclick="state.activeModal = 'login'; render();"><i class="fas fa-tools"></i> Launch Curriculum Panel</button>
        </div>

        <div class="mockup-window">
          <div class="mockup-header">
            <span class="mockup-dot red"></span>
            <span class="mockup-dot yellow"></span>
            <span class="mockup-dot green"></span>
            <span class="mockup-url">https://aurahire.com/dashboard/candidate-portal</span>
          </div>
          <div class="mockup-body" style="padding: 24px; min-height:350px; background:#0b0f19;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:16px; margin-bottom:24px;">
              <div>
                <h3 style="font-size:1.4rem;">Candidate Dashboard: Alex Rivera</h3>
                <p style="font-size:0.85rem; color:var(--secondary);">Welcome back, Alex. Your current applications are listed below.</p>
              </div>
              <div style="background:rgba(37,99,235,0.1); color:#3b82f6; padding:8px 16px; border-radius:8px; font-weight:600; font-size:0.9rem;">
                Overall AI score: 88/100
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:24px;">
              <div>
                <h4 style="margin-bottom:12px; font-size:1rem; font-family:var(--font-display);">Applied Positions Pipeline</h4>
                <div style="background:rgba(255,255,255,0.02); padding:20px; border-radius:12px; border:1px solid rgba(255,255,255,0.05); margin-bottom:16px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <span style="font-weight:600; font-size:1.05rem;">Staff Frontend Engineer</span>
                    <span style="background:rgba(16,185,129,0.1); color:var(--success); padding:4px 10px; border-radius:99px; font-size:0.75rem; font-weight:600;">EVALUATION PENDING</span>
                  </div>
                  <p style="font-size:0.85rem; margin-bottom:12px;">Stripe Inc. • Applied on: 2026-07-10</p>
                  <div style="display:flex; gap:8px;">
                    <span style="font-size:0.75rem; background:rgba(255,255,255,0.04); padding:4px 10px; border-radius:6px;">Whisper Audio: Checked</span>
                    <span style="font-size:0.75rem; background:rgba(255,255,255,0.04); padding:4px 10px; border-radius:6px;">OpenCV Emotion: Checked</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 style="margin-bottom:12px; font-size:1rem; font-family:var(--font-display);">Course Progression</h4>
                <div style="background:rgba(255,255,255,0.02); padding:16px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                  <div style="margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                      <span>Full-Stack Web Development</span>
                      <span>75%</span>
                    </div>
                    <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                      <div style="width:75%; height:100%; background:var(--accent-blue);"></div>
                    </div>
                  </div>
                  <div style="margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                      <span>AI & Machine Learning Engineering</span>
                      <span>40%</span>
                    </div>
                    <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                      <div style="width:40%; height:100%; background:var(--accent-teal);"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 10: Enterprise Security -->
    <section id="security">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Compliance & Privacy</div>
          <h2 class="section-title">Government Grade Security Protocols</h2>
          <p>Auditable log systems, encrypted file deposits, secure temporary OTP registers, and granular access guard modules.</p>
        </div>
        
        <div class="security-grid">
          <div class="card-premium">
            <h3 style="font-size:1.3rem; margin-bottom:12px;"><i class="fas fa-fingerprint text-blue" style="margin-right:8px;"></i> JWT & OTP Guard</h3>
            <p>Secure login tokens and double-factor temporary OTP validation to prevent session highjacks.</p>
          </div>
          
          <div class="card-premium">
            <h3 style="font-size:1.3rem; margin-bottom:12px;"><i class="fas fa-cloud-upload-alt text-teal" style="margin-right:8px;"></i> Secure Video Vaults</h3>
            <p>Raw candidate video interviews are deposited in highly secure, encrypted S3 buckets with signed access control.</p>
          </div>
          
          <div class="card-premium">
            <h3 style="font-size:1.3rem; margin-bottom:12px;"><i class="fas fa-clipboard-list text-amber" style="margin-right:8px;"></i> System Auditing</h3>
            <p>A persistent, un-deletable audit trace tracks user logins, evaluation logs, and administrative modifications.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 11: Technology Stack -->
    <section style="background: rgba(11, 15, 25, 0.2);">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Core Engine</div>
          <h2 class="section-title">Engineered with Production Stacks</h2>
          <p>Built using robust databases, backend networks, computer vision frameworks, and responsive frontend systems.</p>
        </div>
        
        <div class="tech-grid">
          <div class="tech-badge"><i class="fab fa-react text-blue"></i> React.js</div>
          <div class="tech-badge"><i class="fab fa-node-js text-emerald"></i> Node.js</div>
          <div class="tech-badge"><i class="fab fa-python text-amber"></i> Python Django</div>
          <div class="tech-badge"><i class="fas fa-brain text-teal"></i> OpenCV Core</div>
          <div class="tech-badge"><i class="fas fa-volume-high text-blue"></i> Whisper API</div>
          <div class="tech-badge"><i class="fas fa-database text-blue"></i> PostgreSQL</div>
          <div class="tech-badge"><i class="fas fa-folder-open text-emerald"></i> MongoDB</div>
          <div class="tech-badge"><i class="fab fa-aws text-orange"></i> AWS S3 & EC2</div>
        </div>
      </div>
    </section>

    <!-- Section 12: Statistics -->
    <section id="stats">
      <div class="container stats-grid">
        <div class="card-premium stat-card">
          <div class="stat-number">100K+</div>
          <p style="font-weight:600; font-family:var(--font-display); color:var(--primary); margin-bottom:4px;">Candidates Evaluated</p>
          <p style="font-size:0.85rem;">Across multiple educational campuses</p>
        </div>
        <div class="card-premium stat-card">
          <div class="stat-number">500+</div>
          <p style="font-weight:600; font-family:var(--font-display); color:var(--primary); margin-bottom:4px;">Enterprise Clients</p>
          <p style="font-size:0.85rem;">Partnered with hiring pipelines</p>
        </div>
        <div class="card-premium stat-card">
          <div class="stat-number">99.9%</div>
          <p style="font-weight:600; font-family:var(--font-display); color:var(--primary); margin-bottom:4px;">Evaluation Uptime</p>
          <p style="font-size:0.85rem;">Backed by fault-tolerant AWS nodes</p>
        </div>
        <div class="card-premium stat-card">
          <div class="stat-number">10M+</div>
          <p style="font-weight:600; font-family:var(--font-display); color:var(--primary); margin-bottom:4px;">AI Analysis Models Run</p>
          <p style="font-size:0.85rem;">Whisper and OpenCV evaluation tasks</p>
        </div>
      </div>
    </section>

    <!-- Section 13: Testimonials -->
    <section>
      <div class="container">
        <div class="section-header">
          <div class="section-badge">Client Testimonials</div>
          <h2 class="section-title">What Hiring Directors Say</h2>
          <p>Real-world reviews from enterprise hiring managers and university recruitment coordinators.</p>
        </div>
        
        <div class="features-grid">
          <div class="card-premium">
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
              <div class="user-avatar" style="width:48px; height:48px; background:var(--accent-blue); font-size:1.1rem;">JD</div>
              <div>
                <h4 style="font-size:1.1rem; color:var(--primary);">Jane Doe</h4>
                <p style="font-size:0.8rem; color:var(--secondary);">Talent Acquisition lead, Stripe</p>
              </div>
            </div>
            <p style="font-style:italic;">"Integrating AuraHire's mock AI assessment tool into our engineering intake reduced applicant review latency by 68%. The speech analysis cadence report is uncannily accurate."</p>
          </div>
          
          <div class="card-premium">
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px;">
              <div class="user-avatar" style="width:48px; height:48px; background:var(--accent-teal); font-size:1.1rem;">VS</div>
              <div>
                <h4 style="font-size:1.1rem; color:var(--primary);">Vikram Singh</h4>
                <p style="font-size:0.8rem; color:var(--secondary);">Dean of Placements, IIT</p>
              </div>
            </div>
            <p style="font-style:italic;">"The study materials portal along with integrated certificates gave our students structural guidance before hiring season. Fantastic enterprise analytics platform."</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 14: FAQ -->
    <section id="faq">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">FAQ</div>
          <h2 class="section-title">Frequently Asked Questions</h2>
          <p>Answers to common questions about our assessment algorithms, pricing tiers, and privacy guidelines.</p>
        </div>
        
        <div class="faq-wrap">
          <div class="faq-item">
            <div class="faq-header" onclick="toggleFaq(this)">
              <span>How accurate is the OpenCV eye contact analysis?</span>
              <i class="fas fa-chevron-down faq-icon"></i>
            </div>
            <div class="faq-body">
              The eye contact mapping calculates iris bounding vectors relative to the laptop camera coordinates. It achieves a 94% accuracy rate in normal lighting environments, checking for stable attention without flagging minor looking drifts.
            </div>
          </div>
          
          <div class="faq-item">
            <div class="faq-header" onclick="toggleFaq(this)">
              <span>Can we customize the training modules?</span>
              <i class="fas fa-chevron-down faq-icon"></i>
            </div>
            <div class="faq-body">
              Yes. Company teams with corporate access can manage course databases, upload custom PDF learning files, add micro-quizzes, and track individual candidate progress.
            </div>
          </div>
          
          <div class="faq-item">
            <div class="faq-header" onclick="toggleFaq(this)">
              <span>Is there a local fallback if Django servers are down?</span>
              <i class="fas fa-chevron-down faq-icon"></i>
            </div>
            <div class="faq-body">
              Yes, our platform incorporates high-fidelity local AI fallback nodes. If the Django engine microservice on port 8000 is unreachable, the core gateway server simulates analysis reports via pre-configured semantic templates.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 15: Call to Action -->
    <section class="container" style="margin-bottom:80px;">
      <div class="cta-banner">
        <h2 class="gradient-text">Empower Your Enterprise Recruitment Today</h2>
        <p>Start evaluating candidates using high-fidelity automated speech and visual engines. Eliminate manual CV screening queues.</p>
        <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="state.activeModal = 'register'; render();">Register Now</button>
          <button class="btn btn-accent" onclick="state.activeModal = 'book-demo'; render();">Book Demo</button>
        </div>
      </div>
    </section>
  `;
}

function renderCandidateDashboard() {
  const progress1 = (state.user.profile && state.user.profile.course_progress && state.user.profile.course_progress['course-1']) || 0;
  const progress2 = (state.user.profile && state.user.profile.course_progress && state.user.profile.course_progress['course-2']) || 0;
  const progress3 = (state.user.profile && state.user.profile.course_progress && state.user.profile.course_progress['course-3']) || 0;
  
  const hasCertificate = state.user.profile && state.user.profile.certificates && state.user.profile.certificates.includes('course-1');

  return `
    <div class="spa-container">
      <aside class="spa-sidebar">
        <div style="font-family:var(--font-display); font-weight:800; padding:10px 16px; font-size:1.1rem; color:var(--primary); margin-bottom:16px;">
          Candidate Portal
        </div>
        <a class="spa-sidebar-btn active"><i class="fas fa-home"></i> Home</a>
        <a class="spa-sidebar-btn" onclick="navigate('landing')"><i class="fas fa-globe"></i> Landing Page</a>
      </aside>
      
      <main class="spa-content">
        <div class="dashboard-header">
          <div>
            <h1>Candidate Dashboard: ${state.user.display_name}</h1>
            <p>View your active course learning paths and apply to open recruitment assessments.</p>
          </div>
          <div class="user-badge">
            <span style="font-size:0.9rem; color:var(--secondary);">${state.user.email}</span>
            <div class="user-avatar">AR</div>
          </div>
        </div>
        
        <div style="display:grid; grid-template-columns:1.6fr 1.4fr; gap:32px; margin-bottom:40px;">
          <!-- Course section -->
          <div class="card-premium">
            <h2 style="font-size:1.4rem; margin-bottom:24px;"><i class="fas fa-graduation-cap text-teal" style="margin-right:8px;"></i> My Learning Progress</h2>
            
            <div style="margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:16px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="font-weight:600;">Full-Stack Web Development</span>
                <span>${progress1}%</span>
              </div>
              <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; margin-bottom:12px;">
                <div style="width:${progress1}%; height:100%; background:var(--accent-blue); transition:var(--transition);"></div>
              </div>
              ${progress1 < 100 ? `
                <button class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;" onclick="updateCourseProgress('course-1')">Complete Final Module</button>
              ` : `
                <button class="btn btn-accent" style="padding:6px 16px; font-size:0.8rem;" onclick="openCertificate('course-1')"><i class="fas fa-award"></i> View Certificate</button>
              `}
            </div>

            <div style="margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:16px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="font-weight:600;">AI & Machine Learning Engineering</span>
                <span>${progress2}%</span>
              </div>
              <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; margin-bottom:12px;">
                <div style="width:${progress2}%; height:100%; background:var(--accent-teal); transition:var(--transition);"></div>
              </div>
              ${progress2 < 100 ? `
                <button class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;" onclick="updateCourseProgress('course-2')">Complete Next Lesson</button>
              ` : `
                <button class="btn btn-accent" style="padding:6px 16px; font-size:0.8rem;" onclick="openCertificate('course-2')"><i class="fas fa-award"></i> View Certificate</button>
              `}
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <span style="font-weight:600;">System Design & HPC</span>
                <span>${progress3}%</span>
              </div>
              <div style="height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; margin-bottom:12px;">
                <div style="width:${progress3}%; height:100%; background:var(--warning); transition:var(--transition);"></div>
              </div>
              ${progress3 < 100 ? `
                <button class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;" onclick="updateCourseProgress('course-3')">Resume Class</button>
              ` : `
                <button class="btn btn-accent" style="padding:6px 16px; font-size:0.8rem;" onclick="openCertificate('course-3')"><i class="fas fa-award"></i> View Certificate</button>
              `}
            </div>
          </div>
          
          <!-- Job list section -->
          <div class="card-premium">
            <h2 style="font-size:1.4rem; margin-bottom:24px;"><i class="fas fa-briefcase text-blue" style="margin-right:8px;"></i> Available Positions</h2>
            
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${state.jobs.map(job => {
                // Check if already applied or evaluation status
                const app = state.applications.find(a => a.job_id === job.id && a.candidate_id === state.user.id);
                return `
                  <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:16px; border-radius:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                      <div>
                        <h4 style="font-size:1.1rem; color:var(--primary);">${job.title}</h4>
                        <p style="font-size:0.8rem;">Stripe Inc. • Remote</p>
                      </div>
                      ${app ? `
                        <span style="background:rgba(37,99,235,0.1); color:#3b82f6; padding:4px 8px; border-radius:6px; font-size:0.7rem; font-weight:600;">
                          ${app.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      ` : `
                        <button class="btn btn-primary" style="padding:6px 14px; font-size:0.75rem;" onclick="applyToJob('${job.id}')">Apply Now</button>
                      `}
                    </div>
                    <p style="font-size:0.8rem; color:var(--secondary); margin-bottom:8px;">${job.eligibility_criteria}</p>
                    ${app && app.status === 'assessment_pending' ? `
                      <button class="btn btn-accent" style="padding:6px 14px; font-size:0.75rem; width:100%;" onclick="startAIInterview('${app.id}')"><i class="fas fa-video"></i> Start AI Interview Assessment</button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderHrDashboard() {
  const isEnterprise = state.user && state.user.company_id === 'stripe-enterprise-uuid';
  
  return `
    <div class="spa-container">
      <aside class="spa-sidebar">
        <div style="font-family:var(--font-display); font-weight:800; padding:10px 16px; font-size:1.1rem; color:var(--primary); margin-bottom:16px;">
          HR Admin Suite
        </div>
        <a class="spa-sidebar-btn active"><i class="fas fa-users"></i> Applicant Pipeline</a>
        <a class="spa-sidebar-btn" onclick="navigate('landing')"><i class="fas fa-globe"></i> Landing Page</a>
      </aside>
      
      <main class="spa-content">
        <div class="dashboard-header">
          <div>
            <h1>Recruitment & AI Assessment pipeline</h1>
            <p>Monitor applicants, grade profiles, and review detailed emotion timelines and speech transcript notes.</p>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:600; font-family:var(--font-display); color:var(--primary);">${state.user.display_name}</div>
            <div style="font-size:0.85rem; color:var(--secondary);">Stripe Inc. • <span style="color:${isEnterprise ? 'var(--success)' : 'var(--warning)'}; font-weight:600;">${isEnterprise ? 'Enterprise Account' : 'Free Trial Tier'}</span></div>
          </div>
        </div>

        ${!isEnterprise ? `
          <div class="cta-banner" style="padding:24px 32px; text-align:left; display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
            <div>
              <h3 style="font-size:1.2rem; margin-bottom:4px;"><i class="fas fa-crown text-amber"></i> Unlock Premium Features</h3>
              <p style="font-size:0.85rem; margin:0;">Upgrade your company subscription to Enterprise for ₹19,999/year to run Whisper evaluations and detailed facial timelines.</p>
            </div>
            <button class="btn btn-accent" onclick="triggerRazorpayUpgrade()"><i class="fas fa-arrow-up"></i> Upgrade to Enterprise</button>
          </div>
        ` : ''}

        <div style="display:grid; grid-template-columns:1.2fr 1.8fr; gap:32px;">
          <!-- Candidates List -->
          <div class="card-premium">
            <h2 style="font-size:1.3rem; margin-bottom:20px;"><i class="fas fa-address-book text-blue" style="margin-right:8px;"></i> Pipeline Candidates</h2>
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${state.applications.map(app => {
                const isActive = state.activeHrCandidateId === app.candidate_id;
                return `
                  <div style="background:${isActive ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.01)'}; border:1px solid ${isActive ? 'var(--accent-blue)' : 'var(--border)'}; padding:16px; border-radius:12px; cursor:pointer;" onclick="state.activeHrCandidateId = '${app.candidate_id}'; ${app.evaluation_result ? `viewReportDetails('${app.evaluation_result.mongodb_report_id}')` : `state.activeReport = null; render();`}">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                      <h4 style="font-size:1.05rem; color:var(--primary);">Alex Rivera</h4>
                      <span style="background:rgba(37,99,235,0.1); color:#3b82f6; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:600;">
                        ${app.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p style="font-size:0.75rem; margin-bottom:8px;">Position: Staff Frontend Engineer</p>
                    ${app.evaluation_result ? `
                      <div style="font-size:0.8rem; font-weight:600; color:var(--success);">AI Evaluation Complete: ${app.evaluation_result.overall_score}/100</div>
                    ` : `
                      <div style="font-size:0.8rem; color:var(--secondary);">Interview Assessment Pending</div>
                    `}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          
          <!-- Detailed Report Area -->
          <div class="card-premium">
            ${state.activeReport ? `
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:16px; margin-bottom:24px;">
                <div>
                  <h3 style="font-size:1.3rem; color:var(--primary);">AI Multidimensional Evaluation Card</h3>
                  <p style="font-size:0.8rem;">Candidate ID: candidate-uuid-stripe-001</p>
                </div>
                <div style="background:rgba(16,185,129,0.1); color:var(--success); padding:10px 20px; border-radius:8px; font-weight:800; font-size:1.2rem;">
                  Score: ${state.activeReport.overallScore}/100
                </div>
              </div>
              
              <!-- Metrics Bar Chart -->
              <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:20px; border-radius:12px; margin-bottom:24px;">
                <h4 style="font-size:0.95rem; margin-bottom:16px; font-family:var(--font-display);">AuraHire Cognitive/Technical Breakdown</h4>
                
                <div style="margin-bottom:12px;">
                  <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                    <span>Cognitive Reasoning</span>
                    <span>${state.activeReport.cognitiveScore}%</span>
                  </div>
                  <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                    <div style="width:${state.activeReport.cognitiveScore}%; height:100%; background:var(--accent-blue);"></div>
                  </div>
                </div>

                <div style="margin-bottom:12px;">
                  <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                    <span>Communication Clarity</span>
                    <span>${state.activeReport.communicationScore}%</span>
                  </div>
                  <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                    <div style="width:${state.activeReport.communicationScore}%; height:100%; background:var(--accent-teal);"></div>
                  </div>
                </div>

                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                    <span>Technical Proficiency</span>
                    <span>${state.activeReport.technicalScore}%</span>
                  </div>
                  <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:3px; overflow:hidden;">
                    <div style="width:${state.activeReport.technicalScore}%; height:100%; background:var(--success);"></div>
                  </div>
                </div>
              </div>

              <!-- Summary, Strengths & Weaknesses -->
              <div style="margin-bottom:24px;">
                <h4 style="font-size:1rem; margin-bottom:8px; font-family:var(--font-display);">Executive Evaluation Summary</h4>
                <p style="font-size:0.85rem; line-height:1.5; margin-bottom:16px;">${state.activeReport.summary}</p>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                  <div style="background:rgba(16,185,129,0.05); border:1px solid rgba(16,185,129,0.15); padding:16px; border-radius:8px;">
                    <h5 style="color:var(--success); font-size:0.85rem; text-transform:uppercase; margin-bottom:8px;"><i class="fas fa-check"></i> Key Strengths</h5>
                    <ul style="font-size:0.8rem; display:flex; flex-direction:column; gap:4px; padding-left:12px;">
                      ${state.activeReport.strengths.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                  </div>
                  <div style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.15); padding:16px; border-radius:8px;">
                    <h5 style="color:var(--danger); font-size:0.85rem; text-transform:uppercase; margin-bottom:8px;"><i class="fas fa-times"></i> Improvement Areas</h5>
                    <ul style="font-size:0.8rem; display:flex; flex-direction:column; gap:4px; padding-left:12px;">
                      ${state.activeReport.weaknesses.map(w => `<li>${w}</li>`).join('')}
                    </ul>
                  </div>
                </div>
              </div>

              <!-- Speech Transcripts Tab -->
              <div style="border-top:1px solid var(--border); padding-top:20px; margin-bottom:24px;">
                <h4 style="font-size:1rem; margin-bottom:12px; font-family:var(--font-display);">Whisper Speech-to-Text Transcripts</h4>
                <div style="display:flex; flex-direction:column; gap:12px;">
                  ${state.activeReport.transcripts.map(t => `
                    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:12px; border-radius:8px; font-size:0.8rem;">
                      <div style="font-weight:600; color:var(--primary); margin-bottom:4px;">Q: ${t.question}</div>
                      <div style="color:var(--secondary); font-style:italic;">A: "${t.content}"</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- OpenCV Emotion Timeline Chart -->
              <div style="border-top:1px solid var(--border); padding-top:20px;">
                <h4 style="font-size:1rem; margin-bottom:12px; font-family:var(--font-display);">Computer Vision Emotion Timeline</h4>
                <div style="display:flex; align-items:flex-end; gap:8px; height:120px; padding:20px 0; border-bottom:1px solid var(--border);">
                  ${state.activeReport.timeline.map(p => {
                    const heightVal = p.confidence * 100;
                    let color = 'var(--accent-blue)';
                    if (p.emotion === 'happy') color = 'var(--success)';
                    if (p.emotion === 'anxious') color = 'var(--danger)';
                    return `
                      <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
                        <div style="width:100%; height:${heightVal}px; background:${color}; border-radius:4px 4px 0 0;" title="Confidence: ${heightVal}%"></div>
                        <span style="font-size:0.65rem; margin-top:4px;">${p.time}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
                <div style="display:flex; justify-content:center; gap:16px; margin-top:12px; font-size:0.75rem;">
                  <span><i class="fas fa-circle text-blue"></i> Neutral</span>
                  <span><i class="fas fa-circle text-success"></i> Engaged/Happy</span>
                  <span><i class="fas fa-circle text-danger"></i> Anxious</span>
                </div>
              </div>
            ` : `
              <div style="text-align:center; padding:80px 20px; color:var(--secondary);">
                <i class="fas fa-chart-bar" style="font-size:3.5rem; opacity:0.15; margin-bottom:16px;"></i>
                <h3>Select Candidate Applicant to Review AI Assessment Reports</h3>
                <p>Click on any candidate card in the pipeline listing to inspect OpenCV timelines and Whisper transcripts.</p>
              </div>
            `}
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderEmployeeDashboard() {
  return `
    <div class="spa-container">
      <aside class="spa-sidebar">
        <div style="font-family:var(--font-display); font-weight:800; padding:10px 16px; font-size:1.1rem; color:var(--primary); margin-bottom:16px;">
          Curriculum Panel
        </div>
        <a class="spa-sidebar-btn active"><i class="fas fa-book"></i> Courses Catalog</a>
        <a class="spa-sidebar-btn" onclick="navigate('landing')"><i class="fas fa-globe"></i> Landing Page</a>
      </aside>
      
      <main class="spa-content">
        <div class="dashboard-header">
          <div>
            <h1>Curriculum & Audit Management Console</h1>
            <p>Administer courses library, verify logs, and review system operations.</p>
          </div>
          <div class="user-badge">
            <span style="font-size:0.9rem; color:var(--secondary);">${state.user.email}</span>
            <div class="user-avatar">SL</div>
          </div>
        </div>
        
        <div style="display:grid; grid-template-columns:1.8fr 1.2fr; gap:32px;">
          <!-- Course Addition and Listing -->
          <div>
            <div class="card-premium" style="margin-bottom:32px;">
              <h2 style="font-size:1.3rem; margin-bottom:20px;"><i class="fas fa-plus text-teal" style="margin-right:8px;"></i> Add New Course</h2>
              <form onsubmit="addCourse(event)">
                <div class="form-group">
                  <label for="new-course-title">Course Title</label>
                  <input type="text" id="new-course-title" class="form-input" placeholder="e.g. Introduction to OpenCV Vision">
                </div>
                <div class="form-group">
                  <label for="new-course-description">Description</label>
                  <input type="text" id="new-course-description" class="form-input" placeholder="Short description of core topics.">
                </div>
                <div class="form-group">
                  <label for="new-course-duration">Duration</label>
                  <input type="text" id="new-course-duration" class="form-input" placeholder="e.g. 5 Weeks">
                </div>
                <button type="submit" class="btn btn-accent">Publish Course</button>
              </form>
            </div>
            
            <div class="card-premium">
              <h2 style="font-size:1.3rem; margin-bottom:20px;"><i class="fas fa-list text-blue" style="margin-right:8px;"></i> Course Database</h2>
              <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.85rem;">
                <thead>
                  <tr style="border-bottom:1px solid var(--border); color:var(--primary); font-weight:600;">
                    <th style="padding:10px;">ID</th>
                    <th style="padding:10px;">TITLE</th>
                    <th style="padding:10px;">DURATION</th>
                  </tr>
                </thead>
                <tbody>
                  ${state.courses.map(c => `
                    <tr style="border-bottom:1px solid var(--border);">
                      <td style="padding:10px; color:var(--secondary);">${c.id}</td>
                      <td style="padding:10px; font-weight:600;">${c.title}</td>
                      <td style="padding:10px; color:var(--secondary);">${c.duration}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Audit Logs Viewer -->
          <div class="card-premium">
            <h2 style="font-size:1.3rem; margin-bottom:20px;"><i class="fas fa-shield-halved text-amber" style="margin-right:8px;"></i> Audit Activity Logs</h2>
            <div style="display:flex; flex-direction:column; gap:12px; max-height:480px; overflow-y:auto; padding-right:6px;">
              ${state.auditLogs.map(log => `
                <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border); padding:12px; border-radius:8px; font-size:0.75rem;">
                  <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:600; color:var(--primary);">
                    <span>${log.action}</span>
                    <span style="color:var(--secondary);">${new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div style="color:var(--secondary);">User: ${log.user_id || 'system-guest'} • IP: ${log.ip_address}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </main>
    </div>
  `;
}

function renderInterview() {
  const questions = [
    'Describe your experience with CSS grid and responsive layouts.',
    'How do you handle performance bottlenecks in React?'
  ];

  return `
    <div class="container" style="max-width:800px; padding-top:120px;">
      <div class="card-premium interview-box">
        <div style="display:flex; justify-content:between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:16px; margin-bottom:24px;">
          <div>
            <h2>Mock AI Interview Interface</h2>
            <p>Evaluating Candidate: Alex Rivera • Job: Staff Frontend Engineer</p>
          </div>
          <span style="font-size:0.8rem; background:rgba(37,99,235,0.1); color:#3b82f6; padding:6px 12px; border-radius:6px; font-weight:600;">
            Question ${state.activeQuestionIdx + 1} of 2
          </span>
        </div>

        <div class="interview-video-mock">
          <div class="interview-camera-indicator"><i class="fas fa-circle"></i> RECORDING FEED</div>
          
          <div style="text-align:center; color:rgba(255,255,255,0.4); display:flex; flex-direction:column; align-items:center; gap:8px;">
            <i class="fas fa-user-astronaut" style="font-size:4rem; color:var(--accent-blue);"></i>
            <span style="font-size:0.85rem; letter-spacing:0.05em; font-weight:500;">LIVE CAMERA SIMULATOR ACTIVE</span>
          </div>

          <div class="interview-metrics-overlay">
            <div class="metric-pill" id="gauge-eye-contact"><i class="fas fa-eye text-teal"></i> Eye Contact: 95%</div>
            <div class="metric-pill" id="gauge-confidence"><i class="fas fa-chart-line text-blue"></i> Confidence: 90%</div>
            <div class="metric-pill" id="gauge-speech-rate"><i class="fas fa-microphone text-emerald"></i> Speech: 130 WPM</div>
            <div class="metric-pill" id="gauge-emotion"><i class="fas fa-smile text-amber"></i> Emotion: Stable</div>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border); padding:20px; border-radius:12px; margin-bottom:24px;">
          <h3 style="font-size:1.1rem; color:var(--primary); margin-bottom:8px;"><i class="fas fa-circle-question text-blue" style="margin-right:6px;"></i> Interview Question</h3>
          <p style="font-size:1.05rem; font-weight:500; color:var(--primary);">${questions[state.activeQuestionIdx]}</p>
        </div>

        <div class="form-group" style="margin-bottom:24px;">
          <label style="margin-bottom:8px;">Speak or Type Your Answer Response</label>
          <textarea class="form-input" style="height:120px; resize:none;" placeholder="Speak clearly or draft your explanation in this field..." oninput="state.simulatedAnswers[${state.activeQuestionIdx}] = this.value">${state.simulatedAnswers[state.activeQuestionIdx]}</textarea>
        </div>

        <div style="display:flex; justify-content:space-between;">
          <button class="btn btn-secondary" onclick="navigate('candidate-dashboard')">Cancel Assessment</button>
          
          ${state.activeQuestionIdx === 0 ? `
            <button class="btn btn-primary" onclick="state.activeQuestionIdx = 1; render();">Next Question <i class="fas fa-chevron-right"></i></button>
          ` : `
            <button class="btn btn-accent" onclick="submitInterviewAnswers()">Submit Final Answers <i class="fas fa-paper-plane"></i></button>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderModals() {
  if (!state.activeModal) return '';

  if (state.activeModal === 'login') {
    return `
      <div class="modal-overlay active">
        <div class="modal-content">
          <button class="modal-close" onclick="state.activeModal = null; render();">✕</button>
          <h2 style="margin-bottom:8px; font-size:1.6rem;"><i class="fas fa-right-to-bracket text-blue" style="margin-right:6px;"></i> Access AuraHire</h2>
          <p style="font-size:0.85rem; color:var(--secondary); margin-bottom:24px;">Log in to your candidate assessment space or corporate dashboard.</p>
          
          <div style="background:rgba(37,99,235,0.05); border:1px solid rgba(37,99,235,0.15); padding:16px; border-radius:8px; margin-bottom:20px;">
            <div style="font-size:0.75rem; font-weight:600; color:var(--accent-blue); text-transform:uppercase; margin-bottom:8px;"><i class="fas fa-lightbulb"></i> Developer Quick Access accounts</div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.75rem; text-align:left; justify-content:flex-start;" onclick="handleLogin('candidate@hiring.com', 'password123')"><i class="fas fa-user-graduate"></i> Login as Candidate (Alex Rivera)</button>
              <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.75rem; text-align:left; justify-content:flex-start;" onclick="handleLogin('hr@enterprise.com', 'password123')"><i class="fas fa-user-tie"></i> Login as HR Manager (Jane Doe)</button>
              <button class="btn btn-secondary" style="padding:6px 12px; font-size:0.75rem; text-align:left; justify-content:flex-start;" onclick="handleLogin('employee@hiring.com', 'password123')"><i class="fas fa-tools"></i> Login as Curriculum Lead (Sarah)</button>
            </div>
          </div>

          <form onsubmit="event.preventDefault(); handleLogin(state.loginEmail, state.loginPassword);">
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" class="form-input" required placeholder="name@company.com" oninput="state.loginEmail = this.value" value="${state.loginEmail}">
            </div>
            <div class="form-group" style="margin-bottom:24px;">
              <label>Password</label>
              <input type="password" class="form-input" required placeholder="••••••••" oninput="state.loginPassword = this.value" value="${state.loginPassword}">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Sign In</button>
          </form>
        </div>
      </div>
    `;
  }

  if (state.activeModal === 'register') {
    return `
      <div class="modal-overlay active">
        <div class="modal-content">
          <button class="modal-close" onclick="state.activeModal = null; render();">✕</button>
          <h2 style="margin-bottom:8px; font-size:1.6rem;"><i class="fas fa-user-plus text-teal" style="margin-right:6px;"></i> Create AuraHire Account</h2>
          <p style="font-size:0.85rem; color:var(--secondary); margin-bottom:24px;">Register to submit interview answers or configure corporate pipelines.</p>
          
          <form onsubmit="event.preventDefault(); handleSignup(state.registerEmail, state.registerPassword, state.registerRole);">
            <div class="form-group">
              <label>Account Role</label>
              <select class="form-input" onchange="state.registerRole = this.value" style="background:var(--bg-input);">
                <option value="candidate">Candidate (Student / Job Seeker)</option>
                <option value="hr">HR Director (Enterprise Client)</option>
                <option value="employee">Curriculum Editor (Employee)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" class="form-input" required placeholder="name@domain.com" oninput="state.registerEmail = this.value">
            </div>
            <div class="form-group" style="margin-bottom:24px;">
              <label>Password</label>
              <input type="password" class="form-input" required placeholder="••••••••" oninput="state.registerPassword = this.value">
            </div>
            <button type="submit" class="btn btn-accent" style="width:100%;">Complete Registration</button>
          </form>
        </div>
      </div>
    `;
  }

  if (state.activeModal === 'book-demo') {
    return `
      <div class="modal-overlay active">
        <div class="modal-content" style="text-align:center;">
          <button class="modal-close" onclick="state.activeModal = null; render();">✕</button>
          <i class="fas fa-calendar-check text-teal" style="font-size:3rem; margin-bottom:16px;"></i>
          <h2>Book Enterprise AI Demo</h2>
          <p style="font-size:0.85rem; margin-bottom:24px;">Schedule a 30-minute demonstration of Whisper NLP transcripts, OpenCV gaze analysis, and automated candidate shortlisting panels.</p>
          <form onsubmit="event.preventDefault(); showToast('Demo request registered successfully! A representative will connect shortly.'); state.activeModal = null; render();">
            <div class="form-group">
              <input type="text" class="form-input" placeholder="Your Name" required>
            </div>
            <div class="form-group">
              <input type="email" class="form-input" placeholder="Corporate Email Address" required>
            </div>
            <button type="submit" class="btn btn-accent" style="width:100%;">Schedule Demo</button>
          </form>
        </div>
      </div>
    `;
  }

  if (state.activeModal === 'certificate') {
    return `
      <div class="modal-overlay active">
        <div class="modal-content" style="max-width: 600px; padding: 0; overflow: hidden; background:#fff; color:#0f172a; border-radius: var(--radius-md);">
          <button class="modal-close" style="color:#0f172a;" onclick="state.activeModal = null; render();">✕</button>
          
          <div style="border: 15px solid #0f172a; padding: 40px; text-align: center; position: relative;">
            <div style="font-family: var(--font-display); font-weight: 800; font-size: 1.5rem; margin-bottom: 24px; color:#2563EB;">
              <i class="fas fa-brain"></i> AuraHire Certificate of Completion
            </div>
            
            <p style="font-size:0.85rem; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; margin-bottom:12px;">This is proudly presented to</p>
            <h2 style="font-family: var(--font-display); font-size: 2.2rem; color:#0f172a; border-bottom: 2px solid #e2e8f0; display: inline-block; padding-bottom: 8px; margin-bottom: 20px;">
              ${state.user.display_name}
            </h2>
            
            <p style="font-size: 0.95rem; line-height:1.6; margin-bottom:32px;">
              for outstanding performance and successful verification of all modules in the advanced curriculum of 
              <br>
              <strong>${state.activeCertificateCourse ? state.activeCertificateCourse.title : 'Full-Stack Software Engineering'}</strong>
              <br>
              <span style="font-size:0.85rem; color:#64748b;">Duration: ${state.activeCertificateCourse ? state.activeCertificateCourse.duration : '6 Weeks'}</span>
            </p>
            
            <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px solid #e2e8f0; padding-top:20px;">
              <div style="text-align:left;">
                <div style="font-family: 'Outfit'; font-weight: 700; font-size: 0.85rem;">Sarah Jenkins</div>
                <div style="font-size: 0.75rem; color:#64748b;">Curriculum Lead, AuraHire</div>
              </div>
              
              <div style="width:70px; height:70px; border-radius:50%; border:2px dashed #10B981; display:flex; align-items:center; justify-content:center; color:#10B981; font-weight:800; font-size:0.75rem; transform:rotate(-15deg);">
                VERIFIED AI
              </div>
              
              <div style="text-align:right;">
                <div style="font-family: 'Outfit'; font-weight: 700; font-size: 0.85rem;">AuraHire Gatekeeper</div>
                <div style="font-size: 0.75rem; color:#64748b;">Verification ID: cert-${state.activeCertificateCourse ? state.activeCertificateCourse.id : '101'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}

// User registration handler
async function handleSignup(email, password, role) {
  try {
    const signupData = await apiCall('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
    
    showToast(`Verification OTP code generated: ${signupData.simulatedOtp}. Verifying account...`);
    
    // Auto submit verification to complete onboarding simulation instantly
    setTimeout(async () => {
      const verifyData = await apiCall('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, otp: signupData.simulatedOtp })
      });
      
      state.token = verifyData.token;
      state.user = verifyData.user;
      localStorage.setItem('token', verifyData.token);
      
      showToast('Registration and verification success!');
      state.activeModal = null;
      
      if (role === 'candidate') {
        navigate('candidate-dashboard');
      } else if (role === 'hr') {
        navigate('hr-dashboard');
      } else if (role === 'employee') {
        navigate('employee-dashboard');
      }
    }, 1500);

  } catch (e) {
    console.error(e);
  }
}

// FAQ accordion toggler
window.toggleFaq = function(element) {
  const item = element.parentElement;
  const isActive = item.classList.contains('active');
  
  // Close all other FAQs
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
  
  if (!isActive) {
    item.classList.add('active');
  }
};

// Main render function
function render() {
  const root = document.getElementById('app-root');
  if (!root) return;

  let content = renderNavbar();

  if (state.currentView === 'landing') {
    content += renderLanding();
  } else if (state.currentView === 'candidate-dashboard') {
    content += renderCandidateDashboard();
  } else if (state.currentView === 'hr-dashboard') {
    content += renderHrDashboard();
  } else if (state.currentView === 'employee-dashboard') {
    content += renderEmployeeDashboard();
  } else if (state.currentView === 'interview') {
    content += renderInterview();
  }

  // Append footer for landing page
  if (state.currentView === 'landing') {
    content += `
      <footer>
        <div class="container footer-grid">
          <div class="footer-brand">
            <a href="#" class="logo"><i class="fas fa-brain"></i> AuraHire</a>
            <p>Next-generation enterprise screening platform powered by computer vision metrics and speech transcribers.</p>
            <div class="social-links">
              <a href="#"><i class="fab fa-twitter"></i></a>
              <a href="#"><i class="fab fa-github"></i></a>
              <a href="#"><i class="fab fa-linkedin"></i></a>
            </div>
          </div>
          <div class="footer-column">
            <h4>Platform</h4>
            <ul>
              <li><a href="#features">Solutions</a></li>
              <li><a href="#learning">Curriculums</a></li>
              <li><a href="#ai-modules">AI Interviews</a></li>
              <li><a href="#mockups">Dashboard Preview</a></li>
            </ul>
          </div>
          <div class="footer-column">
            <h4>Security</h4>
            <ul>
              <li><a href="#security">JWT Verification</a></li>
              <li><a href="#security">OTP Guidelines</a></li>
              <li><a href="#security">S3 Video Uploads</a></li>
              <li><a href="#stats">Audit Track logs</a></li>
            </ul>
          </div>
          <div class="footer-column">
            <h4>Corporate</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Enterprise Pricing</a></li>
              <li><a href="#">Contact Support</a></li>
            </ul>
          </div>
          <div class="footer-newsletter">
            <h4>Newsletter</h4>
            <p>Subscribe to receive news about our OpenCV and Whisper software releases.</p>
            <form class="newsletter-form" onsubmit="event.preventDefault(); showToast('Subscribed to newsletter.'); this.reset();">
              <input type="email" placeholder="Your work email" required>
              <button type="submit" class="btn btn-primary" style="padding:10px 18px;"><i class="fas fa-envelope"></i></button>
            </form>
          </div>
        </div>
        <div class="container footer-bottom">
          <span>&copy; 2026 AuraHire Inc. All rights reserved. WCAG 2.1 Compliant.</span>
          <span>Designed with Google & Stripe Aesthetics</span>
        </div>
      </footer>
    `;
  }

  content += renderModals();

  root.innerHTML = content;
  
  // Re-run intersection observer scroll reveal if on landing page
  if (state.currentView === 'landing') {
    initScrollReveal();
  }
}

// Scroll Reveal trigger via IntersectionObserver
function initScrollReveal() {
  const sections = document.querySelectorAll('.card-premium, .timeline-content-box, .stat-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.05 });
  
  sections.forEach(s => {
    s.style.opacity = '0';
    s.style.transform = 'translateY(25px)';
    s.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(s);
  });
}

// Add event handlers directly to window to bind modal actions
window.state = state;
window.render = render;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleSignOut = handleSignOut;
window.navigate = navigate;
window.toggleTheme = toggleTheme;
window.applyToJob = applyToJob;
window.startAIInterview = startAIInterview;
window.submitInterviewAnswers = submitInterviewAnswers;
window.triggerRazorpayUpgrade = triggerRazorpayUpgrade;
window.viewReportDetails = viewReportDetails;
window.addCourse = addCourse;
window.updateCourseProgress = updateCourseProgress;
window.openCertificate = openCertificate;

// Initialize on window load
window.addEventListener('DOMContentLoaded', () => {
  checkAuthSession();
});
