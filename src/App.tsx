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
  | "bills_utilities"
  | "expense_budget"
  | "vehicle_mobility"
  | "documents_warranty";

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
    id: "bills_utilities",
    label: "Bills & Utilities",
    defaultQuery: "Please pay our pending MSEDCL electricity bill now.",
    icon: Zap,
  },
  {
    id: "expense_budget",
    label: "Expense & Budget",
    defaultQuery:
      "Summarize our recorded household expenses and active recurring subscriptions.",
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
];

const SAMPLE_AGENT_QUERIES = [
  {
    label: "Dishwasher Warranty & Cost",
    query:
      "Is our Bosch dishwasher covered under warranty, when is maintenance due, and what is its total cost?",
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
    label: "Monthly Expenses & Subscriptions",
    query:
      "Summarize our recorded household expenses and active recurring subscriptions.",
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
  }>({ items: [], subscriptions: [], expenses: [] });
  const [warrantiesData, setWarrantiesData] = useState<{
    items: any[];
    insurance_policies: any[];
    maintenance_records: any[];
  }>({ items: [], insurance_policies: [], maintenance_records: [] });
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

  const [expenseMerchant, setExpenseMerchant] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmountInr, setExpenseAmountInr] = useState("");

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
      domainId === "laundry_clothing"
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
        }),
      });
      setExpenseMerchant("");
      setExpenseDesc("");
      setExpenseAmountInr("");
      setActionToast(
        `Logged expense of ${formatINR(created.amount_minor)} at ${created.merchant_name}`
      );
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
                selectedDomain !== "laundry_clothing" && (
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
                    const maintRecords = warrantiesData.maintenance_records.filter(
                      (m: any) =>
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

              {/* Assets, Vehicles & Maintenance Table (Shown in All Domains, Vehicle, or Warranty tabs) */}
              {selectedDomain !== "home_maintenance" &&
                (showDomainSection("vehicle_mobility") ||
                  showDomainSection("documents_warranty")) && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Assets, Vehicles & Total Cost of Ownership
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveView("documents")}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      + Upload Warranty or Invoice
                    </button>
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
                          .filter((a) => {
                            if (selectedDomain === "vehicle_mobility")
                              return a.category === "VEHICLE";
                            if (selectedDomain === "home_maintenance")
                              return a.category !== "VEHICLE";
                            return true;
                          })
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

                {/* Bills, Subscriptions, Expenses & Policies */}
                {(showDomainSection("bills_utilities") ||
                  showDomainSection("expense_budget") ||
                  showDomainSection("documents_warranty")) && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <h3 className="text-sm font-bold text-slate-900">
                      Bills, Subscriptions & Expenses
                    </h3>

                    <div className="mt-3 space-y-2.5">
                      {(showDomainSection("bills_utilities") ||
                        showDomainSection("expense_budget")) &&
                        billsData.items
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
                                  {bill.provider_name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Account #{bill.consumer_account_number} · Due{" "}
                                  {bill.due_date} ·{" "}
                                  <span
                                    className={
                                      bill.status === "PAID"
                                        ? "font-semibold text-emerald-700"
                                        : "font-semibold text-amber-700"
                                    }
                                  >
                                    {bill.status}
                                  </span>
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

                      {showDomainSection("expense_budget") && (
                        <>
                          <div className="pt-2 text-xs font-bold text-slate-700">
                            Subscriptions
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
                                    Renews {sub.next_renewal_date}
                                  </span>
                                </div>
                                <span className="font-mono font-semibold tabular-nums text-slate-900">
                                  {formatINR(sub.amount_minor)}
                                </span>
                              </div>
                            ))}

                          <div className="pt-2 text-xs font-bold text-slate-700">
                            Recent Expenses
                          </div>
                          <form
                            onSubmit={handleAddExpense}
                            className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:grid-cols-4"
                          >
                            <input
                              type="text"
                              required
                              placeholder="Merchant name"
                              value={expenseMerchant}
                              onChange={(e) =>
                                setExpenseMerchant(e.target.value)
                              }
                              className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Note (optional)"
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
                                exp.payment_method
                              )
                            )
                            .slice(0, 4)
                            .map((exp) => (
                              <div
                                key={exp.id}
                                className="flex items-center justify-between rounded-lg border border-slate-100 px-3.5 py-2 text-xs"
                              >
                                <div>
                                  <div className="font-medium text-slate-800">
                                    {exp.merchant_name}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {exp.description}
                                  </div>
                                </div>
                                <span className="font-mono font-semibold tabular-nums text-slate-900">
                                  {formatINR(exp.amount_minor)}
                                </span>
                              </div>
                            ))}
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
