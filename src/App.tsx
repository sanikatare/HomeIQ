import React, { useEffect, useState, useCallback } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Car,
  CheckCircle2,
  CreditCard,
  Database,
  FileCheck2,
  FileText,
  FolderKanban,
  Layers,
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

const SAMPLE_DOCUMENTS = [
  {
    label: "MSEDCL Electricity Bill (₹4,180.00)",
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
    label: "OnsiteGo Extended Warranty (Bosch Dishwasher)",
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
    label: "Sahyadri Fresh Mart Grocery Receipt (₹1,320.00)",
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
    label: "Star Health Insurance Policy (₹15,00,000)",
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

  // Forms
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("0.500");
  const [newItemThreshold, setNewItemThreshold] = useState("1.500");
  const [newItemUnit, setNewItemUnit] = useState("KILOGRAM");

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
      ] = await Promise.all([
        apiFetch("/api/v1/households/summary", {}, activeToken),
        apiFetch("/api/v1/assets", {}, activeToken),
        apiFetch("/api/v1/inventory", {}, activeToken),
        apiFetch("/api/v1/bills", {}, activeToken),
        apiFetch("/api/v1/warranties", {}, activeToken),
        apiFetch("/api/v1/documents", {}, activeToken),
        apiFetch("/api/v1/intelligence/approvals", {}, activeToken),
        apiFetch("/api/v1/events", {}, activeToken),
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
          category: "SPICES_CONDIMENTS",
          storage_location: "PANTRY",
          quantity_on_hand: newItemQty,
          unit: newItemUnit,
          reorder_threshold: newItemThreshold,
        }),
      });
      setNewItemName("");
      setActionToast(`Added '${created.name}' (${created.stock_status})`);
      await refreshAllData();
    } catch (err: any) {
      setApiError(err);
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

  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    setActionToast(null);
    try {
      const res = await apiFetch("/api/v1/documents/ingest-json", {
        method: "POST",
        body: JSON.stringify({
          filename: docFilename,
          mime_type: "application/pdf",
          document_text: docText,
          expected_category: docCategory,
        }),
      });
      setLastIngestResult(res);
      setActionToast(
        res.idempotency_hit
          ? `Duplicate document skipped (${docFilename})`
          : `Processed ${docFilename} (${res.detected_category})`
      );
      await refreshAllData();
    } catch (err: any) {
      setLastIngestResult(null);
      setApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAgentQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setApiError(null);
    setActionToast(null);
    try {
      const res = await apiFetch("/api/v1/intelligence/execute", {
        method: "POST",
        body: JSON.stringify({
          user_query: agentQuery,
        }),
      });
      setAgentResult(res);
      if (res.requires_human_approval) {
        setActionToast("Action requires owner approval before execution.");
      }
      await refreshAllData();
    } catch (err: any) {
      setAgentResult(null);
      setApiError(err);
    } finally {
      setLoading(false);
    }
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
          ? `Approved and completed (${res.status})`
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
      setActionToast(`${res.insights_count} household insights generated.`);
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
          ? "idem-demo-fixed-key-001"
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
        (f) => f !== null && f !== undefined && String(f).toLowerCase().includes(q)
      );
    },
    [searchQuery]
  );

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
                    <span className="rounded-full bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Monthly Budget & Spend</span>
                    <CreditCard className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {formatINR(summary?.metrics?.recorded_expenses_minor)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    of {formatINR(summary?.metrics?.monthly_budget_minor)}{" "}
                    budget
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Pending Utility Bills</span>
                    <FileText className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {formatINR(summary?.metrics?.pending_bills_amount_minor)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {summary?.metrics?.pending_bills_count ?? 0} pending •{" "}
                    {summary?.metrics?.active_subscriptions_count ?? 0}{" "}
                    subscriptions
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Assets & Coverage</span>
                    <Wrench className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {assets.length} Household Assets
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {warrantiesData.items.length} Warranties •{" "}
                    {warrantiesData.insurance_policies.length} Policies
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Pantry & Action Queue</span>
                    <Package className="h-4 w-4 text-rose-500" />
                  </div>
                  <p className="mt-2 text-lg font-bold text-slate-900">
                    {summary?.metrics?.low_stock_items_count ?? 0} Low-Stock
                    Items
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {summary?.metrics?.pending_approvals_count ?? 0} Pending
                    Approvals
                  </p>
                </div>
              </div>

              {(showDomainSection("home_maintenance") ||
                showDomainSection("vehicle_mobility") ||
                showDomainSection("documents_warranty")) && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900">
                    Assets, Vehicles & Total Cost of Ownership
                  </h3>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="pb-2.5 font-semibold">Asset</th>
                          <th className="pb-2.5 font-semibold">Location</th>
                          <th className="pb-2.5 font-semibold">Status</th>
                          <th className="pb-2.5 font-semibold">Purchase</th>
                          <th className="pb-2.5 font-semibold">Maintenance</th>
                          <th className="pb-2.5 font-semibold">Total Cost</th>
                          <th className="pb-2.5 font-semibold">Coverage</th>
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
                                <div className="font-mono text-[11px] text-slate-400">
                                  {asset.brand} • {asset.model_number}
                                </div>
                              </td>
                              <td className="py-3 pr-4 text-slate-600">
                                {asset.location_room}
                              </td>
                              <td className="py-3 pr-4">
                                <span
                                  className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-semibold ${
                                    asset.status === "OPERATIONAL"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {asset.status}
                                </span>
                              </td>
                              <td className="py-3 pr-4 font-mono">
                                {formatINR(asset.tco?.purchase_price_minor)}
                              </td>
                              <td className="py-3 pr-4 font-mono">
                                {formatINR(asset.tco?.maintenance_cost_minor)}
                              </td>
                              <td className="py-3 pr-4 font-mono font-bold text-slate-900">
                                {formatINR(asset.tco?.total_tco_minor)}
                              </td>
                              <td className="py-3 text-slate-600">
                                {asset.warranty ? (
                                  <span>
                                    Warranty until {asset.warranty.end_date}
                                  </span>
                                ) : asset.vehicle ? (
                                  <span>
                                    {asset.vehicle.registration_number} (
                                    {asset.vehicle.odometer_km} km)
                                  </span>
                                ) : asset.appliance ? (
                                  <span>
                                    Service due{" "}
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
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="text-xs font-bold text-slate-700">
                          Maintenance Schedule
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                              className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900">
                                  {m.title}
                                </span>
                                <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold">
                                  {m.status}
                                </span>
                              </div>
                              <p className="mt-1 text-slate-600">
                                {m.description}
                              </p>
                              <div className="mt-1.5 text-[11px] text-slate-500">
                                Date: {m.scheduled_for} • Cost:{" "}
                                {formatINR(
                                  Number(m.labor_cost_minor) +
                                    Number(m.parts_cost_minor)
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
                {(showDomainSection("kitchen_grocery") ||
                  showDomainSection("laundry_clothing")) && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900">
                      {selectedDomain === "laundry_clothing"
                        ? "Laundry & Garment Care"
                        : "Kitchen Pantry & Garment Care"}
                    </h3>

                    {showDomainSection("kitchen_grocery") && (
                      <form
                        onSubmit={handleAddInventoryItem}
                        className="mt-3 grid grid-cols-1 gap-2.5 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-4"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Item name"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5 text-xs sm:col-span-2"
                        />
                        <input
                          type="number"
                          step="0.1"
                          required
                          placeholder="Qty"
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          className="rounded border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs"
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-1 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 sm:col-span-4">
                          <span>Reorder Threshold:</span>
                          <input
                            type="number"
                            step="0.1"
                            value={newItemThreshold}
                            onChange={(e) =>
                              setNewItemThreshold(e.target.value)
                            }
                            className="w-20 rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-xs"
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

                    <div className="mt-4 space-y-2">
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
                          .map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">
                                {item.name}
                              </span>
                              <span className="ml-2 text-slate-400">
                                {item.storage_location}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-slate-700">
                                {item.quantity_on_hand} {item.unit}
                              </span>
                              <span
                                className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                                  item.stock_status === "LOW_STOCK" ||
                                  item.stock_status === "OUT_OF_STOCK"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {item.stock_status}
                              </span>
                            </div>
                          </div>
                        ))}

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
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">
                                {c.name}
                              </span>
                              <span className="ml-2 text-slate-500">
                                {c.fabric_type}
                              </span>
                            </div>
                            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-800">
                              {c.care_instruction} ({c.max_wash_temp_c}°C)
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {(showDomainSection("bills_utilities") ||
                  showDomainSection("expense_budget") ||
                  showDomainSection("documents_warranty")) && (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                    <h3 className="text-sm font-bold text-slate-900">
                      Bills, Subscriptions & Expenses
                    </h3>

                    <div className="mt-3 space-y-2">
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
                            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-900">
                                {bill.provider_name}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Account #{bill.consumer_account_number} • Due{" "}
                                {bill.due_date}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-slate-900">
                                {formatINR(bill.amount_due_minor)}
                              </div>
                              <span
                                className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                                  bill.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {bill.status}
                              </span>
                            </div>
                          </div>
                        ))}

                      {showDomainSection("expense_budget") && (
                        <>
                          <div className="pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                              className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">
                                  {sub.service_name}
                                </span>
                                <span className="ml-2 text-slate-500">
                                  Renews {sub.next_renewal_date}
                                </span>
                              </div>
                              <span className="font-mono font-semibold text-slate-900">
                                {formatINR(sub.amount_minor)}
                              </span>
                            </div>
                          ))}

                          <div className="pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Recent Expenses
                          </div>
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
                              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs"
                            >
                              <div>
                                <div className="font-medium text-slate-800">
                                  {exp.merchant_name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {exp.description}
                                </div>
                              </div>
                              <span className="font-mono font-semibold text-slate-900">
                                {formatINR(exp.amount_minor)}
                              </span>
                            </div>
                          ))}
                        </>
                      )}

                      {showDomainSection("documents_warranty") && (
                        <>
                          <div className="pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
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
                              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {w.provider_name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Policy #{w.contract_or_policy_number} • Valid
                                  until {w.end_date}
                                </div>
                              </div>
                              <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800">
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
                              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs"
                            >
                              <div>
                                <div className="font-semibold text-slate-900">
                                  {p.insurer_name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Policy #{p.policy_number} • Expires{" "}
                                  {p.expires_on}
                                </div>
                              </div>
                              <span className="font-mono font-semibold text-slate-900">
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
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
                <h2 className="text-base font-bold text-slate-900">
                  Document Ingestion & Extraction
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Sample Documents
                  </label>
                  <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SAMPLE_DOCUMENTS.map((preset) => (
                      <button
                        key={preset.filename}
                        type="button"
                        onClick={() => {
                          setDocFilename(preset.filename);
                          setDocCategory(preset.category);
                          setDocText(preset.content);
                        }}
                        className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                          docFilename === preset.filename
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <div className="font-semibold">{preset.label}</div>
                      </button>
                    ))}
                  </div>
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
                      rows={6}
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
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950">
                        {lastIngestResult.detected_category} (
                        {lastIngestResult.status})
                      </span>
                      <span className="rounded bg-emerald-200 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-900">
                        Confidence:{" "}
                        {(lastIngestResult.overall_confidence * 100).toFixed(0)}
                        %
                      </span>
                    </div>
                    <p className="mt-2 text-slate-700">
                      {lastIngestResult.envelope?.extracted_text_summary}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
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
                        <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
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
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
                <h2 className="text-base font-bold text-slate-900">
                  Household Intelligence Assistant
                </h2>

                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_AGENT_QUERIES.map((sample, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAgentQuery(sample.query)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
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
                        className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                          agentResult.status === "AWAITING_HUMAN_APPROVAL"
                            ? "bg-amber-200 text-amber-950"
                            : "bg-emerald-200 text-emerald-950"
                        }`}
                      >
                        {agentResult.status}
                      </span>
                    </div>

                    <div className="rounded-lg bg-white p-3 font-medium text-slate-800 ring-1 ring-slate-200">
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

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
                <h3 className="text-base font-bold text-slate-900">
                  Approval Gate
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Decision Note
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
                    No actions awaiting approval.
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
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                              item.status === "AWAITING_HUMAN_APPROVAL"
                                ? "bg-amber-100 text-amber-900"
                                : item.status === "APPROVED_COMPLETED"
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-rose-100 text-rose-900"
                            }`}
                          >
                            {item.status}
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
                              Approve
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
              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    Proactive Alerts
                  </h2>
                  <button
                    onClick={handleRunProactiveScan}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Scan Household
                  </button>
                </div>

                {!proactiveReport ? (
                  <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    Click "Scan Household" to check upcoming bills, renewals,
                    and maintenance.
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
                          className="rounded-lg border border-slate-200 p-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              {ins.title}
                            </span>
                            <span className="rounded bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-900">
                              {ins.metric_value}
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600">
                            {ins.description}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6">
                <h2 className="text-base font-bold text-slate-900">
                  Event Bus & Activity
                </h2>

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
                        className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
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
            <div className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-900">
                  Dataset & Extraction Benchmark
                </h2>
                <button
                  onClick={handleRunEvaluationSuite}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  <Activity className="h-4 w-4" />
                  {loading ? "Running..." : "Run Evaluation"}
                </button>
              </div>

              {!evalReport ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  Click "Run Evaluation" to benchmark document extraction and
                  agent accuracy.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-[11px] text-slate-500">
                        Documents Passed
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold text-emerald-700">
                        {evalReport.documents_passed} /{" "}
                        {evalReport.total_documents}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-[11px] text-slate-500">F1 Score</div>
                      <div className="mt-1 font-mono text-lg font-bold text-slate-900">
                        {(evalReport.overall_f1 * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-[11px] text-slate-500">
                        Exact Match Rate
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold text-slate-900">
                        {(evalReport.overall_exact_match_rate * 100).toFixed(1)}
                        %
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="text-[11px] text-slate-500">
                        Hallucination Rate
                      </div>
                      <div className="mt-1 font-mono text-lg font-bold text-emerald-700">
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
                          <th className="pb-2 font-semibold">Exact Match</th>
                          <th className="pb-2 font-semibold">F1</th>
                          <th className="pb-2 font-semibold">Result</th>
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
                          <tr key={doc.document_id}>
                            <td className="py-2.5 pr-4 font-medium text-slate-900">
                              {doc.title}
                            </td>
                            <td className="py-2.5 pr-4 font-mono">
                              {doc.expected_category}
                            </td>
                            <td className="py-2.5 pr-4 font-mono">
                              {doc.actual_status}
                            </td>
                            <td className="py-2.5 pr-4 font-mono">
                              {(doc.metrics.exact_match_rate * 100).toFixed(1)}%
                            </td>
                            <td className="py-2.5 pr-4 font-mono">
                              {(doc.metrics.f1 * 100).toFixed(1)}%
                            </td>
                            <td className="py-2.5">
                              <span className="rounded bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                                {doc.passed ? "PASSED" : "FAILED"}
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
