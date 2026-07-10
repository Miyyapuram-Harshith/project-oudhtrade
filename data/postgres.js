import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'postgres.json');

const defaultDb = {
  users: [],
  listings: [],
  requirements: [],
  threads: [],
  messages: [],
  company_team: [],
  grievances: [],
  data_rights_requests: [],
  audit_logs: [],
  jobs: [],
  applications: [],
  companies: [],
  payments: [],
  interview_results: [],
  courses: []
};

// Seed initial system data for testing
const seedDatabase = (db) => {
  const needsReseed = !db.users || 
                      db.users.length === 0 || 
                      !db.users.some(u => u.email === "hr@enterprise.com") ||
                      !db.jobs ||
                      db.jobs.length === 0;

  if (needsReseed) {
    db.users = [];
    db.listings = [];
    db.requirements = [];
    db.threads = [];
    db.messages = [];
    db.company_team = [];
    db.grievances = [];
    db.data_rights_requests = [];
    db.audit_logs = [];
    db.jobs = [];
    db.applications = [];
    db.companies = [];
    db.payments = [];
    db.interview_results = [];
    db.courses = [];

    // Seed 1: Staff / Internal Users
    // CEO (Super Admin)
    db.users.push({
      id: "staff-ceo-uuid",
      email: "ceo@oudhtrade.com",
      password: "password123",
      role: "ceo", // internal role
      account_state: "active_verified",
      display_name: "Vikram Singh (CEO)",
      created_at: new Date().toISOString()
    });

    // Ops Lead / Grievance Officer (Compliance + Moderation)
    db.users.push({
      id: "staff-ops-uuid",
      email: "compliance@oudhtrade.com",
      password: "password123",
      role: "ops_lead", // Grievance Officer
      account_state: "active_verified",
      display_name: "Priya Sharma (Grievance Officer)",
      created_at: new Date().toISOString()
    });

    // Trust & Safety Moderator (Moderation)
    db.users.push({
      id: "staff-mod-uuid",
      email: "moderator@oudhtrade.com",
      password: "password123",
      role: "moderator",
      account_state: "active_verified",
      display_name: "Amit Patel (T&S Moderator)",
      created_at: new Date().toISOString()
    });

    // Support Agent
    db.users.push({
      id: "staff-support-uuid",
      email: "support@oudhtrade.com",
      password: "password123",
      role: "support_agent",
      account_state: "active_verified",
      display_name: "Rajesh Kumar (Support)",
      created_at: new Date().toISOString()
    });

    // Seed 2: External Users
    // Buyer
    db.users.push({
      id: "buyer-uuid-1",
      email: "buyer@gmail.com",
      password: "password123",
      role: "buyer",
      account_state: "active_verified",
      phone: "+919876543210",
      phone_verified: true,
      id_proof_status: "approved",
      trust_badges: ["Verified Buyer"],
      profile: {
        display_name: "Assam Perfumes Ltd",
        country: "India",
        buyer_type: "perfumer",
        organization_name: "Assam Perfumes Ltd",
        areas_of_interest: ["oud oil", "chips"]
      },
      created_at: new Date().toISOString()
    });

    // Seller (Trader)
    db.users.push({
      id: "seller-uuid-1",
      email: "seller@gmail.com",
      password: "password123",
      role: "seller",
      account_state: "active_verified",
      phone: "+919988776655",
      phone_verified: true,
      id_proof_status: "approved",
      trust_badges: ["Verified Seller"],
      profile: {
        business_name: "Assam Agarwood Traders",
        country_region: "India (Assam)",
        product_categories: ["chips", "raw wood"],
        seller_description: "Wholesale suppliers of premium grade wild and cultivated Assam Agarwood chips and raw materials since 2012.",
        years_in_trade: 14
      },
      created_at: new Date().toISOString()
    });

    // Farmer
    db.users.push({
      id: "farmer-uuid-1",
      email: "farmer@gmail.com",
      password: "password123",
      role: "farmer",
      account_state: "active_verified",
      phone: "+66812345678",
      phone_verified: true,
      id_proof_status: "approved",
      trust_badges: ["Verified Plantation"],
      profile: {
        plantation_name: "Trat Province Organic Aquilaria Farm",
        country_region: "Thailand (Trat)",
        plantation_location: "Trat Sub-district, Thailand",
        plantation_size_approx: "12 Acres",
        offerings: ["plants", "harvest"],
        plantation_description: "Eco-friendly sustainable plantation specializing in Aquilaria Crassna cultivation and inoculation services.",
        agarwood_species: ["Aquilaria Crassna"],
        years_farming: 8
      },
      created_at: new Date().toISOString()
    });

    // Inoculation Provider
    db.users.push({
      id: "inoc-uuid-1",
      email: "inoculator@gmail.com",
      password: "password123",
      role: "inoculation_provider",
      account_state: "active_verified",
      phone: "+60123456789",
      phone_verified: true,
      id_proof_status: "approved",
      trust_badges: ["Verified Specialist"],
      profile: {
        provider_business_name: "Bio-Induce Agarwood Solutions",
        country_region: "Malaysia",
        service_types: ["service", "material supply"],
        coverage_areas: ["Malaysia", "Thailand", "Indonesia"],
        service_description: "Patent-pending organic inoculation technology yielding high-density resin in Aquilaria trees within 18 months.",
        years_of_experience: 12,
        inoculation_methods_used: ["Organic Inoculant", "Drill-Press-Infusion"]
      },
      created_at: new Date().toISOString()
    });

    // Nursery
    db.users.push({
      id: "nursery-uuid-1",
      email: "nursery@gmail.com",
      password: "password123",
      role: "nursery",
      account_state: "active_verified",
      phone: "+84901234567",
      phone_verified: true,
      id_proof_status: "approved",
      trust_badges: ["Verified Nursery"],
      profile: {
        nursery_business_name: "Hanoi Green Aquilaria Nursery",
        country_region: "Vietnam (Hanoi)",
        nursery_location: "Dong Anh District, Hanoi, Vietnam",
        plant_types_offered: ["saplings", "seeds"],
        nursery_description: "Certified growers of high-yield Aquilaria Sinensis and Aquilaria Crassna saplings. Bulk shipping available globally.",
        capacity_stock_scale: "50,000 saplings/year",
        agarwood_species: ["Aquilaria Sinensis", "Aquilaria Crassna"],
        years_in_operation: 6
      },
      created_at: new Date().toISOString()
    });

    // Company (Multi-user)
    db.users.push({
      id: "company-owner-uuid-1",
      email: "owner@agarcorp.com",
      password: "password123",
      role: "company",
      account_state: "active_verified",
      phone: "+6591234567",
      phone_verified: true,
      id_proof_status: "approved",
      trust_badges: ["Verified Company"],
      company_id: "agarcorp-company-uuid",
      profile: {
        legal_company_name: "AgarCorp International Pte Ltd",
        business_registration_number: "201988123K",
        registered_country_address: "10 Anson Road, International Plaza, Singapore 079903",
        primary_contact_name_role: "Mark Chen (Director)",
        work_email: "contact@agarcorp.com",
        company_categories: ["products", "services"],
        company_description: "Global conglomerate covering plantations, processing factories, custom inoculation, and finished Oud oil distribution.",
        company_phone: "+6567890123"
      },
      created_at: new Date().toISOString()
    });

    // Seed Company Team Members
    db.company_team.push({
      id: "team-1",
      company_id: "agarcorp-company-uuid",
      user_id: "company-owner-uuid-1",
      team_role: "owner"
    });

    // Add manager team member
    db.users.push({
      id: "company-mgr-uuid-1",
      email: "manager@agarcorp.com",
      password: "password123",
      role: "company",
      account_state: "active_verified",
      phone: "+6598765432",
      phone_verified: true,
      company_id: "agarcorp-company-uuid",
      profile: {
        display_name: "Sarah Lim (Manager)",
        primary_contact_name_role: "Sarah Lim (Manager)"
      },
      created_at: new Date().toISOString()
    });
    db.company_team.push({
      id: "team-2",
      company_id: "agarcorp-company-uuid",
      user_id: "company-mgr-uuid-1",
      team_role: "manager"
    });

    // Add support agent team member
    db.users.push({
      id: "company-supp-uuid-1",
      email: "support@agarcorp.com",
      password: "password123",
      role: "company",
      account_state: "active_verified",
      phone: "+6595556666",
      phone_verified: true,
      company_id: "agarcorp-company-uuid",
      profile: {
        display_name: "David Tan (Support)",
        primary_contact_name_role: "David Tan (Support)"
      },
      created_at: new Date().toISOString()
    });
    db.company_team.push({
      id: "team-3",
      company_id: "agarcorp-company-uuid",
      user_id: "company-supp-uuid-1",
      team_role: "support_agent"
    });

    // Seed 3: Listings
    db.listings.push({
      id: "listing-1",
      owner_id: "seller-uuid-1",
      owner_type: "user",
      listing_type: "product",
      title: "Grade A Super Assam Oud Wood Chips",
      description: "Harvested from cultivated Aquilaria Malaccensis trees in Sibsagar, Assam. Extremely rich sweet-woody resin content. Ideal for direct heating and incense formulation.",
      status: "published",
      attributes: {
        category: "chips",
        species: "Aquilaria Malaccensis",
        quantity: "5 kg available",
        price_guidance: "$450 / kg"
      },
      views_count: 142,
      saves_count: 28,
      inquiries_count: 6,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      id: "listing-2",
      owner_id: "farmer-uuid-1",
      owner_type: "user",
      listing_type: "plant",
      title: "Sustainable Aquilaria Crassna Plantation Logs",
      description: "Fully inoculated Aquilaria Crassna trees ready for harvest. Grown under sustainable farm protocols in Trat, Thailand. Average age: 10 years, inoculated 2 years ago.",
      status: "published",
      attributes: {
        category: "harvest",
        species: "Aquilaria Crassna",
        quantity: "400 trees",
        price_guidance: "Contact for volume pricing"
      },
      views_count: 85,
      saves_count: 12,
      inquiries_count: 3,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }, {
      id: "listing-3",
      owner_id: "agarcorp-company-uuid",
      owner_type: "company",
      listing_type: "product",
      title: "Pure Cambodi Organic Oud Oil - Batch 4B",
      description: "100% pure hydro-distilled Cambodi Oud Oil. Rich, leather, honey-like drydown with unmatched longevity. Extracted in our GMP-compliant Singapore facility.",
      status: "published",
      attributes: {
        category: "oud oil",
        species: "Aquilaria Subintegra",
        quantity: "15 Liters in stock",
        price_guidance: "$180 per Tola (12ml)"
      },
      views_count: 220,
      saves_count: 54,
      inquiries_count: 11,
      created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Seed 4: Requirements
    db.requirements.push({
      id: "req-1",
      owner_id: "buyer-uuid-1",
      owner_type: "user",
      title: "Urgent: Seeking 500 Liters of Cultivated Oud Oil (Pure)",
      description: "Looking for a reliable nursery or distillery company to supply pure hydro-distilled Aquilaria oil for fine perfumery. Must have legal origin and cultivation documentation.",
      category: "oud oil",
      region: "Global",
      status: "active",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    });

    // Seed 5: Grievances
    db.grievances.push({
      id: "grievance-1",
      reporter_id: "buyer-uuid-1",
      reported_user_id: "seller-uuid-1",
      reported_listing_id: "listing-1",
      complaint_text: "Seller listed products as Assam chips but claims shipping is uncertified. Potential compliance issue.",
      status: "acknowledged",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      acknowledged_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    });

    // Seed 6: AI Hiring Platform Companies
    db.companies.push({
      id: "stripe-enterprise-uuid",
      name: "Stripe Inc.",
      subscription_tier: "free",
      created_at: new Date().toISOString()
    }, {
      id: "linear-uuid",
      name: "Linear App",
      subscription_tier: "enterprise",
      created_at: new Date().toISOString()
    }, {
      id: "openai-uuid",
      name: "OpenAI",
      subscription_tier: "enterprise",
      created_at: new Date().toISOString()
    });

    // Seed 7: AI Hiring Platform Users
    // Candidate User
    db.users.push({
      id: "candidate-uuid-stripe-001",
      email: "candidate@hiring.com",
      password: "password123",
      role: "candidate",
      account_state: "active_verified",
      display_name: "Alex Rivera",
      created_at: new Date().toISOString(),
      profile: {
        skills: ["React.js", "CSS Grid", "Node.js", "Python"],
        education: "B.Tech in Computer Science, IIT Bombay",
        course_progress: {
          "course-1": 75,
          "course-2": 40,
          "course-3": 10
        },
        certificates: ["course-1"]
      }
    });

    // HR Manager User
    db.users.push({
      id: "hr-uuid-stripe-002",
      email: "hr@enterprise.com",
      password: "password123",
      role: "hr",
      company_id: "stripe-enterprise-uuid",
      account_state: "active_verified",
      display_name: "Jane Doe (HR Director)",
      created_at: new Date().toISOString()
    });

    // Employee / Team Lead User
    db.users.push({
      id: "employee-uuid-stripe-003",
      email: "employee@hiring.com",
      password: "password123",
      role: "employee",
      account_state: "active_verified",
      display_name: "Sarah Jenkins (Curriculum Lead)",
      created_at: new Date().toISOString()
    });

    // Seed 8: AI Hiring Platform Courses
    db.courses.push({
      id: "course-1",
      title: "Full-Stack Web Development",
      description: "Master React.js, Node.js, and modern CSS layout design.",
      duration: "6 Weeks",
      lectures: 24,
      modules: 4,
      certificate: true
    }, {
      id: "course-2",
      title: "AI & Machine Learning Engineering",
      description: "Learn computer vision with OpenCV, speech recognition with Whisper, and NLP workflows.",
      duration: "8 Weeks",
      lectures: 32,
      modules: 5,
      certificate: true
    }, {
      id: "course-3",
      title: "System Design & High Performance Computing",
      description: "Design fault-tolerant architectures using AWS, Postgres, MongoDB, and microservices.",
      duration: "4 Weeks",
      lectures: 16,
      modules: 3,
      certificate: true
    });

    // Seed 9: AI Hiring Platform Jobs
    db.jobs.push({
      id: "job-1",
      company_id: "stripe-enterprise-uuid",
      title: "Staff Frontend Engineer",
      eligibility_criteria: "5+ years experience in CSS/JS and reactive SPAs. Experience in design systems is a plus.",
      is_active: true,
      created_at: new Date().toISOString()
    }, {
      id: "job-2",
      company_id: "stripe-enterprise-uuid",
      title: "AI Research Scientist",
      eligibility_criteria: "Strong background in Whisper speech transcription and OpenCV body language models.",
      is_active: true,
      created_at: new Date().toISOString()
    }, {
      id: "job-3",
      company_id: "linear-uuid",
      title: "Full-Stack Product Developer",
      eligibility_criteria: "Comfortable with Node.js, PostgreSQL, and high-fidelity micro-interactions.",
      is_active: true,
      created_at: new Date().toISOString()
    });

    // Seed 10: AI Hiring Platform Applications
    db.applications.push({
      id: "app-1",
      job_id: "job-1",
      candidate_id: "candidate-uuid-stripe-001",
      resume_url: "https://assets.hiringplatform.com/resumes/alex_rivera_cv.pdf",
      status: "evaluation_pending",
      created_at: new Date().toISOString()
    }, {
      id: "app-2",
      job_id: "job-2",
      candidate_id: "candidate-uuid-stripe-001",
      resume_url: "https://assets.hiringplatform.com/resumes/alex_rivera_cv.pdf",
      status: "assessment_pending",
      created_at: new Date().toISOString()
    });

    // Seed 11: AI Hiring Platform Interview Results
    db.interview_results.push({
      id: "result-1",
      application_id: "app-1",
      overall_score: 88,
      cognitive_score: 92,
      communication_score: 85,
      technical_score: 87,
      mongodb_report_id: "mongo-report-stripe-101",
      created_at: new Date().toISOString()
    });

    // Seed 12: AI Hiring Platform Payments
    db.payments.push({
      id: "pay-1",
      company_id: "stripe-enterprise-uuid",
      razorpay_order_id: "order_stripe_001",
      amount: 19999.00,
      status: "paid",
      created_at: new Date().toISOString()
    });
  }
};

class RelationalDatabase {
  constructor() {
    this.data = { ...defaultDb };
    this.load();
  }

  load() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(fileContent);
        // Merge with defaultDb to ensure all OudhTrade fields exist
        this.data = { ...defaultDb, ...parsed };
      } else {
        this.data = { ...defaultDb };
        this.save();
      }
      seedDatabase(this.data);
      this.save();
    } catch (error) {
      console.error("Failed to load OudhTrade relational simulation database:", error);
      this.data = { ...defaultDb };
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error("Failed to save OudhTrade relational simulation database:", error);
    }
  }

  get users() { return this.data.users; }
  get listings() { return this.data.listings; }
  get requirements() { return this.data.requirements; }
  get threads() { return this.data.threads; }
  get messages() { return this.data.messages; }
  get company_team() { return this.data.company_team; }
  get grievances() { return this.data.grievances; }
  get data_rights_requests() { return this.data.data_rights_requests; }
  get audit_logs() { return this.data.audit_logs; }
  get jobs() { return this.data.jobs; }
  get applications() { return this.data.applications; }
  get companies() { return this.data.companies; }
  get payments() { return this.data.payments; }
  get interview_results() { return this.data.interview_results; }
  get courses() { return this.data.courses; }
}

const pgDb = new RelationalDatabase();
export default pgDb;
