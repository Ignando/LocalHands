// Shared marketplace shapes and static presentation metadata.

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


export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export type Review = { id: string; author: string; rating: number; date: string; service: string; text: string };

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
  qualification: "Verified" | "Pending" | "Not required" | "Rejected";
  references: number;
  description: string;
  startPrice: number;
  status: ApplicationStatus;
};


export type RequestStatus = "Pending" | "Accepted" | "Declined" | "Completed" | "Cancelled" | "Rescheduling";

export type ServiceRequest = {
  id: string;
  workerId: string;
  customer: string;
  service: string;
  date: string;
  time: string;
  scheduledAt: string;
  times: string[];
  location: string;
  total: number;
  notes?: string;
  status: RequestStatus;
};


export const ROADMAP = ["Online payments", "Live messaging", "Real email notifications", "Cloud database", "GPS / location services", "Automated worker matching", "Mobile app", "Dispute resolution", "Background checks", "Advanced analytics"];

export const rand = (n: number) => `R${n.toLocaleString("en-ZA")}`;
