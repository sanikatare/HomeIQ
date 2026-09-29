import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  Flame,
  FolderKanban,
  Layers,
  Minus,
  Package,
  Play,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Shirt,
  Sparkles,
  Upload,
  Utensils,
  Wrench,
  X,
  XCircle,
  Zap,
  Compass,
  Calendar,
  MapPin,
} from "lucide-react";

const SEEDED_HOUSEHOLD_ID = "22222222-2222-4222-8222-222222222201";

type SystemViewId =
  | "dashboard"
  | "documents"
  | "intelligence"
  | "proactive"
  | "evaluation";

type DomainFilterId =
  | "all"
  | "kitchen_grocery"
  | "laundry_clothing"
  | "home_maintenance"
  | "finance_expenses"
  | "vehicle_mobility"
  | "documents_warranty"
  | "parents_health"
  | "travel_records";

interface DomainNavSpec {
  id: DomainFilterId;
  label: string;
  defaultQuery: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SEVEN_DOMAIN_NAV: DomainNavSpec[] = [
  {
    id: "all",
    label: "All Domains",
    defaultQuery:
      "Is our Bosch dishwasher covered under warranty, when is maintenance due, and what is its total cost?",
    icon: Layers,
  },
  {
    id: "kitchen_grocery",
    label: "Kitchen & Grocery",
    defaultQuery:
      "Which pantry grocery items are currently low in stock or need restocking?",
    icon: Utensils,
  },
  {
    id: "laundry_clothing",
    label: "Laundry & Clothing",
    defaultQuery:
      "How should we wash the Paithani Pure Silk Saree and can we tumble dry it?",
    icon: Shirt,
  },
  {
    id: "home_maintenance",
    label: "Home Maintenance",
    defaultQuery:
      "What maintenance records and upcoming service schedules are due for our appliances?",
    icon: Wrench,
  },
  {
    id: "finance_expenses",
    label: "Finance & Household Expenses",
    defaultQuery:
      "Summarize our pending utility bills, household expenses, monthly budget, recurring bills, payment history, and financial reminders.",
    icon: Receipt,
  },
  {
    id: "vehicle_mobility",
    label: "Vehicle & Mobility",
    defaultQuery:
      "What is our Tata Nexon EV odometer reading and when is the next service due?",
    icon: Car,
  },
  {
    id: "documents_warranty",
    label: "Documents & Warranty",
    defaultQuery:
      "Is our Bosch dishwasher covered under warranty and when does coverage expire?",
    icon: FolderKanban,
  },
  {
    id: "parents_health",
    label: "Parents' Health Monitoring Agent",
    defaultQuery:
      "Check our parents' monthly checkups, doctor appointments, lab-test records, medication schedules, vaccination records, recorded health measurements, and health reminders.",
    icon: Activity,
  },
  {
    id: "travel_records",
    label: "Travel Records Agent",
    defaultQuery:
      "Summarize our upcoming and past household trips, flight/train/bus bookings, hotel accommodation records, travel expenses, booking confirmations, trip timelines, and travel reminders.",
    icon: Compass,
  },
];

interface AuthSession {
  access_token: string;
  user_id: string;
  email: string;
  full_name: string;
  household_id: string;
  role: "OWNER";
  can_approve_agent_actions: boolean;
}

const KITCHEN_SHOWCASE_IMAGES: Record<
  string,
  {
    image: string;
    subtitle: string;
    culinaryNote: string;
    prepTime: string;
    calories: string;
    origin: string;
  }
> = {
  rice: {
    image: "/src/assets/images/kitchen_indrayani_rice_bowl_1790694352075.jpg",
    subtitle: "Single-Origin Maval Valley Sticky Aromatic Grain",
    culinaryNote:
      "Hand-milled unpolished heirloom grain with natural pandan aroma. Ideal for steamed rice bowls, khichdi, and slow-simmered harvest dishes.",
    prepTime: "18 mins",
    calories: "348 kcal / 100g",
    origin: "Sahyadri Farms · Maval",
  },
  milk: {
    image: "/src/assets/images/kitchen_gir_cow_milk_bottle_1790694371451.jpg",
    subtitle: "Farm-Fresh Morning Harvest · Chilled Glass Bottled",
    culinaryNote:
      "Rich, creamy A2 beta-casein milk delivered daily in sterilized glass bottles. Best for artisanal curd, paneer, and spiced masala chai.",
    prepTime: "Chilled Ready",
    calories: "68 kcal / 100ml",
    origin: "Kothrud Organic Dairy",
  },
  oil: {
    image: "/src/assets/images/kitchen_groundnut_oil_cruet_1790694389423.jpg",
    subtitle: "Lakdi Ghana Wood-Pressed Unrefined Culinary Oil",
    culinaryNote:
      "Slow-extracted below 40°C to preserve natural nutty aroma, vitamin E, and monounsaturated fats for high-heat tempering and roasting.",
    prepTime: "Smoke Pt 225°C",
    calories: "884 kcal / 100ml",
    origin: "Deccan Heirloom Mill",
  },
  dal: {
    image: "/src/assets/images/kitchen_tur_dal_spices_1790694408393.jpg",
    subtitle: "Unpolished Split Pigeon Peas · High-Protein Staple",
    culinaryNote:
      "Sun-dried organic Arhar Tur Dal with velvety texture when tempered with cumin, mustard seeds, garlic, and fresh curry leaves.",
    prepTime: "22 mins",
    calories: "335 kcal / 100g",
    origin: "Latur Organic Collective",
  },
};

function getKitchenVisualSpec(itemName: string) {
  const lower = (itemName || "").toLowerCase();
  if (lower.includes("rice") || lower.includes("indrayani")) {
    return KITCHEN_SHOWCASE_IMAGES.rice;
  }
  if (lower.includes("milk") || lower.includes("dairy") || lower.includes("curd")) {
    return KITCHEN_SHOWCASE_IMAGES.milk;
  }
  if (lower.includes("oil") || lower.includes("ghee") || lower.includes("groundnut")) {
    return KITCHEN_SHOWCASE_IMAGES.oil;
  }
  return KITCHEN_SHOWCASE_IMAGES.dal;
}

const SAMPLE_DOCUMENTS = [
  {
    label: "MSEDCL Electricity Bill",
    sublabel: "Utility Bill · ₹4,180.00",
    filename: "msedcl_oct_2026_bill.pdf",
    category: "UTILITY_BILL",
    content: `%PDF-1.7
MSEDCL MAHAVITARAN ELECTRICITY BILL
Consumer Account Number: 170099887766
Billing Period: 2026-08-16 to 2026-09-15
Due Date: 2026-10-12
Units Consumed: 368.400 kWh
TOTAL AMOUNT DUE: Rs. 4,180.00`,
  },
  {
    label: "OnsiteGo Extended Warranty",
    sublabel: "Bosch Dishwasher · Valid to 2028",
    filename: "onsitego_bosch_extended_warranty.pdf",
    category: "WARRANTY_DOCUMENT",
    content: `%PDF-1.7
ONSITEGO APPLIANCE CARE EXTENDED WARRANTY CERTIFICATE
Contract Number: OSG-BSH-2026-9912
Covered Appliance: Bosch Serie 6 Dishwasher (BSH-PNQ-2024-99812)
Coverage Start: 2026-11-15
Coverage Valid Through: 2028-11-14
Support Helpline: 1800-266-1880`,
  },
  {
    label: "Sahyadri Fresh Mart Receipt",
    sublabel: "Groceries + Auto-Restock Rice · ₹1,320.00",
    filename: "sahyadri_fresh_mart_receipt.pdf",
    category: "RECEIPT",
    content: `%PDF-1.7
SAHYADRI FRESH MART, KOTHRUD, PUNE
Receipt No: SFM-2026-09-1042 | Date: 2026-09-28
1. Indrayani Organic Rice 5kg - Rs. 420.00
2. Cold-Pressed Groundnut Oil 2L - Rs. 560.00
3. Organic Arhar Tur Dal 2kg - Rs. 340.00
GRAND TOTAL PAID: Rs. 1,320.00 (Paid via UPI)`,
  },
  {
    label: "Star Health Insurance Policy",
    sublabel: "Health Coverage · ₹15,00,000",
    filename: "star_health_policy_2026.pdf",
    category: "INSURANCE_DOCUMENT",
    content: `%PDF-1.7
STAR HEALTH & ALLIED INSURANCE CO LTD
Policy Type: HEALTH_MEDICAL
Effective From: 2026-10-01 | Expires On: 2027-09-30
Sum Insured: Rs. 15,00,000.00
Annual Premium Paid: Rs. 24,800.00`,
  },
  {
    label: "Golwilkar Metropolis Lab Panel",
    sublabel: "Parents' HbA1c, Glucose & BP Report",
    filename: "parents_metropolis_lab_panel_2026.pdf",
    category: "MEDICAL_LAB_REPORT",
    content: `%PDF-1.7
GOLWILKAR METROPOLIS DIAGNOSTICS KOTHRUD PUNE
Senior Comprehensive Health Panel | Date: 2026-09-18
Patient: Smt. Sunita Tare (Mother) & Shri. Prakash Tare (Father)
Recorded Measurements: HbA1c 6.1%, Fasting Glucose 102 mg/dL, Vitamin D 34 ng/mL, BP 124/78 mmHg
Next Periodic Checkup Follow-Up: 2026-10-05 (Dr. A. Deshmukh)`,
  },
  {
    label: "Udaipur Flight & Taj Hotel Voucher",
    sublabel: "IndiGo PNR R8K9M2 + Taj Lake Palace",
    filename: "udaipur_flight_taj_booking_voucher_2026.pdf",
    category: "TRAVEL_BOOKING_VOUCHER",
    content: `%PDF-1.7
INDIGO AIRLINES & TAJ LAKE PALACE UDAIPUR BOOKING CONFIRMATION
Trip Name: Udaipur Royal Heritage Diwali Getaway
Airline PNR: R8K9M2 | Flight 6E-714 (PNQ Pune -> UDR Udaipur)
Hotel Confirmation: TAJ-UDR-2026-88410 | Taj Lake Palace, Pichola
Departure Date: 2026-10-24 | Return Date: 2026-10-28
Passengers: Sanika Tare, Rohan Tare, Sunita Tare, Prakash Tare (4 Pax)
Total Recorded Booking Amount: Rs. 83,100.00 (Paid via HDFC Infinia)`,
  },
];

const SAMPLE_AGENT_QUERIES = [
  {
    label: "Dishwasher Warranty & Cost",
    query:
      "Is our Bosch dishwasher covered under warranty, when is maintenance due, and what is its total cost?",
  },
  {
    label: "Travel Records & Upcoming Trips",
    query:
      "Summarize our upcoming and past household trips, flight/train/bus bookings, hotel accommodation records, travel expenses, booking confirmations, trip timelines, and travel reminders.",
  },
  {
    label: "Parents' Health & Checkups",
    query:
      "Check our parents' monthly checkups, doctor appointments, lab-test records, medication schedules, vaccination records, recorded health measurements, and health reminders.",
  },
  {
    label: "Pay Electricity Bill",
    query: "Please pay our pending MSEDCL electricity bill now.",
  },
  {
    label: "Check Low-Stock Pantry Items",
    query:
      "Which pantry grocery items are currently low in stock or need restocking?",
  },
  {
    label: "Finance & Household Expenses",
    query:
      "Summarize our pending utility bills, household expenses, monthly budget, recurring bills, payment history, and financial reminders.",
  },
  {
    label: "Silk Saree Wash Rules",
    query:
      "How should we wash the Paithani Pure Silk Saree and can we tumble dry it?",
  },
  {
    label: "Nexon EV Service Status",
    query:
      "What is our Tata Nexon EV odometer reading and when is the next service due?",
  },
];

export function App() {
  const [activeView, setActiveView] = useState<SystemViewId>("dashboard");
  const [selectedDomain, setSelectedDomain] = useState<DomainFilterId>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Household Data States
  const [summary, setSummary] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [clothing, setClothing] = useState<any[]>([]);
  const [billsData, setBillsData] = useState<{
    items: any[];
    subscriptions: any[];
    expenses: any[];
    reminders?: any[];
  }>({ items: [], subscriptions: [], expenses: [], reminders: [] });
  const [warrantiesData, setWarrantiesData] = useState<{
    items: any[];
    insurance_policies: any[];
    maintenance_records: any[];
    reminders?: any[];
  }>({
    items: [],
    insurance_policies: [],
    maintenance_records: [],
    reminders: [],
  });
  const [parentsHealthData, setParentsHealthData] = useState<{
    items: any[];
    reminders: any[];
    documents: any[];
  }>({
    items: [],
    reminders: [],
    documents: [],
  });
  const [travelRecordsData, setTravelRecordsData] = useState<{
    items: any[];
    reminders: any[];
    documents: any[];
  }>({
    items: [],
    reminders: [],
    documents: [],
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [proactiveReport, setProactiveReport] = useState<any>(null);
  const [eventsData, setEventsData] = useState<{
    items: any[];
    dead_letter_queue: any[];
  }>({ items: [], dead_letter_queue: [] });
  const [evalReport, setEvalReport] = useState<any>(null);

  // Interactive Forms
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1.0");
  const [newItemThreshold, setNewItemThreshold] = useState("2.0");
  const [newItemUnit, setNewItemUnit] = useState("KILOGRAM");
  const [activeKitchenIndex, setActiveKitchenIndex] = useState<number>(0);
  const [kitchenCategoryFilter, setKitchenCategoryFilter] =
    useState<string>("ALL");
  const [showAddKitchenModal, setShowAddKitchenModal] =
    useState<boolean>(false);

  // Home Maintenance (Renovation Webflow) States
  const [showMaintModal, setShowMaintModal] = useState<boolean>(false);
  const [maintTitle, setMaintTitle] = useState("");
  const [maintVendor, setMaintVendor] = useState(
    "Daikin ComfortPro Engineering"
  );
  const [maintDate, setMaintDate] = useState("2026-10-18");
  const [maintCostInr, setMaintCostInr] = useState("1250");

  // Laundry & Clothing (Valet App) States
  const [laundryCareFilter, setLaundryCareFilter] = useState<string>("ALL");
  const [showAddGarmentModal, setShowAddGarmentModal] =
    useState<boolean>(false);
  const [garmentName, setGarmentName] = useState("");
  const [garmentBrand, setGarmentBrand] = useState("");
  const [garmentFabric, setGarmentFabric] = useState("SILK");
  const [garmentCare, setGarmentCare] = useState("DRY_CLEAN_ONLY");
  const [garmentTemp, setGarmentTemp] = useState("20");

  // Vehicle & Mobility (Malen Car Service & Repair Theme) States
  const [showVehicleServiceModal, setShowVehicleServiceModal] =
    useState<boolean>(false);
  const [vehicleServiceFilter, setVehicleServiceFilter] =
    useState<string>("ALL");
  const [vehicleServiceTitle, setVehicleServiceTitle] = useState("");
  const [vehicleServiceVendor, setVehicleServiceVendor] = useState(
    "Malen Auto Care & EV Diagnostic Center, Pune"
  );
  const [vehicleServiceDate, setVehicleServiceDate] = useState("2026-10-22");
  const [vehicleServiceCostInr, setVehicleServiceCostInr] = useState("2450");
  const [customOdometerInput, setCustomOdometerInput] = useState("");

  // Documents & Warranty (Dribbble Finance Analytics Dashboard) States
  const [docVaultCategoryFilter, setDocVaultCategoryFilter] =
    useState<string>("ALL");
  const [docVaultStatusFilter, setDocVaultStatusFilter] =
    useState<string>("ALL");
  const [warrantyStatusFilter, setWarrantyStatusFilter] =
    useState<string>("ALL");
  const [showRegisterWarrantyModal, setShowRegisterWarrantyModal] =
    useState<boolean>(false);
  const [showAddReminderModal, setShowAddReminderModal] =
    useState<boolean>(false);
  const [selectedInspectedDocId, setSelectedInspectedDocId] = useState<
    string | null
  >(null);
  const [newWarrantyAssetId, setNewWarrantyAssetId] = useState(
    "44444444-4444-4444-8444-444444444401"
  );
  const [newWarrantyProvider, setNewWarrantyProvider] = useState(
    "OnsiteGo Appliance Care Pvt Ltd"
  );
  const [newWarrantyType, setNewWarrantyType] = useState("EXTENDED");
  const [newWarrantyPolicyNum, setNewWarrantyPolicyNum] = useState(
    "OSG-BSH-2026-9912"
  );
  const [newWarrantyStartDate, setNewWarrantyStartDate] =
    useState("2026-11-15");
  const [newWarrantyEndDate, setNewWarrantyEndDate] = useState("2028-11-14");
  const [newWarrantyTerms, setNewWarrantyTerms] = useState(
    "2-year extended zero-deductible parts, motor, and PCB protection."
  );
  const [newReminderTitle, setNewReminderTitle] = useState("");
  const [newReminderDueDate, setNewReminderDueDate] = useState("2026-11-01");
  const [newReminderDesc, setNewReminderDesc] = useState(
    "Verify policy renewal terms and upload updated certificate to vault."
  );

  // Parents' Health Monitoring (PowerPeak Smartwatch Fitness App Design) States
  const [parentHealthMemberFilter, setParentHealthMemberFilter] =
    useState<string>("ALL");
  const [parentHealthCategoryFilter, setParentHealthCategoryFilter] =
    useState<string>("ALL");
  const [parentHealthStatusFilter, setParentHealthStatusFilter] =
    useState<string>("ALL");
  const [activeSmartwatchDay, setActiveSmartwatchDay] =
    useState<string>("2026-10-05");
  const [showAddHealthRecordModal, setShowAddHealthRecordModal] =
    useState<boolean>(false);
  const [showAddHealthReminderModal, setShowAddHealthReminderModal] =
    useState<boolean>(false);
  const [healthParentName, setHealthParentName] = useState(
    "Smt. Sunita Tare (Mother)"
  );
  const [healthCategory, setHealthCategory] = useState("PERIODIC_CHECKUP");
  const [healthTitle, setHealthTitle] = useState("");
  const [healthProvider, setHealthProvider] = useState(
    "Dr. A. Deshmukh · Deenanath Mangeshkar Hospital"
  );
  const [healthRecordedDate, setHealthRecordedDate] = useState("2026-09-29");
  const [healthNextDueDate, setHealthNextDueDate] = useState("2026-10-29");
  const [healthScheduleFreq, setHealthScheduleFreq] = useState(
    "Monthly (1st Monday)"
  );
  const [healthExplicitMeasurement, setHealthExplicitMeasurement] = useState(
    "BP: 122/78 mmHg · HR: 71 bpm · SpO2: 98% · Fasting Glucose: 99 mg/dL"
  );
  const [healthNotes, setHealthNotes] = useState(
    "Explicitly recorded for household health monitoring and reminder tracking."
  );
  const [healthReminderTitle, setHealthReminderTitle] = useState("");
  const [healthReminderDueDate, setHealthReminderDueDate] =
    useState("2026-10-05");
  const [healthReminderDesc, setHealthReminderDesc] = useState(
    "Carry Golwilkar Metropolis lab folder and current morning/evening medication log."
  );

  // Travel Records Agent (Dribbble — Eventar Travel Manager) States
  const [travelStatusFilter, setTravelStatusFilter] = useState<string>("ALL");
  const [travelCategoryFilter, setTravelCategoryFilter] =
    useState<string>("ALL");
  const [selectedEventarTripName, setSelectedEventarTripName] = useState<string>(
    "Udaipur Royal Heritage Diwali Getaway"
  );
  const [showAddTravelRecordModal, setShowAddTravelRecordModal] =
    useState<boolean>(false);
  const [showAddTravelReminderModal, setShowAddTravelReminderModal] =
    useState<boolean>(false);
  const [travelTripName, setTravelTripName] = useState(
    "Udaipur Royal Heritage Diwali Getaway"
  );
  const [travelDestination, setTravelDestination] = useState(
    "Udaipur, Rajasthan (UDR)"
  );
  const [travelOriginCity, setTravelOriginCity] = useState(
    "Pune, Maharashtra (PNQ)"
  );
  const [travelCategory, setTravelCategory] = useState("FLIGHT_BOOKING");
  const [travelTransportMode, setTravelTransportMode] = useState("FLIGHT");
  const [travelBookingRef, setTravelBookingRef] = useState("PNR-K9M4X2");
  const [travelProvider, setTravelProvider] = useState(
    "IndiGo Airlines · Flight 6E-719"
  );
  const [travelAccommodation, setTravelAccommodation] = useState(
    "Taj Lake Palace, Pichola, Udaipur"
  );
  const [travelDepartureDate, setTravelDepartureDate] = useState("2026-10-24");
  const [travelReturnDate, setTravelReturnDate] = useState("2026-10-28");
  const [travelTravelers, setTravelTravelers] = useState(
    "Sanika Tare, Rohan Tare, Sunita Tare & Prakash Tare (4 Pax)"
  );
  const [travelRecordStatus, setTravelRecordStatus] = useState("UPCOMING");
  const [travelExpenseInr, setTravelExpenseInr] = useState("18400");
  const [travelDocumentStatus, setTravelDocumentStatus] = useState(
    "Confirmed E-Ticket & Hotel Voucher Archived"
  );
  const [travelImportantDateLabel, setTravelImportantDateLabel] = useState(
    "Web Check-In Opens: 2026-10-22 (48h Prior)"
  );
  const [travelNotes, setTravelNotes] = useState(
    "Recorded in HomeIQ Travel Records Agent ledger with verified booking reference."
  );
  const [travelReminderTitle, setTravelReminderTitle] = useState("");
  const [travelReminderDueDate, setTravelReminderDueDate] =
    useState("2026-10-22");
  const [travelReminderDesc, setTravelReminderDesc] = useState(
    "Verify PNR boarding passes, hotel voucher folder, and original DigiYatra IDs."
  );

  const [expenseMerchant, setExpenseMerchant] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmountInr, setExpenseAmountInr] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("HOUSEHOLD_SUPPLIES");
  const [expensePaymentMethod, setExpensePaymentMethod] = useState("UPI");
  const [financeBillStatusFilter, setFinanceBillStatusFilter] =
    useState<string>("ALL");
  const [financeExpenseCategoryFilter, setFinanceExpenseCategoryFilter] =
    useState<string>("ALL");
  const [showAddExpenseDrawer, setShowAddExpenseDrawer] =
    useState<boolean>(false);
  const [showAddFinanceReminderDrawer, setShowAddFinanceReminderDrawer] =
    useState<boolean>(false);
  const [financeReminderTitle, setFinanceReminderTitle] = useState("");
  const [financeReminderDueDate, setFinanceReminderDueDate] =
    useState("2026-10-12");
  const [financeReminderDesc, setFinanceReminderDesc] = useState(
    "Verify utility meter reading and authorize scheduled bill payment before due date."
  );

  const [docFilename, setDocFilename] = useState(SAMPLE_DOCUMENTS[0].filename);
  const [docCategory, setDocCategory] = useState(SAMPLE_DOCUMENTS[0].category);
  const [docText, setDocText] = useState(SAMPLE_DOCUMENTS[0].content);
  const [lastIngestResult, setLastIngestResult] = useState<any>(null);

  const [agentQuery, setAgentQuery] = useState(SAMPLE_AGENT_QUERIES[0].query);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [approvalReason, setApprovalReason] = useState(
    "Verified meter reading and invoice amount."
  );

  const handleSelectDomain = (domainId: DomainFilterId) => {
    setSelectedDomain(domainId);
    if (
      domainId === "kitchen_grocery" ||
      domainId === "home_maintenance" ||
      domainId === "laundry_clothing" ||
      domainId === "vehicle_mobility" ||
      domainId === "documents_warranty" ||
      domainId === "finance_expenses" ||
      domainId === "parents_health" ||
      domainId === "travel_records"
    ) {
      setActiveView("dashboard");
    }
    const spec = SEVEN_DOMAIN_NAV.find((d) => d.id === domainId);
    if (spec) {
      setAgentQuery(spec.defaultQuery);
    }
  };

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}, tokenOverride?: string) => {
      const token = tokenOverride || authSession?.access_token;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-HomeIQ-Household-Id": SEEDED_HOUSEHOLD_ID,
        ...(options.headers as Record<string, string>),
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw {
          code: data?.error?.code || `HTTP_${response.status}`,
          message:
            data?.error?.message ||
            data?.detail ||
            `Request failed (${response.status})`,
        };
      }
      return data;
    },
    [authSession]
  );

  const refreshAllData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const tokenResp = await fetch("/api/v1/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "OWNER",
          household_id: SEEDED_HOUSEHOLD_ID,
        }),
      });
      const tokenData = await tokenResp.json();
      setAuthSession(tokenData);
      const activeToken = tokenData.access_token;

      const [
        sumResp,
        assetsResp,
        invResp,
        billsResp,
        warResp,
        parentsHealthResp,
        travelRecordsResp,
        docsResp,
        appResp,
        evResp,
        proactiveResp,
        evalLatestResp,
      ] = await Promise.all([
        apiFetch("/api/v1/households/summary", {}, activeToken),
        apiFetch("/api/v1/assets", {}, activeToken),
        apiFetch("/api/v1/inventory", {}, activeToken),
        apiFetch("/api/v1/bills", {}, activeToken),
        apiFetch("/api/v1/warranties", {}, activeToken),
        apiFetch("/api/v1/parents-health", {}, activeToken).catch(() => ({
          items: [],
          reminders: [],
          documents: [],
        })),
        apiFetch("/api/v1/travel-records", {}, activeToken).catch(() => ({
          items: [],
          reminders: [],
          documents: [],
        })),
        apiFetch("/api/v1/documents", {}, activeToken),
        apiFetch("/api/v1/intelligence/approvals", {}, activeToken),
        apiFetch("/api/v1/events", {}, activeToken),
        apiFetch(
          "/api/v1/intelligence/proactive/evaluate",
          { method: "POST" },
          activeToken
        ).catch(() => null),
        apiFetch("/api/v1/intelligence/evaluation/latest", {}, activeToken).catch(
          () => null
        ),
      ]);

      setSummary(sumResp);
      setAssets(assetsResp.items || []);
      setInventory(invResp.items || []);
      setClothing(invResp.clothing_items || []);
      setBillsData(billsResp);
      setWarrantiesData(warResp);
      setParentsHealthData({
        items: parentsHealthResp?.items || [],
        reminders: parentsHealthResp?.reminders || [],
        documents: parentsHealthResp?.documents || [],
      });
      setTravelRecordsData({
        items: travelRecordsResp?.items || [],
        reminders: travelRecordsResp?.reminders || [],
        documents: travelRecordsResp?.documents || [],
      });
      setDocuments(docsResp.items || []);
      setApprovals(appResp.items || []);
      setEventsData(evResp);
      if (proactiveResp) setProactiveReport(proactiveResp);
      if (evalLatestResp) setEvalReport(evalLatestResp);
    } catch (err: any) {
      setApiError({
        code: err.code || "ERROR",
        message: err.message || String(err),
      });
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setActionToast(null);
    try {
      const created = await apiFetch("/api/v1/inventory", {
        method: "POST",
        body: JSON.stringify({
          name: newItemName,
          category: "GRAINS_PULSES",
          storage_location: "PANTRY",
          quantity_on_hand: newItemQty,
          unit: newItemUnit,
          reorder_threshold: newItemThreshold,
        }),
      });
      setNewItemName("");
      setActionToast(`Added '${created.name}' to pantry.`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleAdjustInventory = async (
    itemId: string,
    delta?: number,
    exactQty?: number
  ) => {
    setApiError(null);
    try {
      const updated = await apiFetch(`/api/v1/inventory/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(
          exactQty !== undefined ? { quantity_on_hand: exactQty } : { delta }
        ),
      });
      setActionToast(
        `Updated ${updated.name}: ${Number(updated.quantity_on_hand).toFixed(1)} ${updated.unit}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleToggleLaundry = async (clothId: string) => {
    setApiError(null);
    try {
      const updated = await apiFetch(`/api/v1/clothing/${clothId}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setActionToast(
        `${updated.name} marked as ${updated.needs_laundry ? "Needs Wash" : "Clean & Ready"}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleCompleteMaintenance = async (maintId: string) => {
    setApiError(null);
    try {
      const updated = await apiFetch(`/api/v1/maintenance/${maintId}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setActionToast(`Completed maintenance: ${updated.title}`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleScheduleMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/maintenance", {
        method: "POST",
        body: JSON.stringify({
          title: maintTitle,
          technician_or_vendor: maintVendor,
          scheduled_for: maintDate,
          estimated_cost_inr: maintCostInr,
        }),
      });
      setMaintTitle("");
      setShowMaintModal(false);
      setActionToast(`Scheduled service: ${created.title}`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleScheduleVehicleService = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const vehicleAsset = assets.find((a) => a.category === "VEHICLE");
    try {
      const created = await apiFetch("/api/v1/maintenance", {
        method: "POST",
        body: JSON.stringify({
          asset_id: vehicleAsset?.id || "44444444-4444-4444-8444-444444444402",
          title: vehicleServiceTitle,
          description:
            "Booked via Malen Car Service & EV Diagnostic Workshop Bay.",
          technician_or_vendor: vehicleServiceVendor,
          scheduled_for: vehicleServiceDate,
          estimated_cost_inr: vehicleServiceCostInr,
          priority: "HIGH",
        }),
      });
      setVehicleServiceTitle("");
      setShowVehicleServiceModal(false);
      setActionToast(`Booked workshop bay: ${created.title}`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleUpdateVehicleOdometer = async (
    vehicleId: string,
    deltaKm?: number,
    exactOdometerKm?: number
  ) => {
    setApiError(null);
    try {
      const updated = await apiFetch(`/api/v1/vehicles/${vehicleId}`, {
        method: "PATCH",
        body: JSON.stringify(
          exactOdometerKm !== undefined
            ? { odometer_km: exactOdometerKm }
            : { delta_km: deltaKm }
        ),
      });
      setCustomOdometerInput("");
      setActionToast(
        `Updated ${updated.registration_number} odometer to ${Number(
          updated.odometer_km
        ).toLocaleString("en-IN")} km`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleRegisterWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/warranties", {
        method: "POST",
        body: JSON.stringify({
          asset_id: newWarrantyAssetId,
          provider_name: newWarrantyProvider,
          warranty_type: newWarrantyType,
          contract_or_policy_number: newWarrantyPolicyNum,
          start_date: newWarrantyStartDate,
          end_date: newWarrantyEndDate,
          coverage_terms: newWarrantyTerms,
        }),
      });
      setShowRegisterWarrantyModal(false);
      setActionToast(
        `Registered warranty #${created.contract_or_policy_number} (${created.provider_name})`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleAddWarrantyReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/reminders", {
        method: "POST",
        body: JSON.stringify({
          title: newReminderTitle,
          description: newReminderDesc,
          due_date: newReminderDueDate,
          domain: "documents_warranty",
        }),
      });
      setNewReminderTitle("");
      setShowAddReminderModal(false);
      setActionToast(`Scheduled reminder: ${created.title}`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleToggleReminderStatus = async (reminderId: string) => {
    setApiError(null);
    try {
      const updated = await apiFetch(`/api/v1/reminders/${reminderId}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setActionToast(
        `Reminder "${updated.title}" marked ${updated.status.toLowerCase()}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleToggleDocumentVerified = async (docId: string) => {
    setApiError(null);
    try {
      const updated = await apiFetch(`/api/v1/documents/${docId}`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      setActionToast(
        updated.is_verified_by_human
          ? `Verified document: ${updated.title}`
          : `Flagged document for review: ${updated.title}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleCreateParentHealthRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/parents-health", {
        method: "POST",
        body: JSON.stringify({
          parent_name: healthParentName,
          record_category: healthCategory,
          title: healthTitle,
          provider_or_doctor: healthProvider,
          recorded_date: healthRecordedDate,
          next_due_or_followup_date: healthNextDueDate,
          schedule_or_frequency: healthScheduleFreq,
          explicit_measurement_value: healthExplicitMeasurement,
          status:
            healthCategory === "HEALTH_MEASUREMENT" ||
            healthCategory === "LAB_TEST_REPORT"
              ? "RECORDED"
              : healthCategory === "MEDICATION_SCHEDULE"
              ? "ACTIVE"
              : "SCHEDULED",
          notes: healthNotes,
        }),
      });
      setHealthTitle("");
      setShowAddHealthRecordModal(false);
      setActionToast(
        `Logged health record: ${created.title} (${created.parent_name})`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleQuickLogParentVitals = async (
    parentName: string,
    category: string,
    title: string,
    measurementValue: string,
    provider: string
  ) => {
    setApiError(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const created = await apiFetch("/api/v1/parents-health", {
        method: "POST",
        body: JSON.stringify({
          parent_name: parentName,
          record_category: category,
          title,
          provider_or_doctor: provider,
          recorded_date: today,
          next_due_or_followup_date: "2026-10-15",
          schedule_or_frequency:
            category === "MEDICATION_SCHEDULE"
              ? "Daily — 08:00 AM & 08:30 PM"
              : "Home Vitals Log",
          explicit_measurement_value: measurementValue,
          status: category === "MEDICATION_SCHEDULE" ? "ACTIVE" : "RECORDED",
          notes:
            "Recorded via PowerPeak Smartwatch & Home Vitals Monitor Sync.",
        }),
      });
      setActionToast(
        `Synced ${created.title} for ${created.parent_name}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleToggleParentHealthStatus = async (
    recordId: string,
    nextStatus?: string
  ) => {
    setApiError(null);
    try {
      const updated = await apiFetch(`/api/v1/parents-health/${recordId}`, {
        method: "PATCH",
        body: JSON.stringify(nextStatus ? { status: nextStatus } : {}),
      });
      setActionToast(
        `Updated "${updated.title}" status to ${updated.status}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleAddParentHealthReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/reminders", {
        method: "POST",
        body: JSON.stringify({
          title: healthReminderTitle,
          description: healthReminderDesc,
          due_date: healthReminderDueDate,
          domain: "parents_health",
        }),
      });
      setHealthReminderTitle("");
      setShowAddHealthReminderModal(false);
      setActionToast(`Scheduled health reminder: ${created.title}`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleCreateTravelRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/travel-records", {
        method: "POST",
        body: JSON.stringify({
          trip_name: travelTripName,
          destination: travelDestination,
          origin_city: travelOriginCity,
          record_category: travelCategory,
          transport_mode: travelTransportMode,
          booking_reference: travelBookingRef,
          provider_or_carrier: travelProvider,
          accommodation_name: travelAccommodation,
          departure_date: travelDepartureDate,
          return_date: travelReturnDate,
          travelers: travelTravelers,
          status: travelRecordStatus,
          expense_amount_inr: travelExpenseInr,
          document_status: travelDocumentStatus,
          important_date_label: travelImportantDateLabel,
          notes: travelNotes,
        }),
      });
      setShowAddTravelRecordModal(false);
      setSelectedEventarTripName(created.trip_name);
      setActionToast(
        `Logged travel record: ${created.trip_name} (${created.booking_reference})`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleQuickLogTravelBooking = async (preset: {
    trip_name: string;
    destination: string;
    origin_city: string;
    record_category: string;
    transport_mode: string;
    booking_reference: string;
    provider_or_carrier: string;
    accommodation_name: string;
    departure_date: string;
    return_date: string;
    expense_amount_inr: string;
    important_date_label: string;
  }) => {
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/travel-records", {
        method: "POST",
        body: JSON.stringify({
          ...preset,
          travelers:
            "Sanika Tare, Rohan Tare, Sunita Tare & Prakash Tare (4 Pax)",
          status: "UPCOMING",
          document_status: "E-Ticket & Voucher Logged in Eventar Vault",
          notes:
            "Quick-logged via HomeIQ Eventar Travel Manager booking desk.",
        }),
      });
      setSelectedEventarTripName(created.trip_name);
      setActionToast(
        `Added ${created.transport_mode} record (${created.booking_reference}) to ${created.trip_name}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleToggleTravelRecordStatus = async (
    recordId: string,
    nextStatus?: string
  ) => {
    setApiError(null);
    try {
      const updated = await apiFetch(`/api/v1/travel-records/${recordId}`, {
        method: "PATCH",
        body: JSON.stringify(nextStatus ? { status: nextStatus } : {}),
      });
      setActionToast(
        `Updated "${updated.trip_name}" (${updated.booking_reference}) status to ${updated.status}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleAddTravelReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/reminders", {
        method: "POST",
        body: JSON.stringify({
          title: travelReminderTitle,
          description: travelReminderDesc,
          due_date: travelReminderDueDate,
          domain: "travel_records",
        }),
      });
      setTravelReminderTitle("");
      setShowAddTravelReminderModal(false);
      setActionToast(`Scheduled travel reminder: ${created.title}`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleAddGarment = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/clothing", {
        method: "POST",
        body: JSON.stringify({
          name: garmentName,
          brand: garmentBrand || "Artisanal Wardrobe",
          fabric_type: garmentFabric,
          care_instruction: garmentCare,
          max_wash_temp_c: Number(garmentTemp || 30),
          can_tumble_dry: garmentCare === "MACHINE_WASH_WARM",
        }),
      });
      setGarmentName("");
      setGarmentBrand("");
      setShowAddGarmentModal(false);
      setActionToast(`Added '${created.name}' to Valet Wardrobe.`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/expenses", {
        method: "POST",
        body: JSON.stringify({
          merchant_name: expenseMerchant,
          description: expenseDesc || "Household purchase",
          amount_inr: expenseAmountInr,
          category: expenseCategory,
          payment_method: expensePaymentMethod,
        }),
      });
      setExpenseMerchant("");
      setExpenseDesc("");
      setExpenseAmountInr("");
      setShowAddExpenseDrawer(false);
      setActionToast(
        `Logged expense of ${formatINR(created.amount_minor)} at ${created.merchant_name}`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleAddFinanceReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    try {
      const created = await apiFetch("/api/v1/reminders", {
        method: "POST",
        body: JSON.stringify({
          title: financeReminderTitle,
          description: financeReminderDesc,
          due_date: financeReminderDueDate,
          domain: "finance_expenses",
        }),
      });
      setFinanceReminderTitle("");
      setShowAddFinanceReminderDrawer(false);
      setActionToast(`Scheduled financial reminder: ${created.title}`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    }
  };

  const handleRequestBillPayment = async (providerName: string) => {
    const query = `Please pay our pending ${providerName} electricity bill now.`;
    setAgentQuery(query);
    setActiveView("intelligence");
    setLoading(true);
    setApiError(null);
    try {
      const res = await apiFetch("/api/v1/intelligence/execute", {
        method: "POST",
        body: JSON.stringify({ user_query: query }),
      });
      setAgentResult(res);
      setActionToast(
        "Payment queued in Approval Gate. Click Approve to complete payment."
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploadSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setDocText(String(reader.result || ""));
    };
    reader.readAsText(file);
  };

  const runDocumentIngestion = async (
    filename: string,
    category: string,
    text: string
  ) => {
    setLoading(true);
    setApiError(null);
    setActionToast(null);
    try {
      const res = await apiFetch("/api/v1/documents/ingest-json", {
        method: "POST",
        body: JSON.stringify({
          filename,
          mime_type: "application/pdf",
          document_text: text,
          expected_category: category,
        }),
      });
      setLastIngestResult(res);
      setActionToast(
        res.idempotency_hit
          ? `Document already in vault (${filename})`
          : `Extracted & saved ${filename}`
      );
      await refreshAllData();
    } catch (err: any) {
      setLastIngestResult(null);
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    await runDocumentIngestion(docFilename, docCategory, docText);
  };

  const runAgentQueryText = async (queryText: string) => {
    setAgentQuery(queryText);
    setLoading(true);
    setApiError(null);
    setActionToast(null);
    try {
      const res = await apiFetch("/api/v1/intelligence/execute", {
        method: "POST",
        body: JSON.stringify({
          user_query: queryText,
        }),
      });
      setAgentResult(res);
      if (res.requires_human_approval) {
        setActionToast("Action requires owner approval in the Approval Gate.");
      }
      await refreshAllData();
    } catch (err: any) {
      setAgentResult(null);
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAgentQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAgentQueryText(agentQuery);
  };

  const handleApprovalDecision = async (runId: string, approved: boolean) => {
    setLoading(true);
    setApiError(null);
    setActionToast(null);
    try {
      const res = await apiFetch(
        `/api/v1/intelligence/approvals/${runId}/decide`,
        {
          method: "POST",
          body: JSON.stringify({
            approved,
            reason: approvalReason,
          }),
        }
      );
      setActionToast(
        approved
          ? "Approved and executed bill payment."
          : `Action rejected (${res.status})`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunProactiveScan = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await apiFetch("/api/v1/intelligence/proactive/evaluate", {
        method: "POST",
      });
      setProactiveReport(res);
      setActionToast(`${res.insights_count} household alerts updated.`);
    } catch (err: any) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishTestEvent = async (mode: "normal" | "retry" | "dlq") => {
    setLoading(true);
    setApiError(null);
    try {
      const idemKey =
        mode === "normal"
          ? `idem-event-${Date.now()}`
          : `idem-${mode}-${Date.now()}`;
      const payload =
        mode === "retry"
          ? { simulate_transient_failure: true, item: "Indrayani Organic Rice" }
          : mode === "dlq"
          ? { simulate_poison_message: true, reason: "Invalid payload format" }
          : { item: "A2 Gir Cow Milk" };

      const res = await apiFetch("/api/v1/events/publish", {
        method: "POST",
        body: JSON.stringify({
          event_type: "inventory.low_stock",
          idempotency_key: idemKey,
          domain:
            selectedDomain === "all" ? "kitchen_grocery" : selectedDomain,
          payload,
        }),
      });
      setActionToast(
        `Event status: ${res.status} (Attempts: ${res.attempts_made})`
      );
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunEvaluationSuite = async () => {
    setLoading(true);
    setApiError(null);
    setActionToast(null);
    try {
      const res = await apiFetch("/api/v1/intelligence/evaluation/run", {
        method: "POST",
      });
      setEvalReport(res);
      setActionToast(
        `Evaluation complete: ${res.documents_passed}/${res.total_documents} documents passed.`
      );
    } catch (err: any) {
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (minor: number | undefined) => {
    const val = Number(minor || 0) / 100;
    return `₹${val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const pendingApprovalsCount = approvals.filter(
    (a) => a.status === "AWAITING_HUMAN_APPROVAL"
  ).length;

  const SIDEBAR_MODULES: Array<{
    id: SystemViewId;
    title: string;
    badge?: number;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: "dashboard",
      title: "Household State",
      icon: Database,
    },
    {
      id: "documents",
      title: "Document Ingestion & Gemini",
      icon: Upload,
    },
    {
      id: "intelligence",
      title: "Multi-Agent & Approval Gate",
      badge: pendingApprovalsCount,
      icon: Sparkles,
    },
    {
      id: "proactive",
      title: "Proactive Engine & Event Bus",
      icon: Bell,
    },
    {
      id: "evaluation",
      title: "Dataset Evaluation Benchmark",
      icon: BarChart3,
    },
  ];

  const showDomainSection = (domain: DomainFilterId) =>
    selectedDomain === "all" || selectedDomain === domain;

  const matchesSearch = useCallback(
    (...fields: Array<string | number | null | undefined>) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return fields.some(
        (f) =>
          f !== null &&
          f !== undefined &&
          String(f).toLowerCase().includes(q)
      );
    },
    [searchQuery]
  );

  const budgetMinor = Number(summary?.metrics?.monthly_budget_minor || 8500000);
  const spendMinor = Number(summary?.metrics?.recorded_expenses_minor || 0);
  const budgetUtilizationPct = Math.min(
    100,
    Math.round((spendMinor / Math.max(1, budgetMinor)) * 100)
  );

  const hasActiveFilter =
    selectedDomain !== "all" || searchQuery.trim().length > 0;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Left Vertical Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-slate-950 text-slate-100">
        <div>
          <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white">
                HomeIQ
              </span>
              <p className="text-[11px] text-slate-400">
                Tare Family Residence
              </p>
            </div>
          </div>

          <nav className="space-y-1 p-3">
            {SIDEBAR_MODULES.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeView === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveView(mod.id)}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-slate-950 shadow-xs"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? "text-slate-950" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{mod.title}</span>
                  </div>
                  {mod.badge !== undefined && mod.badge > 0 && (
                    <span className="rounded-md bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
                      {mod.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Owner Profile Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/50 px-4 py-3.5 text-xs">
          <div className="truncate">
            <div className="font-semibold text-white">Sanika Tare</div>
            <div className="text-[11px] text-slate-400">Household Owner</div>
          </div>
          <button
            onClick={() => refreshAllData()}
            disabled={loading}
            title="Refresh Data"
            className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Horizontal 7-Domains Bar + Global Search */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {SEVEN_DOMAIN_NAV.map((dom) => {
                const Icon = dom.icon;
                const isSelected = selectedDomain === dom.id;
                return (
                  <button
                    key={dom.id}
                    onClick={() => handleSelectDomain(dom.id)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{dom.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <div className="relative w-full shrink-0 lg:w-72">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all domains..."
                  aria-label="Global household search"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-8 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    title="Clear search"
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDomain("all");
                    setSearchQuery("");
                  }}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          {apiError && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                <span className="font-medium">{apiError.message}</span>
              </div>
              <button
                onClick={() => setApiError(null)}
                className="font-semibold text-red-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {actionToast && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{actionToast}</span>
              </div>
              <button
                onClick={() => setActionToast(null)}
                className="font-semibold text-emerald-700 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* VIEW 1: HOUSEHOLD STATE */}
          {activeView === "dashboard" && (
            <div className="space-y-6">
              {/* ANIMATED RESTAURANT DESIGN SHOWCASE FOR KITCHEN & GROCERY TAB */}
              {selectedDomain === "kitchen_grocery" && (
                <div className="space-y-6">
                  {(() => {
                    const filteredKitchenItems = inventory
                      .filter((item) =>
                        kitchenCategoryFilter === "ALL"
                          ? true
                          : item.category === kitchenCategoryFilter
                      )
                      .filter((item) =>
                        matchesSearch(
                          item.name,
                          item.category,
                          item.storage_location,
                          item.stock_status,
                          item.unit
                        )
                      );

                    const safeIdx =
                      filteredKitchenItems.length > 0
                        ? activeKitchenIndex % filteredKitchenItems.length
                        : 0;
                    const featuredItem =
                      filteredKitchenItems[safeIdx] || inventory[0] || null;
                    const featuredSpec = getKitchenVisualSpec(
                      featuredItem?.name || "Indrayani Organic Rice"
                    );
                    const rotationDeg = safeIdx * 90;
                    const isFeaturedLow =
                      featuredItem?.stock_status === "LOW_STOCK" ||
                      featuredItem?.stock_status === "OUT_OF_STOCK";

                    return (
                      <>
                        {/* Hero Split-Screen Animated Turntable Canvas */}
                        <div className="relative overflow-hidden rounded-3xl bg-[#111315] text-stone-100 shadow-xl">
                          {/* Subtle warm radial culinary glow */}
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl"
                          />
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl"
                          />

                          {/* Top Culinary Category Navigation Bar inside Hero */}
                          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-10">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
                                <Utensils className="h-4 w-4" />
                              </div>
                              <span className="font-serif text-lg tracking-wide text-white italic">
                                Tare Culinary Pantry & Larder
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {[
                                { id: "ALL", label: "All Signatures" },
                                {
                                  id: "GRAINS_PULSES",
                                  label: "Grains & Lentils",
                                },
                                { id: "DAIRY_EGGS", label: "Fresh Dairy" },
                                {
                                  id: "COOKING_OILS",
                                  label: "Cold-Pressed Oils",
                                },
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setKitchenCategoryFilter(cat.id);
                                    setActiveKitchenIndex(0);
                                  }}
                                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                                    kitchenCategoryFilter === cat.id
                                      ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                                      : "text-stone-300 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setShowAddKitchenModal((prev) => !prev)
                              }
                              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500 hover:text-slate-950"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {showAddKitchenModal
                                ? "Close Form"
                                : "Add Ingredient"}
                            </button>
                          </div>

                          {/* Collapsible Quick-Add Pantry Drawer */}
                          {showAddKitchenModal && (
                            <form
                              onSubmit={(e) => {
                                handleAddInventoryItem(e);
                                setShowAddKitchenModal(false);
                              }}
                              className="relative z-10 border-b border-white/10 bg-white/5 px-6 py-4 backdrop-blur lg:px-10"
                            >
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                                <input
                                  type="text"
                                  required
                                  placeholder="Ingredient name (e.g., Kashmiri Saffron)"
                                  value={newItemName}
                                  onChange={(e) =>
                                    setNewItemName(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white placeholder:text-stone-400 sm:col-span-2"
                                />
                                <input
                                  type="number"
                                  step="0.5"
                                  required
                                  placeholder="Quantity"
                                  value={newItemQty}
                                  onChange={(e) =>
                                    setNewItemQty(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 font-mono text-xs text-white tabular-nums"
                                />
                                <select
                                  value={newItemUnit}
                                  onChange={(e) =>
                                    setNewItemUnit(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white"
                                >
                                  <option value="KILOGRAM">Kilograms (kg)</option>
                                  <option value="LITER">Liters (L)</option>
                                  <option value="PIECE">Pieces (pcs)</option>
                                </select>
                                <button
                                  type="submit"
                                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
                                >
                                  Save to Pantry
                                </button>
                              </div>
                            </form>
                          )}

                          {/* Main Split-Screen Restaurant Showcase */}
                          {featuredItem && (
                            <div className="relative z-10 grid grid-cols-1 items-center gap-8 px-6 py-8 lg:grid-cols-12 lg:px-10 lg:py-10">
                              {/* Left Editorial Content & Controls (7 cols) */}
                              <div className="space-y-6 lg:col-span-7">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400/90">
                                  <span>{featuredSpec.origin}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{featuredItem.storage_location}</span>
                                  <span aria-hidden="true">·</span>
                                  <span
                                    className={
                                      isFeaturedLow
                                        ? "font-semibold text-rose-400"
                                        : "font-semibold text-emerald-400"
                                    }
                                  >
                                    {isFeaturedLow
                                      ? "Low Stock — Reorder Soon"
                                      : "Fresh & In Stock"}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  <h1 className="font-serif text-3xl leading-tight font-normal tracking-tight text-white sm:text-5xl">
                                    {featuredItem.name}
                                  </h1>
                                  <p className="text-sm font-medium text-amber-300/90">
                                    {featuredSpec.subtitle}
                                  </p>
                                  <p className="max-w-xl text-xs leading-relaxed text-stone-300 sm:text-sm">
                                    {featuredSpec.culinaryNote}
                                  </p>
                                </div>

                                {/* Culinary Specs Row */}
                                <div className="grid grid-cols-3 gap-4 border-y border-white/10 py-4 text-xs">
                                  <div>
                                    <div className="text-stone-400">
                                      On-Hand Reserve
                                    </div>
                                    <div className="mt-1 font-mono text-lg font-bold tabular-nums text-white">
                                      {Number(
                                        featuredItem.quantity_on_hand
                                      ).toFixed(1)}{" "}
                                      <span className="text-xs font-normal text-amber-400">
                                        {featuredItem.unit}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-stone-400">
                                      Prep / Profile
                                    </div>
                                    <div className="mt-1 font-semibold text-white">
                                      {featuredSpec.prepTime}
                                    </div>
                                    <div className="text-[11px] text-stone-400">
                                      {featuredSpec.calories}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-stone-400">
                                      Freshness Window
                                    </div>
                                    <div className="mt-1 font-mono font-semibold tabular-nums text-white">
                                      {featuredItem.expiry_date || "2027-02-01"}
                                    </div>
                                    <div className="text-[11px] text-stone-400">
                                      Min threshold:{" "}
                                      {Number(
                                        featuredItem.reorder_threshold
                                      ).toFixed(1)}{" "}
                                      {featuredItem.unit}
                                    </div>
                                  </div>
                                </div>

                                {/* Interactive Action Bar */}
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAdjustInventory(
                                          featuredItem.id,
                                          -0.5
                                        )
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-amber-500 hover:text-slate-950"
                                      title="Use 0.5 unit"
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="px-3 font-mono text-xs font-bold tabular-nums text-white">
                                      {Number(
                                        featuredItem.quantity_on_hand
                                      ).toFixed(1)}{" "}
                                      {featuredItem.unit}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAdjustInventory(
                                          featuredItem.id,
                                          0.5
                                        )
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-amber-500 hover:text-slate-950"
                                      title="Add 0.5 unit"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAdjustInventory(
                                        featuredItem.id,
                                        undefined,
                                        5.0
                                      )
                                    }
                                    className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:bg-amber-400"
                                  >
                                    <Flame className="h-4 w-4" />
                                    Restock Full Reserve (5.0 {featuredItem.unit})
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveView("intelligence");
                                      runAgentQueryText(
                                        `What is our current stock and culinary usage recommendation for ${featuredItem.name}?`
                                      );
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-stone-200 transition-colors hover:bg-white/15"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                    Ask Kitchen Chef AI
                                  </button>
                                </div>

                                {/* Interactive Dish Carousel Switcher */}
                                <div className="pt-2">
                                  <div className="mb-2.5 flex items-center justify-between text-xs text-stone-400">
                                    <span>
                                      Select Plated Ingredient to Rotate
                                      Turntable
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveKitchenIndex((prev) =>
                                            prev === 0
                                              ? Math.max(
                                                  0,
                                                  filteredKitchenItems.length -
                                                    1
                                                )
                                              : prev - 1
                                          )
                                        }
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-stone-200 hover:bg-amber-500 hover:text-slate-950"
                                        title="Previous Dish"
                                      >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveKitchenIndex(
                                            (prev) =>
                                              (prev + 1) %
                                              Math.max(
                                                1,
                                                filteredKitchenItems.length
                                              )
                                          )
                                        }
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-stone-200 hover:bg-amber-500 hover:text-slate-950"
                                        title="Next Dish"
                                      >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                    {filteredKitchenItems.map((item, idx) => {
                                      const spec = getKitchenVisualSpec(
                                        item.name
                                      );
                                      const isCurrent = idx === safeIdx;
                                      return (
                                        <button
                                          key={item.id}
                                          type="button"
                                          onClick={() =>
                                            setActiveKitchenIndex(idx)
                                          }
                                          className={`group flex items-center gap-2.5 rounded-2xl border p-2 text-left transition-all duration-300 ${
                                            isCurrent
                                              ? "border-amber-400 bg-amber-500/15 shadow-sm"
                                              : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                                          }`}
                                        >
                                          <img
                                            src={spec.image}
                                            alt={item.name}
                                            referrerPolicy="no-referrer"
                                            className={`h-11 w-11 shrink-0 rounded-full object-cover ring-2 transition-transform duration-500 ${
                                              isCurrent
                                                ? "scale-105 ring-amber-400"
                                                : "ring-white/15 group-hover:rotate-12"
                                            }`}
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="truncate text-xs font-semibold text-white">
                                              {item.name}
                                            </div>
                                            <div className="font-mono text-[11px] tabular-nums text-amber-300/90">
                                              {Number(
                                                item.quantity_on_hand
                                              ).toFixed(1)}{" "}
                                              {item.unit}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>

                              {/* Right Animated Circular Plate Turntable (5 cols) */}
                              <div className="flex flex-col items-center justify-center lg:col-span-5">
                                <div className="relative flex h-80 w-80 items-center justify-center sm:h-96 sm:w-96">
                                  {/* Outer Rotating Orbital Dial Ring */}
                                  <div
                                    className="absolute inset-0 rounded-full border border-dashed border-amber-400/35 transition-transform duration-700 ease-out"
                                    style={{
                                      transform: `rotate(${rotationDeg}deg)`,
                                    }}
                                  >
                                    <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-slate-950 bg-amber-400 shadow" />
                                    <span className="absolute top-1/2 -right-2 h-3 w-3 -translate-y-1/2 rounded-full bg-stone-500" />
                                    <span className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-amber-500/60" />
                                    <span className="absolute top-1/2 -left-2 h-3 w-3 -translate-y-1/2 rounded-full bg-stone-500" />
                                  </div>

                                  {/* Inner Glowing Culinary Rim */}
                                  <div className="absolute inset-5 rounded-full border border-white/10 bg-gradient-to-br from-amber-500/10 via-transparent to-white/5 shadow-inner" />

                                  {/* Rotating High-Res Plated Dish Image */}
                                  <div
                                    className="relative h-60 w-60 overflow-hidden rounded-full border-4 border-amber-400/30 shadow-2xl transition-all duration-700 ease-out sm:h-72 sm:w-72"
                                    style={{
                                      transform: `rotate(${rotationDeg}deg)`,
                                    }}
                                  >
                                    <img
                                      src={featuredSpec.image}
                                      alt={featuredItem.name}
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-cover"
                                    />
                                  </div>

                                  {/* Floating Culinary Status Callout */}
                                  <div className="absolute right-2 bottom-2 rounded-2xl border border-white/15 bg-slate-950/90 px-3.5 py-2 text-xs backdrop-blur">
                                    <div className="text-[10px] text-stone-400">
                                      Pantry Telemetry
                                    </div>
                                    <div className="font-mono text-sm font-bold tabular-nums text-amber-400">
                                      {Number(
                                        featuredItem.quantity_on_hand
                                      ).toFixed(1)}{" "}
                                      {featuredItem.unit}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Culinary Menu Grid of All Pantry Items */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900">
                              Complete Kitchen & Grocery Larder (
                              {filteredKitchenItems.length})
                            </h3>
                            <span className="text-xs text-slate-500">
                              Click any card to feature on the turntable
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {filteredKitchenItems.map((item, idx) => {
                              const spec = getKitchenVisualSpec(item.name);
                              const isLow =
                                item.stock_status === "LOW_STOCK" ||
                                item.stock_status === "OUT_OF_STOCK";
                              const isSelected = idx === safeIdx;
                              const stockPct = Math.min(
                                100,
                                Math.round(
                                  (parseFloat(
                                    String(item.quantity_on_hand || "0")
                                  ) /
                                    Math.max(
                                      1,
                                      parseFloat(
                                        String(item.reorder_threshold || "1")
                                      ) * 2
                                    )) *
                                    100
                                )
                              );

                              return (
                                <div
                                  key={item.id}
                                  onClick={() => setActiveKitchenIndex(idx)}
                                  className={`group cursor-pointer overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                                    isSelected
                                      ? "border-slate-900 ring-1 ring-slate-900"
                                      : "border-slate-200"
                                  }`}
                                >
                                  <div className="relative h-44 w-full overflow-hidden bg-stone-100">
                                    <img
                                      src={spec.image}
                                      alt={item.name}
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                                      <div>
                                        <div className="text-[11px] font-medium text-amber-300">
                                          {item.storage_location}
                                        </div>
                                        <div className="text-sm font-bold">
                                          {item.name}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3 p-4 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`font-semibold ${
                                          isLow
                                            ? "text-rose-700"
                                            : "text-emerald-700"
                                        }`}
                                      >
                                        {isLow
                                          ? "Low Stock Alert"
                                          : "Optimal Reserve"}
                                      </span>
                                      <span className="font-mono font-bold tabular-nums text-slate-900">
                                        {Number(item.quantity_on_hand).toFixed(
                                          1
                                        )}{" "}
                                        {item.unit}
                                      </span>
                                    </div>

                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          isLow
                                            ? "bg-rose-500"
                                            : "bg-emerald-600"
                                        }`}
                                        style={{ width: `${stockPct}%` }}
                                      />
                                    </div>

                                    <div
                                      className="flex items-center justify-between pt-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAdjustInventory(item.id, -0.5)
                                          }
                                          className="rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleAdjustInventory(item.id, 0.5)
                                          }
                                          className="rounded-md border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100"
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAdjustInventory(
                                            item.id,
                                            undefined,
                                            5.0
                                          )
                                        }
                                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                                      >
                                        Restock 5.0 {item.unit}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Top Metric Summary Strip (Shown when not in dedicated domain showcase tabs) */}
              {selectedDomain !== "kitchen_grocery" &&
                selectedDomain !== "home_maintenance" &&
                selectedDomain !== "laundry_clothing" &&
                selectedDomain !== "vehicle_mobility" &&
                selectedDomain !== "documents_warranty" &&
                selectedDomain !== "parents_health" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Monthly Budget & Spend</span>
                    <CreditCard className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-2 font-mono text-lg font-bold tabular-nums text-slate-900">
                    {formatINR(summary?.metrics?.recorded_expenses_minor)}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900 transition-all"
                      style={{ width: `${budgetUtilizationPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {budgetUtilizationPct}% of{" "}
                    <span className="font-mono tabular-nums">
                      {formatINR(summary?.metrics?.monthly_budget_minor)}
                    </span>{" "}
                    monthly budget
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Pending Utility Bills</span>
                    <FileText className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="mt-2 font-mono text-lg font-bold tabular-nums text-slate-900">
                    {formatINR(summary?.metrics?.pending_bills_amount_minor)}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {summary?.metrics?.pending_bills_count ?? 0} pending ·{" "}
                    {summary?.metrics?.active_subscriptions_count ?? 0} active
                    subscriptions
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Assets & Coverage</span>
                    <Wrench className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="mt-2 font-mono text-lg font-bold tabular-nums text-slate-900">
                    {assets.length} Household Assets
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {warrantiesData.items.length} warranties ·{" "}
                    {warrantiesData.insurance_policies.length} insurance
                    policies
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Pantry & Approvals</span>
                    <Package className="h-4 w-4 text-rose-500" />
                  </div>
                  <p className="mt-2 font-mono text-lg font-bold tabular-nums text-slate-900">
                    {summary?.metrics?.low_stock_items_count ?? 0} Low-Stock
                    Items
                  </p>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>{pendingApprovalsCount} awaiting approval</span>
                    {pendingApprovalsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveView("intelligence")}
                        className="font-semibold text-amber-700 hover:underline"
                      >
                        Review →
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )}

              {/* RENOVATION WEBFLOW TEMPLATE UI FOR HOME MAINTENANCE TAB */}
              {selectedDomain === "home_maintenance" && (
                <div className="space-y-8">
                  {(() => {
                    const homeAssets = assets
                      .filter((a) => a.category !== "VEHICLE")
                      .filter((a) =>
                        matchesSearch(
                          a.name,
                          a.brand,
                          a.model_number,
                          a.location_room,
                          a.status
                        )
                      );
                    const maintRecords = warrantiesData.maintenance_records
                      .filter(
                        (m: any) =>
                          m.asset_id !== "44444444-4444-4444-8444-444444444402"
                      )
                      .filter((m: any) =>
                        matchesSearch(
                          m.title,
                          m.description,
                          m.status,
                          m.technician_or_vendor,
                          m.scheduled_for
                        )
                      );
                    const scheduledCount = maintRecords.filter(
                      (m: any) => m.status !== "COMPLETED"
                    ).length;
                    const completedCount = maintRecords.filter(
                      (m: any) => m.status === "COMPLETED"
                    ).length;
                    const totalMaintMinor = maintRecords.reduce(
                      (acc: number, m: any) =>
                        acc +
                        Number(m.labor_cost_minor || 0) +
                        Number(m.parts_cost_minor || 0),
                      0
                    );

                    return (
                      <>
                        {/* Renovation Webflow Hero Section */}
                        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-[#18181B] text-white shadow-lg">
                          <div className="grid grid-cols-1 items-center gap-8 p-6 lg:grid-cols-12 lg:p-10">
                            <div className="space-y-6 lg:col-span-6">
                              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                                <Wrench className="h-4 w-4" />
                                <span>
                                  Residential Engineering · Preventive
                                  Renovation & Care
                                </span>
                              </div>

                              <h1 className="text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl">
                                Built for Longevity. Engineered for Zero
                                Downtime.
                              </h1>

                              <p className="max-w-xl text-xs leading-relaxed text-stone-300 sm:text-sm">
                                Complete preventive maintenance, HVAC climate
                                servicing, hydro-mechanical calibration, and
                                total cost of ownership tracking across your
                                residence.
                              </p>

                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowMaintModal((prev) => !prev)
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-bold text-slate-950 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-amber-400"
                                >
                                  <Plus className="h-4 w-4" />
                                  {showMaintModal
                                    ? "Close Booking Form"
                                    : "Schedule Service Visit"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveView("intelligence");
                                    runAgentQueryText(
                                      "What maintenance records and upcoming service schedules are due for our appliances?"
                                    );
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-semibold text-white hover:bg-white/10"
                                >
                                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                  Inspect with Engineering AI
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5 text-xs">
                                <div>
                                  <div className="font-mono text-2xl font-bold tabular-nums text-amber-400">
                                    {homeAssets.length}
                                  </div>
                                  <div className="mt-0.5 text-stone-400">
                                    Managed Systems
                                  </div>
                                </div>
                                <div>
                                  <div className="font-mono text-2xl font-bold tabular-nums text-white">
                                    {scheduledCount}
                                  </div>
                                  <div className="mt-0.5 text-stone-400">
                                    Active Work Orders
                                  </div>
                                </div>
                                <div>
                                  <div className="font-mono text-xl font-bold tabular-nums text-emerald-400">
                                    {formatINR(totalMaintMinor)}
                                  </div>
                                  <div className="mt-0.5 text-stone-400">
                                    Service Investment
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="relative lg:col-span-6">
                              <div className="overflow-hidden rounded-2xl border border-white/10">
                                <img
                                  src="/src/assets/images/renovation_hero_interior_1790696327676.jpg"
                                  alt="Residential Renovation and Appliance Engineering"
                                  referrerPolicy="no-referrer"
                                  className="h-72 w-full object-cover sm:h-80"
                                />
                              </div>
                              <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-stone-900/95 px-4 py-3 text-xs">
                                <div>
                                  <div className="font-semibold text-white">
                                    Next Priority Dispatch: Daikin Split AC
                                    Hydro-Wash
                                  </div>
                                  <div className="text-[11px] text-stone-400">
                                    Master Bedroom · Daikin ComfortPro Pune
                                  </div>
                                </div>
                                <span className="font-mono font-bold tabular-nums text-amber-400">
                                  {completedCount}/{maintRecords.length} Done
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Service Booking Drawer */}
                          {showMaintModal && (
                            <form
                              onSubmit={handleScheduleMaintenance}
                              className="border-t border-white/10 bg-stone-900 px-6 py-4 lg:px-10"
                            >
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                                <input
                                  type="text"
                                  required
                                  placeholder="Service title (e.g., RO Water Filter Cartridge Replacement)"
                                  value={maintTitle}
                                  onChange={(e) =>
                                    setMaintTitle(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white placeholder:text-stone-400 sm:col-span-2"
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder="Contractor / Vendor"
                                  value={maintVendor}
                                  onChange={(e) =>
                                    setMaintVendor(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white"
                                />
                                <input
                                  type="number"
                                  required
                                  placeholder="Est. Cost (₹)"
                                  value={maintCostInr}
                                  onChange={(e) =>
                                    setMaintCostInr(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 font-mono text-xs text-white tabular-nums"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                                >
                                  Confirm Booking
                                </button>
                              </div>
                            </form>
                          )}
                        </div>

                        {/* Editorial Numbered Renovation & Maintenance Pillars */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          {[
                            {
                              num: "01.",
                              title: "Climate & HVAC Servicing",
                              desc: "Seasonal hydro-wash sanitization, refrigerant pressure checks, and PM2.5 titanium apatite filter maintenance.",
                              meta: "Master Bedroom · 180-Day Cycle",
                            },
                            {
                              num: "02.",
                              title: "Kitchen & Hydro-Mechanical",
                              desc: "Hard-water softener calibration, spray-arm descaling, and micro-mesh seal replacements for built-in appliances.",
                              meta: "Kitchen Island · BSH Certified",
                            },
                            {
                              num: "03.",
                              title: "Warranty & Lifecycle Audit",
                              desc: "Continuous tracking of purchase cost, repair parts, and labor against manufacturer and extended warranty coverage.",
                              meta: "100% Receipt-Backed TCO",
                            },
                          ].map((pillar) => (
                            <div
                              key={pillar.num}
                              className="rounded-2xl border border-stone-200 bg-[#FAF8F5] p-5"
                            >
                              <div className="font-mono text-sm font-bold text-amber-600">
                                {pillar.num}
                              </div>
                              <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                                {pillar.title}
                              </h3>
                              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                                {pillar.desc}
                              </p>
                              <div className="mt-3 border-t border-stone-200/80 pt-2.5 text-[11px] font-medium text-slate-500">
                                {pillar.meta}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Featured Residential Systems Showcase */}
                        <div className="space-y-3">
                          <h2 className="text-base font-bold text-slate-900">
                            Installed Residential Systems & Cost of Ownership
                          </h2>
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {homeAssets.map((asset) => {
                              const isHvac =
                                asset.category === "HVAC_SYSTEM" ||
                                asset.name.toLowerCase().includes("daikin");
                              const imgSrc = isHvac
                                ? "/src/assets/images/maintenance_hvac_service_1790696342392.jpg"
                                : "/src/assets/images/maintenance_dishwasher_care_1790696354374.jpg";
                              const isOperational =
                                asset.status === "OPERATIONAL";

                              return (
                                <div
                                  key={asset.id}
                                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:shadow-md"
                                >
                                  <div className="relative h-52 w-full overflow-hidden bg-stone-100">
                                    <img
                                      src={imgSrc}
                                      alt={asset.name}
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                                    <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between text-white">
                                      <div>
                                        <div className="text-xs font-medium text-amber-300">
                                          {asset.location_room} · {asset.brand}
                                        </div>
                                        <div className="text-base font-bold">
                                          {asset.name}
                                        </div>
                                      </div>
                                      <span
                                        className={`text-xs font-semibold ${
                                          isOperational
                                            ? "text-emerald-300"
                                            : "text-amber-300"
                                        }`}
                                      >
                                        {isOperational
                                          ? "Operational"
                                          : "Service Due"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-4 p-5 text-xs">
                                    <p className="text-slate-600">
                                      {asset.notes}
                                    </p>

                                    <div className="grid grid-cols-3 gap-3 rounded-xl bg-stone-50 p-3">
                                      <div>
                                        <div className="text-[11px] text-slate-500">
                                          Purchase Price
                                        </div>
                                        <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                                          {formatINR(
                                            asset.tco?.purchase_price_minor
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-500">
                                          Service Spend
                                        </div>
                                        <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                                          {formatINR(
                                            asset.tco?.maintenance_cost_minor
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-500">
                                          Total Lifecycle Cost
                                        </div>
                                        <div className="mt-0.5 font-mono font-bold tabular-nums text-slate-900">
                                          {formatINR(
                                            asset.tco?.total_tco_minor
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                                      <span>
                                        Model: {asset.model_number} · Serial:{" "}
                                        {asset.serial_number}
                                      </span>
                                      {asset.appliance?.next_service_due_on && (
                                        <span className="font-semibold text-slate-800">
                                          Next Service:{" "}
                                          {asset.appliance.next_service_due_on}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active Renovation & Service Work Orders */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="text-base font-bold text-slate-900">
                                Active Work Orders & Service History
                              </h3>
                              <p className="text-xs text-slate-500">
                                Mark scheduled visits complete once the
                                technician finishes inspection.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowMaintModal(true)}
                              className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              + New Work Order
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            {maintRecords.map((m: any) => {
                              const isDone = m.status === "COMPLETED";
                              return (
                                <div
                                  key={m.id}
                                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-stone-50/60 p-4 text-xs"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-sm font-bold text-slate-900">
                                        {m.title}
                                      </span>
                                      <span
                                        className={`shrink-0 font-semibold ${
                                          isDone
                                            ? "text-emerald-700"
                                            : "text-amber-700"
                                        }`}
                                      >
                                        {isDone
                                          ? "Completed"
                                          : "Scheduled Visit"}
                                      </span>
                                    </div>
                                    <p className="mt-1.5 text-slate-600">
                                      {m.description}
                                    </p>
                                    <div className="mt-2 text-[11px] text-slate-500">
                                      Contractor: {m.technician_or_vendor}
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center justify-between border-t border-slate-200/80 pt-3">
                                    <div className="text-[11px] text-slate-600">
                                      Date: {m.scheduled_for} · Cost:{" "}
                                      <span className="font-mono font-bold tabular-nums text-slate-900">
                                        {formatINR(
                                          Number(m.labor_cost_minor) +
                                            Number(m.parts_cost_minor)
                                        )}
                                      </span>
                                    </div>
                                    {!isDone && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleCompleteMaintenance(m.id)
                                        }
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        Mark Completed
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* LAUNDRY & DRY-CLEANING DELIVERY APP UI FOR LAUNDRY & CLOTHING TAB */}
              {selectedDomain === "laundry_clothing" && (
                <div className="space-y-6">
                  {(() => {
                    const filteredClothing = clothing
                      .filter((c) =>
                        laundryCareFilter === "ALL"
                          ? true
                          : c.care_instruction === laundryCareFilter
                      )
                      .filter((c) =>
                        matchesSearch(
                          c.name,
                          c.fabric_type,
                          c.care_instruction,
                          c.brand,
                          c.color
                        )
                      );
                    const needsCareCount = clothing.filter(
                      (c) => c.needs_laundry
                    ).length;
                    const cleanCount = clothing.length - needsCareCount;

                    return (
                      <>
                        {/* Pastel Sky-Blue & Crisp White Valet Delivery App Hero */}
                        <div className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-[#EAF4FF] via-[#F4F9FF] to-white p-6 shadow-sm lg:p-8">
                          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                            <div className="space-y-5 lg:col-span-7">
                              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600">
                                <Shirt className="h-4 w-4" />
                                <span>
                                  Tare Wardrobe Valet · Fabric-Safe Dry Cleaning
                                  & Care
                                </span>
                              </div>

                              <h1 className="text-2xl leading-tight font-bold tracking-tight text-slate-900 sm:text-4xl">
                                Gentle Fabric Care & On-Demand Valet Tracker
                              </h1>

                              <p className="max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                                Temperature-governed wash rules, delicate
                                handloom silk preservation, and one-tap laundry
                                basket scheduling for every garment in your
                                wardrobe.
                              </p>

                              {/* Service Care Category Pills */}
                              <div className="flex flex-wrap gap-2">
                                {[
                                  { id: "ALL", label: "All Wardrobe" },
                                  {
                                    id: "DRY_CLEAN_ONLY",
                                    label: "Dry Clean Valet",
                                  },
                                  {
                                    id: "GENTLE_COLD_WASH",
                                    label: "Gentle Cold Wash",
                                  },
                                  {
                                    id: "MACHINE_WASH_WARM",
                                    label: "Warm Wash & Fold",
                                  },
                                ].map((pill) => (
                                  <button
                                    key={pill.id}
                                    type="button"
                                    onClick={() =>
                                      setLaundryCareFilter(pill.id)
                                    }
                                    className={`rounded-2xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                                      laundryCareFilter === pill.id
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-white text-slate-700 hover:bg-blue-50"
                                    }`}
                                  >
                                    {pill.label}
                                  </button>
                                ))}
                              </div>

                              {/* Valet Order Status Stepper Card */}
                              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-slate-900">
                                    Active Valet Care Batch · #VL-2026
                                  </span>
                                  <span className="font-semibold text-blue-600">
                                    {needsCareCount} in Basket · {cleanCount}{" "}
                                    Fresh in Closet
                                  </span>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                                  <div className="rounded-xl bg-blue-50 px-3 py-2 font-semibold text-blue-900">
                                    1. Basket Sorted
                                  </div>
                                  <div className="rounded-xl bg-blue-600 px-3 py-2 font-semibold text-white">
                                    2. Temp-Safe Care
                                  </div>
                                  <div className="rounded-xl bg-slate-100 px-3 py-2 font-medium text-slate-600">
                                    3. Steam & Hang
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAddGarmentModal((prev) => !prev)
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {showAddGarmentModal
                                    ? "Close Form"
                                    : "Add Garment to Wardrobe"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveView("intelligence");
                                    runAgentQueryText(
                                      "How should we wash the Paithani Pure Silk Saree and can we tumble dry it?"
                                    );
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Ask Fabric Care AI
                                </button>
                              </div>
                            </div>

                            {/* Right Visual Valet Showcase */}
                            <div className="grid grid-cols-2 gap-4 lg:col-span-5">
                              <div className="overflow-hidden rounded-3xl border border-white bg-white p-2 shadow-sm">
                                <img
                                  src="/src/assets/images/laundry_silk_saree_care_1790696366528.jpg"
                                  alt="Paithani Pure Silk Saree Valet Care"
                                  referrerPolicy="no-referrer"
                                  className="h-52 w-full rounded-2xl object-cover"
                                />
                                <div className="p-2.5 text-xs">
                                  <div className="font-bold text-slate-900">
                                    Delicate Silk Valet
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    20°C Max · No Tumble Dry
                                  </div>
                                </div>
                              </div>
                              <div className="overflow-hidden rounded-3xl border border-white bg-white p-2 shadow-sm">
                                <img
                                  src="/src/assets/images/laundry_linen_wardrobe_1790696378092.jpg"
                                  alt="Freshly Pressed Organic Linen Wardrobe"
                                  referrerPolicy="no-referrer"
                                  className="h-52 w-full rounded-2xl object-cover"
                                />
                                <div className="p-2.5 text-xs">
                                  <div className="font-bold text-slate-900">
                                    Linen & Cotton Press
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    30°C Gentle · Cedar Hung
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Add Garment Drawer */}
                          {showAddGarmentModal && (
                            <form
                              onSubmit={handleAddGarment}
                              className="mt-6 border-t border-blue-100 pt-5"
                            >
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                                <input
                                  type="text"
                                  required
                                  placeholder="Garment name (e.g., Pashmina Shawl)"
                                  value={garmentName}
                                  onChange={(e) =>
                                    setGarmentName(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:col-span-2"
                                />
                                <select
                                  value={garmentFabric}
                                  onChange={(e) =>
                                    setGarmentFabric(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                >
                                  <option value="SILK">Pure Silk</option>
                                  <option value="LINEN">Belgian Linen</option>
                                  <option value="ORGANIC_COTTON">
                                    Organic Cotton
                                  </option>
                                  <option value="WOOL_CASHMERE">
                                    Wool / Cashmere
                                  </option>
                                </select>
                                <select
                                  value={garmentCare}
                                  onChange={(e) =>
                                    setGarmentCare(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                                >
                                  <option value="DRY_CLEAN_ONLY">
                                    Dry Clean Only (20°C)
                                  </option>
                                  <option value="GENTLE_COLD_WASH">
                                    Gentle Cold Wash (30°C)
                                  </option>
                                  <option value="MACHINE_WASH_WARM">
                                    Machine Wash Warm (40°C)
                                  </option>
                                </select>
                                <button
                                  type="submit"
                                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                                >
                                  Save Garment
                                </button>
                              </div>
                            </form>
                          )}
                        </div>

                        {/* Garment Care Cards Grid */}
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {filteredClothing.map((c) => {
                            const isSilk =
                              c.fabric_type === "SILK" ||
                              c.care_instruction === "DRY_CLEAN_ONLY";
                            const imgSrc = isSilk
                              ? "/src/assets/images/laundry_silk_saree_care_1790696366528.jpg"
                              : "/src/assets/images/laundry_linen_wardrobe_1790696378092.jpg";

                            return (
                              <div
                                key={c.id}
                                className="flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
                              >
                                <div>
                                  <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-slate-100">
                                    <img
                                      src={imgSrc}
                                      alt={c.name}
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-cover"
                                    />
                                    <div className="absolute top-3 right-3 rounded-xl bg-white/95 px-2.5 py-1 font-mono text-[11px] font-bold tabular-nums text-slate-900 backdrop-blur">
                                      Max {c.max_wash_temp_c}°C
                                    </div>
                                  </div>

                                  <div className="mt-4 space-y-1.5">
                                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                                      <span>
                                        {c.brand} · {c.fabric_type}
                                      </span>
                                      <span
                                        className={
                                          c.needs_laundry
                                            ? "font-semibold text-amber-700"
                                            : "font-semibold text-emerald-700"
                                        }
                                      >
                                        {c.needs_laundry
                                          ? "In Laundry Basket"
                                          : "Fresh & Ready"}
                                      </span>
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                      {c.name}
                                    </h3>
                                    <div className="text-xs text-slate-600">
                                      Care: {c.care_instruction} · Tumble Dry:{" "}
                                      <span
                                        className={
                                          c.can_tumble_dry
                                            ? "font-medium text-slate-800"
                                            : "font-semibold text-rose-700"
                                        }
                                      >
                                        {c.can_tumble_dry
                                          ? "Allowed"
                                          : "Do Not Tumble Dry"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                  <span className="text-[11px] text-slate-500">
                                    Wears since wash:{" "}
                                    <strong className="font-mono text-slate-800">
                                      {c.wear_count_since_wash ?? 0}
                                    </strong>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleLaundry(c.id)}
                                    className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                                      c.needs_laundry
                                        ? "bg-blue-600 text-white hover:bg-blue-700"
                                        : "border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                                    }`}
                                  >
                                    {c.needs_laundry
                                      ? "Complete Valet Care"
                                      : "Queue for Wash"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* MALEN CAR SERVICE & REPAIR WORDPRESS THEME UI FOR VEHICLE & MOBILITY TAB */}
              {selectedDomain === "vehicle_mobility" && (
                <div className="space-y-8">
                  {(() => {
                    const vehicleAssets = assets
                      .filter((a) => a.category === "VEHICLE")
                      .filter((a) =>
                        matchesSearch(
                          a.name,
                          a.brand,
                          a.model_number,
                          a.location_room,
                          a.status,
                          a.vehicle?.registration_number,
                          a.vehicle?.vin,
                          a.vehicle?.fuel_type
                        )
                      );
                    const primaryCar =
                      vehicleAssets[0] ||
                      assets.find((a) => a.category === "VEHICLE") ||
                      null;
                    const vehSpec = primaryCar?.vehicle || {
                      id: "66666666-6666-4666-8666-666666666601",
                      registration_number: "MH-12-W-4092",
                      vin: "MAT631299RPN10482",
                      fuel_type: "ELECTRIC",
                      odometer_km: 14280,
                      service_interval_km: 10000,
                      next_service_due_km: 20000,
                      next_service_due_on: "2027-01-15",
                      pollution_cert_expiry: "2027-01-19",
                    };

                    const currentOdometerKm = Number(
                      vehSpec.odometer_km || 14280
                    );
                    const nextServiceDueKm = Number(
                      vehSpec.next_service_due_km || 20000
                    );
                    const serviceIntervalKm = Number(
                      vehSpec.service_interval_km || 10000
                    );
                    const lastMilestoneKm = Math.max(
                      0,
                      nextServiceDueKm - serviceIntervalKm
                    );
                    const kmRemaining = Math.max(
                      0,
                      nextServiceDueKm - currentOdometerKm
                    );
                    const cycleProgressPct = Math.min(
                      100,
                      Math.max(
                        8,
                        Math.round(
                          ((currentOdometerKm - lastMilestoneKm) /
                            Math.max(1, serviceIntervalKm)) *
                            100
                        )
                      )
                    );
                    const isServiceDue =
                      currentOdometerKm >= nextServiceDueKm ||
                      primaryCar?.status === "MAINTENANCE_DUE";

                    const vehicleMaintRecords = warrantiesData.maintenance_records
                      .filter(
                        (m: any) =>
                          m.asset_id ===
                            (primaryCar?.id ||
                              "44444444-4444-4444-8444-444444444402") ||
                          String(m.title || "")
                            .toLowerCase()
                            .includes("ev") ||
                          String(m.title || "")
                            .toLowerCase()
                            .includes("wheel") ||
                          String(m.title || "")
                            .toLowerCase()
                            .includes("brake") ||
                          String(m.technician_or_vendor || "")
                            .toLowerCase()
                            .includes("malen")
                      )
                      .filter((m: any) => {
                        if (vehicleServiceFilter === "SCHEDULED")
                          return m.status !== "COMPLETED";
                        if (vehicleServiceFilter === "COMPLETED")
                          return m.status === "COMPLETED";
                        return true;
                      })
                      .filter((m: any) =>
                        matchesSearch(
                          m.title,
                          m.description,
                          m.status,
                          m.technician_or_vendor,
                          m.scheduled_for
                        )
                      );

                    const scheduledBayCount = warrantiesData.maintenance_records.filter(
                      (m: any) =>
                        m.asset_id ===
                          (primaryCar?.id ||
                            "44444444-4444-4444-8444-444444444402") &&
                        m.status !== "COMPLETED"
                    ).length;

                    const motorPolicies =
                      warrantiesData.insurance_policies.filter(
                        (p: any) =>
                          p.policy_type === "MOTOR_VEHICLE" ||
                          p.covered_asset_id === primaryCar?.id
                      );
                    const primaryPolicy = motorPolicies[0] || null;

                    return (
                      <>
                        {/* Malen Car Service & Repair Workshop Hero Split Banner */}
                        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-[#0F1115] text-white shadow-xl">
                          <div className="grid grid-cols-1 items-center gap-8 p-6 lg:grid-cols-12 lg:p-10">
                            {/* Left Column: Malen Workshop Proposition & Telemetry */}
                            <div className="space-y-6 lg:col-span-6">
                              <div className="flex items-center gap-2 text-xs font-semibold text-red-500">
                                <Car className="h-4 w-4" />
                                <span>
                                  Malen Car Service & EV Repair Center · Garage
                                  Bay B-14
                                </span>
                              </div>

                              <h1
                                className="text-3xl leading-tight font-bold tracking-tight text-white sm:text-4xl"
                                style={{ textWrap: "balance" }}
                              >
                                Precision EV Diagnostics, Mechanical Care &
                                Service Bay Ledger
                              </h1>

                              <p className="max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                                Multi-point high-voltage battery health
                                calibration, 3D laser wheel alignment,
                                regenerative brake pad inspection, and live
                                odometer service interval tracking for your
                                household fleet.
                              </p>

                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowVehicleServiceModal((prev) => !prev)
                                  }
                                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-xs font-bold text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-red-500 whitespace-nowrap"
                                >
                                  <Wrench className="h-4 w-4" />
                                  {showVehicleServiceModal
                                    ? "Close Appointment Bay"
                                    : "Book Service Appointment"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveView("intelligence");
                                    runAgentQueryText(
                                      "What is our Tata Nexon EV odometer reading and when is the next service due?"
                                    );
                                  }}
                                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-white/10 whitespace-nowrap"
                                >
                                  <Sparkles className="h-3.5 w-3.5 text-red-400" />
                                  Run EV Diagnostic AI
                                </button>
                              </div>

                              {/* Malen Quantitative Telemetry Strip */}
                              <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-xs sm:grid-cols-4">
                                <div>
                                  <div className="font-mono text-xl font-bold tabular-nums text-white">
                                    {currentOdometerKm.toLocaleString("en-IN")}{" "}
                                    km
                                  </div>
                                  <div className="mt-0.5 text-slate-400">
                                    Live Odometer
                                  </div>
                                </div>
                                <div>
                                  <div className="font-mono text-xl font-bold tabular-nums text-red-400">
                                    {kmRemaining.toLocaleString("en-IN")} km
                                  </div>
                                  <div className="mt-0.5 text-slate-400">
                                    Until 20k Service
                                  </div>
                                </div>
                                <div>
                                  <div className="font-mono text-xl font-bold tabular-nums text-white">
                                    {scheduledBayCount} Active
                                  </div>
                                  <div className="mt-0.5 text-slate-400">
                                    Bay Work Orders
                                  </div>
                                </div>
                                <div>
                                  <div className="font-mono text-xl font-bold tabular-nums text-emerald-400">
                                    {formatINR(
                                      primaryCar?.tco?.total_tco_minor ||
                                        189915000
                                    )}
                                  </div>
                                  <div className="mt-0.5 text-slate-400">
                                    Fleet Total TCO
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Malen Workshop Hero Visual + Live Odometer Control Bar */}
                            <div className="space-y-3 lg:col-span-6">
                              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
                                <img
                                  src="/src/assets/images/vehicle_malen_hero_bay_1790706396218.jpg"
                                  alt="Tata Nexon EV inside Malen Automotive Diagnostic Service Bay"
                                  referrerPolicy="no-referrer"
                                  className="h-72 w-full object-cover sm:h-80"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-2 text-white">
                                  <div>
                                    <div className="text-xs font-medium text-red-400">
                                      {vehSpec.registration_number} ·{" "}
                                      {vehSpec.fuel_type} · VIN{" "}
                                      {vehSpec.vin}
                                    </div>
                                    <div className="text-lg font-bold">
                                      {primaryCar?.name ||
                                        "Tata Nexon EV Empowered+ LR"}
                                    </div>
                                  </div>
                                  <span
                                    className={`text-xs font-semibold ${
                                      isServiceDue
                                        ? "text-amber-300"
                                        : "text-emerald-300"
                                    }`}
                                  >
                                    {isServiceDue
                                      ? "Service Interval Reached"
                                      : "All Systems Nominal"}
                                  </span>
                                </div>
                              </div>

                              {/* Interactive Odometer & Service Milestone Control Bar */}
                              <div className="rounded-2xl border border-white/10 bg-[#161920] p-4 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <span className="font-semibold text-white">
                                      Service Interval Progress
                                    </span>
                                    <span className="ml-2 text-slate-400">
                                      Next Due:{" "}
                                      <strong className="font-mono tabular-nums text-white">
                                        {nextServiceDueKm.toLocaleString(
                                          "en-IN"
                                        )}{" "}
                                        km
                                      </strong>{" "}
                                      · {vehSpec.next_service_due_on}
                                    </span>
                                  </div>
                                  <span className="font-mono font-bold tabular-nums text-red-400">
                                    {cycleProgressPct}% of 10,000 km Cycle
                                  </span>
                                </div>

                                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className="h-full rounded-full bg-red-600 transition-all duration-200"
                                    style={{ width: `${cycleProgressPct}%` }}
                                  />
                                </div>

                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateVehicleOdometer(
                                          vehSpec.id,
                                          250
                                        )
                                      }
                                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] font-semibold tabular-nums text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
                                    >
                                      +250 km City
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdateVehicleOdometer(
                                          vehSpec.id,
                                          1000
                                        )
                                      }
                                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] font-semibold tabular-nums text-slate-200 transition-colors hover:bg-white/10 whitespace-nowrap"
                                    >
                                      +1,000 km Highway
                                    </button>
                                  </div>

                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      if (!customOdometerInput) return;
                                      handleUpdateVehicleOdometer(
                                        vehSpec.id,
                                        undefined,
                                        Number(customOdometerInput)
                                      );
                                    }}
                                    className="flex items-center gap-1.5"
                                  >
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="Set exact km"
                                      value={customOdometerInput}
                                      onChange={(e) =>
                                        setCustomOdometerInput(e.target.value)
                                      }
                                      className="w-28 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-white placeholder:text-slate-500"
                                    />
                                    <button
                                      type="submit"
                                      className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-red-500 whitespace-nowrap"
                                    >
                                      Log Odometer
                                    </button>
                                  </form>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Collapsible Malen Service Appointment Booking Drawer */}
                          {showVehicleServiceModal && (
                            <form
                              onSubmit={handleScheduleVehicleService}
                              className="border-t border-white/10 bg-[#14171D] px-6 py-5 lg:px-10"
                            >
                              <div className="mb-3 flex items-center justify-between text-xs">
                                <span className="font-bold text-white">
                                  Malen Workshop Service Bay Reservation ·{" "}
                                  {vehSpec.registration_number}
                                </span>
                                <span className="text-slate-400">
                                  Creates a tracked work order in your vehicle
                                  maintenance ledger
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                                <input
                                  type="text"
                                  required
                                  placeholder="Service package (e.g., 20,000 km HV Coolant & Brake Pad Service)"
                                  value={vehicleServiceTitle}
                                  onChange={(e) =>
                                    setVehicleServiceTitle(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white placeholder:text-slate-400 sm:col-span-2"
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder="Workshop / Service Center"
                                  value={vehicleServiceVendor}
                                  onChange={(e) =>
                                    setVehicleServiceVendor(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 text-xs text-white"
                                />
                                <input
                                  type="number"
                                  required
                                  min="100"
                                  placeholder="Estimated Cost (₹)"
                                  value={vehicleServiceCostInr}
                                  onChange={(e) =>
                                    setVehicleServiceCostInr(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3.5 py-2 font-mono text-xs tabular-nums text-white"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-500 whitespace-nowrap"
                                >
                                  Confirm Bay Booking
                                </button>
                              </div>
                            </form>
                          )}
                        </div>

                        {/* Malen 4-Column Numbered Automotive Service Specialties */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {[
                            {
                              num: "01.",
                              title: "HV Battery & BMS Diagnostics",
                              desc: "Cell voltage balancing, liquid cooling loop pressure testing, and SOH state-of-health telemetry.",
                              meta: "40.5 kWh Pack · 8-Year Warranty",
                              presetTitle:
                                "High-Voltage EV Battery Cell Balancing & Thermal Loop Check",
                              presetCost: "2800",
                            },
                            {
                              num: "02.",
                              title: "Regenerative Brakes & Alignment",
                              desc: "3D laser 4-wheel alignment, caliper pin lubrication, DOT-4 brake fluid flush, and tire rotation.",
                              meta: "Every 10,000 km · Laser Calibrated",
                              presetTitle:
                                "3D Laser Wheel Alignment, Tire Rotation & Brake Caliper Service",
                              presetCost: "2250",
                            },
                            {
                              num: "03.",
                              title: "Cabin HEPA & AC Thermal Care",
                              desc: "Activated carbon PM2.5 cabin filter replacement, evaporator sanitization, and compressor check.",
                              meta: "Pre-Monsoon & Summer Cycle",
                              presetTitle:
                                "Cabin HEPA Filter Replacement & AC Evaporator Sanitization",
                              presetCost: "1650",
                            },
                            {
                              num: "04.",
                              title: "Zero-Dep Insurance & PUC Vault",
                              desc: "Comprehensive motor IDV tracking, battery water-ingress add-on protection, and RTO PUC compliance.",
                              meta: `PUC Valid to ${vehSpec.pollution_cert_expiry}`,
                              presetTitle:
                                "Annual Multi-Point Pre-Insurance Inspection & Diagnostics",
                              presetCost: "1200",
                            },
                          ].map((service) => (
                            <div
                              key={service.num}
                              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-red-300 hover:shadow-sm"
                            >
                              <div>
                                <div className="font-mono text-sm font-bold text-red-600">
                                  {service.num}
                                </div>
                                <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                                  {service.title}
                                </h3>
                                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                                  {service.desc}
                                </p>
                              </div>
                              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                                <span className="text-[11px] font-medium text-slate-500">
                                  {service.meta}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVehicleServiceTitle(service.presetTitle);
                                    setVehicleServiceCostInr(
                                      service.presetCost
                                    );
                                    setShowVehicleServiceModal(true);
                                  }}
                                  className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline whitespace-nowrap"
                                >
                                  Select Bay →
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Malen Multi-Point Subsystem Inspection & Fleet Ownership Bento */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                          {/* Card 1: EV Powertrain, Battery Telemetry & Total Cost of Ownership */}
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-6">
                            <div className="relative h-52 w-full overflow-hidden bg-slate-900">
                              <img
                                src="/src/assets/images/vehicle_ev_battery_diagnostics_1790706410952.jpg"
                                alt="EV High-Voltage Battery and Drivetrain Diagnostic Station"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                              <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between text-white">
                                <div>
                                  <div className="text-xs font-medium text-red-400">
                                    {primaryCar?.location_room ||
                                      "Basement Parking B-14"}{" "}
                                    · {primaryCar?.brand || "Tata Motors"}
                                  </div>
                                  <div className="text-base font-bold">
                                    EV Powertrain & Lifecycle TCO Breakdown
                                  </div>
                                </div>
                                <span className="font-mono text-xs font-semibold tabular-nums text-emerald-300">
                                  SOH 98.4%
                                </span>
                              </div>
                            </div>

                            <div className="space-y-4 p-5 text-xs">
                              <p className="text-slate-600">
                                {primaryCar?.notes ||
                                  "7.2kW AC fast charger installed at pillar B-14."}{" "}
                                Model:{" "}
                                <strong className="text-slate-900">
                                  {primaryCar?.model_number ||
                                    "Nexon.ev LR 40.5kWh"}
                                </strong>{" "}
                                · Serial/VIN:{" "}
                                <span className="font-mono text-slate-800">
                                  {vehSpec.vin}
                                </span>
                              </p>

                              <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3.5">
                                <div>
                                  <div className="text-[11px] text-slate-500">
                                    Ex-Showroom / Purchase
                                  </div>
                                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                                    {formatINR(
                                      primaryCar?.tco?.purchase_price_minor ||
                                        189500000
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-slate-500">
                                    Workshop Service Spend
                                  </div>
                                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-red-600">
                                    {formatINR(
                                      primaryCar?.tco?.maintenance_cost_minor ||
                                        415000
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[11px] text-slate-500">
                                    Total Lifecycle Cost
                                  </div>
                                  <div className="mt-0.5 font-mono font-bold tabular-nums text-slate-900">
                                    {formatINR(
                                      primaryCar?.tco?.total_tco_minor ||
                                        189915000
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                                <span>
                                  Purchased:{" "}
                                  {primaryCar?.purchase_date || "2025-01-20"} ·
                                  Service Cycle:{" "}
                                  <strong className="font-mono tabular-nums text-slate-800">
                                    {serviceIntervalKm.toLocaleString("en-IN")}{" "}
                                    km
                                  </strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveView("documents")}
                                  className="font-semibold text-red-600 hover:underline"
                                >
                                  Upload Service Invoice →
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Card 2: Brake, Alignment & Motor Insurance / PUC Compliance */}
                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white lg:col-span-6">
                            <div className="relative h-52 w-full overflow-hidden bg-slate-900">
                              <img
                                src="/src/assets/images/vehicle_brake_wheel_alignment_1790706425404.jpg"
                                alt="Precision Wheel Alignment and Regenerative Disc Brake Service"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                              <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between text-white">
                                <div>
                                  <div className="text-xs font-medium text-red-400">
                                    Chassis, Brakes & Regulatory Protection
                                  </div>
                                  <div className="text-base font-bold">
                                    Running Gear & Zero-Dep Insurance Coverage
                                  </div>
                                </div>
                                <span className="font-mono text-xs font-semibold tabular-nums text-white">
                                  {vehSpec.registration_number}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-4 p-5 text-xs">
                              {primaryPolicy ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <div className="font-bold text-slate-900">
                                        {primaryPolicy.insurer_name}
                                      </div>
                                      <div className="mt-0.5 text-[11px] text-slate-500">
                                        Policy #{primaryPolicy.policy_number} ·{" "}
                                        {primaryPolicy.policy_type} · Expires{" "}
                                        <strong className="text-slate-800">
                                          {primaryPolicy.expires_on}
                                        </strong>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                        {formatINR(
                                          primaryPolicy.coverage_limit_minor
                                        )}
                                      </div>
                                      <div className="text-[11px] text-emerald-700 font-semibold">
                                        IDV Insured · Active
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-slate-200 p-3.5 text-slate-500">
                                  No active motor insurance policy linked.
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                  <div className="text-[11px] text-slate-500">
                                    Annual Premium
                                  </div>
                                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                                    {formatINR(
                                      primaryPolicy?.annual_premium_minor ||
                                        3240000
                                    )}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                  <div className="text-[11px] text-slate-500">
                                    PUC / Compliance
                                  </div>
                                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-slate-900">
                                    {vehSpec.pollution_cert_expiry}
                                  </div>
                                </div>
                                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                  <div className="text-[11px] text-slate-500">
                                    Next Scheduled Bay
                                  </div>
                                  <div className="mt-0.5 font-mono font-semibold tabular-nums text-red-600">
                                    {vehSpec.next_service_due_on}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                                <span>
                                  Includes HV Battery & Motor Water-Ingress
                                  Zero-Dep Add-On
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveView("intelligence");
                                    runAgentQueryText(
                                      "What is our Tata Nexon EV odometer reading and when is the next service due?"
                                    );
                                  }}
                                  className="font-semibold text-slate-900 hover:underline"
                                >
                                  Verify Coverage with AI →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Malen Workshop Service Work Orders & History Ledger */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h2 className="text-base font-bold text-slate-900">
                                Malen Workshop Work Orders & Service Bay Ledger
                              </h2>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Track scheduled diagnostic appointments, labor
                                and parts costs, and completed service records.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "ALL", label: "All Records" },
                                  { id: "SCHEDULED", label: "Scheduled Bay" },
                                  { id: "COMPLETED", label: "Completed" },
                                ].map((tab) => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() =>
                                      setVehicleServiceFilter(tab.id)
                                    }
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                                      vehicleServiceFilter === tab.id
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => setShowVehicleServiceModal(true)}
                                className="rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-red-500 whitespace-nowrap"
                              >
                                + Book Service Bay
                              </button>
                            </div>
                          </div>

                          {vehicleMaintRecords.length === 0 ? (
                            <div className="mt-4 rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                              No vehicle work orders match the current filter.
                              Click "+ Book Service Bay" to schedule an
                              appointment.
                            </div>
                          ) : (
                            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                              {vehicleMaintRecords.map((m: any) => {
                                const isDone = m.status === "COMPLETED";
                                const totalCostMinor =
                                  Number(m.labor_cost_minor || 0) +
                                  Number(m.parts_cost_minor || 0);

                                return (
                                  <div
                                    key={m.id}
                                    className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs transition-colors hover:border-slate-300"
                                  >
                                    <div>
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="text-sm font-bold text-slate-900">
                                          {m.title}
                                        </span>
                                        <span
                                          className={`shrink-0 font-semibold ${
                                            isDone
                                              ? "text-emerald-700"
                                              : "text-red-600"
                                          }`}
                                        >
                                          {isDone
                                            ? "Completed"
                                            : "Scheduled Bay"}
                                        </span>
                                      </div>
                                      <p className="mt-1.5 leading-relaxed text-slate-600">
                                        {m.description}
                                      </p>
                                      <div className="mt-2 text-[11px] text-slate-500">
                                        Workshop: {m.technician_or_vendor} ·
                                        Priority: {m.priority || "HIGH"}
                                      </div>
                                    </div>

                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-3">
                                      <div className="text-[11px] text-slate-600">
                                        Date: {m.scheduled_for} · Total:{" "}
                                        <span className="font-mono font-bold tabular-nums text-slate-900">
                                          {formatINR(totalCostMinor)}
                                        </span>
                                      </div>
                                      {!isDone ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleCompleteMaintenance(m.id)
                                          }
                                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-500 whitespace-nowrap"
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                          Complete Service Order
                                        </button>
                                      ) : (
                                        <span className="text-[11px] font-medium text-slate-500">
                                          Next due:{" "}
                                          {m.next_recommended_service_on ||
                                            vehSpec.next_service_due_on}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* DRIBBBLE FINANCE ANALYTICS DASHBOARD FOR DOCUMENTS & WARRANTY TAB */}
              {selectedDomain === "documents_warranty" && (
                <div className="space-y-6">
                  {(() => {
                    const nowMs = new Date("2026-09-29T12:00:00Z").getTime();
                    const computeDaysUntil = (dateStr?: string) => {
                      if (!dateStr) return 999;
                      const targetMs = new Date(dateStr).getTime();
                      if (Number.isNaN(targetMs)) return 999;
                      return Math.ceil(
                        (targetMs - nowMs) / (1000 * 60 * 60 * 24)
                      );
                    };

                    const computeSpanProgressPct = (
                      startStr?: string,
                      endStr?: string
                    ) => {
                      if (!startStr || !endStr) return 45;
                      const s = new Date(startStr).getTime();
                      const e = new Date(endStr).getTime();
                      if (Number.isNaN(s) || Number.isNaN(e) || e <= s)
                        return 50;
                      const pct = Math.round(((nowMs - s) / (e - s)) * 100);
                      return Math.min(100, Math.max(6, pct));
                    };

                    const allWarranties = warrantiesData.items || [];
                    const allPolicies = warrantiesData.insurance_policies || [];
                    const allReminders = (
                      warrantiesData.reminders ||
                      billsData.reminders ||
                      []
                    ).filter(
                      (r: any) =>
                        !r.domain || r.domain === "documents_warranty"
                    );

                    // Total Protected Asset & Coverage Value
                    const totalInsuredIdvMinor = allPolicies.reduce(
                      (acc: number, p: any) =>
                        acc + Number(p.coverage_limit_minor || 0),
                      0
                    );
                    const coveredAssetIds = new Set(
                      allWarranties.map((w: any) => w.asset_id)
                    );
                    const totalWarrantyAssetValueMinor = assets
                      .filter((a) => coveredAssetIds.has(a.id))
                      .reduce(
                        (acc, a) => acc + Number(a.purchase_price_minor || 0),
                        0
                      );

                    // Purchase records & receipts total value from documents
                    const totalReceiptsValueMinor = documents.reduce(
                      (acc, d) =>
                        acc +
                        Number(
                          d.structured_extraction_json?.total_amount_minor || 0
                        ),
                      0
                    );

                    const verifiedDocsCount = documents.filter(
                      (d) => d.is_verified_by_human
                    ).length;
                    const pendingReviewDocsCount = Math.max(
                      0,
                      documents.length - verifiedDocsCount
                    );

                    const expiringCoverageCount =
                      allWarranties.filter(
                        (w: any) =>
                          w.status === "EXPIRING_SOON" ||
                          computeDaysUntil(w.end_date) <= 90
                      ).length +
                      allPolicies.filter(
                        (p: any) => computeDaysUntil(p.expires_on) <= 60
                      ).length;

                    const pendingRemindersCount = allReminders.filter(
                      (r: any) => r.status !== "COMPLETED"
                    ).length;

                    // Unified Coverage Portfolio (Warranties + Insurance Policies)
                    const unifiedCoverageRows = [
                      ...allWarranties.map((w: any) => {
                        const linkedAsset = assets.find(
                          (a) => a.id === w.asset_id
                        );
                        const daysLeft = computeDaysUntil(w.end_date);
                        const isExpiring =
                          w.status === "EXPIRING_SOON" ||
                          (daysLeft >= 0 && daysLeft <= 90);
                        const isExpired =
                          w.status === "EXPIRED" || daysLeft < 0;
                        return {
                          id: w.id,
                          kind: "WARRANTY",
                          assetName:
                            linkedAsset?.name || "Household Appliance",
                          assetLocation:
                            linkedAsset?.location_room || "Residence",
                          providerName: w.provider_name,
                          policyNumber: w.contract_or_policy_number,
                          coverageType: w.warranty_type || "MANUFACTURER",
                          startDate: w.start_date,
                          endDate: w.end_date,
                          daysLeft,
                          progressPct: computeSpanProgressPct(
                            w.start_date,
                            w.end_date
                          ),
                          protectedValueMinor: Number(
                            linkedAsset?.purchase_price_minor || 5490000
                          ),
                          termsSummary: w.coverage_terms,
                          contactPhone: w.claim_contact_phone,
                          statusKey: isExpired
                            ? "EXPIRED"
                            : isExpiring
                            ? "EXPIRING_SOON"
                            : "ACTIVE",
                        };
                      }),
                      ...allPolicies.map((p: any) => {
                        const linkedAsset = assets.find(
                          (a) => a.id === p.covered_asset_id
                        );
                        const daysLeft = computeDaysUntil(p.expires_on);
                        const isExpiring = daysLeft >= 0 && daysLeft <= 60;
                        return {
                          id: p.id,
                          kind: "INSURANCE",
                          assetName:
                            linkedAsset?.name || "Tata Nexon EV Empowered+ LR",
                          assetLocation:
                            linkedAsset?.location_room || "Basement B-14",
                          providerName: p.insurer_name,
                          policyNumber: p.policy_number,
                          coverageType: p.policy_type || "MOTOR_VEHICLE",
                          startDate: p.effective_from,
                          endDate: p.expires_on,
                          daysLeft,
                          progressPct: computeSpanProgressPct(
                            p.effective_from,
                            p.expires_on
                          ),
                          protectedValueMinor: Number(
                            p.coverage_limit_minor || 175000000
                          ),
                          termsSummary: `Comprehensive Zero-Dep IDV Coverage · Annual Premium ${formatINR(
                            p.annual_premium_minor
                          )} · Deductible ${formatINR(p.deductible_minor)}`,
                          contactPhone: "1800-2666",
                          statusKey:
                            daysLeft < 0
                              ? "EXPIRED"
                              : isExpiring
                              ? "EXPIRING_SOON"
                              : "ACTIVE",
                        };
                      }),
                    ]
                      .filter((row) => {
                        if (warrantyStatusFilter === "ACTIVE")
                          return row.statusKey === "ACTIVE";
                        if (warrantyStatusFilter === "EXPIRING_SOON")
                          return row.statusKey === "EXPIRING_SOON";
                        return true;
                      })
                      .filter((row) =>
                        matchesSearch(
                          row.assetName,
                          row.providerName,
                          row.policyNumber,
                          row.coverageType,
                          row.startDate,
                          row.endDate,
                          row.termsSummary
                        )
                      );

                    // Document Categories Allocation
                    const DOC_CATEGORY_SPECS = [
                      {
                        id: "WARRANTY_CERTIFICATE",
                        label: "Warranty Certificates",
                        barColor: "bg-indigo-600",
                        dotColor: "bg-indigo-600",
                      },
                      {
                        id: "PURCHASE_RECEIPT",
                        label: "Purchase Receipts",
                        barColor: "bg-emerald-600",
                        dotColor: "bg-emerald-600",
                      },
                      {
                        id: "INSURANCE_POLICY",
                        label: "Insurance Policies",
                        barColor: "bg-sky-500",
                        dotColor: "bg-sky-500",
                      },
                      {
                        id: "SERVICE_INVOICE",
                        label: "Service Invoices",
                        barColor: "bg-amber-500",
                        dotColor: "bg-amber-500",
                      },
                      {
                        id: "UTILITY_BILL",
                        label: "Utility Statements",
                        barColor: "bg-slate-600",
                        dotColor: "bg-slate-600",
                      },
                    ];

                    const categoryBreakdown = DOC_CATEGORY_SPECS.map((cat) => {
                      const matchingDocs = documents.filter(
                        (d) =>
                          d.document_type === cat.id ||
                          (cat.id === "WARRANTY_CERTIFICATE" &&
                            d.document_type === "WARRANTY_DOCUMENT") ||
                          (cat.id === "INSURANCE_POLICY" &&
                            d.document_type === "INSURANCE_DOCUMENT") ||
                          (cat.id === "PURCHASE_RECEIPT" &&
                            d.document_type === "RECEIPT") ||
                          (cat.id === "SERVICE_INVOICE" &&
                            d.document_type === "INVOICE")
                      );
                      const recordedMinor = matchingDocs.reduce(
                        (acc, d) =>
                          acc +
                          Number(
                            d.structured_extraction_json?.total_amount_minor ||
                              d.structured_extraction_json?.idv_minor ||
                              0
                          ),
                        0
                      );
                      return {
                        ...cat,
                        count: matchingDocs.length,
                        sharePct: Math.max(
                          8,
                          Math.round(
                            (matchingDocs.length /
                              Math.max(1, documents.length)) *
                              100
                          )
                        ),
                        recordedMinor,
                      };
                    });

                    const filteredVaultDocs = documents
                      .filter((doc) => {
                        if (docVaultCategoryFilter !== "ALL") {
                          const t = doc.document_type;
                          if (docVaultCategoryFilter === "WARRANTY_CERTIFICATE")
                            return (
                              t === "WARRANTY_CERTIFICATE" ||
                              t === "WARRANTY_DOCUMENT"
                            );
                          if (docVaultCategoryFilter === "PURCHASE_RECEIPT")
                            return t === "PURCHASE_RECEIPT" || t === "RECEIPT";
                          if (docVaultCategoryFilter === "INSURANCE_POLICY")
                            return (
                              t === "INSURANCE_POLICY" ||
                              t === "INSURANCE_DOCUMENT"
                            );
                          if (docVaultCategoryFilter === "SERVICE_INVOICE")
                            return t === "SERVICE_INVOICE" || t === "INVOICE";
                          return t === docVaultCategoryFilter;
                        }
                        return true;
                      })
                      .filter((doc) => {
                        if (docVaultStatusFilter === "VERIFIED")
                          return Boolean(doc.is_verified_by_human);
                        if (docVaultStatusFilter === "PENDING_REVIEW")
                          return !doc.is_verified_by_human;
                        return true;
                      })
                      .filter((doc) =>
                        matchesSearch(
                          doc.title,
                          doc.document_type,
                          doc.document_date,
                          doc.extracted_text_summary,
                          doc.structured_extraction_json?.vendor_name,
                          doc.structured_extraction_json?.insurer_name,
                          doc.structured_extraction_json?.invoice_number,
                          doc.structured_extraction_json?.policy_number
                        )
                      );

                    const inspectedDoc =
                      filteredVaultDocs.find(
                        (d) => d.id === selectedInspectedDocId
                      ) ||
                      filteredVaultDocs[0] ||
                      null;

                    return (
                      <>
                        {/* Executive Finance-Analytics Header Bar */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                            <div>
                              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                                <FolderKanban className="h-4 w-4" />
                                <span>
                                  Documents & Warranty Analytics · RAG Knowledge
                                  Vault
                                </span>
                              </div>
                              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                Household Coverage, Purchase Receipts & Expiry
                                Ledger
                              </h1>
                              <p className="mt-1 max-w-2xl text-xs text-slate-500">
                                Track product and service warranties, start and
                                expiry horizons, verified purchase invoices,
                                category allocations, and automated renewal
                                reminders.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowRegisterWarrantyModal((prev) => !prev)
                                }
                                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 whitespace-nowrap"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {showRegisterWarrantyModal
                                  ? "Close Form"
                                  : "Register Warranty"}
                              </button>

                              <button
                                type="button"
                                onClick={() => setActiveView("documents")}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 whitespace-nowrap"
                              >
                                <Upload className="h-3.5 w-3.5 text-indigo-600" />
                                Ingest Document PDF
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveView("intelligence");
                                  runAgentQueryText(
                                    "Is our Bosch dishwasher covered under warranty, when does coverage expire, and what purchase receipts are on file?"
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-2.5 text-xs font-semibold text-indigo-950 transition-colors hover:bg-indigo-100/80 whitespace-nowrap"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                                Ask Warranty RAG
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Register New Product/Service Warranty Drawer */}
                          {showRegisterWarrantyModal && (
                            <form
                              onSubmit={handleRegisterWarranty}
                              className="mt-5 border-t border-slate-100 pt-5"
                            >
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-bold text-slate-900">
                                  Register Product or Extended Service Warranty
                                </span>
                                <span className="text-slate-500">
                                  Automatically schedules an expiry reminder and
                                  publishes a domain event
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                                <select
                                  value={newWarrantyAssetId}
                                  onChange={(e) =>
                                    setNewWarrantyAssetId(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                                >
                                  {assets.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  required
                                  placeholder="Provider / OEM Name"
                                  value={newWarrantyProvider}
                                  onChange={(e) =>
                                    setNewWarrantyProvider(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                                />
                                <input
                                  type="text"
                                  required
                                  placeholder="Policy / Contract #"
                                  value={newWarrantyPolicyNum}
                                  onChange={(e) =>
                                    setNewWarrantyPolicyNum(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900"
                                />
                                <input
                                  type="date"
                                  required
                                  value={newWarrantyStartDate}
                                  onChange={(e) =>
                                    setNewWarrantyStartDate(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs tabular-nums text-slate-900"
                                />
                                <input
                                  type="date"
                                  required
                                  value={newWarrantyEndDate}
                                  onChange={(e) =>
                                    setNewWarrantyEndDate(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs tabular-nums text-slate-900"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 whitespace-nowrap"
                                >
                                  Save Coverage
                                </button>
                              </div>
                              <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-6">
                                <select
                                  value={newWarrantyType}
                                  onChange={(e) =>
                                    setNewWarrantyType(e.target.value)
                                  }
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
                                >
                                  <option value="MANUFACTURER">
                                    Manufacturer Warranty
                                  </option>
                                  <option value="EXTENDED">
                                    Extended Protection Plan
                                  </option>
                                  <option value="AMC_SERVICE">
                                    Annual Maintenance Contract (AMC)
                                  </option>
                                </select>
                                <input
                                  type="text"
                                  value={newWarrantyTerms}
                                  onChange={(e) =>
                                    setNewWarrantyTerms(e.target.value)
                                  }
                                  placeholder="Coverage terms (e.g., Comprehensive parts, motor, and labor)"
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 sm:col-span-5"
                                />
                              </div>
                            </form>
                          )}
                        </div>

                        {/* Row 1: Dribbble Finance Analytics 4-Column KPI Strip */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          {/* KPI 1: Protected Asset & Policy Value */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Protected Coverage Value</span>
                              <ShieldCheck className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {formatINR(
                                totalWarrantyAssetValueMinor +
                                  totalInsuredIdvMinor
                              )}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>
                                Warranties:{" "}
                                <strong className="font-mono tabular-nums text-slate-800">
                                  {formatINR(totalWarrantyAssetValueMinor)}
                                </strong>
                              </span>
                              <span>
                                IDV:{" "}
                                <strong className="font-mono tabular-nums text-indigo-700">
                                  {formatINR(totalInsuredIdvMinor)}
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* KPI 2: Active & Expiring Warranties */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Warranties & Policies</span>
                              <FileCheck2 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {allWarranties.length + allPolicies.length} Active
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                              <span className="font-semibold text-amber-700">
                                {expiringCoverageCount} Expiring &lt; 90d
                              </span>
                              <span className="font-mono tabular-nums text-slate-500">
                                Next: 2026-10-18
                              </span>
                            </div>
                          </div>

                          {/* KPI 3: Purchase Records & Receipts Vault */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Purchase Receipts & Bills</span>
                              <Receipt className="h-4 w-4 text-slate-700" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {formatINR(totalReceiptsValueMinor)}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span className="text-emerald-700 font-semibold">
                                {verifiedDocsCount} Verified PDF(s)
                              </span>
                              <span>
                                {pendingReviewDocsCount > 0
                                  ? `${pendingReviewDocsCount} Needs Review`
                                  : "100% Audited"}
                              </span>
                            </div>
                          </div>

                          {/* KPI 4: Renewal & Expiry Reminders */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Renewal & Expiry Alerts</span>
                              <Bell className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {pendingRemindersCount} Pending
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>
                                {allReminders.length} total scheduled
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddReminderModal((prev) => !prev)
                                }
                                className="font-semibold text-indigo-600 hover:underline"
                              >
                                + Add Alert
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Row 2: 12-Column Financial Analytics Split (Coverage Horizon Timeline + Category Allocation & Reminders) */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                          {/* Left 7 Columns: Product/Service Warranties & Coverage Horizon Timeline */}
                          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <h2 className="text-base font-bold text-slate-900">
                                    Product & Service Warranties Horizon
                                  </h2>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Start and expiry dates, elapsed coverage
                                    timelines, and protected asset values.
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                                  {[
                                    { id: "ALL", label: "All Coverage" },
                                    { id: "ACTIVE", label: "Active" },
                                    {
                                      id: "EXPIRING_SOON",
                                      label: "Expiring Soon",
                                    },
                                  ].map((tab) => (
                                    <button
                                      key={tab.id}
                                      type="button"
                                      onClick={() =>
                                        setWarrantyStatusFilter(tab.id)
                                      }
                                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                                        warrantyStatusFilter === tab.id
                                          ? "bg-white text-slate-900 shadow-xs"
                                          : "text-slate-600 hover:text-slate-900"
                                      }`}
                                    >
                                      {tab.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="mt-5 space-y-4">
                                {unifiedCoverageRows.map((row) => {
                                  const isExpiring =
                                    row.statusKey === "EXPIRING_SOON";
                                  const isExpired = row.statusKey === "EXPIRED";
                                  return (
                                    <div
                                      key={row.id}
                                      className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 text-xs transition-colors hover:border-slate-300"
                                    >
                                      {/* Row Top: Asset & Status */}
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900">
                                              {row.assetName}
                                            </span>
                                            <span className="font-mono text-[11px] text-slate-500">
                                              #{row.policyNumber}
                                            </span>
                                          </div>
                                          <div className="mt-0.5 text-[11px] text-slate-500">
                                            {row.providerName} ·{" "}
                                            {row.coverageType} ·{" "}
                                            {row.assetLocation}
                                          </div>
                                        </div>

                                        <div className="text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <span
                                              className={`h-2 w-2 rounded-full ${
                                                isExpired
                                                  ? "bg-rose-600"
                                                  : isExpiring
                                                  ? "bg-amber-500"
                                                  : "bg-emerald-600"
                                              }`}
                                            />
                                            <span
                                              className={`font-semibold ${
                                                isExpired
                                                  ? "text-rose-700"
                                                  : isExpiring
                                                  ? "text-amber-700"
                                                  : "text-emerald-700"
                                              }`}
                                            >
                                              {isExpired
                                                ? "Expired"
                                                : isExpiring
                                                ? `Expiring in ${row.daysLeft}d`
                                                : `Active (${row.daysLeft}d left)`}
                                            </span>
                                          </div>
                                          <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-slate-900">
                                            {formatINR(row.protectedValueMinor)}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Row Middle: Start & Expiry Dates + Progress Bar */}
                                      <div className="mt-3">
                                        <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-slate-500">
                                          <span>Start: {row.startDate}</span>
                                          <span>
                                            {row.progressPct}% term elapsed
                                          </span>
                                          <span className="font-semibold text-slate-800">
                                            Expires: {row.endDate}
                                          </span>
                                        </div>
                                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                                          <div
                                            className={`h-full rounded-full transition-all ${
                                              isExpired
                                                ? "bg-rose-600"
                                                : isExpiring
                                                ? "bg-amber-500"
                                                : "bg-indigo-600"
                                            }`}
                                            style={{
                                              width: `${row.progressPct}%`,
                                            }}
                                          />
                                        </div>
                                      </div>

                                      {/* Row Bottom: Coverage Terms & Quick RAG Query */}
                                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-2.5 text-[11px] text-slate-600">
                                        <span className="max-w-lg truncate">
                                          {row.termsSummary}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveView("intelligence");
                                            runAgentQueryText(
                                              `Is ${row.assetName} covered under warranty/policy #${row.policyNumber} and when does coverage expire?`
                                            );
                                          }}
                                          className="font-semibold text-indigo-600 hover:underline whitespace-nowrap"
                                        >
                                          Verify Terms →
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Right 5 Columns: Document Categories Allocation + Renewal/Expiry Reminders */}
                          <div className="space-y-6 lg:col-span-5">
                            {/* Analytics Card: Document Categories Breakdown */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className="text-base font-bold text-slate-900">
                                    Document Categories & Vault Share
                                  </h2>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Click any category to filter the structured
                                    document ledger below.
                                  </p>
                                </div>
                                {docVaultCategoryFilter !== "ALL" && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDocVaultCategoryFilter("ALL")
                                    }
                                    className="text-xs font-semibold text-indigo-600 hover:underline"
                                  >
                                    Reset Filter
                                  </button>
                                )}
                              </div>

                              {/* Stacked Horizontal Category Distribution Bar */}
                              <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 gap-0.5">
                                {categoryBreakdown.map((cat) => (
                                  <div
                                    key={cat.id}
                                    className={`h-full first:rounded-l-full last:rounded-r-full ${cat.barColor}`}
                                    style={{ width: `${cat.sharePct}%` }}
                                    title={`${cat.label}: ${cat.count} document(s)`}
                                  />
                                ))}
                              </div>

                              {/* Category Rows */}
                              <div className="mt-4 divide-y divide-slate-100 text-xs">
                                {categoryBreakdown.map((cat) => {
                                  const isSelected =
                                    docVaultCategoryFilter === cat.id;
                                  return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() =>
                                        setDocVaultCategoryFilter(
                                          isSelected ? "ALL" : cat.id
                                        )
                                      }
                                      className={`flex w-full items-center justify-between py-2.5 text-left transition-colors ${
                                        isSelected
                                          ? "bg-indigo-50/60 font-semibold text-indigo-950 px-2 rounded-lg"
                                          : "hover:bg-slate-50"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span
                                          className={`h-2.5 w-2.5 rounded-full ${cat.dotColor}`}
                                        />
                                        <span className="font-medium text-slate-900">
                                          {cat.label}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 font-mono tabular-nums">
                                        <span className="text-slate-500">
                                          {cat.count} file
                                          {cat.count === 1 ? "" : "s"}
                                        </span>
                                        <span className="w-24 text-right font-semibold text-slate-900">
                                          {cat.recordedMinor > 0
                                            ? formatINR(cat.recordedMinor)
                                            : "—"}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Analytics Card: Important Renewal & Expiry Reminders */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className="text-base font-bold text-slate-900">
                                    Renewal & Expiry Reminders
                                  </h2>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Proactive deadline alerts for expiring
                                    warranties and policies.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAddReminderModal((prev) => !prev)
                                  }
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                                >
                                  {showAddReminderModal
                                    ? "Close"
                                    : "+ New Reminder"}
                                </button>
                              </div>

                              {showAddReminderModal && (
                                <form
                                  onSubmit={handleAddWarrantyReminder}
                                  className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs"
                                >
                                  <input
                                    type="text"
                                    required
                                    placeholder="Reminder title (e.g., Renew Bosch AMC Plan)"
                                    value={newReminderTitle}
                                    onChange={(e) =>
                                      setNewReminderTitle(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                                  />
                                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    <input
                                      type="date"
                                      required
                                      value={newReminderDueDate}
                                      onChange={(e) =>
                                        setNewReminderDueDate(e.target.value)
                                      }
                                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs tabular-nums"
                                    />
                                    <button
                                      type="submit"
                                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                                    >
                                      Schedule Reminder
                                    </button>
                                  </div>
                                </form>
                              )}

                              <div className="mt-4 space-y-2.5">
                                {allReminders.map((rem: any) => {
                                  const isDone = rem.status === "COMPLETED";
                                  const dueDateShort = String(
                                    rem.due_at || ""
                                  ).slice(0, 10);
                                  const daysUntilDue =
                                    computeDaysUntil(dueDateShort);
                                  return (
                                    <div
                                      key={rem.id}
                                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs"
                                    >
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`h-2 w-2 rounded-full ${
                                              isDone
                                                ? "bg-emerald-600"
                                                : daysUntilDue <= 14
                                                ? "bg-rose-600"
                                                : "bg-amber-500"
                                            }`}
                                          />
                                          <span
                                            className={`font-bold ${
                                              isDone
                                                ? "line-through text-slate-400"
                                                : "text-slate-900"
                                            }`}
                                          >
                                            {rem.title}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                                          {rem.description}
                                        </p>
                                        <div className="mt-1.5 font-mono text-[11px] tabular-nums text-slate-500">
                                          Due: {dueDateShort} ·{" "}
                                          {isDone
                                            ? "Completed"
                                            : `${daysUntilDue} days remaining`}
                                        </div>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleReminderStatus(rem.id)
                                        }
                                        className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                                          isDone
                                            ? "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                                            : "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                                        }`}
                                      >
                                        {isDone ? "Reopen" : "Complete"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Structured Household Documents, Purchase Records & Receipts Ledger */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center">
                            <div>
                              <h2 className="text-base font-bold text-slate-900">
                                Household Documents, Purchase Records & Receipts
                                Ledger
                              </h2>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Search, filter by document category or audit
                                status, inspect OCR extraction fields, and
                                verify purchase records.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Category Select Filter */}
                              <select
                                value={docVaultCategoryFilter}
                                onChange={(e) =>
                                  setDocVaultCategoryFilter(e.target.value)
                                }
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800"
                              >
                                <option value="ALL">
                                  All Categories ({documents.length})
                                </option>
                                <option value="WARRANTY_CERTIFICATE">
                                  Warranty Certificates
                                </option>
                                <option value="PURCHASE_RECEIPT">
                                  Purchase Receipts
                                </option>
                                <option value="INSURANCE_POLICY">
                                  Insurance Policies
                                </option>
                                <option value="SERVICE_INVOICE">
                                  Service Invoices
                                </option>
                                <option value="UTILITY_BILL">
                                  Utility Statements
                                </option>
                              </select>

                              {/* Status Segmented Filter */}
                              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "ALL", label: "All Status" },
                                  { id: "VERIFIED", label: "Verified" },
                                  {
                                    id: "PENDING_REVIEW",
                                    label: "Needs Review",
                                  },
                                ].map((st) => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() =>
                                      setDocVaultStatusFilter(st.id)
                                    }
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                                      docVaultStatusFilter === st.id
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12">
                            {/* Structured Financial-Style Document Table (8 Cols) */}
                            <div className="overflow-x-auto lg:col-span-8">
                              {filteredVaultDocs.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                                  No documents match the current category or
                                  search filter.
                                </div>
                              ) : (
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500">
                                      <th className="pb-2.5 font-semibold">
                                        Document & Vendor / Merchant
                                      </th>
                                      <th className="pb-2.5 font-semibold">
                                        Category
                                      </th>
                                      <th className="pb-2.5 font-semibold">
                                        Record Date
                                      </th>
                                      <th className="pb-2.5 text-right font-semibold">
                                        Receipt / Policy Value
                                      </th>
                                      <th className="pb-2.5 pl-4 font-semibold">
                                        Status & Audit
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {filteredVaultDocs.map((doc) => {
                                      const linkedAsset = assets.find(
                                        (a) => a.id === doc.asset_id
                                      );
                                      const ext =
                                        doc.structured_extraction_json || {};
                                      const vendorOrInsurer =
                                        ext.vendor_name ||
                                        ext.insurer_name ||
                                        linkedAsset?.brand ||
                                        "Household Record";
                                      const refNum =
                                        ext.invoice_number ||
                                        ext.policy_number ||
                                        ext.contract_number ||
                                        doc.sha256_checksum?.slice(0, 8);
                                      const valueMinor = Number(
                                        ext.total_amount_minor ||
                                          ext.amount_due_minor ||
                                          ext.idv_minor ||
                                          0
                                      );
                                      const isSelected =
                                        inspectedDoc?.id === doc.id;

                                      return (
                                        <tr
                                          key={doc.id}
                                          onClick={() =>
                                            setSelectedInspectedDocId(doc.id)
                                          }
                                          className={`cursor-pointer transition-colors ${
                                            isSelected
                                              ? "bg-indigo-50/50"
                                              : "hover:bg-slate-50/80"
                                          }`}
                                        >
                                          <td className="py-3.5 pr-4">
                                            <div className="font-semibold text-slate-900">
                                              {doc.title}
                                            </div>
                                            <div className="mt-0.5 text-[11px] text-slate-500">
                                              {vendorOrInsurer} · Ref #{refNum}
                                              {linkedAsset
                                                ? ` · ${linkedAsset.name}`
                                                : ""}
                                            </div>
                                          </td>
                                          <td className="py-3.5 pr-4 font-mono text-[11px] text-slate-600">
                                            {doc.document_type.replace(
                                              /_/g,
                                              " "
                                            )}
                                          </td>
                                          <td className="py-3.5 pr-4 font-mono tabular-nums text-slate-700">
                                            {doc.document_date}
                                          </td>
                                          <td className="py-3.5 pr-4 text-right font-mono font-bold tabular-nums text-slate-900">
                                            {valueMinor > 0
                                              ? formatINR(valueMinor)
                                              : "—"}
                                          </td>
                                          <td
                                            className="py-3.5 pl-4"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <span
                                                className={`inline-flex items-center gap-1.5 font-semibold ${
                                                  doc.is_verified_by_human
                                                    ? "text-emerald-700"
                                                    : "text-amber-700"
                                                }`}
                                              >
                                                <span
                                                  className={`h-1.5 w-1.5 rounded-full ${
                                                    doc.is_verified_by_human
                                                      ? "bg-emerald-600"
                                                      : "bg-amber-500"
                                                  }`}
                                                />
                                                {doc.is_verified_by_human
                                                  ? "Verified"
                                                  : "Needs Review"}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  handleToggleDocumentVerified(
                                                    doc.id
                                                  )
                                                }
                                                className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                                              >
                                                {doc.is_verified_by_human
                                                  ? "Flag"
                                                  : "Verify"}
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>

                            {/* Structured Document & Extraction Inspector Panel (4 Cols) */}
                            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs lg:col-span-4">
                              {inspectedDoc ? (
                                <div className="space-y-3.5">
                                  <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-3">
                                    <div>
                                      <div className="text-[11px] font-semibold text-indigo-600">
                                        RAG Document Inspector
                                      </div>
                                      <h3 className="mt-0.5 text-sm font-bold text-slate-900">
                                        {inspectedDoc.title}
                                      </h3>
                                    </div>
                                    <span className="font-mono text-[11px] tabular-nums text-slate-500">
                                      {(
                                        Number(
                                          inspectedDoc.file_size_bytes || 240000
                                        ) / 1024
                                      ).toFixed(0)}{" "}
                                      KB
                                    </span>
                                  </div>

                                  <div>
                                    <div className="text-[11px] font-semibold text-slate-500">
                                      Extracted Knowledge Summary
                                    </div>
                                    <p className="mt-1 leading-relaxed text-slate-700">
                                      {inspectedDoc.extracted_text_summary}
                                    </p>
                                  </div>

                                  {inspectedDoc.structured_extraction_json && (
                                    <div>
                                      <div className="text-[11px] font-semibold text-slate-500">
                                        Structured Purchase / Warranty Fields
                                      </div>
                                      <div className="mt-1.5 divide-y divide-slate-200/70 rounded-lg border border-slate-200 bg-white px-3 py-1">
                                        {Object.entries(
                                          inspectedDoc.structured_extraction_json
                                        ).map(([k, v]) => (
                                          <div
                                            key={k}
                                            className="flex items-center justify-between py-1.5 text-[11px]"
                                          >
                                            <span className="text-slate-500">
                                              {k.replace(/_/g, " ")}
                                            </span>
                                            <span className="font-mono font-semibold tabular-nums text-slate-900">
                                              {k.endsWith("_minor")
                                                ? formatINR(Number(v))
                                                : String(v)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                                    <span className="font-mono text-[10px] text-slate-400">
                                      SHA256:{" "}
                                      {String(
                                        inspectedDoc.sha256_checksum || ""
                                      ).slice(0, 16)}
                                      …
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveView("intelligence");
                                        runAgentQueryText(
                                          `Summarize the key warranty terms, purchase amount, and expiry dates in "${inspectedDoc.title}".`
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800"
                                    >
                                      <Sparkles className="h-3 w-3 text-amber-400" />
                                      Query in RAG
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-8 text-center text-slate-500">
                                  Select a document row to inspect extracted
                                  fields and warranty metadata.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* POWERPEAK SMARTWATCH FITNESS APP UI FOR PARENTS' HEALTH MONITORING AGENT TAB */}
              {selectedDomain === "parents_health" && (
                <div className="space-y-6">
                  {(() => {
                    const allHealthRecords = parentsHealthData.items || [];
                    const allHealthReminders = (
                      parentsHealthData.reminders || []
                    ).filter((r: any) =>
                      matchesSearch(r.title, r.description, r.due_date, r.status)
                    );
                    const allHealthDocs =
                      parentsHealthData.documents &&
                      parentsHealthData.documents.length > 0
                        ? parentsHealthData.documents
                        : documents.filter(
                            (d) =>
                              d.document_type === "MEDICAL_LAB_REPORT" ||
                              String(d.title || "")
                                .toLowerCase()
                                .includes("lab") ||
                              String(d.title || "")
                                .toLowerCase()
                                .includes("health")
                          );

                    const filteredHealthRecords = allHealthRecords
                      .filter((rec: any) => {
                        if (parentHealthMemberFilter === "MOTHER") {
                          return String(rec.parent_name || "")
                            .toLowerCase()
                            .includes("sunita");
                        }
                        if (parentHealthMemberFilter === "FATHER") {
                          return String(rec.parent_name || "")
                            .toLowerCase()
                            .includes("prakash");
                        }
                        return true;
                      })
                      .filter((rec: any) => {
                        if (parentHealthCategoryFilter === "ALL") return true;
                        return (
                          rec.record_category === parentHealthCategoryFilter
                        );
                      })
                      .filter((rec: any) => {
                        if (parentHealthStatusFilter === "ALL") return true;
                        if (parentHealthStatusFilter === "UPCOMING") {
                          return (
                            rec.status === "SCHEDULED" ||
                            rec.status === "DUE_SOON"
                          );
                        }
                        if (parentHealthStatusFilter === "ACTIVE_RECORDED") {
                          return (
                            rec.status === "ACTIVE" || rec.status === "RECORDED"
                          );
                        }
                        return rec.status === parentHealthStatusFilter;
                      })
                      .filter((rec: any) =>
                        matchesSearch(
                          rec.parent_name,
                          rec.record_category,
                          rec.title,
                          rec.provider_or_doctor,
                          rec.recorded_date,
                          rec.next_due_or_followup_date,
                          rec.schedule_or_frequency,
                          rec.explicit_measurement_value,
                          rec.status,
                          rec.notes
                        )
                      );

                    const periodicCheckupsCount = allHealthRecords.filter(
                      (r: any) => r.record_category === "PERIODIC_CHECKUP"
                    ).length;
                    const doctorVisitsCount = allHealthRecords.filter(
                      (r: any) => r.record_category === "DOCTOR_APPOINTMENT"
                    ).length;
                    const labReportsCount = allHealthRecords.filter(
                      (r: any) => r.record_category === "LAB_TEST_REPORT"
                    ).length;
                    const medicationSchedules = allHealthRecords.filter(
                      (r: any) => r.record_category === "MEDICATION_SCHEDULE"
                    );
                    const vaccinationRecordsCount = allHealthRecords.filter(
                      (r: any) => r.record_category === "VACCINATION_SCREENING"
                    ).length;
                    const measurementRecords = allHealthRecords.filter(
                      (r: any) => r.record_category === "HEALTH_MEASUREMENT"
                    );
                    const pendingHealthRemindersCount =
                      allHealthReminders.filter(
                        (r: any) => r.status !== "COMPLETED"
                      ).length;

                    const featuredMeasurement =
                      measurementRecords.find((r: any) =>
                        parentHealthMemberFilter === "FATHER"
                          ? String(r.parent_name || "")
                              .toLowerCase()
                              .includes("prakash")
                          : String(r.parent_name || "")
                              .toLowerCase()
                              .includes("sunita")
                      ) ||
                      measurementRecords[0] ||
                      allHealthRecords[0];

                    const HEALTH_CATEGORY_META: Record<
                      string,
                      { label: string; accent: string; badgeBg: string }
                    > = {
                      PERIODIC_CHECKUP: {
                        label: "Monthly / Periodic Checkup",
                        accent: "text-lime-400",
                        badgeBg:
                          "bg-lime-400/15 text-lime-300 border-lime-400/30",
                      },
                      DOCTOR_APPOINTMENT: {
                        label: "Doctor Appointment & Visit",
                        accent: "text-cyan-400",
                        badgeBg:
                          "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
                      },
                      LAB_TEST_REPORT: {
                        label: "Lab-Test & Medical Report",
                        accent: "text-emerald-400",
                        badgeBg:
                          "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
                      },
                      MEDICATION_SCHEDULE: {
                        label: "Medication Schedule",
                        accent: "text-amber-400",
                        badgeBg:
                          "bg-amber-400/15 text-amber-300 border-amber-400/30",
                      },
                      VACCINATION_SCREENING: {
                        label: "Vaccination & Screening",
                        accent: "text-purple-400",
                        badgeBg:
                          "bg-purple-400/15 text-purple-300 border-purple-400/30",
                      },
                      HEALTH_MEASUREMENT: {
                        label: "Explicit Health Measurement",
                        accent: "text-rose-400",
                        badgeBg:
                          "bg-rose-400/15 text-rose-300 border-rose-400/30",
                      },
                    };

                    const SMARTWATCH_TIMELINE_DAYS = [
                      {
                        date: "2026-10-05",
                        dayLabel: "05 OCT",
                        eventTitle: "Mother · Comprehensive Checkup & ECG",
                        sub: "Deenanath Mangeshkar Hospital · Dr. A. Deshmukh",
                        ringPct: 92,
                      },
                      {
                        date: "2026-10-12",
                        dayLabel: "12 OCT",
                        eventTitle: "Father · Orthopedic & Lipid Follow-Up",
                        sub: "Sahyadri Super Speciality · Dr. R. Kulkarni",
                        ringPct: 86,
                      },
                      {
                        date: "2026-10-15",
                        dayLabel: "15 OCT",
                        eventTitle: "Both Parents · 30-Day Medication Refill",
                        sub: "Telmisartan 40mg, Metformin SR & D3",
                        ringPct: 96,
                      },
                      {
                        date: "2026-11-10",
                        dayLabel: "10 NOV",
                        eventTitle: "Annual Retinal & Bone DEXA Screening",
                        sub: "Vaccination & Preventive Screening Log",
                        ringPct: 78,
                      },
                    ];

                    const activeWatchSlot =
                      SMARTWATCH_TIMELINE_DAYS.find(
                        (d) => d.date === activeSmartwatchDay
                      ) || SMARTWATCH_TIMELINE_DAYS[0];

                    return (
                      <>
                        {/* PowerPeak Smartwatch Fitness App Hero Console (Obsidian Carbon + Electric Lime + Vital Coral) */}
                        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0B0F14] text-slate-100 shadow-2xl">
                          {/* Ambient Smartwatch Neon Glows */}
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -top-28 -right-24 h-96 w-96 rounded-full bg-[#D4FF33]/10 blur-3xl"
                          />
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-28 left-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl"
                          />

                          {/* Top Bar: PowerPeak Brand Header + Parent Selector + Strict Non-Diagnostic Guardrail Badge */}
                          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-8">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#D4FF33] text-slate-950 shadow-md">
                                <Activity className="h-5 w-5 stroke-[2.5]" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold tracking-wider text-[#D4FF33] uppercase">
                                    PowerPeak · Parents' Health Monitoring Agent
                                  </span>
                                  <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                                    RECORD & REMINDER LOG ONLY
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  Strict monitoring & record management for
                                  monthly checkups, doctor visits, lab reports,
                                  medications, vaccinations, and recorded
                                  measurements (no diagnosis or treatment
                                  decisions).
                                </p>
                              </div>
                            </div>

                            {/* Parent Member Switcher */}
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-[#131922] p-1">
                                {[
                                  { id: "ALL", label: "Both Parents (6)" },
                                  {
                                    id: "MOTHER",
                                    label: "Mother · Sunita Tare",
                                  },
                                  {
                                    id: "FATHER",
                                    label: "Father · Prakash Tare",
                                  },
                                ].map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() =>
                                      setParentHealthMemberFilter(m.id)
                                    }
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                                      parentHealthMemberFilter === m.id
                                        ? "bg-[#D4FF33] text-slate-950 shadow-xs"
                                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddHealthRecordModal((prev) => !prev)
                                }
                                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#D4FF33] px-4 py-2 text-xs font-bold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-lime-300 whitespace-nowrap"
                              >
                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                {showAddHealthRecordModal
                                  ? "Close Form"
                                  : "Log Health Record"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveView("intelligence");
                                  runAgentQueryText(
                                    "Check our parents' monthly checkups, doctor appointments, lab-test records, medication schedules, vaccination records, recorded health measurements, and health reminders."
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 rounded-2xl border border-[#D4FF33]/40 bg-[#D4FF33]/10 px-4 py-2 text-xs font-semibold text-[#D4FF33] transition-colors hover:bg-[#D4FF33]/20 whitespace-nowrap"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Ask Health Agent
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Log New Health Record Drawer */}
                          {showAddHealthRecordModal && (
                            <form
                              onSubmit={handleCreateParentHealthRecord}
                              className="relative z-10 border-b border-white/10 bg-[#131922]/90 px-6 py-5 backdrop-blur lg:px-8"
                            >
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-bold text-[#D4FF33]">
                                  Record Parent Checkup, Appointment, Lab Test,
                                  Medication, Vaccination, or Health Measurement
                                </span>
                                <span className="text-slate-400">
                                  Persists to parent_health_records table &
                                  auto-schedules follow-up reminder
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <select
                                  value={healthParentName}
                                  onChange={(e) =>
                                    setHealthParentName(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white"
                                >
                                  <option value="Smt. Sunita Tare (Mother)">
                                    Smt. Sunita Tare (Mother)
                                  </option>
                                  <option value="Shri. Prakash Tare (Father)">
                                    Shri. Prakash Tare (Father)
                                  </option>
                                  <option value="Smt. Sunita Tare & Shri. Prakash Tare">
                                    Both Parents (Joint Checkup)
                                  </option>
                                </select>

                                <select
                                  value={healthCategory}
                                  onChange={(e) =>
                                    setHealthCategory(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white"
                                >
                                  <option value="PERIODIC_CHECKUP">
                                    Monthly / Periodic Checkup
                                  </option>
                                  <option value="DOCTOR_APPOINTMENT">
                                    Doctor Appointment & Visit
                                  </option>
                                  <option value="LAB_TEST_REPORT">
                                    Lab-Test Record / Medical Report
                                  </option>
                                  <option value="MEDICATION_SCHEDULE">
                                    Medication Schedule
                                  </option>
                                  <option value="VACCINATION_SCREENING">
                                    Vaccination & Screening Record
                                  </option>
                                  <option value="HEALTH_MEASUREMENT">
                                    Explicit Health Measurement
                                  </option>
                                </select>

                                <input
                                  type="text"
                                  required
                                  placeholder="Record title (e.g., Monthly Cardiac Checkup)"
                                  value={healthTitle}
                                  onChange={(e) =>
                                    setHealthTitle(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                                />

                                <input
                                  type="text"
                                  required
                                  placeholder="Doctor / Hospital / Lab"
                                  value={healthProvider}
                                  onChange={(e) =>
                                    setHealthProvider(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/50 px-3 py-2 text-xs text-white placeholder:text-slate-500"
                                />
                              </div>

                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase">
                                    Recorded Date
                                  </label>
                                  <input
                                    type="date"
                                    value={healthRecordedDate}
                                    onChange={(e) =>
                                      setHealthRecordedDate(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 font-mono text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase">
                                    Next Due / Follow-Up Date
                                  </label>
                                  <input
                                    type="date"
                                    value={healthNextDueDate}
                                    onChange={(e) =>
                                      setHealthNextDueDate(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 font-mono text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase">
                                    Schedule / Frequency
                                  </label>
                                  <input
                                    type="text"
                                    value={healthScheduleFreq}
                                    onChange={(e) =>
                                      setHealthScheduleFreq(e.target.value)
                                    }
                                    placeholder="e.g., Monthly / Daily 8 AM"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-mono text-slate-400 uppercase">
                                    Explicitly Recorded Measurements
                                  </label>
                                  <input
                                    type="text"
                                    value={healthExplicitMeasurement}
                                    onChange={(e) =>
                                      setHealthExplicitMeasurement(
                                        e.target.value
                                      )
                                    }
                                    placeholder="BP 122/78 mmHg, Glucose 99 mg/dL"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/50 px-3 py-1.5 font-mono text-xs text-lime-300"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="submit"
                                    className="w-full rounded-xl bg-[#D4FF33] px-4 py-2 text-xs font-bold text-slate-950 hover:bg-lime-300"
                                  >
                                    Save Health Record
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}

                          {/* Main Smartwatch Dial & Telemetry Grid (12 Columns) */}
                          <div className="relative z-10 grid grid-cols-1 items-center gap-8 px-6 py-8 lg:grid-cols-12 lg:px-8">
                            {/* Left 5 Columns: PowerPeak Smartwatch Circular Bezel & Activity Rings */}
                            <div className="flex flex-col items-center justify-center lg:col-span-5">
                              <div className="relative flex h-80 w-80 items-center justify-center rounded-[52px] border-4 border-slate-700/80 bg-gradient-to-b from-[#171F2C] to-[#0B0F14] p-6 shadow-2xl ring-1 ring-white/10 sm:h-88 sm:w-88">
                                {/* Smartwatch Side Crown Button */}
                                <div
                                  aria-hidden="true"
                                  className="absolute -right-2.5 top-24 h-12 w-2 rounded-r-md bg-[#D4FF33]"
                                />
                                <div
                                  aria-hidden="true"
                                  className="absolute -right-2 top-44 h-8 w-1.5 rounded-r-md bg-slate-600"
                                />

                                {/* Multi-Ring SVG Biometric & Schedule Dial */}
                                <svg
                                  className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] -rotate-90"
                                  viewBox="0 0 240 240"
                                >
                                  {/* Outer Track: Checkup & Follow-Up Schedule Ring */}
                                  <circle
                                    cx="120"
                                    cy="120"
                                    r="102"
                                    fill="none"
                                    stroke="rgba(212, 255, 51, 0.12)"
                                    strokeWidth="12"
                                  />
                                  <circle
                                    cx="120"
                                    cy="120"
                                    r="102"
                                    fill="none"
                                    stroke="#D4FF33"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    strokeDasharray="640"
                                    strokeDashoffset={
                                      640 -
                                      (640 * activeWatchSlot.ringPct) / 100
                                    }
                                  />
                                  {/* Middle Track: Medication Schedule Adherence Ring */}
                                  <circle
                                    cx="120"
                                    cy="120"
                                    r="84"
                                    fill="none"
                                    stroke="rgba(0, 229, 255, 0.12)"
                                    strokeWidth="10"
                                  />
                                  <circle
                                    cx="120"
                                    cy="120"
                                    r="84"
                                    fill="none"
                                    stroke="#00E5FF"
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    strokeDasharray="527"
                                    strokeDashoffset={527 - (527 * 94) / 100}
                                  />
                                  {/* Inner Track: Vitals & Lab Screening Completion */}
                                  <circle
                                    cx="120"
                                    cy="120"
                                    r="68"
                                    fill="none"
                                    stroke="rgba(255, 90, 95, 0.14)"
                                    strokeWidth="8"
                                  />
                                  <circle
                                    cx="120"
                                    cy="120"
                                    r="68"
                                    fill="none"
                                    stroke="#FF5A5F"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray="427"
                                    strokeDashoffset={427 - (427 * 88) / 100}
                                  />
                                </svg>

                                {/* Center Watchface Readout */}
                                <div className="relative z-10 flex flex-col items-center text-center">
                                  <span className="font-mono text-[10px] font-bold tracking-widest text-[#D4FF33] uppercase">
                                    {activeWatchSlot.dayLabel} · WATCH SYNC
                                  </span>
                                  <div className="mt-1 font-mono text-3xl font-extrabold tracking-tight tabular-nums text-white">
                                    124/78
                                  </div>
                                  <span className="font-mono text-[11px] text-slate-400">
                                    mmHg · HR 72 bpm · SpO2 98%
                                  </span>
                                  <div className="mt-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] font-semibold text-cyan-300">
                                    HbA1c 6.1% · Glu 102 mg/dL
                                  </div>
                                  <span className="mt-1.5 max-w-[165px] truncate text-[10px] text-slate-400">
                                    {featuredMeasurement?.parent_name ||
                                      "Smt. Sunita Tare"}
                                  </span>
                                </div>
                              </div>

                              {/* Ring Legend Under Watch */}
                              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full bg-[#D4FF33]" />
                                  <span className="text-slate-300">
                                    Checkups ({activeWatchSlot.ringPct}%)
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full bg-[#00E5FF]" />
                                  <span className="text-slate-300">
                                    Med Schedule (94%)
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5A5F]" />
                                  <span className="text-slate-300">
                                    Vitals & Labs (88%)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right 7 Columns: Smartwatch Horizon Scrubber, Recorded Vitals Cards & One-Tap Vitals Sync */}
                            <div className="space-y-5 lg:col-span-7">
                              <div>
                                <div className="text-xs font-semibold text-[#D4FF33] uppercase tracking-wider">
                                  Upcoming Checkups & Follow-Up Horizon
                                </div>
                                <h2 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                  {activeWatchSlot.eventTitle}
                                </h2>
                                <p className="mt-1 text-xs text-slate-300">
                                  {activeWatchSlot.sub}
                                </p>
                              </div>

                              {/* Interactive Smartwatch Day Scrubber */}
                              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                {SMARTWATCH_TIMELINE_DAYS.map((slot) => {
                                  const isSelected =
                                    slot.date === activeWatchSlot.date;
                                  return (
                                    <button
                                      key={slot.date}
                                      type="button"
                                      onClick={() =>
                                        setActiveSmartwatchDay(slot.date)
                                      }
                                      className={`rounded-2xl border p-3 text-left transition-all ${
                                        isSelected
                                          ? "border-[#D4FF33] bg-[#D4FF33]/15 shadow-md"
                                          : "border-white/10 bg-[#131922] hover:border-white/25"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span
                                          className={`font-mono text-xs font-bold ${
                                            isSelected
                                              ? "text-[#D4FF33]"
                                              : "text-white"
                                          }`}
                                        >
                                          {slot.dayLabel}
                                        </span>
                                        <span className="font-mono text-[10px] text-slate-400">
                                          {slot.ringPct}%
                                        </span>
                                      </div>
                                      <div className="mt-1.5 truncate text-xs font-semibold text-white">
                                        {slot.eventTitle}
                                      </div>
                                      <div className="mt-0.5 truncate text-[10px] text-slate-400">
                                        {slot.sub}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Explicitly Recorded Health Measurements Telemetry Strip */}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl border border-white/10 bg-[#131922] p-4">
                                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Mother · Recorded Vitals</span>
                                    <span className="font-mono text-[10px] text-[#D4FF33]">
                                      OMRON HEM-7156
                                    </span>
                                  </div>
                                  <div className="mt-1.5 font-mono text-lg font-bold tabular-nums text-white">
                                    BP 124/78 · 72 bpm
                                  </div>
                                  <div className="mt-1 font-mono text-[11px] text-slate-300">
                                    SpO2: 98% · Fasting Glu: 102 mg/dL
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-[#131922] p-4">
                                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Father · Recorded Vitals</span>
                                    <span className="font-mono text-[10px] text-cyan-400">
                                      HOME LOGGED
                                    </span>
                                  </div>
                                  <div className="mt-1.5 font-mono text-lg font-bold tabular-nums text-white">
                                    BP 128/82 · 70 bpm
                                  </div>
                                  <div className="mt-1 font-mono text-[11px] text-slate-300">
                                    Weight: 71.4 kg · Temp: 98.2°F
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-[#131922] p-4">
                                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>Latest Lab Panel</span>
                                    <span className="font-mono text-[10px] text-emerald-400">
                                      METROPOLIS
                                    </span>
                                  </div>
                                  <div className="mt-1.5 font-mono text-lg font-bold tabular-nums text-white">
                                    HbA1c 6.1%
                                  </div>
                                  <div className="mt-1 font-mono text-[11px] text-slate-300">
                                    Vit D: 34 ng/mL · LDL: 94 mg/dL
                                  </div>
                                </div>
                              </div>

                              {/* Quick Smartwatch Sync & Action Buttons */}
                              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickLogParentVitals(
                                      "Smt. Sunita Tare (Mother)",
                                      "HEALTH_MEASUREMENT",
                                      "Morning Smartwatch & Omron BP Telemetry Log",
                                      "BP: 122/78 mmHg · HR: 71 bpm · SpO2: 98% · Fasting Glucose: 99 mg/dL",
                                      "PowerPeak Smartwatch & Omron HEM-7156"
                                    )
                                  }
                                  className="rounded-xl bg-[#D4FF33] px-3.5 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-lime-300"
                                >
                                  + Sync Mother's Today Vitals
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickLogParentVitals(
                                      "Shri. Prakash Tare (Father)",
                                      "HEALTH_MEASUREMENT",
                                      "Evening Smartwatch BP & Weight Check-In",
                                      "BP: 126/80 mmHg · Pulse: 69 bpm · SpO2: 98% · Weight: 71.2 kg",
                                      "PowerPeak Smartwatch & Home Vitals Log"
                                    )
                                  }
                                  className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-400/20"
                                >
                                  + Sync Father's BP & Weight
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setActiveView("documents")}
                                  className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
                                >
                                  Upload Lab Report PDF →
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4-Column PowerPeak Summary Bento Strip */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Periodic Checkups & Visits</span>
                              <Activity className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {periodicCheckupsCount + doctorVisitsCount}{" "}
                              Scheduled
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>
                                {periodicCheckupsCount} Monthly Checkup(s)
                              </span>
                              <span className="font-mono font-semibold text-slate-800">
                                Next: 2026-10-05
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Lab Reports & Screenings</span>
                              <FileCheck2 className="h-4 w-4 text-teal-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {labReportsCount + vaccinationRecordsCount}{" "}
                              Records
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>{labReportsCount} Lab Panel(s)</span>
                              <span className="font-semibold text-teal-700">
                                {vaccinationRecordsCount} Screening/Vaccine
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Active Medication Schedules</span>
                              <ShieldCheck className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {medicationSchedules.length} Active Regimens
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>08:00 AM & 08:30 PM</span>
                              <span className="font-mono font-semibold text-amber-700">
                                Refill: 2026-10-15
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Health Reminders & Alerts</span>
                              <Bell className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {pendingHealthRemindersCount} Upcoming
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>
                                {measurementRecords.length} Vitals Logs
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddHealthReminderModal((prev) => !prev)
                                }
                                className="font-semibold text-teal-700 hover:underline"
                              >
                                + Add Reminder
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 12-Column Split: Complete Parents' Health Monitoring Ledger (7 Cols) + Medication, Reminders & Lab Vault (5 Cols) */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                          {/* Left 7 Columns: Structured Health Monitoring & Follow-Up Ledger */}
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h2 className="text-base font-bold text-slate-900">
                                  Parents' Health Monitoring & Follow-Up Ledger
                                  ({filteredHealthRecords.length})
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  Organized records for periodic checkups,
                                  doctor visits, lab panels, medications,
                                  vaccinations, and explicit measurements.
                                </p>
                              </div>

                              {/* Status Filter */}
                              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "ALL", label: "All" },
                                  { id: "UPCOMING", label: "Scheduled" },
                                  {
                                    id: "ACTIVE_RECORDED",
                                    label: "Active / Logged",
                                  },
                                  { id: "COMPLETED", label: "Completed" },
                                ].map((st) => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() =>
                                      setParentHealthStatusFilter(st.id)
                                    }
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                                      parentHealthStatusFilter === st.id
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Category Filter Bar */}
                            <div className="mt-3 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
                              {[
                                { id: "ALL", label: "All Categories" },
                                {
                                  id: "PERIODIC_CHECKUP",
                                  label: "Monthly Checkups",
                                },
                                {
                                  id: "DOCTOR_APPOINTMENT",
                                  label: "Doctor Visits",
                                },
                                {
                                  id: "LAB_TEST_REPORT",
                                  label: "Lab-Test Reports",
                                },
                                {
                                  id: "MEDICATION_SCHEDULE",
                                  label: "Medications",
                                },
                                {
                                  id: "VACCINATION_SCREENING",
                                  label: "Vaccinations & Screenings",
                                },
                                {
                                  id: "HEALTH_MEASUREMENT",
                                  label: "Recorded Measurements",
                                },
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() =>
                                    setParentHealthCategoryFilter(cat.id)
                                  }
                                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    parentHealthCategoryFilter === cat.id
                                      ? "bg-slate-900 text-[#D4FF33]"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>

                            {/* Health Records List */}
                            <div className="mt-4 space-y-3.5">
                              {filteredHealthRecords.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                                  No parent health records match the selected
                                  filter.
                                </div>
                              ) : (
                                filteredHealthRecords.map((rec: any) => {
                                  const meta = HEALTH_CATEGORY_META[
                                    rec.record_category
                                  ] || {
                                    label: rec.record_category,
                                    accent: "text-teal-600",
                                    badgeBg: "bg-slate-100 text-slate-800",
                                  };
                                  const isCompleted =
                                    rec.status === "COMPLETED";

                                  return (
                                    <div
                                      key={rec.id}
                                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs transition-colors hover:border-slate-300"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#D4FF33]">
                                              {meta.label}
                                            </span>
                                            <span className="font-semibold text-slate-700">
                                              {rec.parent_name}
                                            </span>
                                          </div>
                                          <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                                            {rec.title}
                                          </h3>
                                          <div className="mt-0.5 text-[11px] text-slate-500">
                                            {rec.provider_or_doctor} ·{" "}
                                            {rec.schedule_or_frequency}
                                          </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5">
                                          <span
                                            className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold ${
                                              isCompleted
                                                ? "text-emerald-700"
                                                : rec.status === "SCHEDULED"
                                                ? "text-amber-700"
                                                : "text-teal-700"
                                            }`}
                                          >
                                            <span
                                              className={`h-2 w-2 rounded-full ${
                                                isCompleted
                                                  ? "bg-emerald-600"
                                                  : rec.status === "SCHEDULED"
                                                  ? "bg-amber-500"
                                                  : "bg-teal-600"
                                              }`}
                                            />
                                            {rec.status}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleToggleParentHealthStatus(
                                                rec.id
                                              )
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                          >
                                            {isCompleted
                                              ? "Re-open Schedule"
                                              : "Mark Completed"}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Explicitly Recorded Measurement Callout Box */}
                                      {rec.explicit_measurement_value && (
                                        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                                          <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                            Explicitly Recorded Measurements /
                                            Schedule Details
                                          </div>
                                          <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-slate-900">
                                            {rec.explicit_measurement_value}
                                          </div>
                                        </div>
                                      )}

                                      {rec.notes && (
                                        <p className="mt-2.5 leading-relaxed text-slate-600">
                                          {rec.notes}
                                        </p>
                                      )}

                                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 text-[11px] text-slate-500">
                                        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
                                          <span>
                                            Recorded:{" "}
                                            <strong className="text-slate-800">
                                              {rec.recorded_date}
                                            </strong>
                                          </span>
                                          {rec.next_due_or_followup_date && (
                                            <span>
                                              Next Due / Follow-Up:{" "}
                                              <strong className="text-teal-700">
                                                {rec.next_due_or_followup_date}
                                              </strong>
                                            </span>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveView("intelligence");
                                            runAgentQueryText(
                                              `Show the recorded details, measurements, and follow-up date for "${rec.title}" (${rec.parent_name}).`
                                            );
                                          }}
                                          className="font-semibold text-teal-700 hover:underline"
                                        >
                                          Verify in Agent RAG →
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Right 5 Columns: Upcoming Checkup Reminders + Medication Regimen + Lab Report Vault */}
                          <div className="space-y-6 lg:col-span-5">
                            {/* Card 1: Upcoming Checkups & Health-Related Reminders */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className="text-base font-bold text-slate-900">
                                    Upcoming Checkups & Health Reminders
                                  </h2>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Automated follow-up alerts, appointment
                                    reminders, and medication refills.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAddHealthReminderModal(
                                      (prev) => !prev
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                                >
                                  {showAddHealthReminderModal
                                    ? "Close"
                                    : "+ New Reminder"}
                                </button>
                              </div>

                              {showAddHealthReminderModal && (
                                <form
                                  onSubmit={handleAddParentHealthReminder}
                                  className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs"
                                >
                                  <input
                                    type="text"
                                    required
                                    placeholder="Health reminder title (e.g., Fasting Blood Test at 7:30 AM)"
                                    value={healthReminderTitle}
                                    onChange={(e) =>
                                      setHealthReminderTitle(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="date"
                                      required
                                      value={healthReminderDueDate}
                                      onChange={(e) =>
                                        setHealthReminderDueDate(e.target.value)
                                      }
                                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                                    />
                                    <button
                                      type="submit"
                                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-[#D4FF33] hover:bg-slate-800"
                                    >
                                      Schedule Alert
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={healthReminderDesc}
                                    onChange={(e) =>
                                      setHealthReminderDesc(e.target.value)
                                    }
                                    placeholder="Preparation or follow-up notes"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </form>
                              )}

                              <div className="mt-4 space-y-2.5">
                                {allHealthReminders.map((rem: any) => {
                                  const isDone = rem.status === "COMPLETED";
                                  return (
                                    <div
                                      key={rem.id}
                                      className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-xs ${
                                        isDone
                                          ? "border-slate-100 bg-slate-50/50 opacity-65"
                                          : "border-slate-200 bg-slate-50/70"
                                      }`}
                                    >
                                      <div>
                                        <div
                                          className={`font-semibold ${
                                            isDone
                                              ? "line-through text-slate-500"
                                              : "text-slate-900"
                                          }`}
                                        >
                                          {rem.title}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                          {rem.description}
                                        </p>
                                        <div className="mt-1 font-mono text-[11px] font-semibold text-teal-700">
                                          Due: {rem.due_date}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleReminderStatus(rem.id)
                                        }
                                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                      >
                                        {isDone ? "Reopen" : "Done"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Card 2: Lab-Test Records & Medical Reports Vault (RAG Linked) */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className="text-base font-bold text-slate-900">
                                    Lab-Test Reports & Medical Vault
                                  </h2>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Ingested diagnostic panels and medical
                                    certificates indexed for RAG retrieval.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveView("documents")}
                                  className="text-xs font-semibold text-teal-700 hover:underline"
                                >
                                  + Ingest Report
                                </button>
                              </div>

                              <div className="mt-4 space-y-2.5">
                                {allHealthDocs.map((doc: any) => (
                                  <div
                                    key={doc.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="font-semibold text-slate-900">
                                          {doc.title}
                                        </div>
                                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                                          {doc.document_type} ·{" "}
                                          {doc.document_date}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveView("intelligence");
                                          runAgentQueryText(
                                            `What measurements and follow-up dates are recorded in "${doc.title}"?`
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-[#D4FF33] hover:bg-slate-800 whitespace-nowrap"
                                      >
                                        <Sparkles className="h-3 w-3" />
                                        Query RAG
                                      </button>
                                    </div>
                                    <p className="mt-2 leading-relaxed text-slate-600">
                                      {doc.extracted_text_summary}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* TRAVEL RECORDS AGENT (DRIBBBLE — EVENTAR TRAVEL MANAGER) SHOWCASE */}
              {selectedDomain === "travel_records" && (
                <div className="space-y-6">
                  {(() => {
                    const FALLBACK_TRAVEL_RECORDS = [
                      {
                        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01",
                        trip_name: "Udaipur Royal Heritage Diwali Getaway",
                        destination: "Udaipur, Rajasthan (UDR)",
                        origin_city: "Pune, Maharashtra (PNQ)",
                        record_category: "FLIGHT_BOOKING",
                        transport_mode: "FLIGHT",
                        booking_reference: "PNR: R8K9M2 · Flight 6E-714 / 6E-719",
                        provider_or_carrier: "IndiGo Airlines",
                        accommodation_name: "Taj Lake Palace, Pichola, Udaipur",
                        departure_date: "2026-10-24",
                        return_date: "2026-10-28",
                        travelers:
                          "Sanika Tare, Rohan Tare, Sunita Tare & Prakash Tare (4 Pax)",
                        status: "UPCOMING",
                        expense_amount_minor: 3460000,
                        document_status:
                          "E-Tickets & Boarding Vouchers Verified",
                        important_date_label:
                          "Web Check-In Opens: 2026-10-22 (48h Prior)",
                        timeline_milestones: [
                          "2026-10-24 09:15 AM: Departure from Pune (PNQ) Terminal 1 via IndiGo 6E-714",
                          "2026-10-24 11:10 AM: Arrival at Maharana Pratap Airport Udaipur (UDR) & Pier Transfer",
                          "2026-10-24 02:00 PM: Check-in at Taj Lake Palace (Confirmation #TAJ-UDR-2026-88410)",
                          "2026-10-28 04:45 PM: Return flight IndiGo 6E-719 to Pune (PNQ)",
                        ],
                        notes:
                          "4 round-trip tickets booked with wheelchair assistance pre-registered at PNQ & UDR gates for senior parents.",
                      },
                      {
                        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb02",
                        trip_name: "Udaipur Royal Heritage Diwali Getaway",
                        destination: "Udaipur, Rajasthan (UDR)",
                        origin_city: "Pune, Maharashtra (PNQ)",
                        record_category: "HOTEL_ACCOMMODATION",
                        transport_mode: "HOTEL",
                        booking_reference: "CONF: TAJ-UDR-2026-88410",
                        provider_or_carrier: "IHCL Taj Hotels Palaces Resorts",
                        accommodation_name:
                          "Taj Lake Palace — 2 Luxury Lake-View Rooms (4 Nights)",
                        departure_date: "2026-10-24",
                        return_date: "2026-10-28",
                        travelers:
                          "Sanika Tare, Rohan Tare, Sunita Tare & Prakash Tare (4 Pax)",
                        status: "UPCOMING",
                        expense_amount_minor: 4850000,
                        document_status:
                          "Pre-Paid Hotel Voucher & Receipt Archived",
                        important_date_label:
                          "Free Cancellation Cutoff: 2026-10-18",
                        timeline_milestones: [
                          "2026-10-24: Lake Pichola Private Boat Transfer & Check-In (2:00 PM)",
                          "2026-10-26: Heritage Courtyard Dinner Reservation",
                          "2026-10-28: Check-Out (11:00 AM) & Airport Chauffeur Drop",
                        ],
                        notes:
                          "Includes daily breakfast, boat transfers, and ground-floor room allocation for parents.",
                      },
                      {
                        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb03",
                        trip_name: "Lonavala & Karjat Monsoon Rail Excursion",
                        destination: "Lonavala & Bhushi Ghats, Maharashtra",
                        origin_city: "Pune Junction (PUNE)",
                        record_category: "TRAIN_BOOKING",
                        transport_mode: "TRAIN",
                        booking_reference:
                          "IRCTC PNR: 842-9910423 · Train 12128",
                        provider_or_carrier:
                          "Indian Railways — Intercity Vistadome Express",
                        accommodation_name:
                          "Machan Eco Forest Canopy Resort, Lonavala",
                        departure_date: "2026-11-14",
                        return_date: "2026-11-16",
                        travelers: "Sanika Tare & Rohan Tare (2 Pax)",
                        status: "UPCOMING",
                        expense_amount_minor: 1420000,
                        document_status:
                          "IRCTC E-Ticket & Resort Voucher Confirmed",
                        important_date_label:
                          "Chart Preparation: 2026-11-14 05:30 AM",
                        timeline_milestones: [
                          "2026-11-14 06:30 AM: Board Intercity Vistadome Coach EV1 from Pune Junction",
                          "2026-11-14 12:00 PM: Check-in at Machan Eco Resort (Booking #MCH-2026-412)",
                          "2026-11-16 05:15 PM: Return train to Pune Junction",
                        ],
                        notes:
                          "Confirmed Executive Chair Car window seats; resort cab transfer included.",
                      },
                      {
                        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb04",
                        trip_name: "Mahabaleshwar Strawberry Harvest Bus Retreat",
                        destination: "Mahabaleshwar & Panchgani, Maharashtra",
                        origin_city: "Swargate / Wakad, Pune",
                        record_category: "BUS_TRANSIT_BOOKING",
                        transport_mode: "BUS",
                        booking_reference: "MSRTC-SHIVNERI-77219",
                        provider_or_carrier:
                          "MSRTC Shivneri Volvo AC Coach & Private Cab",
                        accommodation_name:
                          "Ravine Hotel & Valley View Suites, Panchgani",
                        departure_date: "2026-12-05",
                        return_date: "2026-12-07",
                        travelers: "Tare Family Household (4 Pax)",
                        status: "UPCOMING",
                        expense_amount_minor: 1680000,
                        document_status: "Bus E-Tickets & Hotel Receipt Saved",
                        important_date_label:
                          "Boarding Point Reporting: 2026-12-05 07:15 AM",
                        timeline_milestones: [
                          "2026-12-05 07:30 AM: Depart Wakad Flyover via MSRTC Volvo AC Coach",
                          "2026-12-05 11:00 AM: Check-in at Ravine Hotel Panchgani",
                          "2026-12-07 04:00 PM: Return coach departure to Pune",
                        ],
                        notes:
                          "Seats 5, 6, 7, 8 reserved in front rows for motion-comfort.",
                      },
                      {
                        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb05",
                        trip_name: "South Goa Monsoon Coastal Retreat",
                        destination: "Cavelossim & Benaulim, South Goa (GOI)",
                        origin_city: "Pune, Maharashtra (PNQ)",
                        record_category: "HOTEL_ACCOMMODATION",
                        transport_mode: "FLIGHT",
                        booking_reference:
                          "PNR: W4P2L9 · Taj Exotica #GOA-99201",
                        provider_or_carrier:
                          "Akasa Air QP-1382 & Taj Exotica Resort Goa",
                        accommodation_name:
                          "Taj Exotica Resort & Spa, Benaulim, South Goa",
                        departure_date: "2026-08-14",
                        return_date: "2026-08-18",
                        travelers:
                          "Sanika Tare, Rohan Tare, Sunita Tare & Prakash Tare (4 Pax)",
                        status: "COMPLETED",
                        expense_amount_minor: 6240000,
                        document_status:
                          "Final Folio Invoice & Boarding Passes Archived",
                        important_date_label:
                          "Completed Trip — Folio Settled on 2026-08-18",
                        timeline_milestones: [
                          "2026-08-14: Direct flight PNQ to GOI Dabolim & resort check-in",
                          "2026-08-16: Old Goa Heritage Churches & Fontainhas walk",
                          "2026-08-18: Checkout & return flight to Pune",
                        ],
                        notes:
                          "Past Independence Day long-weekend family trip; all GST hotel invoices and flight receipts reconciled.",
                      },
                      {
                        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb06",
                        trip_name: "Shimla & Kalka Himalayan Heritage Rail Trip",
                        destination: "Shimla, Himachal Pradesh",
                        origin_city: "Pune -> Chandigarh -> Kalka",
                        record_category: "TRAIN_BOOKING",
                        transport_mode: "TRAIN",
                        booking_reference:
                          "IRCTC PNR: 229-4810291 · Train 52451 Shivalik Deluxe",
                        provider_or_carrier:
                          "Northern Railway Kalka-Shimla Toy Train & Oberoi Cecil",
                        accommodation_name: "The Oberoi Cecil, Chaura Maidan, Shimla",
                        departure_date: "2026-05-10",
                        return_date: "2026-05-16",
                        travelers:
                          "Sanika Tare, Rohan Tare, Sunita Tare & Prakash Tare (4 Pax)",
                        status: "COMPLETED",
                        expense_amount_minor: 7890000,
                        document_status:
                          "Complete Travel History & Expense Receipts Archived",
                        important_date_label:
                          "Completed Trip — Archived in 2026 Travel History",
                        timeline_milestones: [
                          "2026-05-10: Pune to Chandigarh flight & Kalka transfer",
                          "2026-05-11: Kalka-Shimla UNESCO Heritage Toy Train journey (05:45 AM)",
                          "2026-05-11 to 2026-05-16: 5-night stay at The Oberoi Cecil Shimla",
                        ],
                        notes:
                          "Summer family retreat in the Himalayas; complete itinerary, train tickets, and hotel receipts stored in vault.",
                      },
                      {
                        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb07",
                        trip_name: "Household Passports, DigiYatra & Travel Insurance Folder",
                        destination: "Domestic & International Travel Readiness",
                        origin_city: "Pune Household Vault",
                        record_category: "TRAVEL_DOCUMENT",
                        transport_mode: "DOCUMENT",
                        booking_reference:
                          "PASSPORT-TARE-4PAX · TATA-AIG-TRV-2026",
                        provider_or_carrier:
                          "Ministry of External Affairs & Tata AIG Travel Guard",
                        accommodation_name: "All Household Trips",
                        departure_date: "2026-10-24",
                        return_date: "2027-09-30",
                        travelers:
                          "Sanika Tare, Rohan Tare, Sunita Tare & Prakash Tare (4 Pax)",
                        status: "UPCOMING",
                        expense_amount_minor: 640000,
                        document_status:
                          "Passports Valid Until 2031 · Senior Medical Travel Cover Active",
                        important_date_label:
                          "Policy Renewal Date: 2027-09-30",
                        timeline_milestones: [
                          "DigiYatra Biometric Profiles: Active for PNQ, BOM, BLR, DEL, UDR",
                          "Senior Citizen Travel Medical Policy: ₹25,00,000 Domestic & Asian Cover",
                        ],
                        notes:
                          "Central travel document checklist ensuring IDs, medical summaries, and emergency contacts accompany every trip.",
                      },
                    ];

                    const allTravelRecords =
                      travelRecordsData.items &&
                      travelRecordsData.items.length > 0
                        ? travelRecordsData.items
                        : FALLBACK_TRAVEL_RECORDS;

                    const allTravelReminders =
                      travelRecordsData.reminders &&
                      travelRecordsData.reminders.length > 0
                        ? travelRecordsData.reminders
                        : [
                            {
                              id: "66666666-6666-4666-8666-666666666611",
                              title:
                                "Udaipur Flight 6E-714 Web Check-In & Seat Confirmation",
                              description:
                                "Complete IndiGo web check-in 48 hours before departure (PNR: R8K9M2) and download boarding passes.",
                              domain: "travel_records",
                              due_date: "2026-10-22",
                              status: "PENDING",
                            },
                            {
                              id: "66666666-6666-4666-8666-666666666612",
                              title:
                                "Pack Taj Lake Palace Voucher, Senior IDs & Medication Kit",
                              description:
                                "Verify printed voucher #TAJ-UDR-2026-88410, Aadhaar cards, and parents' 5-day travel pill organizer.",
                              domain: "travel_records",
                              due_date: "2026-10-23",
                              status: "PENDING",
                            },
                            {
                              id: "66666666-6666-4666-8666-666666666613",
                              title:
                                "Lonavala Vistadome Express IRCTC Chart & Cab Check",
                              description:
                                "Confirm Coach EV1 seat numbers for PNR 842-9910423 and Machan Eco Resort station pickup.",
                              domain: "travel_records",
                              due_date: "2026-11-13",
                              status: "PENDING",
                            },
                          ];

                    const allTravelDocs =
                      travelRecordsData.documents &&
                      travelRecordsData.documents.length > 0
                        ? travelRecordsData.documents
                        : documents.filter(
                            (d) =>
                              d.document_type === "TRAVEL_BOOKING_VOUCHER" ||
                              String(d.title || "")
                                .toLowerCase()
                                .includes("udaipur") ||
                              String(d.title || "")
                                .toLowerCase()
                                .includes("flight") ||
                              String(d.title || "")
                                .toLowerCase()
                                .includes("travel")
                          );

                    const filteredTravelRecords = allTravelRecords
                      .filter((r: any) =>
                        travelStatusFilter === "ALL"
                          ? true
                          : r.status === travelStatusFilter
                      )
                      .filter((r: any) =>
                        travelCategoryFilter === "ALL"
                          ? true
                          : r.record_category === travelCategoryFilter
                      )
                      .filter((r: any) =>
                        matchesSearch(
                          r.trip_name,
                          r.destination,
                          r.origin_city,
                          r.record_category,
                          r.transport_mode,
                          r.booking_reference,
                          r.provider_or_carrier,
                          r.accommodation_name,
                          r.travelers,
                          r.notes
                        )
                      );

                    const EVENTAR_DESTINATION_GALLERY = [
                      {
                        trip_name: "Udaipur Royal Heritage Diwali Getaway",
                        destination: "Udaipur, Rajasthan",
                        airport_pair: "PNQ ➔ UDR",
                        dates: "24 Oct – 28 Oct 2026",
                        status: "UPCOMING",
                        badge: "Flight + Palace Stay",
                        image:
                          "/src/assets/images/travel_udaipur_lake_palace_1790712238911.jpg",
                        booking_ref: "PNR: R8K9M2 · TAJ-UDR-88410",
                        carrier: "IndiGo 6E-714 & Taj Lake Palace",
                        total_spend_minor: 8310000,
                      },
                      {
                        trip_name: "South Goa Monsoon Coastal Retreat",
                        destination: "Benaulim, South Goa",
                        airport_pair: "PNQ ➔ GOI",
                        dates: "14 Aug – 18 Aug 2026",
                        status: "COMPLETED",
                        badge: "Past Family Trip",
                        image:
                          "/src/assets/images/travel_goa_boutique_villa_1790712252049.jpg",
                        booking_ref: "PNR: W4P2L9 · GOA-99201",
                        carrier: "Akasa Air & Taj Exotica Goa",
                        total_spend_minor: 6240000,
                      },
                      {
                        trip_name: "Shimla & Kalka Himalayan Heritage Rail Trip",
                        destination: "Shimla, Himachal Pradesh",
                        airport_pair: "KLK ➔ SML",
                        dates: "10 May – 16 May 2026",
                        status: "COMPLETED",
                        badge: "UNESCO Rail + Resort",
                        image:
                          "/src/assets/images/travel_himalayan_mountain_train_1790712265611.jpg",
                        booking_ref: "IRCTC: 229-4810291",
                        carrier: "Shivalik Deluxe Express & Oberoi Cecil",
                        total_spend_minor: 7890000,
                      },
                    ];

                    const activeGallerySpec =
                      EVENTAR_DESTINATION_GALLERY.find(
                        (g) => g.trip_name === selectedEventarTripName
                      ) || EVENTAR_DESTINATION_GALLERY[0];

                    const selectedTripRecords = allTravelRecords.filter(
                      (r: any) => r.trip_name === activeGallerySpec.trip_name
                    );
                    const primaryTripRecord =
                      selectedTripRecords[0] || allTravelRecords[0];

                    const upcomingRecordsCount = allTravelRecords.filter(
                      (r: any) => r.status === "UPCOMING"
                    ).length;
                    const completedRecordsCount = allTravelRecords.filter(
                      (r: any) => r.status === "COMPLETED"
                    ).length;
                    const transportBookingsCount = allTravelRecords.filter(
                      (r: any) =>
                        r.record_category === "FLIGHT_BOOKING" ||
                        r.record_category === "TRAIN_BOOKING" ||
                        r.record_category === "BUS_TRANSIT_BOOKING"
                    ).length;
                    const hotelBookingsCount = allTravelRecords.filter(
                      (r: any) => r.record_category === "HOTEL_ACCOMMODATION"
                    ).length;
                    const totalTravelSpendMinor = allTravelRecords.reduce(
                      (acc: number, r: any) =>
                        acc + Number(r.expense_amount_minor || 0),
                      0
                    );
                    const pendingTravelRemindersCount =
                      allTravelReminders.filter(
                        (rem: any) => rem.status === "PENDING"
                      ).length;

                    const TRAVEL_CATEGORY_META: Record<
                      string,
                      { label: string; badgeClass: string }
                    > = {
                      FLIGHT_BOOKING: {
                        label: "Flight Booking",
                        badgeClass: "bg-sky-500/15 text-sky-300 border-sky-400/30",
                      },
                      TRAIN_BOOKING: {
                        label: "Train / Rail Booking",
                        badgeClass:
                          "bg-amber-500/15 text-amber-300 border-amber-400/30",
                      },
                      BUS_TRANSIT_BOOKING: {
                        label: "Bus & Transit",
                        badgeClass:
                          "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
                      },
                      HOTEL_ACCOMMODATION: {
                        label: "Hotel & Accommodation",
                        badgeClass:
                          "bg-violet-500/15 text-violet-300 border-violet-400/30",
                      },
                      TRAVEL_DOCUMENT: {
                        label: "Travel Document & Policy",
                        badgeClass:
                          "bg-rose-500/15 text-rose-300 border-rose-400/30",
                      },
                      TRAVEL_EXPENSE: {
                        label: "Travel Expense & Receipt",
                        badgeClass:
                          "bg-teal-500/15 text-teal-300 border-teal-400/30",
                      },
                    };

                    return (
                      <>
                        {/* HERO CONTAINER: DRIBBBLE — EVENTAR TRAVEL MANAGER */}
                        <div className="relative overflow-hidden rounded-3xl bg-[#0B1221] text-slate-100 shadow-xl">
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -top-28 -left-24 h-96 w-96 rounded-full bg-sky-500/15 blur-3xl"
                          />
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -right-24 -bottom-28 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl"
                          />

                          {/* Top Eventar Travel Manager Header Bar */}
                          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-10">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-slate-950 shadow-md">
                                <Compass className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-base font-bold tracking-tight text-white">
                                    Eventar Travel Manager
                                  </span>
                                  <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-300">
                                    TRAVEL RECORDS AGENT
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Household Trip Ledger · Flights, Rail, Bus,
                                  Hotel Stays, Vouchers, Expenses & Timelines
                                </p>
                              </div>
                            </div>

                            {/* Status Filter Switcher */}
                            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/10 bg-white/5 p-1">
                              {[
                                {
                                  id: "ALL",
                                  label: `All Records (${allTravelRecords.length})`,
                                },
                                {
                                  id: "UPCOMING",
                                  label: `Upcoming (${upcomingRecordsCount})`,
                                },
                                {
                                  id: "COMPLETED",
                                  label: `Past / Completed (${completedRecordsCount})`,
                                },
                              ].map((tab) => (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setTravelStatusFilter(tab.id)}
                                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                    travelStatusFilter === tab.id
                                      ? "bg-sky-400 text-slate-950 shadow-xs"
                                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddTravelRecordModal((prev) => !prev)
                                }
                                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-sky-300"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {showAddTravelRecordModal
                                  ? "Close Form"
                                  : "Log Travel Record"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const preset = SAMPLE_DOCUMENTS.find(
                                    (d) =>
                                      d.category === "TRAVEL_BOOKING_VOUCHER"
                                  );
                                  if (preset) {
                                    setDocFilename(preset.filename);
                                    setDocCategory(preset.category);
                                    setDocText(preset.content);
                                  }
                                  setActiveView("documents");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                              >
                                <Upload className="h-3.5 w-3.5 text-sky-400" />
                                Ingest Voucher PDF
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Log Travel Record Drawer */}
                          {showAddTravelRecordModal && (
                            <form
                              onSubmit={handleCreateTravelRecord}
                              className="relative z-10 border-b border-white/10 bg-slate-900/90 px-6 py-5 backdrop-blur lg:px-10"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <span className="text-xs font-bold tracking-wider text-sky-300 uppercase">
                                  Record Household Trip, Booking, Hotel Stay, or
                                  Travel Expense
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Automatically indexes PNR, dates, timeline
                                  milestones, and upcoming trip reminders
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Trip Name
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={travelTripName}
                                    onChange={(e) =>
                                      setTravelTripName(e.target.value)
                                    }
                                    placeholder="e.g., Udaipur Royal Heritage Getaway"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Destination
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={travelDestination}
                                    onChange={(e) =>
                                      setTravelDestination(e.target.value)
                                    }
                                    placeholder="e.g., Udaipur, Rajasthan (UDR)"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Record Category
                                  </label>
                                  <select
                                    value={travelCategory}
                                    onChange={(e) =>
                                      setTravelCategory(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-1.5 text-xs text-white"
                                  >
                                    <option value="FLIGHT_BOOKING">
                                      Flight Booking
                                    </option>
                                    <option value="TRAIN_BOOKING">
                                      Train / Rail Booking
                                    </option>
                                    <option value="BUS_TRANSIT_BOOKING">
                                      Bus / Coach Booking
                                    </option>
                                    <option value="HOTEL_ACCOMMODATION">
                                      Hotel / Accommodation
                                    </option>
                                    <option value="TRAVEL_DOCUMENT">
                                      Travel Document / Visa / Insurance
                                    </option>
                                    <option value="TRAVEL_EXPENSE">
                                      Travel Expense / Receipt
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Transport / Mode
                                  </label>
                                  <select
                                    value={travelTransportMode}
                                    onChange={(e) =>
                                      setTravelTransportMode(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-1.5 text-xs text-white"
                                  >
                                    <option value="FLIGHT">Flight</option>
                                    <option value="TRAIN">Train / Rail</option>
                                    <option value="BUS">Bus / Coach</option>
                                    <option value="HOTEL">Hotel / Stay</option>
                                    <option value="DOCUMENT">
                                      Travel Document
                                    </option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Booking Ref / PNR / Policy #
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={travelBookingRef}
                                    onChange={(e) =>
                                      setTravelBookingRef(e.target.value)
                                    }
                                    placeholder="e.g., PNR: R8K9M2"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 font-mono text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Carrier / Provider / Hotel Brand
                                  </label>
                                  <input
                                    type="text"
                                    value={travelProvider}
                                    onChange={(e) =>
                                      setTravelProvider(e.target.value)
                                    }
                                    placeholder="e.g., IndiGo Airlines / IHCL Taj"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Departure / Check-In Date
                                  </label>
                                  <input
                                    type="date"
                                    value={travelDepartureDate}
                                    onChange={(e) =>
                                      setTravelDepartureDate(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 font-mono text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Return / Check-Out Date
                                  </label>
                                  <input
                                    type="date"
                                    value={travelReturnDate}
                                    onChange={(e) =>
                                      setTravelReturnDate(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 font-mono text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Hotel / Accommodation Name
                                  </label>
                                  <input
                                    type="text"
                                    value={travelAccommodation}
                                    onChange={(e) =>
                                      setTravelAccommodation(e.target.value)
                                    }
                                    placeholder="e.g., Taj Lake Palace, Udaipur"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Recorded Spend / Receipt Amount (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={travelExpenseInr}
                                    onChange={(e) =>
                                      setTravelExpenseInr(e.target.value)
                                    }
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 font-mono text-xs text-white tabular-nums"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-300">
                                    Important Travel Date / Cutoff
                                  </label>
                                  <input
                                    type="text"
                                    value={travelImportantDateLabel}
                                    onChange={(e) =>
                                      setTravelImportantDateLabel(
                                        e.target.value
                                      )
                                    }
                                    placeholder="e.g., Web Check-In Opens 48h Prior"
                                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-white"
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <select
                                    value={travelRecordStatus}
                                    onChange={(e) =>
                                      setTravelRecordStatus(e.target.value)
                                    }
                                    className="rounded-xl border border-white/15 bg-slate-950 px-3 py-1.5 text-xs text-white"
                                  >
                                    <option value="UPCOMING">Upcoming</option>
                                    <option value="COMPLETED">
                                      Completed / Past
                                    </option>
                                  </select>
                                  <button
                                    type="submit"
                                    className="flex-1 rounded-xl bg-sky-400 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-sky-300"
                                  >
                                    Save Record
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}

                          {/* Main Eventar Split-Deck: Destination Boarding Pass Spotlight (7 Cols) + Trip Timeline & Destination Switcher (5 Cols) */}
                          <div className="relative z-10 grid grid-cols-1 gap-6 p-6 lg:grid-cols-12 lg:p-10">
                            {/* Left 7 Cols: Eventar Destination Hero & Perforated Boarding Pass Card */}
                            <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-slate-900/75 shadow-lg lg:col-span-7">
                              <div className="relative h-64 w-full overflow-hidden sm:h-72">
                                <img
                                  src={activeGallerySpec.image}
                                  alt={activeGallerySpec.trip_name}
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0B1221] via-[#0B1221]/55 to-transparent" />

                                <div className="absolute top-4 right-4 left-4 flex flex-wrap items-center justify-between gap-2">
                                  <span className="rounded-xl border border-white/20 bg-slate-950/75 px-3 py-1 font-mono text-xs font-bold text-sky-300 backdrop-blur">
                                    {activeGallerySpec.airport_pair} ·{" "}
                                    {activeGallerySpec.badge}
                                  </span>
                                  <span
                                    className={`rounded-xl px-3 py-1 font-mono text-xs font-bold ${
                                      activeGallerySpec.status === "UPCOMING"
                                        ? "bg-emerald-400 text-slate-950"
                                        : "bg-white/20 text-white backdrop-blur"
                                    }`}
                                  >
                                    {activeGallerySpec.status === "UPCOMING"
                                      ? "UPCOMING TRIP"
                                      : "PAST TRIP ARCHIVE"}
                                  </span>
                                </div>

                                <div className="absolute right-6 bottom-4 left-6">
                                  <div className="flex items-center gap-2 text-xs font-medium text-sky-300">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span>{activeGallerySpec.destination}</span>
                                    <span>·</span>
                                    <Calendar className="h-3.5 w-3.5" />
                                    <span className="font-mono">
                                      {activeGallerySpec.dates}
                                    </span>
                                  </div>
                                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                                    {activeGallerySpec.trip_name}
                                  </h1>
                                </div>
                              </div>

                              <div className="space-y-5 p-6">
                                <div className="grid grid-cols-2 gap-4 rounded-2xl border border-dashed border-sky-400/30 bg-slate-950/70 p-4 sm:grid-cols-4">
                                  <div>
                                    <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                      Booking Ref / PNR
                                    </div>
                                    <div className="mt-1 font-mono text-xs font-bold text-sky-300">
                                      {primaryTripRecord?.booking_reference ||
                                        activeGallerySpec.booking_ref}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                      Carrier & Stay
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-white">
                                      {activeGallerySpec.carrier}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                      Document Readiness
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-emerald-400">
                                      {primaryTripRecord?.document_status ||
                                        "Vouchers Verified"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                      Recorded Trip Spend
                                    </div>
                                    <div className="mt-1 font-mono text-sm font-bold tabular-nums text-amber-300">
                                      {formatINR(
                                        activeGallerySpec.total_spend_minor
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuickLogTravelBooking({
                                          trip_name:
                                            activeGallerySpec.trip_name,
                                          destination:
                                            activeGallerySpec.destination,
                                          origin_city:
                                            "Pune, Maharashtra (PNQ)",
                                          record_category: "TRAVEL_EXPENSE",
                                          transport_mode: "HOTEL",
                                          booking_reference: `REC-${Date.now()
                                            .toString()
                                            .slice(-5)}`,
                                          provider_or_carrier:
                                            "Airport Lounge & Chauffeur Transfer",
                                          accommodation_name:
                                            primaryTripRecord?.accommodation_name ||
                                            activeGallerySpec.carrier,
                                          departure_date:
                                            primaryTripRecord?.departure_date ||
                                            "2026-10-24",
                                          return_date:
                                            primaryTripRecord?.return_date ||
                                            "2026-10-28",
                                          expense_amount_inr: "3200",
                                          important_date_label:
                                            "Receipt Logged in Travel Expense Ledger",
                                        })
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/40 bg-sky-400/15 px-3.5 py-2 text-xs font-semibold text-sky-200 transition-colors hover:bg-sky-400 hover:text-slate-950"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      + Log Transfer / Receipt (₹3,200)
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveView("intelligence");
                                        runAgentQueryText(
                                          `Provide the complete booking references, hotel accommodation details, travel dates, timeline milestones, and recorded expenses for "${activeGallerySpec.trip_name}".`
                                        );
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/15"
                                    >
                                      <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                                      Ask Travel Records Agent
                                    </button>
                                  </div>

                                  <span className="font-mono text-[11px] text-slate-400">
                                    {primaryTripRecord?.important_date_label}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right 5 Cols: Eventar Trip Timeline Milestones & Destination Switcher */}
                            <div className="flex flex-col justify-between space-y-5 rounded-3xl border border-white/15 bg-slate-900/75 p-6 lg:col-span-5">
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold tracking-wider text-sky-300 uppercase">
                                    Trip Timeline & Important Dates
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-400">
                                    {selectedTripRecords.length} Linked Record(s)
                                  </span>
                                </div>
                                <h2 className="mt-1 text-base font-bold text-white">
                                  Chronological Itinerary & Milestones
                                </h2>

                                <div className="mt-4 space-y-3 border-l-2 border-sky-400/40 pl-4">
                                  {(
                                    primaryTripRecord?.timeline_milestones || [
                                      "2026-10-24 09:15 AM: Departure from Pune (PNQ) via IndiGo 6E-714",
                                      "2026-10-24 02:00 PM: Check-in at Taj Lake Palace Udaipur",
                                      "2026-10-28 04:45 PM: Return flight 6E-719 to Pune",
                                    ]
                                  ).map((step: string, idx: number) => (
                                    <div key={idx} className="relative text-xs">
                                      <span className="absolute top-1.5 -left-[21px] h-2.5 w-2.5 rounded-full bg-sky-400 ring-4 ring-slate-900" />
                                      <div className="font-medium text-slate-100">
                                        {step}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="border-t border-white/10 pt-4">
                                <div className="mb-2.5 flex items-center justify-between text-xs text-slate-400">
                                  <span>
                                    Switch Household Trip Timeline (Upcoming &
                                    Past)
                                  </span>
                                  <span className="font-mono text-[11px] text-sky-300">
                                    3 Featured Trips
                                  </span>
                                </div>

                                <div className="space-y-2.5">
                                  {EVENTAR_DESTINATION_GALLERY.map((trip) => {
                                    const isCurrent =
                                      trip.trip_name ===
                                      activeGallerySpec.trip_name;
                                    return (
                                      <button
                                        key={trip.trip_name}
                                        type="button"
                                        onClick={() =>
                                          setSelectedEventarTripName(
                                            trip.trip_name
                                          )
                                        }
                                        className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all ${
                                          isCurrent
                                            ? "border-sky-400 bg-sky-400/15 shadow-sm"
                                            : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                                        }`}
                                      >
                                        <img
                                          src={trip.image}
                                          alt={trip.destination}
                                          referrerPolicy="no-referrer"
                                          className="h-12 w-16 shrink-0 rounded-xl object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-xs font-bold text-white">
                                              {trip.trip_name}
                                            </span>
                                            <span className="shrink-0 font-mono text-[10px] font-semibold text-sky-300">
                                              {trip.airport_pair}
                                            </span>
                                          </div>
                                          <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate-300">
                                            <span className="truncate">
                                              {trip.dates} · {trip.carrier}
                                            </span>
                                            <span className="font-mono font-semibold text-amber-300">
                                              {formatINR(
                                                trip.total_spend_minor
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 4-Column Eventar Travel Summary Bento Strip */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Upcoming & Past Trips</span>
                              <Compass className="h-4 w-4 text-sky-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {upcomingRecordsCount} Upcoming
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>
                                {completedRecordsCount} Completed Archive(s)
                              </span>
                              <span className="font-mono font-semibold text-sky-700">
                                Next: 2026-10-24
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Flights, Rail, Bus & Stays</span>
                              <MapPin className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {transportBookingsCount + hotelBookingsCount}{" "}
                              Bookings
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>
                                {transportBookingsCount} Transit Tickets
                              </span>
                              <span className="font-semibold text-indigo-700">
                                {hotelBookingsCount} Hotel Voucher(s)
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Recorded Travel Expenses</span>
                              <CreditCard className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {formatINR(totalTravelSpendMinor)}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>Flights, Rail, Bus & Hotels</span>
                              <span className="font-mono font-semibold text-emerald-700">
                                Receipts Verified
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                              <span>Trip & Document Reminders</span>
                              <Bell className="h-4 w-4 text-amber-600" />
                            </div>
                            <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-slate-900">
                              {pendingTravelRemindersCount} Active Alerts
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>Check-In & Voucher Cutoffs</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddTravelReminderModal((prev) => !prev)
                                }
                                className="font-semibold text-sky-700 hover:underline"
                              >
                                + Add Reminder
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 12-Column Split: Household Travel Records & Booking Ledger (7 Cols) + Reminders & Travel Document Vault (5 Cols) */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                          <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h2 className="text-base font-bold text-slate-900">
                                  Household Travel Records & Booking Ledger (
                                  {filteredTravelRecords.length})
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  Organized records for past and upcoming trips,
                                  flight/train/bus bookings, hotel stays, travel
                                  documents, and expenses.
                                </p>
                              </div>

                              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "ALL", label: "All" },
                                  { id: "UPCOMING", label: "Upcoming" },
                                  { id: "COMPLETED", label: "Completed" },
                                ].map((st) => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setTravelStatusFilter(st.id)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                      travelStatusFilter === st.id
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
                              {[
                                { id: "ALL", label: "All Categories" },
                                {
                                  id: "FLIGHT_BOOKING",
                                  label: "Flights",
                                },
                                {
                                  id: "TRAIN_BOOKING",
                                  label: "Trains & Rail",
                                },
                                {
                                  id: "BUS_TRANSIT_BOOKING",
                                  label: "Bus & Coach",
                                },
                                {
                                  id: "HOTEL_ACCOMMODATION",
                                  label: "Hotels & Stays",
                                },
                                {
                                  id: "TRAVEL_DOCUMENT",
                                  label: "Travel Documents",
                                },
                                {
                                  id: "TRAVEL_EXPENSE",
                                  label: "Expenses & Receipts",
                                },
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() =>
                                    setTravelCategoryFilter(cat.id)
                                  }
                                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    travelCategoryFilter === cat.id
                                      ? "bg-slate-900 text-sky-300"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>

                            <div className="mt-4 space-y-3.5">
                              {filteredTravelRecords.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                                  No household travel records match the selected
                                  filter.
                                </div>
                              ) : (
                                filteredTravelRecords.map((rec: any) => {
                                  const meta = TRAVEL_CATEGORY_META[
                                    rec.record_category
                                  ] || {
                                    label: rec.record_category,
                                    badgeClass: "bg-slate-100 text-slate-800",
                                  };
                                  const isCompleted =
                                    rec.status === "COMPLETED";

                                  return (
                                    <div
                                      key={rec.id}
                                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs transition-colors hover:border-slate-300"
                                    >
                                      <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-semibold text-sky-300">
                                              {meta.label}
                                            </span>
                                            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                                              {rec.transport_mode}
                                            </span>
                                            <span className="font-semibold text-slate-700">
                                              {rec.destination}
                                            </span>
                                          </div>
                                          <h3 className="mt-1.5 text-sm font-bold text-slate-900">
                                            {rec.trip_name}
                                          </h3>
                                          <div className="mt-0.5 text-[11px] text-slate-500">
                                            {rec.provider_or_carrier} · Stay:{" "}
                                            {rec.accommodation_name}
                                          </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-1.5">
                                          <span
                                            className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold ${
                                              isCompleted
                                                ? "text-slate-600"
                                                : "text-emerald-700"
                                            }`}
                                          >
                                            <span
                                              className={`h-2 w-2 rounded-full ${
                                                isCompleted
                                                  ? "bg-slate-400"
                                                  : "bg-emerald-600"
                                              }`}
                                            />
                                            {rec.status}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleToggleTravelRecordStatus(
                                                rec.id
                                              )
                                            }
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                          >
                                            {isCompleted
                                              ? "Mark Upcoming"
                                              : "Mark Completed"}
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 sm:grid-cols-3">
                                        <div>
                                          <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                            Booking Reference / PNR
                                          </div>
                                          <div className="mt-0.5 font-mono text-xs font-bold text-slate-900">
                                            {rec.booking_reference}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                            Travel Dates & Travelers
                                          </div>
                                          <div className="mt-0.5 font-mono text-xs font-semibold text-slate-800">
                                            {rec.departure_date} →{" "}
                                            {rec.return_date}
                                          </div>
                                          <div className="truncate text-[10px] text-slate-500">
                                            {rec.travelers}
                                          </div>
                                        </div>
                                        <div className="sm:text-right">
                                          <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                                            Recorded Expense
                                          </div>
                                          <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-slate-900">
                                            {formatINR(
                                              rec.expense_amount_minor
                                            )}
                                          </div>
                                          <div className="text-[10px] font-medium text-emerald-700">
                                            {rec.document_status}
                                          </div>
                                        </div>
                                      </div>

                                      {rec.important_date_label && (
                                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sky-50 px-3 py-1.5 text-[11px] text-sky-950">
                                          <span className="font-semibold">
                                            Important Date:{" "}
                                            {rec.important_date_label}
                                          </span>
                                          <span className="font-mono text-[10px] text-sky-800">
                                            Origin: {rec.origin_city}
                                          </span>
                                        </div>
                                      )}

                                      {rec.notes && (
                                        <p className="mt-2 leading-relaxed text-slate-600">
                                          {rec.notes}
                                        </p>
                                      )}

                                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-2.5 text-[11px] text-slate-500">
                                        <span>
                                          Timeline:{" "}
                                          <strong className="text-slate-800">
                                            {(rec.timeline_milestones || [])
                                              .length || 3}{" "}
                                            milestones logged
                                          </strong>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveView("intelligence");
                                            runAgentQueryText(
                                              `Retrieve the booking confirmation reference, travel dates, accommodation details, and recorded expense for "${rec.trip_name}" (${rec.booking_reference}).`
                                            );
                                          }}
                                          className="font-semibold text-sky-700 hover:underline"
                                        >
                                          Verify in Travel Agent RAG →
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Right 5 Cols: Travel Reminders + Travel Documents & Vouchers Vault */}
                          <div className="space-y-6 lg:col-span-5">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className="text-base font-bold text-slate-900">
                                    Upcoming Trip & Document Reminders
                                  </h2>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Web check-in cutoffs, boarding pass alerts,
                                    and travel document readiness reminders.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAddTravelReminderModal(
                                      (prev) => !prev
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 whitespace-nowrap"
                                >
                                  {showAddTravelReminderModal
                                    ? "Close"
                                    : "+ New Reminder"}
                                </button>
                              </div>

                              {showAddTravelReminderModal && (
                                <form
                                  onSubmit={handleAddTravelReminder}
                                  className="mt-3 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs"
                                >
                                  <input
                                    type="text"
                                    required
                                    placeholder="Reminder title (e.g., IndiGo 6E-714 Web Check-In)"
                                    value={travelReminderTitle}
                                    onChange={(e) =>
                                      setTravelReminderTitle(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                  <div className="grid grid-cols-2 gap-2">
                                    <input
                                      type="date"
                                      required
                                      value={travelReminderDueDate}
                                      onChange={(e) =>
                                        setTravelReminderDueDate(e.target.value)
                                      }
                                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                                    />
                                    <button
                                      type="submit"
                                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-slate-800"
                                    >
                                      Schedule Alert
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={travelReminderDesc}
                                    onChange={(e) =>
                                      setTravelReminderDesc(e.target.value)
                                    }
                                    placeholder="Booking reference or document checklist note"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                                  />
                                </form>
                              )}

                              <div className="mt-4 space-y-2.5">
                                {allTravelReminders.map((rem: any) => {
                                  const isDone = rem.status === "COMPLETED";
                                  return (
                                    <div
                                      key={rem.id}
                                      className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-xs ${
                                        isDone
                                          ? "border-slate-100 bg-slate-50/50 opacity-65"
                                          : "border-slate-200 bg-slate-50/70"
                                      }`}
                                    >
                                      <div>
                                        <div
                                          className={`font-semibold ${
                                            isDone
                                              ? "line-through text-slate-500"
                                              : "text-slate-900"
                                          }`}
                                        >
                                          {rem.title}
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                          {rem.description}
                                        </p>
                                        <div className="mt-1 font-mono text-[11px] font-semibold text-sky-700">
                                          Due:{" "}
                                          {rem.due_date ||
                                            String(rem.due_at || "").slice(
                                              0,
                                              10
                                            )}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleReminderStatus(rem.id)
                                        }
                                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                      >
                                        {isDone ? "Reopen" : "Done"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h2 className="text-base font-bold text-slate-900">
                                    Travel Documents & Booking Vouchers Vault
                                  </h2>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Ingested airline e-tickets, rail vouchers,
                                    and hotel confirmations indexed for RAG.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveView("documents")}
                                  className="text-xs font-semibold text-sky-700 hover:underline"
                                >
                                  + Ingest Voucher
                                </button>
                              </div>

                              <div className="mt-4 space-y-2.5">
                                {allTravelDocs.map((doc: any) => (
                                  <div
                                    key={doc.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <div className="font-semibold text-slate-900">
                                          {doc.title}
                                        </div>
                                        <div className="mt-0.5 font-mono text-[11px] text-slate-500">
                                          {doc.document_type} ·{" "}
                                          {doc.document_date}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveView("intelligence");
                                          runAgentQueryText(
                                            `What booking confirmations, PNR numbers, travel dates, and expenses are recorded in "${doc.title}"?`
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-sky-300 hover:bg-slate-800 whitespace-nowrap"
                                      >
                                        <Sparkles className="h-3 w-3" />
                                        Query RAG
                                      </button>
                                    </div>
                                    <p className="mt-2 leading-relaxed text-slate-600">
                                      {doc.extracted_text_summary}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* FINANCE & HOUSEHOLD EXPENSES (DRIBBBLE — SC MODERN PRIVATE WEALTH MANAGEMENT) SHOWCASE */}
              {selectedDomain === "finance_expenses" && (
                <div className="space-y-6">
                  {(() => {
                    const allBills = billsData.items || [];
                    const allSubscriptions = billsData.subscriptions || [];
                    const allExpenses = billsData.expenses || [];
                    const allFinanceReminders = (
                      billsData.reminders || []
                    ).filter(
                      (r: any) =>
                        r.domain === "finance_expenses" ||
                        String(r.title || "")
                          .toLowerCase()
                          .includes("bill") ||
                        String(r.title || "")
                          .toLowerCase()
                          .includes("msedcl") ||
                        String(r.title || "")
                          .toLowerCase()
                          .includes("payment")
                    );

                    const pendingBills = allBills.filter(
                      (b: any) => b.status === "PENDING"
                    );
                    const paidBills = allBills.filter(
                      (b: any) => b.status === "PAID"
                    );
                    const pendingBillsMinor = pendingBills.reduce(
                      (acc: number, b: any) =>
                        acc + Number(b.amount_due_minor || 0),
                      0
                    );
                    const settledBillsMinor = paidBills.reduce(
                      (acc: number, b: any) =>
                        acc + Number(b.amount_due_minor || 0),
                      0
                    );
                    const recurringTotalMinor = allSubscriptions.reduce(
                      (acc: number, s: any) =>
                        acc + Number(s.amount_minor || 0),
                      0
                    );
                    const recordedExpensesTotalMinor = allExpenses.reduce(
                      (acc: number, e: any) =>
                        acc + Number(e.amount_minor || 0),
                      0
                    );

                    const effectiveSpendMinor = Math.max(
                      spendMinor,
                      recordedExpensesTotalMinor + settledBillsMinor
                    );
                    const remainingBudgetMinor = Math.max(
                      0,
                      budgetMinor - effectiveSpendMinor
                    );
                    const utilizationPct = Math.min(
                      100,
                      Math.round(
                        (effectiveSpendMinor / Math.max(1, budgetMinor)) * 100
                      )
                    );

                    const primaryPendingBill =
                      pendingBills[0] || allBills[0] || null;

                    // Category allocation for SC Private Wealth Capital Allocation bar
                    const utilitiesOutflowMinor =
                      pendingBillsMinor + settledBillsMinor;
                    const groceriesOutflowMinor = allExpenses
                      .filter(
                        (e: any) =>
                          String(e.category || "").includes("GROCER") ||
                          String(e.merchant_name || "")
                            .toLowerCase()
                            .includes("sahyadri") ||
                          String(e.merchant_name || "")
                            .toLowerCase()
                            .includes("mart")
                      )
                      .reduce(
                        (acc: number, e: any) =>
                          acc + Number(e.amount_minor || 0),
                        0
                      );
                    const maintenanceOutflowMinor = allExpenses
                      .filter(
                        (e: any) =>
                          String(e.category || "").includes("MAINTENANCE") ||
                          String(e.category || "").includes("APPLIANCE") ||
                          String(e.description || "")
                            .toLowerCase()
                            .includes("service")
                      )
                      .reduce(
                        (acc: number, e: any) =>
                          acc + Number(e.amount_minor || 0),
                        0
                      );
                    const generalHouseholdOutflowMinor = Math.max(
                      0,
                      recordedExpensesTotalMinor -
                        groceriesOutflowMinor -
                        maintenanceOutflowMinor
                    );

                    const allocationTotalBase = Math.max(
                      budgetMinor,
                      utilitiesOutflowMinor +
                        recurringTotalMinor +
                        recordedExpensesTotalMinor
                    );

                    const wealthAllocations = [
                      {
                        id: "UTILITIES",
                        label: "Bills & Utilities",
                        amountMinor: utilitiesOutflowMinor,
                        sharePct: Math.max(
                          6,
                          Math.round(
                            (utilitiesOutflowMinor / allocationTotalBase) * 100
                          )
                        ),
                        barClass: "flex-[3] bg-[#D4AF37]",
                        dotClass: "bg-[#D4AF37]",
                        cadence: `${allBills.length} utility accounts`,
                      },
                      {
                        id: "RECURRING",
                        label: "Recurring Bills & Mandates",
                        amountMinor: recurringTotalMinor,
                        sharePct: Math.max(
                          5,
                          Math.round(
                            (recurringTotalMinor / allocationTotalBase) * 100
                          )
                        ),
                        barClass: "flex-[2] bg-emerald-400",
                        dotClass: "bg-emerald-400",
                        cadence: `${allSubscriptions.length} active cycles`,
                      },
                      {
                        id: "GROCERIES",
                        label: "Culinary & Grocery Provisioning",
                        amountMinor: groceriesOutflowMinor,
                        sharePct: Math.max(
                          5,
                          Math.round(
                            (groceriesOutflowMinor / allocationTotalBase) * 100
                          )
                        ),
                        barClass: "flex-[2] bg-teal-300",
                        dotClass: "bg-teal-300",
                        cadence: "Pantry & fresh harvest",
                      },
                      {
                        id: "HOUSEHOLD_SUPPLIES",
                        label: "Household & Maintenance Spend",
                        amountMinor:
                          generalHouseholdOutflowMinor +
                          maintenanceOutflowMinor,
                        sharePct: Math.max(
                          6,
                          Math.round(
                            ((generalHouseholdOutflowMinor +
                              maintenanceOutflowMinor) /
                              allocationTotalBase) *
                              100
                          )
                        ),
                        barClass: "flex-[3] bg-stone-300",
                        dotClass: "bg-stone-300",
                        cadence: `${allExpenses.length} logged vouchers`,
                      },
                    ];

                    const filteredBillsList = allBills
                      .filter((b: any) =>
                        financeBillStatusFilter === "ALL"
                          ? true
                          : b.status === financeBillStatusFilter
                      )
                      .filter((b: any) =>
                        matchesSearch(
                          b.provider_name,
                          b.utility_type,
                          b.consumer_account_number,
                          b.status,
                          b.due_date,
                          b.billing_period_start,
                          b.billing_period_end
                        )
                      );

                    // Unified Payment History & Expenditure rows combining expenses and paid utility bills
                    const unifiedExpenditureRows = [
                      ...allExpenses.map((exp: any) => ({
                        id: exp.id,
                        entryType: "EXPENSE",
                        merchant: exp.merchant_name,
                        category: exp.category || "HOUSEHOLD_SUPPLIES",
                        description: exp.description || "Household expenditure",
                        date: exp.incurred_on || "2026-09-28",
                        paymentMethod: exp.payment_method || "UPI",
                        isRecurring: Boolean(exp.is_recurring),
                        amountMinor: Number(exp.amount_minor || 0),
                        statusLabel: "Settled & Recorded",
                      })),
                      ...paidBills.map((bill: any) => ({
                        id: `paid-bill-${bill.id}`,
                        entryType: "UTILITY_PAYMENT",
                        merchant: bill.provider_name,
                        category: `UTILITY_${bill.utility_type}`,
                        description: `Utility Bill Payment · Account #${bill.consumer_account_number}`,
                        date: bill.paid_at
                          ? String(bill.paid_at).slice(0, 10)
                          : bill.due_date,
                        paymentMethod: "Approved Gate / BBPS",
                        isRecurring: true,
                        amountMinor: Number(bill.amount_due_minor || 0),
                        statusLabel: "Paid Utility Bill",
                      })),
                    ]
                      .filter((row) => {
                        if (financeExpenseCategoryFilter === "ALL") return true;
                        if (financeExpenseCategoryFilter === "UTILITIES") {
                          return (
                            row.entryType === "UTILITY_PAYMENT" ||
                            String(row.category).includes("UTILITY")
                          );
                        }
                        if (financeExpenseCategoryFilter === "GROCERIES") {
                          return (
                            String(row.category).includes("GROCER") ||
                            row.merchant.toLowerCase().includes("sahyadri")
                          );
                        }
                        if (financeExpenseCategoryFilter === "MAINTENANCE") {
                          return (
                            String(row.category).includes("MAINTENANCE") ||
                            String(row.category).includes("APPLIANCE") ||
                            row.description.toLowerCase().includes("service")
                          );
                        }
                        return row.category === financeExpenseCategoryFilter;
                      })
                      .filter((row) =>
                        matchesSearch(
                          row.merchant,
                          row.category,
                          row.description,
                          row.paymentMethod,
                          row.date,
                          row.statusLabel
                        )
                      );

                    // Payment method breakdown for spending summary
                    const upiTotalMinor = unifiedExpenditureRows
                      .filter((r) =>
                        String(r.paymentMethod).toUpperCase().includes("UPI")
                      )
                      .reduce((a, r) => a + r.amountMinor, 0);
                    const cardAndBankMinor = Math.max(
                      0,
                      unifiedExpenditureRows.reduce(
                        (a, r) => a + r.amountMinor,
                        0
                      ) - upiTotalMinor
                    );

                    return (
                      <>
                        {/* SECTION 1: SC MODERN PRIVATE WEALTH MANAGEMENT HERO CONSOLE */}
                        <div className="relative overflow-hidden rounded-3xl border border-[#1E2E28] bg-[#0A1411] text-stone-100 shadow-xl">
                          {/* Subtle Private-Banking Champagne & Emerald Radial Lighting */}
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-[#D4AF37]/10 blur-3xl"
                          />
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl"
                          />

                          {/* Top Private Client Navigation & Action Bar */}
                          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-10">
                            <div className="flex items-center gap-3.5">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 font-serif text-sm font-bold tracking-wider text-[#E5C76B]">
                                SC
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#E5C76B]">
                                  <span className="font-semibold tracking-wide">
                                    SC Private Wealth & Household Treasury
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="text-stone-500"
                                  >
                                    ·
                                  </span>
                                  <span className="text-stone-400">
                                    Tare Family Office Mandate
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] text-stone-400">
                                  Bills & utilities · Household expenditure ·
                                  Budget governance · Payment history · Due
                                  dates & recurring bills · Financial reminders
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddExpenseDrawer((prev) => !prev);
                                  setShowAddFinanceReminderDrawer(false);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-[#E5C76B]"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {showAddExpenseDrawer
                                  ? "Close Expense Entry"
                                  : "Record Expenditure"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddFinanceReminderDrawer(
                                    (prev) => !prev
                                  );
                                  setShowAddExpenseDrawer(false);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-stone-200 transition-colors hover:bg-white/10"
                              >
                                <Bell className="h-3.5 w-3.5 text-[#E5C76B]" />
                                {showAddFinanceReminderDrawer
                                  ? "Close Reminder"
                                  : "Set Financial Alert"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const billPreset = SAMPLE_DOCUMENTS[0];
                                  if (billPreset) {
                                    setDocFilename(billPreset.filename);
                                    setDocCategory(billPreset.category);
                                    setDocText(billPreset.content);
                                  }
                                  setActiveView("documents");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-stone-200 transition-colors hover:bg-white/10"
                              >
                                <Upload className="h-3.5 w-3.5 text-emerald-400" />
                                Ingest Bill / Receipt
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveView("intelligence");
                                  runAgentQueryText(
                                    "Summarize our pending utility bills, household expenses, monthly budget, recurring bills, payment history, and financial reminders."
                                  );
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3.5 py-2 text-xs font-semibold text-[#E5C76B] transition-colors hover:bg-[#D4AF37]/20"
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                                Consult Finance Agent
                              </button>
                            </div>
                          </div>

                          {/* Collapsible Private Ledger Expenditure Drawer */}
                          {showAddExpenseDrawer && (
                            <form
                              onSubmit={handleAddExpense}
                              className="relative z-10 border-b border-white/10 bg-[#0F1D19] px-6 py-5 lg:px-10"
                            >
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-serif text-sm font-normal text-[#E5C76B]">
                                  Log Household Expenditure & Payment Voucher
                                </span>
                                <span className="text-stone-400">
                                  Updates monthly budget utilization, spending
                                  summaries, and payment history ledger
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                                <input
                                  type="text"
                                  required
                                  placeholder="Merchant / Payee (e.g., Sahyadri Organic)"
                                  value={expenseMerchant}
                                  onChange={(e) =>
                                    setExpenseMerchant(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-stone-500 lg:col-span-2"
                                />
                                <select
                                  value={expenseCategory}
                                  onChange={(e) =>
                                    setExpenseCategory(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-[#0A1411] px-3 py-2 text-xs text-white"
                                >
                                  <option value="HOUSEHOLD_SUPPLIES">
                                    Household Supplies
                                  </option>
                                  <option value="GROCERIES">
                                    Groceries & Culinary
                                  </option>
                                  <option value="UTILITIES">
                                    Utilities & Energy
                                  </option>
                                  <option value="MAINTENANCE">
                                    Maintenance & Service
                                  </option>
                                  <option value="HEALTHCARE">
                                    Healthcare & Medical
                                  </option>
                                </select>
                                <select
                                  value={expensePaymentMethod}
                                  onChange={(e) =>
                                    setExpensePaymentMethod(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-[#0A1411] px-3 py-2 text-xs text-white"
                                >
                                  <option value="UPI">UPI Instant</option>
                                  <option value="HDFC Infinia Credit">
                                    HDFC Infinia Card
                                  </option>
                                  <option value="NEFT Auto-Debit">
                                    NEFT / Auto-Debit
                                  </option>
                                </select>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  placeholder="Amount (₹)"
                                  value={expenseAmountInr}
                                  onChange={(e) =>
                                    setExpenseAmountInr(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs text-white tabular-nums placeholder:text-stone-500"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#E5C76B]"
                                >
                                  Post to Ledger
                                </button>
                              </div>
                              <div className="mt-2.5">
                                <input
                                  type="text"
                                  placeholder="Expenditure memorandum / invoice reference note"
                                  value={expenseDesc}
                                  onChange={(e) =>
                                    setExpenseDesc(e.target.value)
                                  }
                                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500"
                                />
                              </div>
                            </form>
                          )}

                          {/* Collapsible Financial Reminder Drawer */}
                          {showAddFinanceReminderDrawer && (
                            <form
                              onSubmit={handleAddFinanceReminder}
                              className="relative z-10 border-b border-white/10 bg-[#0F1D19] px-6 py-5 lg:px-10"
                            >
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-serif text-sm font-normal text-[#E5C76B]">
                                  Schedule Financial Due-Date Alert or Bill
                                  Reminder
                                </span>
                                <span className="text-stone-400">
                                  Synchronizes with HomeIQ Proactive Engine &
                                  Financial Reminders
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                                <input
                                  type="text"
                                  required
                                  placeholder="Alert title (e.g., MSEDCL Bill Due-Date Verification)"
                                  value={financeReminderTitle}
                                  onChange={(e) =>
                                    setFinanceReminderTitle(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-xs text-white placeholder:text-stone-500 sm:col-span-2"
                                />
                                <input
                                  type="date"
                                  required
                                  value={financeReminderDueDate}
                                  onChange={(e) =>
                                    setFinanceReminderDueDate(e.target.value)
                                  }
                                  className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs text-white tabular-nums"
                                />
                                <button
                                  type="submit"
                                  className="rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-[#E5C76B]"
                                >
                                  Save Financial Alert
                                </button>
                              </div>
                              <div className="mt-2.5">
                                <input
                                  type="text"
                                  value={financeReminderDesc}
                                  onChange={(e) =>
                                    setFinanceReminderDesc(e.target.value)
                                  }
                                  placeholder="Instructions or account details"
                                  className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-stone-200 placeholder:text-stone-500"
                                />
                              </div>
                            </form>
                          )}

                          {/* Main 12-Column SC Private Wealth Hero Split */}
                          <div className="relative z-10 grid grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-12 lg:px-10 lg:py-10">
                            {/* Left 7 Columns: Monthly Budget Governance & Capital Allocation */}
                            <div className="flex flex-col justify-between space-y-6 lg:col-span-7">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[#E5C76B]">
                                  <span>
                                    01. Monthly Capital Allocation & Budget
                                    Governance
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-stone-400">
                                    FY 2026–27 · October Cycle
                                  </span>
                                </div>
                                <h1 className="max-w-2xl font-serif text-3xl leading-tight font-normal tracking-tight text-white sm:text-4xl">
                                  Household Liquidity, Budget Discipline &
                                  Outflow Ledgers
                                </h1>
                                <p className="max-w-xl text-xs leading-relaxed text-stone-300 sm:text-sm">
                                  Real-time treasury visibility across utility
                                  tariffs, recurring household mandates, daily
                                  expenditure, and owner-authorized bill
                                  disbursements.
                                </p>
                              </div>

                              {/* 3-Column Private Banking Key Balance Strip */}
                              <div className="grid grid-cols-1 gap-6 border-y border-white/10 py-5 sm:grid-cols-3">
                                <div>
                                  <div className="text-xs text-stone-400">
                                    Monthly Household Budget
                                  </div>
                                  <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">
                                    {formatINR(budgetMinor)}
                                  </div>
                                  <div className="mt-1 text-[11px] text-stone-400">
                                    Target monthly ceiling
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs text-stone-400">
                                    Recorded Spend & Outflows
                                  </div>
                                  <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-[#E5C76B]">
                                    {formatINR(effectiveSpendMinor)}
                                  </div>
                                  <div className="mt-1 text-[11px] text-emerald-400">
                                    {utilizationPct}% of monthly budget utilized
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs text-stone-400">
                                    Unallocated Reserve Cushion
                                  </div>
                                  <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-emerald-400">
                                    {formatINR(remainingBudgetMinor)}
                                  </div>
                                  <div className="mt-1 text-[11px] text-stone-400">
                                    {100 - utilizationPct}% liquidity headroom
                                  </div>
                                </div>
                              </div>

                              {/* Multi-Segment Wealth Allocation Bar */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium text-stone-300">
                                    Expenditure & Obligation Distribution
                                  </span>
                                  <span className="font-mono text-[11px] tabular-nums text-stone-400">
                                    Committed + Spent:{" "}
                                    {formatINR(
                                      utilitiesOutflowMinor +
                                        recurringTotalMinor +
                                        recordedExpensesTotalMinor
                                    )}
                                  </span>
                                </div>

                                <div className="flex h-3 w-full gap-1 overflow-hidden rounded-full bg-white/10 p-0.5">
                                  {wealthAllocations.map((seg) => (
                                    <div
                                      key={seg.id}
                                      className={`h-full first:rounded-l-full last:rounded-r-full ${seg.barClass}`}
                                      title={`${seg.label}: ${formatINR(
                                        seg.amountMinor
                                      )} (${seg.sharePct}%)`}
                                    />
                                  ))}
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
                                  {wealthAllocations.map((seg) => (
                                    <div
                                      key={seg.id}
                                      className="border-l border-white/15 pl-3 text-xs"
                                    >
                                      <div className="flex items-center gap-1.5 text-stone-300">
                                        <span
                                          className={`h-2 w-2 rounded-full ${seg.dotClass}`}
                                        />
                                        <span className="truncate font-medium">
                                          {seg.label}
                                        </span>
                                      </div>
                                      <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-white">
                                        {formatINR(seg.amountMinor)}
                                      </div>
                                      <div className="text-[11px] text-stone-400">
                                        {seg.cadence}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Right 5 Columns: Priority Utility Obligation Spotlight & Approval Gate Dispatch */}
                            <div className="flex flex-col justify-between rounded-2xl border border-white/15 bg-[#101F1B] p-6 lg:col-span-5">
                              {primaryPendingBill ? (
                                <div className="space-y-5">
                                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
                                    <div>
                                      <div className="text-xs text-[#E5C76B]">
                                        Priority Utility Obligation · Due{" "}
                                        {primaryPendingBill.due_date}
                                      </div>
                                      <h2 className="mt-1 font-serif text-xl font-normal text-white">
                                        {primaryPendingBill.provider_name}
                                      </h2>
                                      <div className="mt-0.5 text-xs text-stone-400">
                                        {primaryPendingBill.utility_type} ·
                                        Consumer Account #
                                        {
                                          primaryPendingBill.consumer_account_number
                                        }
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono text-2xl font-semibold tabular-nums text-white">
                                        {formatINR(
                                          primaryPendingBill.amount_due_minor
                                        )}
                                      </div>
                                      <div className="mt-0.5 text-[11px] font-medium text-amber-400">
                                        {primaryPendingBill.status === "PENDING"
                                          ? "Awaiting Settlement"
                                          : "Settled"}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <div className="text-stone-400">
                                        Billing Cycle Window
                                      </div>
                                      <div className="mt-0.5 font-mono text-stone-200 tabular-nums">
                                        {primaryPendingBill.billing_period_start ||
                                          "2026-08-16"}{" "}
                                        →{" "}
                                        {primaryPendingBill.billing_period_end ||
                                          "2026-09-15"}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-stone-400">
                                        Metered Consumption
                                      </div>
                                      <div className="mt-0.5 font-mono text-stone-200 tabular-nums">
                                        {primaryPendingBill.consumption_units ||
                                          "368.4"}{" "}
                                        {primaryPendingBill.consumption_unit_label ||
                                          "kWh"}
                                      </div>
                                    </div>
                                  </div>

                                  {primaryPendingBill.status === "PENDING" ? (
                                    <div className="pt-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRequestBillPayment(
                                            primaryPendingBill.provider_name
                                          )
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-[#E5C76B]"
                                      >
                                        <CreditCard className="h-4 w-4" />
                                        Authorize Payment via Approval Gate (
                                        {formatINR(
                                          primaryPendingBill.amount_due_minor
                                        )}
                                        )
                                      </button>
                                      <p className="mt-2 text-center text-[11px] text-stone-400">
                                        Consequential disbursement routed
                                        through Owner Approval Gate
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
                                      All utility bills in this cycle have been
                                      settled and verified.
                                    </div>
                                  )}
                                </div>
                              ) : null}

                              {/* Bottom Treasury Pulse Footer inside Right Card */}
                              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
                                <div>
                                  <div className="text-stone-400">
                                    Recurring Monthly Mandates
                                  </div>
                                  <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-white">
                                    {formatINR(recurringTotalMinor)}{" "}
                                    <span className="text-[11px] font-normal text-stone-400">
                                      ({allSubscriptions.length} active)
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <div className="text-stone-400">
                                    Settled Payments & Vouchers
                                  </div>
                                  <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-emerald-400">
                                    {unifiedExpenditureRows.length} entries
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 2: 4-COLUMN EXECUTIVE WEALTH & EXPENSE SUMMARY STRIP */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="text-xs font-medium text-slate-500">
                              01. Monthly Budget & Spend
                            </div>
                            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                              {formatINR(effectiveSpendMinor)}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>Ceiling: {formatINR(budgetMinor)}</span>
                              <span className="font-mono font-semibold text-emerald-700">
                                {utilizationPct}% utilized
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="text-xs font-medium text-slate-500">
                              02. Bills, Utilities & Due Dates
                            </div>
                            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                              {formatINR(pendingBillsMinor)}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>
                                {pendingBills.length} Pending ·{" "}
                                {paidBills.length} Paid
                              </span>
                              <span className="font-mono font-semibold text-amber-800">
                                Due{" "}
                                {primaryPendingBill?.due_date || "2026-10-12"}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="text-xs font-medium text-slate-500">
                              03. Recurring Bills & Mandates
                            </div>
                            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                              {formatINR(recurringTotalMinor)}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>
                                {allSubscriptions.length} Active Cycle(s)
                              </span>
                              <span className="font-mono text-slate-700">
                                Auto-Renewal Active
                              </span>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="text-xs font-medium text-slate-500">
                              04. Financial Reminders & Alerts
                            </div>
                            <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                              {pendingBills.length +
                                allSubscriptions.filter((s: any) => s.is_active)
                                  .length +
                                allFinanceReminders.filter(
                                  (r: any) => r.status !== "COMPLETED"
                                ).length}{" "}
                              Active
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                              <span>Due-Date & Bill Alerts</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setShowAddFinanceReminderDrawer(
                                    (prev) => !prev
                                  )
                                }
                                className="font-semibold text-slate-900 hover:underline"
                              >
                                + Schedule Alert
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 3: 12-COLUMN SPLIT — BILLS, UTILITIES & RECURRING MANDATES (7 COLS) + FINANCIAL REMINDERS & SPENDING SUMMARY (5 COLS) */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                          {/* Left 7 Columns: Utility Bills, Due Dates & Recurring Bills */}
                          <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                              <div>
                                <h2 className="font-serif text-lg font-normal text-slate-900">
                                  01. Utility Bills, Due Dates & Payment
                                  Governance
                                </h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  Electricity, natural gas, and municipal
                                  utility statements with due dates and payment
                                  authorization.
                                </p>
                              </div>

                              <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                                {[
                                  { id: "ALL", label: "All Bills" },
                                  { id: "PENDING", label: "Pending Dues" },
                                  { id: "PAID", label: "Paid History" },
                                ].map((tab) => (
                                  <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() =>
                                      setFinanceBillStatusFilter(tab.id)
                                    }
                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                                      financeBillStatusFilter === tab.id
                                        ? "bg-white text-slate-900 shadow-xs"
                                        : "text-slate-600 hover:text-slate-900"
                                    }`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Utility Bills List */}
                            <div className="space-y-3">
                              {filteredBillsList.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                                  No utility bills match the selected status
                                  filter.
                                </div>
                              ) : (
                                filteredBillsList.map((bill: any) => {
                                  const isPaid = bill.status === "PAID";
                                  return (
                                    <div
                                      key={bill.id}
                                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-4 text-xs sm:flex-row sm:items-center"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                          <span className="font-semibold text-slate-800">
                                            {bill.utility_type}
                                          </span>
                                          <span aria-hidden="true">·</span>
                                          <span className="font-mono">
                                            Account #
                                            {bill.consumer_account_number}
                                          </span>
                                          <span aria-hidden="true">·</span>
                                          <span
                                            className={
                                              isPaid
                                                ? "font-semibold text-emerald-700"
                                                : "font-semibold text-amber-800"
                                            }
                                          >
                                            {isPaid
                                              ? `Paid${
                                                  bill.paid_at
                                                    ? ` on ${String(
                                                        bill.paid_at
                                                      ).slice(0, 10)}`
                                                    : ""
                                                }`
                                              : `Pending · Due ${bill.due_date}`}
                                          </span>
                                        </div>
                                        <div className="text-sm font-semibold text-slate-900">
                                          {bill.provider_name}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          Billing Period:{" "}
                                          {bill.billing_period_start ||
                                            "2026-08-16"}{" "}
                                          to{" "}
                                          {bill.billing_period_end ||
                                            "2026-09-15"}
                                          {bill.consumption_units
                                            ? ` · Metered Usage: ${bill.consumption_units} ${
                                                bill.consumption_unit_label ||
                                                "units"
                                              }`
                                            : ""}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                                        <div className="font-mono text-base font-semibold tabular-nums text-slate-900">
                                          {formatINR(bill.amount_due_minor)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {!isPaid && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleRequestBillPayment(
                                                  bill.provider_name
                                                )
                                              }
                                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-[#E5C76B] hover:bg-slate-800"
                                            >
                                              Pay Bill
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveView("intelligence");
                                              runAgentQueryText(
                                                `What is the due date, consumption usage, and payment status for our ${bill.provider_name} (${bill.utility_type}) bill?`
                                              );
                                            }}
                                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                                          >
                                            Audit →
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Recurring Bills & Active Subscriptions */}
                            <div className="border-t border-slate-100 pt-5">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-serif text-base font-normal text-slate-900">
                                    02. Recurring Bills & Household Mandates
                                  </h3>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Standing monthly and annual household
                                    commitments and renewal dates.
                                  </p>
                                </div>
                                <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
                                  Total: {formatINR(recurringTotalMinor)} /
                                  cycle
                                </span>
                              </div>

                              <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {allSubscriptions
                                  .filter((sub: any) =>
                                    matchesSearch(
                                      sub.service_name,
                                      sub.vendor_name,
                                      sub.billing_cycle,
                                      sub.next_renewal_date
                                    )
                                  )
                                  .map((sub: any) => (
                                    <div
                                      key={sub.id}
                                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-900">
                                          {sub.service_name}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">
                                          {sub.vendor_name ||
                                            "Standing Household Mandate"}{" "}
                                          · {sub.billing_cycle} · Next Due:{" "}
                                          <span className="font-mono text-slate-700">
                                            {sub.next_renewal_date}
                                          </span>
                                          {sub.auto_renew
                                            ? " · Auto-Debit Enabled"
                                            : ""}
                                        </div>
                                      </div>
                                      <div className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                                        {formatINR(sub.amount_minor)}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>

                          {/* Right 5 Columns: Financial Reminders & Spending Summaries */}
                          <div className="space-y-6 lg:col-span-5">
                            {/* Financial Reminders & Due-Date Alerts Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                                <div>
                                  <h2 className="font-serif text-lg font-normal text-slate-900">
                                    03. Financial Reminders & Due Dates
                                  </h2>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Upcoming utility bill deadlines, recurring
                                    renewals, and custom treasury alerts.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowAddFinanceReminderDrawer(
                                      (prev) => !prev
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                                >
                                  + Alert
                                </button>
                              </div>

                              <div className="mt-4 space-y-2.5">
                                {/* Pending Utility Bill Due Alerts */}
                                {pendingBills.map((b: any) => (
                                  <div
                                    key={`fin-rem-bill-${b.id}`}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-3.5 py-2.5 text-xs"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-900">
                                        Utility Bill Due: {b.provider_name}
                                      </div>
                                      <div className="mt-0.5 text-[11px] text-slate-600">
                                        {b.utility_type} · Account #
                                        {b.consumer_account_number} ·{" "}
                                        <span className="font-mono font-semibold text-amber-900">
                                          {formatINR(b.amount_due_minor)}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono text-[11px] font-semibold text-amber-900">
                                        Due {b.due_date}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRequestBillPayment(
                                            b.provider_name
                                          )
                                        }
                                        className="mt-1 text-[11px] font-semibold text-slate-900 hover:underline"
                                      >
                                        Pay Now →
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {/* Active Subscription Renewal Alerts */}
                                {allSubscriptions
                                  .filter((s: any) => s.is_active)
                                  .map((s: any) => (
                                    <div
                                      key={`fin-rem-sub-${s.id}`}
                                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-xs"
                                    >
                                      <div>
                                        <div className="font-semibold text-slate-900">
                                          Recurring Renewal: {s.service_name}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">
                                          {s.billing_cycle} cycle ·{" "}
                                          <span className="font-mono font-semibold text-slate-800">
                                            {formatINR(s.amount_minor)}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="font-mono text-[11px] text-slate-600">
                                        Renews {s.next_renewal_date}
                                      </span>
                                    </div>
                                  ))}

                                {/* Persisted Custom Finance Reminders */}
                                {allFinanceReminders.map((rem: any) => {
                                  const isDone = rem.status === "COMPLETED";
                                  return (
                                    <div
                                      key={rem.id}
                                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs"
                                    >
                                      <div>
                                        <div
                                          className={`font-semibold ${
                                            isDone
                                              ? "line-through text-slate-400"
                                              : "text-slate-900"
                                          }`}
                                        >
                                          {rem.title}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-slate-500">
                                          {rem.description}
                                        </div>
                                        <div className="mt-1 font-mono text-[11px] text-slate-500">
                                          Due:{" "}
                                          {String(
                                            rem.due_at || rem.due_date || ""
                                          ).slice(0, 10)}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleReminderStatus(rem.id)
                                        }
                                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                      >
                                        {isDone ? "Reopen" : "Done"}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Spending Summary & Channel Analytics Card */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-6">
                              <h2 className="font-serif text-lg font-normal text-slate-900">
                                04. Spending Summary & Settlement Channels
                              </h2>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Consolidated household expenditure by payment
                                rail and budget category.
                              </p>

                              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600">
                                    UPI & Instant Merchant Settlements
                                  </span>
                                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                                    {formatINR(upiTotalMinor)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600">
                                    Card, NEFT & Utility BillPay Rails
                                  </span>
                                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                                    {formatINR(cardAndBankMinor)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-600">
                                    Standing Recurring Subscriptions
                                  </span>
                                  <span className="font-mono font-semibold tabular-nums text-slate-900">
                                    {formatINR(recurringTotalMinor)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-200 pt-3 font-semibold text-slate-900">
                                  <span>
                                    Total Tracked Outflow + Pending Bills
                                  </span>
                                  <span className="font-mono text-sm tabular-nums">
                                    {formatINR(
                                      recordedExpensesTotalMinor +
                                        settledBillsMinor +
                                        pendingBillsMinor
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* SECTION 4: FULL-WIDTH HOUSEHOLD EXPENDITURE TRACKING & PAYMENT HISTORY LEDGER */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-6">
                          <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-center">
                            <div>
                              <h2 className="font-serif text-lg font-normal text-slate-900">
                                05. Household Expenditure, Expense Tracking &
                                Payment History ({unifiedExpenditureRows.length}
                                )
                              </h2>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Chronological audit trail of logged household
                                expenses, merchant vouchers, and settled utility
                                payments.
                              </p>
                            </div>

                            {/* Category Filter Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {[
                                { id: "ALL", label: "All Expenditure" },
                                {
                                  id: "GROCERIES",
                                  label: "Groceries & Pantry",
                                },
                                {
                                  id: "UTILITIES",
                                  label: "Utilities & Paid Bills",
                                },
                                {
                                  id: "MAINTENANCE",
                                  label: "Maintenance & Service",
                                },
                                {
                                  id: "HOUSEHOLD_SUPPLIES",
                                  label: "Household Supplies",
                                },
                              ].map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() =>
                                    setFinanceExpenseCategoryFilter(cat.id)
                                  }
                                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    financeExpenseCategoryFilter === cat.id
                                      ? "bg-[#0A1411] text-[#E5C76B]"
                                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Inline Quick-Log Expenditure Form */}
                          <form
                            onSubmit={handleAddExpense}
                            className="mt-4 grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-6"
                          >
                            <input
                              type="text"
                              required
                              placeholder="Merchant or Payee Name"
                              value={expenseMerchant}
                              onChange={(e) =>
                                setExpenseMerchant(e.target.value)
                              }
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:col-span-2"
                            />
                            <input
                              type="text"
                              placeholder="Expenditure note or invoice ref"
                              value={expenseDesc}
                              onChange={(e) => setExpenseDesc(e.target.value)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs sm:col-span-2"
                            />
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Amount (₹)"
                              value={expenseAmountInr}
                              onChange={(e) =>
                                setExpenseAmountInr(e.target.value)
                              }
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-mono text-xs tabular-nums"
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0A1411] px-3 py-1.5 text-xs font-semibold text-[#E5C76B] hover:bg-slate-900"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Log Spend
                            </button>
                          </form>

                          {/* Structured Payment History & Expenditure Table */}
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500">
                                  <th className="pb-2.5 font-semibold">Date</th>
                                  <th className="pb-2.5 font-semibold">
                                    Merchant / Payee
                                  </th>
                                  <th className="pb-2.5 font-semibold">
                                    Category & Memorandum
                                  </th>
                                  <th className="pb-2.5 font-semibold">
                                    Payment Rail
                                  </th>
                                  <th className="pb-2.5 font-semibold">
                                    Status
                                  </th>
                                  <th className="pb-2.5 text-right font-semibold">
                                    Amount (₹)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {unifiedExpenditureRows.map((row) => (
                                  <tr
                                    key={row.id}
                                    className="hover:bg-slate-50/80"
                                  >
                                    <td className="py-3 pr-4 font-mono whitespace-nowrap tabular-nums text-slate-600">
                                      {row.date}
                                    </td>
                                    <td className="py-3 pr-4 font-semibold text-slate-900">
                                      {row.merchant}
                                    </td>
                                    <td className="py-3 pr-4 text-slate-600">
                                      <span className="font-medium text-slate-800">
                                        {row.category}
                                      </span>{" "}
                                      · {row.description}
                                    </td>
                                    <td className="py-3 pr-4 text-slate-600">
                                      {row.paymentMethod}
                                      {row.isRecurring ? " · Recurring" : ""}
                                    </td>
                                    <td className="py-3 pr-4 font-medium text-emerald-700">
                                      {row.statusLabel}
                                    </td>
                                    <td className="py-3 text-right font-mono font-semibold whitespace-nowrap tabular-nums text-slate-900">
                                      {formatINR(row.amountMinor)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Assets, Vehicles & Maintenance Table (Shown in All Domains overview) */}
              {selectedDomain === "all" && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Assets, Vehicles & Total Cost of Ownership
                    </h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectDomain("vehicle_mobility")}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Malen Auto Workshop →
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveView("documents")}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        + Upload Warranty or Invoice
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-2.5 font-semibold">Asset</th>
                          <th className="pb-2.5 font-semibold">Location</th>
                          <th className="pb-2.5 font-semibold">Status</th>
                          <th className="pb-2.5 text-right font-semibold">
                            Purchase
                          </th>
                          <th className="pb-2.5 text-right font-semibold">
                            Maintenance
                          </th>
                          <th className="pb-2.5 text-right font-semibold">
                            Total Cost
                          </th>
                          <th className="pb-2.5 pl-4 font-semibold">
                            Coverage & Service
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {assets
                          .filter((a) =>
                            matchesSearch(
                              a.name,
                              a.brand,
                              a.model_number,
                              a.location_room,
                              a.status,
                              a.category,
                              a.vehicle?.registration_number,
                              a.warranty?.provider_name
                            )
                          )
                          .map((asset) => (
                            <tr key={asset.id} className="hover:bg-slate-50/80">
                              <td className="py-3 pr-4">
                                <div className="font-semibold text-slate-900">
                                  {asset.name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {asset.brand} · {asset.model_number}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {asset.location_room}
                              </td>
                              <td className="py-3 pr-4">
                                <span
                                  className={`font-medium ${
                                    asset.status === "OPERATIONAL"
                                      ? "text-emerald-700"
                                      : "text-amber-700"
                                  }`}
                                >
                                  {asset.status === "OPERATIONAL"
                                    ? "Operational"
                                    : "Maintenance Due"}
                                </span>
                              </td>
                              <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-700">
                                {formatINR(asset.tco?.purchase_price_minor)}
                              </td>
                              <td className="py-3 pr-4 text-right font-mono tabular-nums text-slate-700">
                                {formatINR(asset.tco?.maintenance_cost_minor)}
                              </td>
                              <td className="py-3 pr-4 text-right font-mono font-bold tabular-nums text-slate-900">
                                {formatINR(asset.tco?.total_tco_minor)}
                              </td>
                              <td className="py-3 pl-4 text-slate-600">
                                {asset.warranty ? (
                                  <span>
                                    Warranty until {asset.warranty.end_date}
                                  </span>
                                ) : asset.vehicle ? (
                                  <span>
                                    {asset.vehicle.registration_number} ·{" "}
                                    {asset.vehicle.odometer_km.toLocaleString(
                                      "en-IN"
                                    )}{" "}
                                    km
                                  </span>
                                ) : asset.appliance ? (
                                  <span>
                                    Next service{" "}
                                    {asset.appliance.next_service_due_on}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {showDomainSection("home_maintenance") &&
                    warrantiesData.maintenance_records.length > 0 && (
                      <div className="mt-5 border-t border-slate-100 pt-4">
                        <div className="text-xs font-bold text-slate-800">
                          Maintenance & Service Schedule
                        </div>
                        <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {warrantiesData.maintenance_records
                            .filter((m: any) =>
                              matchesSearch(
                                m.title,
                                m.description,
                                m.status,
                                m.technician_or_vendor,
                                m.scheduled_for
                              )
                            )
                            .map((m: any) => (
                              <div
                                key={m.id}
                                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 text-xs"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="font-semibold text-slate-900">
                                      {m.title}
                                    </span>
                                    <span
                                      className={`shrink-0 font-medium ${
                                        m.status === "COMPLETED"
                                          ? "text-emerald-700"
                                          : "text-amber-700"
                                      }`}
                                    >
                                      {m.status === "COMPLETED"
                                        ? "Completed"
                                        : "Scheduled"}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-slate-600">
                                    {m.description}
                                  </p>
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-[11px] text-slate-500">
                                  <span>
                                    {m.scheduled_for} ·{" "}
                                    <span className="font-mono tabular-nums text-slate-700">
                                      {formatINR(
                                        Number(m.labor_cost_minor) +
                                          Number(m.parts_cost_minor)
                                      )}
                                    </span>
                                  </span>
                                  {m.status !== "COMPLETED" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCompleteMaintenance(m.id)
                                      }
                                      className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                                    >
                                      <Check className="h-3 w-3" />
                                      Mark Completed
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Kitchen Pantry & Laundry Care (Shown in All Domains overview; dedicated tabs use their bespoke showcases above) */}
                {selectedDomain === "all" && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        Kitchen Pantry & Garment Care
                      </h3>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSelectDomain("kitchen_grocery")}
                          className="text-xs font-semibold text-amber-700 hover:underline"
                        >
                          Culinary Showcase →
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectDomain("laundry_clothing")}
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Laundry Valet →
                        </button>
                      </div>
                    </div>

                    {showDomainSection("kitchen_grocery") && (
                      <form
                        onSubmit={handleAddInventoryItem}
                        className="mt-3 grid grid-cols-1 gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Add pantry item (e.g., Basmati Rice)"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:col-span-2"
                        />
                        <input
                          type="number"
                          step="0.5"
                          required
                          placeholder="Qty"
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs tabular-nums"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Item
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 sm:col-span-4">
                          <span>Reorder Threshold:</span>
                          <input
                            type="number"
                            step="0.5"
                            value={newItemThreshold}
                            onChange={(e) =>
                              setNewItemThreshold(e.target.value)
                            }
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-xs tabular-nums"
                          />
                          <span>Unit:</span>
                          <select
                            value={newItemUnit}
                            onChange={(e) => setNewItemUnit(e.target.value)}
                            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs"
                          >
                            <option value="KILOGRAM">kg</option>
                            <option value="LITER">L</option>
                            <option value="PIECE">pcs</option>
                          </select>
                        </div>
                      </form>
                    )}

                    <div className="mt-4 space-y-2.5">
                      {showDomainSection("kitchen_grocery") &&
                        inventory
                          .filter((item) =>
                            matchesSearch(
                              item.name,
                              item.category,
                              item.storage_location,
                              item.stock_status,
                              item.unit
                            )
                          )
                          .map((item) => {
                            const isLow =
                              item.stock_status === "LOW_STOCK" ||
                              item.stock_status === "OUT_OF_STOCK";
                            return (
                              <div
                                key={item.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {item.name}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {item.storage_location} ·{" "}
                                    <span
                                      className={
                                        isLow
                                          ? "font-semibold text-rose-700"
                                          : "text-emerald-700"
                                      }
                                    >
                                      {isLow ? "Low Stock" : "In Stock"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-semibold tabular-nums text-slate-900">
                                    {Number(item.quantity_on_hand).toFixed(1)}{" "}
                                    {item.unit}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAdjustInventory(item.id, -0.5)
                                      }
                                      title="Decrease quantity"
                                      className="rounded border border-slate-200 bg-slate-50 p-1 text-slate-600 hover:bg-slate-100"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleAdjustInventory(item.id, 1.0)
                                      }
                                      title="Increase quantity"
                                      className="rounded border border-slate-200 bg-slate-50 p-1 text-slate-600 hover:bg-slate-100"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </button>
                                    {isLow && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleAdjustInventory(
                                            item.id,
                                            undefined,
                                            5.0
                                          )
                                        }
                                        className="ml-1 rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                                      >
                                        Restock
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                      {showDomainSection("laundry_clothing") &&
                        clothing
                          .filter((c) =>
                            matchesSearch(
                              c.name,
                              c.fabric_type,
                              c.care_instruction,
                              c.brand,
                              c.color
                            )
                          )
                          .map((c) => (
                            <div
                              key={c.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {c.name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {c.fabric_type} · {c.care_instruction} (Max{" "}
                                  {c.max_wash_temp_c}°C) ·{" "}
                                  <span
                                    className={
                                      c.needs_laundry
                                        ? "font-semibold text-amber-700"
                                        : "text-emerald-700"
                                    }
                                  >
                                    {c.needs_laundry
                                      ? "Needs Wash"
                                      : "Clean & Ready"}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleLaundry(c.id)}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
                              >
                                {c.needs_laundry
                                  ? "Mark Clean"
                                  : "Queue Laundry"}
                              </button>
                            </div>
                          ))}
                    </div>
                  </div>
                )}

                {/* Unified Finance & Household Expenses (Shown in All Domains overview; dedicated tab uses SC Private Wealth showcase above) */}
                {selectedDomain === "all" && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Finance & Household Expenses
                        </h3>
                        {showDomainSection("finance_expenses") && (
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Bills & utilities, household expenditure, budget
                            management, payments & payment history, due dates,
                            recurring bills, expense tracking, spending
                            summaries, and financial reminders.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectDomain("finance_expenses")
                          }
                          className="text-xs font-semibold text-emerald-800 hover:underline"
                        >
                          SC Private Wealth Treasury →
                        </button>
                        {showDomainSection("finance_expenses") && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveView("intelligence");
                              runAgentQueryText(
                                "Summarize our pending utility bills, household expenses, monthly budget, recurring bills, payment history, and financial reminders."
                              );
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                          >
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            Ask Finance Agent
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      {showDomainSection("finance_expenses") && (
                        <>
                          {/* Spending Summary & Budget Management Strip */}
                          <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-3">
                            <div>
                              <div className="text-[11px] font-medium text-slate-500">
                                Monthly Budget & Spend Summary
                              </div>
                              <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-slate-900">
                                {formatINR(spendMinor)} /{" "}
                                {formatINR(budgetMinor)}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {budgetUtilizationPct}% utilized ·{" "}
                                {formatINR(Math.max(0, budgetMinor - spendMinor))}{" "}
                                remaining
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] font-medium text-slate-500">
                                Pending Bills & Due Dates
                              </div>
                              <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-amber-700">
                                {formatINR(
                                  summary?.metrics?.pending_bills_amount_minor
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {summary?.metrics?.pending_bills_count ?? 0}{" "}
                                unpaid utility bill(s)
                              </div>
                            </div>
                            <div>
                              <div className="text-[11px] font-medium text-slate-500">
                                Recurring Bills & Subscriptions
                              </div>
                              <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-slate-900">
                                {formatINR(
                                  billsData.subscriptions.reduce(
                                    (acc, s) => acc + Number(s.amount_minor || 0),
                                    0
                                  )
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {billsData.subscriptions.length} active
                                recurring cycle(s)
                              </div>
                            </div>
                          </div>

                          {/* Utility Bills, Due Dates & Payments */}
                          <div className="pt-1 text-xs font-bold text-slate-700">
                            Utility Bills, Due Dates & Payment Status
                          </div>
                          {billsData.items
                            .filter((bill) =>
                              matchesSearch(
                                bill.provider_name,
                                bill.utility_type,
                                bill.consumer_account_number,
                                bill.status,
                                bill.due_date
                              )
                            )
                            .map((bill) => (
                              <div
                                key={bill.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {bill.provider_name} · {bill.utility_type}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Account #{bill.consumer_account_number} · Due{" "}
                                    {bill.due_date}
                                    {bill.consumption_units
                                      ? ` · ${bill.consumption_units} ${bill.consumption_unit_label || "units"}`
                                      : ""}{" "}
                                    ·{" "}
                                    <span
                                      className={
                                        bill.status === "PAID"
                                          ? "font-semibold text-emerald-700"
                                          : "font-semibold text-amber-700"
                                      }
                                    >
                                      {bill.status}
                                    </span>
                                    {bill.paid_at && (
                                      <span className="ml-1 text-slate-400">
                                        (Paid {String(bill.paid_at).slice(0, 10)})
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                  <span className="font-mono font-bold tabular-nums text-slate-900">
                                    {formatINR(bill.amount_due_minor)}
                                  </span>
                                  {bill.status === "PENDING" && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRequestBillPayment(
                                          bill.provider_name
                                        )
                                      }
                                      className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                                    >
                                      Pay Bill
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}

                          {/* Recurring Bills & Active Subscriptions */}
                          <div className="pt-2 text-xs font-bold text-slate-700">
                            Recurring Bills & Subscriptions
                          </div>
                          {billsData.subscriptions
                            .filter((sub) =>
                              matchesSearch(
                                sub.service_name,
                                sub.vendor_name,
                                sub.billing_cycle,
                                sub.next_renewal_date
                              )
                            )
                            .map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2 text-xs"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800">
                                    {sub.service_name}
                                  </span>
                                  <span className="ml-2 text-[11px] text-slate-500">
                                    {sub.billing_cycle} · Due/Renews{" "}
                                    {sub.next_renewal_date}
                                  </span>
                                </div>
                                <span className="font-mono font-semibold tabular-nums text-slate-900">
                                  {formatINR(sub.amount_minor)}
                                </span>
                              </div>
                            ))}

                          {/* Expense Tracking, Expenditure & Payment History */}
                          <div className="pt-2 text-xs font-bold text-slate-700">
                            Expense Tracking & Payment History
                          </div>
                          <form
                            onSubmit={handleAddExpense}
                            className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-4"
                          >
                            <input
                              type="text"
                              required
                              placeholder="Merchant / Payee"
                              value={expenseMerchant}
                              onChange={(e) =>
                                setExpenseMerchant(e.target.value)
                              }
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Expenditure note"
                              value={expenseDesc}
                              onChange={(e) => setExpenseDesc(e.target.value)}
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs"
                            />
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Amount (₹)"
                              value={expenseAmountInr}
                              onChange={(e) =>
                                setExpenseAmountInr(e.target.value)
                              }
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs tabular-nums"
                            />
                            <button
                              type="submit"
                              className="inline-flex items-center justify-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              <Plus className="h-3 w-3" />
                              Log Spend
                            </button>
                          </form>

                          {billsData.expenses
                            .filter((exp) =>
                              matchesSearch(
                                exp.merchant_name,
                                exp.description,
                                exp.category,
                                exp.payment_method,
                                exp.incurred_on
                              )
                            )
                            .slice(0, 6)
                            .map((exp) => (
                              <div
                                key={exp.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2 text-xs"
                              >
                                <div>
                                  <div className="font-medium text-slate-800">
                                    {exp.merchant_name}{" "}
                                    <span className="text-[11px] font-normal text-slate-500">
                                      · {exp.category}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {exp.description} · Paid on{" "}
                                    {exp.incurred_on} via{" "}
                                    {exp.payment_method || "UPI"}
                                    {exp.is_recurring ? " · Recurring" : ""}
                                  </div>
                                </div>
                                <span className="font-mono font-semibold tabular-nums text-slate-900">
                                  {formatINR(exp.amount_minor)}
                                </span>
                              </div>
                            ))}

                          {/* Financial Reminders */}
                          <div className="pt-2 text-xs font-bold text-slate-700">
                            Financial Reminders & Due-Date Alerts
                          </div>
                          <div className="space-y-1.5">
                            {billsData.items
                              .filter((b) => b.status === "PENDING")
                              .map((b) => (
                                <div
                                  key={`rem-bill-${b.id}`}
                                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-950"
                                >
                                  <span>
                                    Upcoming utility bill due:{" "}
                                    <strong>{b.provider_name}</strong> (
                                    {formatINR(b.amount_due_minor)})
                                  </span>
                                  <span className="font-mono text-[11px] font-semibold">
                                    Due {b.due_date}
                                  </span>
                                </div>
                              ))}
                            {billsData.subscriptions
                              .filter((s) => s.is_active)
                              .map((s) => (
                                <div
                                  key={`rem-sub-${s.id}`}
                                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                                >
                                  <span>
                                    Recurring renewal:{" "}
                                    <strong>{s.service_name}</strong> (
                                    {formatINR(s.amount_minor)})
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-500">
                                    Renews {s.next_renewal_date}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </>
                      )}

                      {showDomainSection("documents_warranty") && (
                        <>
                          <div className="pt-2 text-xs font-bold text-slate-700">
                            Warranties & Insurance Policies
                          </div>
                          {warrantiesData.items
                            .filter((w: any) =>
                              matchesSearch(
                                w.provider_name,
                                w.contract_or_policy_number,
                                w.status,
                                w.warranty_type,
                                w.end_date
                              )
                            )
                            .map((w: any) => (
                              <div
                                key={w.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {w.provider_name}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Policy #{w.contract_or_policy_number} ·
                                    Valid until {w.end_date}
                                  </div>
                                </div>
                                <span className="text-[11px] font-semibold text-amber-700">
                                  {w.status}
                                </span>
                              </div>
                            ))}
                          {warrantiesData.insurance_policies
                            .filter((p: any) =>
                              matchesSearch(
                                p.insurer_name,
                                p.policy_number,
                                p.policy_type,
                                p.expires_on
                              )
                            )
                            .map((p: any) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {p.insurer_name}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    Policy #{p.policy_number} · Expires{" "}
                                    {p.expires_on}
                                  </div>
                                </div>
                                <span className="font-mono font-semibold tabular-nums text-slate-900">
                                  {formatINR(p.coverage_limit_minor)}
                                </span>
                              </div>
                            ))}
                        </>
                      )}

                      {showDomainSection("parents_health") && (
                        <>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-xs font-bold text-slate-700">
                              Parents' Health Monitoring (Checkups, Labs &
                              Vitals)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectDomain("parents_health")
                              }
                              className="text-xs font-semibold text-teal-700 hover:underline"
                            >
                              PowerPeak Health Monitor →
                            </button>
                          </div>
                          {(parentsHealthData.items || [])
                            .slice(0, 3)
                            .map((hr: any) => (
                              <div
                                key={hr.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {hr.title}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {hr.parent_name} · Next Due:{" "}
                                    {hr.next_due_or_followup_date ||
                                      hr.recorded_date}
                                  </div>
                                </div>
                                <span className="font-mono text-[11px] font-semibold text-teal-700">
                                  {hr.status}
                                </span>
                              </div>
                            ))}
                        </>
                      )}

                      {showDomainSection("travel_records") && (
                        <>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-xs font-bold text-slate-700">
                              Travel Records Agent (Trips, Bookings & Vouchers)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleSelectDomain("travel_records")
                              }
                              className="text-xs font-semibold text-sky-700 hover:underline"
                            >
                              Eventar Travel Manager →
                            </button>
                          </div>
                          {(travelRecordsData.items || [])
                            .slice(0, 3)
                            .map((tr: any) => (
                              <div
                                key={tr.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2 text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {tr.trip_name} ({tr.destination})
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {tr.booking_reference} · {tr.departure_date}{" "}
                                    to {tr.return_date}
                                  </div>
                                </div>
                                <span className="font-mono text-[11px] font-semibold text-sky-700">
                                  {tr.status}
                                </span>
                              </div>
                            ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 2: DOCUMENT INGESTION & GEMINI PIPELINE */}
          {activeView === "documents" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Document Ingestion & Extraction
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Select a sample household document or upload a file to
                    extract structured records into your household ledger.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {SAMPLE_DOCUMENTS.map((preset) => {
                    const isSelected = docFilename === preset.filename;
                    return (
                      <div
                        key={preset.filename}
                        className={`flex items-center justify-between rounded-lg border p-3 text-xs transition-colors ${
                          isSelected
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setDocFilename(preset.filename);
                            setDocCategory(preset.category);
                            setDocText(preset.content);
                          }}
                          className="flex-1 text-left"
                        >
                          <div className="font-semibold text-slate-900">
                            {preset.label}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">
                            {preset.sublabel}
                          </div>
                        </button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => {
                            setDocFilename(preset.filename);
                            setDocCategory(preset.category);
                            setDocText(preset.content);
                            runDocumentIngestion(
                              preset.filename,
                              preset.category,
                              preset.content
                            );
                          }}
                          className="ml-2 shrink-0 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          Extract
                        </button>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleIngestDocument} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Filename
                      </label>
                      <input
                        type="text"
                        value={docFilename}
                        onChange={(e) => setDocFilename(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Document Category
                      </label>
                      <select
                        value={docCategory}
                        onChange={(e) => setDocCategory(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                      >
                        <option value="UTILITY_BILL">Utility Bill</option>
                        <option value="RECEIPT">Receipt</option>
                        <option value="WARRANTY_DOCUMENT">Warranty</option>
                        <option value="INSURANCE_DOCUMENT">Insurance</option>
                        <option value="MEDICAL_LAB_REPORT">
                          Medical / Lab Report (Parents' Health)
                        </option>
                        <option value="TRAVEL_BOOKING_VOUCHER">
                          Travel Booking / Voucher (Travel Records)
                        </option>
                        <option value="INVOICE">Invoice</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">
                        Upload File
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.txt,.json,.md"
                        onChange={handleFileUploadSelect}
                        className="mt-1 w-full text-xs text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-2.5 file:py-1 file:text-xs file:font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Document Content
                    </label>
                    <textarea
                      rows={5}
                      value={docText}
                      onChange={(e) => setDocText(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-emerald-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <FileCheck2 className="h-4 w-4" />
                    Extract & Save Document
                  </button>
                </form>

                {lastIngestResult && (
                  <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950">
                        {lastIngestResult.detected_category} ·{" "}
                        {lastIngestResult.status === "DUPLICATE_SKIPPED"
                          ? "Duplicate Skipped"
                          : "Saved to Household State"}
                      </span>
                      <span className="font-mono font-semibold tabular-nums text-emerald-900">
                        Confidence:{" "}
                        {(lastIngestResult.overall_confidence * 100).toFixed(0)}
                        %
                      </span>
                    </div>
                    <p className="text-slate-700">
                      {lastIngestResult.envelope?.extracted_text_summary}
                    </p>
                    {lastIngestResult.created_domain_records?.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200/70 pt-2.5">
                        <span className="text-[11px] font-medium text-emerald-900">
                          Updated:{" "}
                          {lastIngestResult.created_domain_records
                            .map((r: any) => r.table.replace("_", " "))
                            .join(", ")}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveView("dashboard")}
                          className="inline-flex items-center gap-1 font-semibold text-emerald-900 hover:underline"
                        >
                          View in Household State
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Document Vault ({documents.length})
                </h3>

                <div className="space-y-2.5">
                  {documents
                    .filter((doc) =>
                      matchesSearch(
                        doc.title,
                        doc.document_type,
                        doc.extracted_text_summary
                      )
                    )
                    .map((doc) => (
                      <div
                        key={doc.id}
                        className="rounded-lg border border-slate-200 p-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {doc.title}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-slate-500">
                            {doc.document_type}
                          </span>
                        </div>
                        <p className="mt-1.5 text-slate-600">
                          {doc.extracted_text_summary}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: MULTI-AGENT & APPROVAL GATE */}
          {activeView === "intelligence" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-7">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Household Intelligence Assistant
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Click any prompt below or ask a question across your
                    warranties, bills, pantry, vehicles, and maintenance.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_AGENT_QUERIES.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => runAgentQueryText(sample.query)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleExecuteAgentQuery} className="space-y-3">
                  <textarea
                    rows={3}
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                    placeholder="Ask a question about your household..."
                    className="w-full rounded-lg border border-slate-300 p-3 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Ask Assistant
                  </button>
                </form>

                {agentResult && (
                  <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                      <span className="font-bold text-slate-900">Response</span>
                      <span
                        className={`font-semibold ${
                          agentResult.status === "AWAITING_HUMAN_APPROVAL"
                            ? "text-amber-700"
                            : "text-emerald-700"
                        }`}
                      >
                        {agentResult.status === "AWAITING_HUMAN_APPROVAL"
                          ? "Awaiting Owner Approval"
                          : "Completed"}
                      </span>
                    </div>

                    <div className="rounded-lg bg-white p-3.5 font-medium leading-relaxed text-slate-800 ring-1 ring-slate-200">
                      {agentResult.synthesized_response}
                    </div>

                    {agentResult.recorded_facts?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-700">
                          Household Facts
                        </div>
                        {agentResult.recorded_facts.map(
                          (fact: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded border border-slate-200 bg-white px-3 py-2"
                            >
                              <span className="font-semibold text-slate-900">
                                {fact.field_or_metric}:
                              </span>{" "}
                              <span className="text-slate-700">
                                {fact.recorded_value}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {agentResult.estimates_or_suggestions?.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="font-bold text-slate-700">
                          Recommendations
                        </div>
                        {agentResult.estimates_or_suggestions.map(
                          (rec: any, idx: number) => (
                            <div
                              key={idx}
                              className="rounded border border-blue-200 bg-blue-50/50 px-3 py-2 text-blue-950"
                            >
                              <div className="font-semibold">{rec.title}</div>
                              <p className="mt-0.5 text-blue-900">
                                {rec.recommendation_text}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Approval Gate
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Consequential actions such as utility bill payments pause
                    here for owner sign-off.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Approval Note
                  </label>
                  <input
                    type="text"
                    value={approvalReason}
                    onChange={(e) => setApprovalReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                  />
                </div>

                {approvals.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    No actions awaiting approval. Click "Pay Electricity Bill"
                    to test the approval flow.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {approvals
                      .filter((item) =>
                        matchesSearch(
                          item.user_query,
                          item.final_response,
                          item.status,
                          item.target_domain
                        )
                      )
                      .map((item) => (
                        <div
                          key={item.run_id}
                          className="rounded-xl border border-slate-200 p-3.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900">
                              {item.user_query}
                            </span>
                            <span
                              className={`shrink-0 font-semibold ${
                                item.status === "AWAITING_HUMAN_APPROVAL"
                                  ? "text-amber-700"
                                  : item.status === "APPROVED_COMPLETED"
                                  ? "text-emerald-700"
                                  : "text-rose-700"
                              }`}
                            >
                              {item.status === "AWAITING_HUMAN_APPROVAL"
                                ? "Pending"
                                : item.status === "APPROVED_COMPLETED"
                                ? "Approved"
                                : "Rejected"}
                            </span>
                          </div>
                          <p className="mt-1.5 text-slate-600">
                            {item.final_response}
                          </p>

                          {item.status === "AWAITING_HUMAN_APPROVAL" && (
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() =>
                                  handleApprovalDecision(item.run_id, true)
                                }
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Approve & Pay
                              </button>
                              <button
                                onClick={() =>
                                  handleApprovalDecision(item.run_id, false)
                                }
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: PROACTIVE ENGINE & EVENT BUS */}
          {activeView === "proactive" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Proactive Alerts
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Automated checks for upcoming bills, expiring warranties,
                      and low stock.
                    </p>
                  </div>
                  <button
                    onClick={handleRunProactiveScan}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Refresh Scan
                  </button>
                </div>

                {!proactiveReport ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    Scanning household records...
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {proactiveReport.insights
                      ?.filter(
                        (ins: any) =>
                          (selectedDomain === "all" ||
                            ins.domain === selectedDomain) &&
                          matchesSearch(
                            ins.title,
                            ins.description,
                            ins.domain,
                            ins.insight_type,
                            ins.metric_value
                          )
                      )
                      .map((ins: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-slate-200 p-3.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">
                              {ins.title}
                            </span>
                            <span className="font-mono font-semibold tabular-nums text-amber-800">
                              {ins.metric_value}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600">
                            {ins.description}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                            <span>Due: {ins.due_or_expiry_date}</span>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectDomain(
                                  ins.domain as DomainFilterId
                                );
                                setActiveView("dashboard");
                              }}
                              className="font-semibold text-slate-700 hover:underline"
                            >
                              Open Domain →
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 lg:col-span-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Event Bus & Activity
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Domain events emitted across document ingestion, inventory
                    updates, and approvals.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handlePublishTestEvent("normal")}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Publish Event
                  </button>
                  <button
                    onClick={() => handlePublishTestEvent("retry")}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Test Retry Recovery
                  </button>
                  <button
                    onClick={() => handlePublishTestEvent("dlq")}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 hover:bg-rose-100"
                  >
                    Test Dead-Letter Queue
                  </button>
                </div>

                {eventsData.dead_letter_queue?.length > 0 && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs">
                    <div className="font-bold text-rose-900">
                      Dead-Letter Queue ({eventsData.dead_letter_queue.length})
                    </div>
                    {eventsData.dead_letter_queue.map((dlq: any) => (
                      <div
                        key={dlq.event_id}
                        className="mt-1 text-[11px] text-rose-800"
                      >
                        {dlq.event_type} — {dlq.failure_reason}
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  {eventsData.items
                    .filter(
                      (ev: any) =>
                        (selectedDomain === "all" ||
                          ev.domain === selectedDomain) &&
                        matchesSearch(
                          ev.event_type,
                          ev.domain,
                          JSON.stringify(ev.payload_json)
                        )
                    )
                    .slice(0, 8)
                    .map((ev: any) => (
                      <div
                        key={ev.id}
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {ev.event_type}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {ev.domain}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: DATASET EVALUATION BENCHMARK */}
          {activeView === "evaluation" && (
            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Dataset & Extraction Benchmark
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Field-level precision, recall, F1, and adversarial safety
                    verification across 10 benchmark household documents.
                  </p>
                </div>
                <button
                  onClick={handleRunEvaluationSuite}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Activity className="h-4 w-4" />
                  {loading ? "Running..." : "Re-Run Evaluation"}
                </button>
              </div>

              {!evalReport ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  Click "Re-Run Evaluation" to benchmark document extraction and
                  agent accuracy.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 p-3.5">
                      <div className="text-xs text-slate-500">
                        Documents Passed
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-700">
                        {evalReport.documents_passed} /{" "}
                        {evalReport.total_documents}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3.5">
                      <div className="text-xs text-slate-500">F1 Score</div>
                      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
                        {(evalReport.overall_f1 * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3.5">
                      <div className="text-xs text-slate-500">
                        Exact Match Rate
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-slate-900">
                        {(evalReport.overall_exact_match_rate * 100).toFixed(1)}
                        %
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3.5">
                      <div className="text-xs text-slate-500">
                        Hallucination Rate
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold tabular-nums text-emerald-700">
                        {(
                          evalReport.overall_hallucinated_field_rate * 100
                        ).toFixed(1)}
                        %
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-2 font-semibold">Document</th>
                          <th className="pb-2 font-semibold">Category</th>
                          <th className="pb-2 font-semibold">Status</th>
                          <th className="pb-2 text-right font-semibold">
                            Exact Match
                          </th>
                          <th className="pb-2 text-right font-semibold">F1</th>
                          <th className="pb-2 pl-4 font-semibold">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {evalReport.document_results
                          ?.filter((doc: any) =>
                            matchesSearch(
                              doc.title,
                              doc.expected_category,
                              doc.actual_status
                            )
                          )
                          .map((doc: any) => (
                            <tr
                              key={doc.document_id}
                              className="hover:bg-slate-50/80"
                            >
                              <td className="py-2.5 pr-4 font-medium text-slate-900">
                                {doc.title}
                              </td>
                              <td className="py-2.5 pr-4 font-mono text-slate-600">
                                {doc.expected_category}
                              </td>
                              <td className="py-2.5 pr-4 font-mono text-slate-600">
                                {doc.actual_status}
                              </td>
                              <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-700">
                                {(doc.metrics.exact_match_rate * 100).toFixed(
                                  1
                                )}
                                %
                              </td>
                              <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-slate-700">
                                {(doc.metrics.f1 * 100).toFixed(1)}%
                              </td>
                              <td className="py-2.5 pl-4">
                                <span
                                  className={`font-semibold ${
                                    doc.passed
                                      ? "text-emerald-700"
                                      : "text-rose-700"
                                  }`}
                                >
                                  {doc.passed ? "Passed" : "Failed"}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
