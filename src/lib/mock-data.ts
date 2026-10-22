// Mock data layer. Shapes mirror future database tables so this file can be
// swapped for real queries later.
import thabo from "@/assets/thabo.jpg";
import naledi from "@/assets/naledi.jpg";
import daniel from "@/assets/daniel.jpg";
import ayesha from "@/assets/ayesha.jpg";

export const LOCATIONS = [
  "Cape Town CBD",
  "Bellville",
  "Goodwood",
  "Durbanville",
  "Parow",
  "Milnerton",
  "Table View",
  "Observatory",
  "Stellenbosch",
] as const;

export type ServiceLevel = { name: "Basic" | "Standard" | "Premium"; desc: string; range: string };

export type Category = {
  slug: string;
  name: string;
  icon: string;
  blurb: string;
  regulated?: string;
  services: string[];
  levels: ServiceLevel[];
};

export const CATEGORIES: Category[] = [
  {
    slug: "garden",
    name: "Garden & Landscaping",
    icon: "🌿",
    blurb: "Lawns, hedges, full landscaping",
    services: ["General Garden Maintenance", "Lawn Cutting", "Hedge & Tree Trimming", "Landscaping", "Vegetable Garden Installation", "Irrigation Installation", "Garden Clean-up", "Garden Design", "Water Features / Fountain Installation"],
    levels: [
      { name: "Basic", desc: "Lawn cutting, trimming and general maintenance.", range: "R200–R350" },
      { name: "Standard", desc: "Maintenance plus clean-up and minor landscaping.", range: "R350–R600" },
      { name: "Premium", desc: "Full landscaping, design, irrigation or installs.", range: "R600+" },
    ],
  },
  {
    slug: "cleaning",
    name: "Cleaning",
    icon: "🧽",
    blurb: "Homes, offices, deep cleans",
    services: ["Regular Home Cleaning", "Deep Cleaning", "Move-in / Move-out Cleaning", "Office Cleaning", "Carpet & Upholstery", "Window Cleaning", "Oven & Fridge Detailing"],
    levels: [
      { name: "Basic", desc: "Standard tidy, dusting, floors and bathrooms.", range: "R180–R300" },
      { name: "Standard", desc: "Full clean including kitchen detailing.", range: "R300–R500" },
      { name: "Premium", desc: "Deep clean, carpets, move-out ready.", range: "R500+" },
    ],
  },
  {
    slug: "it",
    name: "IT & Technology",
    icon: "💻",
    blurb: "Repairs, Wi-Fi, setups",
    services: ["Computer Repair", "Laptop Screen Replacement", "Wi-Fi & Network Setup", "Virus Removal", "Data Backup & Recovery", "Smart Home Setup", "Phone Repair"],
    levels: [
      { name: "Basic", desc: "Diagnostics, software fixes, setup help.", range: "R250–R400" },
      { name: "Standard", desc: "Hardware repair, networking, data recovery.", range: "R400–R800" },
      { name: "Premium", desc: "Full home/office network or smart installs.", range: "R800+" },
    ],
  },
  {
    slug: "electrical",
    name: "Electrical & Energy",
    icon: "⚡",
    blurb: "Lighting, solar, inverters",
    regulated: "Electrical work must be done by a qualified, registered electrician. Look for the Qualified Worker badge.",
    services: ["Appliance Troubleshooting", "Lighting Installation", "Electrical Maintenance", "Solar Consultation", "Solar Installation", "Inverter Installation", "Battery Backup Systems", "Electrical Planning / Schematic Work"],
    levels: [
      { name: "Basic", desc: "Troubleshooting, consultation, fittings.", range: "R350–R600" },
      { name: "Standard", desc: "Lighting installs, maintenance, COC checks.", range: "R600–R1,500" },
      { name: "Premium", desc: "Solar, inverter and battery systems.", range: "R1,500+" },
    ],
  },
  {
    slug: "tutoring",
    name: "Tutoring & Education",
    icon: "📚",
    blurb: "Primary to university",
    services: ["Mathematics", "Physical Sciences", "English", "Afrikaans", "Accounting", "Computer Science", "Exam Preparation"],
    levels: [
      { name: "Basic", desc: "Primary school, per hour.", range: "R150–R220" },
      { name: "Standard", desc: "High school, per hour.", range: "R200–R320" },
      { name: "Premium", desc: "University / college, per hour.", range: "R300+" },
    ],
  },
  {
    slug: "home-repairs",
    name: "Home Repairs & Maintenance",
    icon: "🔧",
    blurb: "Plumbing, painting, carpentry",
    regulated: "Plumbing and gas work may require a registered professional. Check qualification badges.",
    services: ["Plumbing", "Painting", "Tiling", "Gutter Cleaning", "Gutter Repairs", "Basic Carpentry", "Furniture Assembly", "Door Repairs", "Cabinet Repairs", "Drywall / Partition Repairs", "Curtain / Blind Installation", "General Maintenance"],
    levels: [
      { name: "Basic", desc: "Small fixes, assembly, call-outs.", range: "R250–R450" },
      { name: "Standard", desc: "Painting a room, tiling, gutter work.", range: "R450–R1,200" },
      { name: "Premium", desc: "Multi-day repairs and renovations.", range: "R1,200+" },
    ],
  },
  {
    slug: "automotive",
    name: "Automotive",
    icon: "🚗",
    blurb: "Mobile servicing & washes",
    regulated: "Specialised mechanical work may require a qualified mechanic.",
    services: ["Basic Vehicle Maintenance", "Battery Replacement", "Brake Inspection", "Oil / Filter Services", "Mobile Car Wash", "Interior Cleaning", "Mobile Tyre Services", "Vehicle Diagnostics", "Minor Repairs"],
    levels: [
      { name: "Basic", desc: "Washes, valets, battery swaps.", range: "R150–R350" },
      { name: "Standard", desc: "Oil service, diagnostics, tyres.", range: "R350–R900" },
      { name: "Premium", desc: "Brakes and minor mechanical repairs.", range: "R900+" },
    ],
  },
  {
    slug: "moving",
    name: "Moving & Assistance",
    icon: "📦",
    blurb: "Small moves, removals",
    services: ["Small Moves", "Furniture Moving", "Appliance Moving", "Packing / Unpacking", "Loading / Unloading", "Garage Clearing", "Garden Waste Removal", "Small Deliveries"],
    levels: [
      { name: "Basic", desc: "Loading help, small deliveries.", range: "R250–R450" },
      { name: "Standard", desc: "Bakkie move within the metro.", range: "R450–R1,000" },
      { name: "Premium", desc: "Full flat move with packing.", range: "R1,000+" },
    ],
  },
];

export type Day = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export const DAYS: Day[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type Worker = {
  id: string;
  name: string;
  category: string;
  services: string[];
  location: string;
  years: number;
  startPrice: number;
  rating: number;
  reviews: number;
  jobs: number;
  verified: boolean;
  availability?: "Available" | "NextWeek";
  qualified?: string;
  badges: string[];
  bio: string;
  photo?: string;
  schedule: Partial<Record<Day, [string, string]>>;
  travelFee: number;
};

const weekdays: Worker["schedule"] = { Mon: ["08:00", "17:00"], Tue: ["08:00", "17:00"], Thu: ["08:00", "17:00"], Fri: ["08:00", "15:00"], Sat: ["09:00", "13:00"] };
const full: Worker["schedule"] = { Mon: ["07:00", "17:00"], Tue: ["07:00", "17:00"], Wed: ["07:00", "17:00"], Thu: ["07:00", "17:00"], Fri: ["07:00", "17:00"] };
const evenings: Worker["schedule"] = { Mon: ["14:00", "19:00"], Tue: ["14:00", "19:00"], Wed: ["14:00", "19:00"], Thu: ["14:00", "19:00"], Sat: ["09:00", "14:00"] };

export const WORKERS: Worker[] = [
  { id: "thabo", name: "Thabo Mokoena", category: "garden", services: ["General Garden Maintenance", "Lawn Cutting", "Hedge & Tree Trimming", "Garden Clean-up"], location: "Bellville", years: 6, startPrice: 250, rating: 4.8, reviews: 43, jobs: 127, verified: true, badges: ["Identity Verified", "Experience Verified", "Customer Rated"], bio: "Independent gardener with 6 years of experience maintaining residential gardens around Cape Town. I bring my own mower and trimmer.", photo: thabo, schedule: weekdays, travelFee: 50 },
  { id: "johan", name: "Johan van Wyk", category: "garden", services: ["Landscaping", "Irrigation Installation", "Garden Design", "Water Features / Fountain Installation"], location: "Durbanville", years: 11, startPrice: 450, rating: 4.9, reviews: 61, jobs: 188, verified: true, badges: ["Identity Verified", "Experience Verified", "Customer Rated"], bio: "Landscaper focusing on water-wise gardens and drip irrigation for Cape summers.", schedule: full, travelFee: 80 },
  { id: "sipho", name: "Sipho Dlamini", category: "garden", services: ["General Garden Maintenance", "Lawn Cutting", "Vegetable Garden Installation"], location: "Goodwood", years: 3, startPrice: 200, rating: 4.6, reviews: 18, jobs: 41, verified: true, badges: ["Identity Verified", "Customer Rated"], bio: "Building my reputation one garden at a time. Reliable, punctual and passionate about veggie patches.", schedule: weekdays, travelFee: 40 },
  { id: "zanele", name: "Zanele Khumalo", category: "garden", services: ["General Garden Maintenance", "Hedge & Tree Trimming", "Garden Clean-up"], location: "Table View", years: 5, startPrice: 230, rating: 4.7, reviews: 29, jobs: 84, verified: false, badges: ["Customer Rated"], bio: "Weekly and fortnightly garden care along the West Coast suburbs.", schedule: weekdays, travelFee: 50 },
  { id: "naledi", name: "Naledi Mokoena", category: "cleaning", services: ["Regular Home Cleaning", "Deep Cleaning", "Oven & Fridge Detailing", "Move-in / Move-out Cleaning"], location: "Parow", years: 8, startPrice: 220, rating: 4.9, reviews: 94, jobs: 260, verified: true, badges: ["Identity Verified", "Experience Verified", "Customer Rated"], bio: "Thorough, friendly home cleaner. I bring my own eco-friendly supplies.", photo: naledi, schedule: full, travelFee: 40 },
  { id: "fatima", name: "Fatima Adams", category: "cleaning", services: ["Office Cleaning", "Window Cleaning", "Carpet & Upholstery"], location: "Observatory", years: 4, startPrice: 260, rating: 4.7, reviews: 37, jobs: 96, verified: true, badges: ["Identity Verified", "Customer Rated"], bio: "Small office and studio cleaning around Obs, Woodstock and the CBD.", schedule: weekdays, travelFee: 50 },
  { id: "liam", name: "Liam Jacobs", category: "it", services: ["Computer Repair", "Laptop Screen Replacement", "Virus Removal", "Data Backup & Recovery"], location: "Milnerton", years: 5, startPrice: 300, rating: 4.8, reviews: 52, jobs: 140, verified: true, badges: ["Identity Verified", "Experience Verified", "Customer Rated"], bio: "Computer technician — I'll fix it at your kitchen table and explain what went wrong.", schedule: evenings, travelFee: 60 },
  { id: "keagan", name: "Keagan Fortuin", category: "it", services: ["Wi-Fi & Network Setup", "Smart Home Setup", "Phone Repair"], location: "Cape Town CBD", years: 2, startPrice: 250, rating: 4.5, reviews: 12, jobs: 27, verified: true, badges: ["Identity Verified"], bio: "IT student offering affordable Wi-Fi mesh and smart home setups.", schedule: evenings, travelFee: 50 },
  { id: "siyabonga", name: "Siyabonga Dlamini", category: "electrical", services: ["Solar Consultation", "Solar Installation", "Inverter Installation", "Battery Backup Systems", "Lighting Installation"], location: "Stellenbosch", years: 9, startPrice: 550, rating: 4.9, reviews: 48, jobs: 112, verified: true, qualified: "Registered Electrician · Wireman's Licence", badges: ["Identity Verified", "Qualification Verified", "Customer Rated"], bio: "Qualified electrician specialising in load-shedding backup: inverters, batteries and rooftop solar. COC issued.", schedule: full, travelFee: 100 },
  { id: "ayesha", name: "Ayesha Khan", category: "tutoring", services: ["Mathematics", "Physical Sciences", "Exam Preparation"], location: "Observatory", years: 4, startPrice: 220, rating: 5.0, reviews: 33, jobs: 210, verified: true, qualified: "BSc Mathematics (UCT)", badges: ["Identity Verified", "Qualification Verified", "Customer Rated"], bio: "Maths and science tutor for Grades 8–12 and first-year university. Patient, structured and exam-focused.", photo: ayesha, schedule: evenings, travelFee: 0 },
  { id: "daniel", name: "Daniel Petersen", category: "home-repairs", services: ["Plumbing", "Gutter Repairs", "Door Repairs", "General Maintenance"], location: "Goodwood", years: 12, startPrice: 380, rating: 4.8, reviews: 71, jobs: 305, verified: true, qualified: "Qualified Plumber (PIRB registered)", badges: ["Identity Verified", "Qualification Verified", "Customer Rated"], bio: "Burst pipes, geysers, leaking taps — same-day call-outs across the Northern Suburbs.", photo: daniel, schedule: full, travelFee: 60 },
  { id: "pieter", name: "Pieter Botha", category: "home-repairs", services: ["Painting", "Tiling", "Basic Carpentry", "Furniture Assembly"], location: "Durbanville", years: 7, startPrice: 320, rating: 4.6, reviews: 25, jobs: 78, verified: true, badges: ["Identity Verified", "Experience Verified"], bio: "Neat, careful painter and handyman. Free quote on site.", schedule: weekdays, travelFee: 60 },
  { id: "musa", name: "Musa Ndlovu", category: "automotive", services: ["Mobile Car Wash", "Interior Cleaning", "Battery Replacement"], location: "Parow", years: 3, startPrice: 180, rating: 4.7, reviews: 40, jobs: 150, verified: true, badges: ["Identity Verified", "Customer Rated"], bio: "Waterless mobile car wash and valet at your home or office.", schedule: full, travelFee: 30 },
  { id: "bongani", name: "Bongani Zulu", category: "moving", services: ["Small Moves", "Furniture Moving", "Garden Waste Removal", "Small Deliveries"], location: "Milnerton", years: 6, startPrice: 400, rating: 4.8, reviews: 56, jobs: 190, verified: true, badges: ["Identity Verified", "Experience Verified", "Customer Rated"], bio: "Bakkie and two strong hands. Small moves and removals anywhere in the metro.", schedule: { ...full, Sat: ["08:00", "14:00"] }, travelFee: 80 },
];

export const getWorker = (id: string) => WORKERS.find((w) => w.id === id);
export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export type Review = { id: string; author: string; rating: number; date: string; service: string; text: string };

const REVIEW_POOL = [
  { author: "Megan R.", rating: 5, text: "Arrived on time, worked hard and left everything spotless. Fair price too." },
  { author: "Sizwe N.", rating: 5, text: "Really professional. Explained what needed doing before starting. Will book again." },
  { author: "Charlene D.", rating: 4, text: "Good work overall, ran about 30 minutes late but let me know in advance." },
  { author: "Ahmed P.", rating: 5, text: "So much cheaper than the big company quote and honestly a better job." },
  { author: "Karin S.", rating: 5, text: "Friendly, careful and tidy. Highly recommend to anyone in the area." },
  { author: "Lwazi M.", rating: 3, text: "Job done fine, but had to follow up on a small detail afterwards." },
];

export function getReviews(worker: Worker): Review[] {
  return REVIEW_POOL.map((r, i) => ({
    ...r,
    id: `${worker.id}-r${i}`,
    service: worker.services[i % worker.services.length] ?? "",
    date: `${[28, 21, 14, 9, 3, 26][i]} ${["Sep", "Sep", "Sep", "Aug", "Aug", "Jul"][i]} 2026`,
  }));
}

export function ratingBreakdown(worker: Worker) {
  const n = worker.reviews;
  const five = Math.round(n * (worker.rating >= 4.9 ? 0.9 : worker.rating >= 4.7 ? 0.8 : 0.65));
  const four = Math.round((n - five) * 0.65);
  const three = Math.round((n - five - four) * 0.6);
  const two = Math.max(0, n - five - four - three - 0);
  return [
    { stars: 5, count: five },
    { stars: 4, count: four },
    { stars: 3, count: three },
    { stars: 2, count: two },
    { stars: 1, count: 0 },
  ];
}

// Upcoming bookable slots for the next 7 days based on weekly schedule.
export function upcomingSlots(worker: Worker) {
  const base = new Date(2026, 9, 6); // Tue 6 Oct 2026 (demo "tomorrow")
  const out: { key: string; label: string; date: string; slots: string[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const day = DAYS[(d.getDay() + 6) % 7] as Day;
    const hours = worker.schedule[day];
    const slots: string[] = [];
    if (hours) {
      const start = parseInt(hours[0]);
      const end = parseInt(hours[1]);
      for (let h = start + 1; h < end; h += 2) slots.push(`${String(h).padStart(2, "0")}:00`);
    }
    out.push({
      key: d.toISOString().slice(0, 10),
      label: day,
      date: d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
      slots,
    });
  }
  return out;
}

export const ADD_ONS: Record<string, { label: string; price: number }[]> = {
  garden: [{ label: "Garden waste removal", price: 100 }, { label: "Fertiliser application", price: 80 }],
  cleaning: [{ label: "Inside oven", price: 100 }, { label: "Ironing (1 hr)", price: 90 }],
  it: [{ label: "Data backup", price: 150 }, { label: "Antivirus licence", price: 120 }],
  electrical: [{ label: "COC certificate", price: 450 }, { label: "Extra light point", price: 250 }],
  tutoring: [{ label: "Extra 30 min", price: 100 }, { label: "Past-paper pack", price: 60 }],
  "home-repairs": [{ label: "Materials supply", price: 150 }, { label: "After-hours call-out", price: 200 }],
  automotive: [{ label: "Tyre shine & polish", price: 60 }, { label: "Engine bay clean", price: 120 }],
  moving: [{ label: "Extra helper", price: 200 }, { label: "Packing boxes (10)", price: 120 }],
};

export type ApplicationStatus = "Application Submitted" | "Under Review" | "Interview Required" | "Approved" | "Rejected";

export type Application = {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  services: string[];
  location: string;
  years: number;
  date: string;
  idVerified: boolean;
  qualification: "Verified" | "Pending" | "Not required";
  references: number;
  description: string;
  startPrice: number;
  status: ApplicationStatus;
};

export const APPLICATIONS: Application[] = [
  { id: "a1", name: "Lindiwe Mthembu", email: "lindiwe.m@example.co.za", phone: "072 555 0141", category: "cleaning", services: ["Deep Cleaning", "Regular Home Cleaning"], location: "Bellville", years: 4, date: "2 Oct 2026", idVerified: true, qualification: "Not required", references: 2, description: "Experienced domestic cleaner looking for more weekly clients.", startPrice: 220, status: "Application Submitted" },
  { id: "a2", name: "Riaan Steyn", email: "riaan.s@example.co.za", phone: "083 555 0177", category: "electrical", services: ["Inverter Installation", "Lighting Installation"], location: "Durbanville", years: 7, date: "29 Sep 2026", idVerified: true, qualification: "Pending", references: 3, description: "Qualified electrician, recently went independent.", startPrice: 500, status: "Under Review" },
  { id: "a3", name: "Yusuf Hendricks", email: "yusuf.h@example.co.za", phone: "061 555 0102", category: "it", services: ["Computer Repair", "Phone Repair"], location: "Observatory", years: 2, date: "27 Sep 2026", idVerified: false, qualification: "Not required", references: 1, description: "Final-year IT student offering repairs after hours.", startPrice: 200, status: "Interview Required" },
  { id: "a4", name: "Nomsa Shabalala", email: "nomsa.s@example.co.za", phone: "079 555 0190", category: "tutoring", services: ["English", "Afrikaans"], location: "Stellenbosch", years: 3, date: "24 Sep 2026", idVerified: true, qualification: "Verified", references: 2, description: "B.Ed graduate tutoring languages for Grades 4–12.", startPrice: 180, status: "Approved" },
  { id: "a5", name: "Kyle Daniels", email: "kyle.d@example.co.za", phone: "082 555 0123", category: "automotive", services: ["Vehicle Diagnostics", "Minor Repairs"], location: "Parow", years: 1, date: "20 Sep 2026", idVerified: true, qualification: "Pending", references: 0, description: "Hobby mechanic wanting to start a mobile service.", startPrice: 300, status: "Rejected" },
  { id: "a6", name: "Thabo Mokoena", email: "thabo.m@example.co.za", phone: "074 555 0166", category: "garden", services: ["General Garden Maintenance", "Lawn Cutting"], location: "Bellville", years: 6, date: "12 Mar 2026", idVerified: true, qualification: "Not required", references: 3, description: "Independent gardener, 6 years experience.", startPrice: 250, status: "Approved" },
];

export type RequestStatus = "Pending" | "Accepted" | "Declined" | "Completed";

export type ServiceRequest = {
  id: string;
  workerId: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  location: string;
  total: number;
  notes?: string;
  status: RequestStatus;
};

export const SEED_REQUESTS: ServiceRequest[] = [
  { id: "SR-1038", workerId: "thabo", customer: "Megan R.", service: "Hedge & Tree Trimming", date: "Thu 8 Oct", time: "09:00", location: "Bellville", total: 400, status: "Pending" },
  { id: "SR-1031", workerId: "thabo", customer: "Sizwe N.", service: "Lawn Cutting", date: "Fri 9 Oct", time: "11:00", location: "Parow", total: 300, status: "Accepted" },
  { id: "SR-1019", workerId: "thabo", customer: "Karin S.", service: "General Garden Maintenance", date: "Mon 28 Sep", time: "09:00", location: "Durbanville", total: 350, status: "Completed" },
];

export const JOBS_PER_MONTH = [
  { m: "Apr", v: 142 }, { m: "May", v: 188 }, { m: "Jun", v: 231 }, { m: "Jul", v: 264 }, { m: "Aug", v: 312 }, { m: "Sep", v: 386 },
];

export const ROADMAP = ["Online payments", "Live messaging", "Real email notifications", "Cloud database", "Real authentication", "GPS / location services", "Automated worker matching", "Mobile app", "Dispute resolution", "Background checks", "Advanced analytics"];

export const rand = (n: number) => `R${n.toLocaleString("en-ZA")}`;
