import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  AccountingWorkspace,
  AccountWallet,
  AccountWalletType,
  AccountingParty,
  AccountingPartyType,
  AccountingProject,
  AccountingProjectStatus,
  AccountingTransaction,
  AccountingTxType,
  AccountingProfile,
  AccountingDirector,
  AccountingDirectorAllocation,
  AccountingPaidByMode,
  Project,
  ServiceVoucher,
} from "../types";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Users,
  FolderKanban,
  Landmark,
  BarChart3,
  Settings,
  X,
  Plus,
  Edit3,
  Trash2,
  Printer,
  Download,
  Upload,
  Search,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  Receipt,
  Building2,
  Phone,
  MapPin,
  Mail,
  FileText,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  Briefcase,
  Coins,
  Percent,
  UserCheck,
  Calculator,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { createDefaultAccountingWorkspace } from "../services/api";

interface BusinessAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: AccountingWorkspace | null;
  onSaveWorkspace: (ws: AccountingWorkspace) => Promise<void>;
  boqProjects: Project[];
  serviceVouchers: ServiceVoucher[];
  currentUserEmail?: string;
  currentUserId?: string;
  currentUserName?: string;
  readOnly?: boolean;
}

type AccountsTab =
  | "dashboard"
  | "summary"
  | "transactions"
  | "parties"
  | "directors"
  | "projects"
  | "accounts"
  | "reports"
  | "settings";

const INCOME_CATEGORIES = [
  "Consultancy Fee",
  "Client Payment",
  "Advance Received",
  "Design & Drawing Fee",
  "Soil Test / Survey",
  "Site Supervision",
  "BOQ & Estimation",
  "Other Income",
];

const EXPENSE_CATEGORIES = [
  "Tea & Snacks (Cha/Biscuit)",
  "House Rent",
  "Utility & Internet",
  "Material",
  "Labour",
  "Sub-Consultant Fee",
  "Office Rent",
  "Salary",
  "Software & Tools",
  "Transport",
  "Food",
  "Printing & Stationery",
  "Equipment",
  "Tax / VAT",
  "Other Expense",
];

const ALL_CATEGORIES = Array.from(new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]));

const todayStr = () => new Date().toISOString().slice(0, 10);
const currentMonthPrefix = () => new Date().toISOString().slice(0, 7);

function fmtBdt(n: number | undefined | null): string {
  const val = Number(n || 0);
  const abs = Math.abs(val).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return val < 0 ? `-৳${abs}` : `৳${abs}`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export const BusinessAccountsModal: React.FC<BusinessAccountsModalProps> = ({
  isOpen,
  onClose,
  workspace,
  onSaveWorkspace,
  boqProjects,
  serviceVouchers,
  currentUserEmail,
  currentUserId,
  currentUserName,
  readOnly = false,
}) => {
  const { isLight } = useTheme();
  const [activeTab, setActiveTab] = useState<AccountsTab>("dashboard");
  const [statusBanner, setStatusBanner] = useState<{ msg: string; type: "success" | "error" | "info" } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Confirm Dialog State (replaces window.confirm)
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Transaction Form State
  const [txId, setTxId] = useState<string>("");
  const [txType, setTxType] = useState<AccountingTxType>("income");
  const [txDate, setTxDate] = useState<string>(todayStr());
  const [txDesc, setTxDesc] = useState<string>("");
  const [txAmount, setTxAmount] = useState<string>("");
  const [txCategory, setTxCategory] = useState<string>("Consultancy Fee");
  const [txAccountId, setTxAccountId] = useState<string>("");
  const [txToAccountId, setTxToAccountId] = useState<string>("");
  const [txPartyId, setTxPartyId] = useState<string>("");
  const [txProjectId, setTxProjectId] = useState<string>("");
  const [txNote, setTxNote] = useState<string>("");
  const [txPaidByMode, setTxPaidByMode] = useState<AccountingPaidByMode>("wallet");
  const [txPaidByDirectorId, setTxPaidByDirectorId] = useState<string>("");
  const [txFromDirectorId, setTxFromDirectorId] = useState<string>("");
  const [txToDirectorId, setTxToDirectorId] = useState<string>("");
  const [txDirectorSettlementMode, setTxDirectorSettlementMode] = useState<"firm_to_director" | "director_to_firm">("firm_to_director");
  const [txSplitEnabled, setTxSplitEnabled] = useState<boolean>(false);
  const [txSplitAllocations, setTxSplitAllocations] = useState<{ directorId: string; amount: string }[]>([]);

  // Inline Quick Add Shop/Party inside Transaction form
  const [quickPartyOpen, setQuickPartyOpen] = useState(false);
  const [quickPartyName, setQuickPartyName] = useState("");
  const [quickPartyType, setQuickPartyType] = useState<AccountingPartyType>("Vendor / Shop");

  // Transaction Filters
  const [txSearch, setTxSearch] = useState<string>("");
  const [txFilterType, setTxFilterType] = useState<string>("all");
  const [txFilterCategory, setTxFilterCategory] = useState<string>("all");
  const [txFilterAccount, setTxFilterAccount] = useState<string>("all");
  const [txFilterProject, setTxFilterProject] = useState<string>("all");
  const [txFilterMonth, setTxFilterMonth] = useState<string>("");

  // Party Form & Filters & Statement Drawer
  const [partyId, setPartyId] = useState<string>("");
  const [partyType, setPartyType] = useState<AccountingPartyType>("Client");
  const [partyName, setPartyName] = useState<string>("");
  const [partyPhone, setPartyPhone] = useState<string>("");
  const [partyEmail, setPartyEmail] = useState<string>("");
  const [partyAddress, setPartyAddress] = useState<string>("");
  const [partyOpening, setPartyOpening] = useState<string>("0");
  const [partyDirection, setPartyDirection] = useState<"receivable" | "payable">("receivable");
  const [partySearch, setPartySearch] = useState<string>("");
  const [partyFilterType, setPartyFilterType] = useState<string>("all");
  const [partyBalanceFilter, setPartyBalanceFilter] = useState<"all" | "receivable" | "payable">("all");
  const [selectedStatementPartyId, setSelectedStatementPartyId] = useState<string | null>(null);

  // Directors & Profit Distribution State
  const [dirId, setDirId] = useState<string>("");
  const [dirName, setDirName] = useState<string>("");
  const [dirDesignation, setDirDesignation] = useState<string>("Director");
  const [dirPhone, setDirPhone] = useState<string>("");
  const [dirSharePercent, setDirSharePercent] = useState<string>("25");
  const [dirSalaryAmount, setDirSalaryAmount] = useState<string>("0");
  const [dirOpeningBalance, setDirOpeningBalance] = useState<string>("0");
  const [selectedDirectorLedgerId, setSelectedDirectorLedgerId] = useState<string | null>(null);

  const [quickDirTransferFrom, setQuickDirTransferFrom] = useState<string>("");
  const [quickDirTransferTo, setQuickDirTransferTo] = useState<string>("");
  const [quickDirTransferAmt, setQuickDirTransferAmt] = useState<string>("");
  const [quickDirTransferDate, setQuickDirTransferDate] = useState<string>(todayStr());
  const [quickDirTransferNote, setQuickDirTransferNote] = useState<string>("");

  const [dirSettleDirectorId, setDirSettleDirectorId] = useState<string>("");
  const [dirSettleMode, setDirSettleMode] = useState<"director_to_firm" | "firm_to_director">("director_to_firm");
  const [dirSettleWalletId, setDirSettleWalletId] = useState<string>("");
  const [dirSettleAmt, setDirSettleAmt] = useState<string>("");
  const [dirSettleDate, setDirSettleDate] = useState<string>(todayStr());
  const [dirSettleNote, setDirSettleNote] = useState<string>("");

  const [distFrom, setDistFrom] = useState<string>("");
  const [distTo, setDistTo] = useState<string>("");
  const [distMode, setDistMode] = useState<"salary_plus_percent" | "percent_only" | "salary_weighted_percent">("salary_plus_percent");
  const [distSalaryMonths, setDistSalaryMonths] = useState<string>("1");
  const [distPoolOverride, setDistPoolOverride] = useState<string>("");

  // Project Form State
  const [projId, setProjId] = useState<string>("");
  const [projName, setProjName] = useState<string>("");
  const [projClientId, setProjClientId] = useState<string>("");
  const [projContract, setProjContract] = useState<string>("0");
  const [projStatus, setProjStatus] = useState<AccountingProjectStatus>("Active");
  const [projNote, setProjNote] = useState<string>("");

  // Account Wallet Form State
  const [acctId, setAcctId] = useState<string>("");
  const [acctName, setAcctName] = useState<string>("");
  const [acctType, setAcctType] = useState<AccountWalletType>("Cash");
  const [acctOpening, setAcctOpening] = useState<string>("0");
  const [acctNumber, setAcctNumber] = useState<string>("");

  // Report Filters
  const [reportFrom, setReportFrom] = useState<string>(`${currentMonthPrefix()}-01`);
  const [reportTo, setReportTo] = useState<string>(todayStr());

  // Profile Editor State
  const [profileForm, setProfileForm] = useState<AccountingProfile>({
    name: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    signatoryName: "",
  });

  // Inline Quick Edit Business Name in Modal Header
  const [editingHeaderName, setEditingHeaderName] = useState(false);
  const [headerNameDraft, setHeaderNameDraft] = useState("");

  // Print Mode Target
  const [printTarget, setPrintTarget] = useState<"report" | "statement" | "director" | "profit_sheet" | "summary_hisab">("report");

  const restoreInputRef = useRef<HTMLInputElement>(null);

  const ws: AccountingWorkspace = useMemo(() => {
    if (workspace) return workspace;
    return createDefaultAccountingWorkspace(
      { uid: currentUserId || "local", email: currentUserEmail || "" },
      currentUserName
    );
  }, [workspace, currentUserId, currentUserEmail, currentUserName]);

  useEffect(() => {
    if (ws.profile) {
      setProfileForm({
        name: ws.profile.name || "",
        tagline: ws.profile.tagline || "",
        address: ws.profile.address || "",
        phone: ws.profile.phone || "",
        email: ws.profile.email || currentUserEmail || "",
        signatoryName: ws.profile.signatoryName || currentUserName || "",
      });
      setHeaderNameDraft(ws.profile.name || "");
    }
  }, [ws.profile, currentUserEmail, currentUserName]);

  useEffect(() => {
    if (ws.accounts.length > 0 && !txAccountId) {
      setTxAccountId(ws.accounts[0].id);
    }
    if (ws.accounts.length > 1 && !txToAccountId) {
      setTxToAccountId(ws.accounts[1].id);
    }
  }, [ws.accounts, txAccountId, txToAccountId]);

  const notify = (msg: string, type: "success" | "error" | "info" = "success") => {
    setStatusBanner({ msg, type });
    setTimeout(() => {
      setStatusBanner((prev) => (prev?.msg === msg ? null : prev));
    }, 3500);
  };

  const commitWorkspace = async (next: AccountingWorkspace, successMsg?: string) => {
    if (readOnly) {
      notify("Viewer accounts are read-only and cannot modify financial records.", "error");
      return;
    }
    setIsSyncing(true);
    try {
      await onSaveWorkspace({
        ...next,
        updatedAt: new Date().toISOString(),
      });
      if (successMsg) notify(successMsg, "success");
    } catch (err: any) {
      notify(err?.message || "Failed to save accounting changes.", "error");
    } finally {
      setIsSyncing(false);
    }
  };

  // ---------------- CALCULATIONS ----------------

  const directorsList = useMemo<AccountingDirector[]>(() => {
    return Array.isArray(ws.directors) ? ws.directors : [];
  }, [ws.directors]);

  useEffect(() => {
    if (directorsList.length > 0) {
      if (!txPaidByDirectorId) setTxPaidByDirectorId(directorsList[0].id);
      if (!txFromDirectorId) setTxFromDirectorId(directorsList[0].id);
      if (!txToDirectorId) setTxToDirectorId((directorsList[1] || directorsList[0]).id);
      if (!quickDirTransferFrom) setQuickDirTransferFrom(directorsList[0].id);
      if (!quickDirTransferTo) setQuickDirTransferTo((directorsList[1] || directorsList[0]).id);
      if (!dirSettleDirectorId) setDirSettleDirectorId(directorsList[0].id);
    }
    if (ws.accounts.length > 0 && !dirSettleWalletId) {
      setDirSettleWalletId(ws.accounts[0].id);
    }
  }, [directorsList, ws.accounts, txPaidByDirectorId, txFromDirectorId, txToDirectorId, quickDirTransferFrom, quickDirTransferTo, dirSettleDirectorId, dirSettleWalletId]);

  const accountBalances = useMemo(() => {
    const map: Record<string, { balance: number; inflow: number; outflow: number }> = {};
    ws.accounts.forEach((a) => {
      map[a.id] = { balance: Number(a.opening || 0), inflow: 0, outflow: 0 };
    });
    ws.transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "opening") {
        if (map[t.accountId]) {
          map[t.accountId].balance += amt;
          map[t.accountId].inflow += amt;
        }
      } else if (t.type === "income") {
        // Subtract any portion directly taken/retained by directors from client bill
        const dirTaken = (t.directorAllocations || []).reduce((s, a) => s + Number(a.amount || 0), 0);
        const walletDeposit = Math.max(0, amt - dirTaken);
        if (map[t.accountId] && walletDeposit > 0) {
          map[t.accountId].balance += walletDeposit;
          map[t.accountId].inflow += walletDeposit;
        }
      } else if (t.type === "expense") {
        // Only deduct from wallet if paid from wallet (not on Baki/credit and not paid out-of-pocket by director)
        if (t.paidByMode !== "credit" && t.paidByMode !== "director" && map[t.accountId]) {
          map[t.accountId].balance -= amt;
          map[t.accountId].outflow += amt;
        }
      } else if (t.type === "due_settlement") {
        // Paying shop/supplier Baki from wallet (or by director -> 0 wallet change)
        if (t.paidByMode !== "director" && map[t.accountId]) {
          map[t.accountId].balance -= amt;
          map[t.accountId].outflow += amt;
        }
      } else if (t.type === "transfer") {
        if (map[t.accountId]) {
          map[t.accountId].balance -= amt;
          map[t.accountId].outflow += amt;
        }
        if (t.toAccountId && map[t.toAccountId]) {
          map[t.toAccountId].balance += amt;
          map[t.toAccountId].inflow += amt;
        }
      } else if (t.type === "director_settlement") {
        if (map[t.accountId]) {
          if (t.directorSettlementMode === "director_to_firm") {
            map[t.accountId].balance += amt;
            map[t.accountId].inflow += amt;
          } else {
            map[t.accountId].balance -= amt;
            map[t.accountId].outflow += amt;
          }
        }
      }
    });
    return map;
  }, [ws.accounts, ws.transactions]);

  const totalAssets = useMemo(() => {
    const vals = Object.values(accountBalances) as Array<{ balance: number; inflow: number; outflow: number }>;
    return vals.reduce((sum, item) => sum + item.balance, 0);
  }, [accountBalances]);

  const overallTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let creditExpenseTotal = 0;
    let directorPaidExpenseTotal = 0;
    ws.transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") income += amt;
      else if (t.type === "expense") {
        expense += amt;
        if (t.paidByMode === "credit") creditExpenseTotal += amt;
        if (t.paidByMode === "director") directorPaidExpenseTotal += amt;
      }
    });
    const net = income - expense;
    const margin = income > 0 ? (net / income) * 100 : 0;
    return { income, expense, net, margin, creditExpenseTotal, directorPaidExpenseTotal };
  }, [ws.transactions]);

  const getPartyBalance = (p: AccountingParty): number => {
    // + = Receivable (they owe us), - = Payable / Baki (we owe them)
    let bal = (p.direction === "payable" ? -1 : 1) * Number(p.opening || 0);
    ws.transactions
      .filter((t) => t.partyId === p.id)
      .forEach((t) => {
        const amt = Number(t.amount || 0);
        if (t.type === "income") {
          bal -= amt;
        } else if (t.type === "due_settlement") {
          bal += amt;
        } else if (t.type === "expense") {
          if (t.paidByMode === "credit") {
            // Buying on Baki increases what we owe the shop/supplier
            bal -= amt;
          } else if (!t.paidByMode) {
            // Legacy transaction behavior compatibility
            bal += amt;
          }
          // Immediate cash or director-paid direct expense settles on the spot -> 0 net change to due
        }
      });
    return bal;
  };

  const duesTotals = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    ws.parties.forEach((p) => {
      const b = getPartyBalance(p);
      if (b > 0) receivable += b;
      else if (b < 0) payable += -b;
    });
    return { receivable, payable };
  }, [ws.parties, ws.transactions]);

  // Per-Director Accounting Ledger Statistics
  const directorStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        opening: number;
        paidForFirm: number;
        givenToDirectors: number;
        receivedFromDirectors: number;
        clientCashKept: number;
        profitSalaryCredited: number;
        withdrawnFromFirm: number;
        depositedToFirm: number;
        netBalance: number;
      }
    > = {};

    directorsList.forEach((d) => {
      map[d.id] = {
        opening: Number(d.openingBalance || 0),
        paidForFirm: 0,
        givenToDirectors: 0,
        receivedFromDirectors: 0,
        clientCashKept: 0,
        profitSalaryCredited: 0,
        withdrawnFromFirm: 0,
        depositedToFirm: 0,
        netBalance: Number(d.openingBalance || 0),
      };
    });

    ws.transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if ((t.type === "expense" || t.type === "due_settlement") && t.paidByMode === "director" && t.paidByDirectorId && map[t.paidByDirectorId]) {
        map[t.paidByDirectorId].paidForFirm += amt;
      } else if (t.type === "director_transfer") {
        if (t.fromDirectorId && map[t.fromDirectorId]) {
          map[t.fromDirectorId].givenToDirectors += amt;
        }
        if (t.toDirectorId && map[t.toDirectorId]) {
          map[t.toDirectorId].receivedFromDirectors += amt;
        }
      } else if (t.type === "income" && Array.isArray(t.directorAllocations)) {
        t.directorAllocations.forEach((alloc) => {
          if (alloc.directorId && map[alloc.directorId]) {
            map[alloc.directorId].clientCashKept += Number(alloc.amount || 0);
          }
        });
      } else if (t.type === "profit_distribution" && Array.isArray(t.directorAllocations)) {
        t.directorAllocations.forEach((alloc) => {
          if (alloc.directorId && map[alloc.directorId]) {
            map[alloc.directorId].profitSalaryCredited += Number(alloc.amount || 0);
          }
        });
      } else if (t.type === "director_settlement") {
        const targetDir = t.paidByDirectorId || t.fromDirectorId || t.toDirectorId;
        if (targetDir && map[targetDir]) {
          if (t.directorSettlementMode === "director_to_firm") {
            map[targetDir].depositedToFirm += amt;
          } else {
            map[targetDir].withdrawnFromFirm += amt;
          }
        }
      }
    });

    Object.keys(map).forEach((id) => {
      const s = map[id];
      s.netBalance =
        s.opening +
        s.paidForFirm +
        s.givenToDirectors +
        s.profitSalaryCredited +
        s.depositedToFirm -
        s.receivedFromDirectors -
        s.clientCashKept -
        s.withdrawnFromFirm;
    });

    return map;
  }, [directorsList, ws.transactions]);

  const directorSummaryTotals = useMemo(() => {
    let firmOwesDirectors = 0;
    let directorsOweFirm = 0;
    directorsList.forEach((d) => {
      const bal = directorStatsMap[d.id]?.netBalance || 0;
      if (bal > 0) firmOwesDirectors += bal;
      else if (bal < 0) directorsOweFirm += -bal;
    });
    return { firmOwesDirectors, directorsOweFirm };
  }, [directorsList, directorStatsMap]);

  // Complete Baki, Credit Expenses & Directors Spend/Taken/Payable Overview
  const hisabOverview = useMemo(() => {
    const creditExpenses = [...ws.transactions]
      .filter((t) => t.type === "expense" && t.paidByMode === "credit")
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));

    const directorPaidExpenses = [...ws.transactions]
      .filter((t) => t.type === "expense" && t.paidByMode === "director")
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));

    const payablesList = ws.parties
      .map((p) => ({ party: p, balance: getPartyBalance(p) }))
      .filter((x) => x.balance < -0.005)
      .map((x) => ({ party: x.party, bakiAmount: Math.abs(x.balance) }))
      .sort((a, b) => b.bakiAmount - a.bakiAmount);

    const receivablesList = ws.parties
      .map((p) => ({ party: p, balance: getPartyBalance(p) }))
      .filter((x) => x.balance > 0.005)
      .map((x) => ({ party: x.party, recvAmount: x.balance }))
      .sort((a, b) => b.recvAmount - a.recvAmount);

    const directorRows = directorsList.map((d) => {
      const st = directorStatsMap[d.id] || {
        opening: Number(d.openingBalance || 0),
        paidForFirm: 0,
        givenToDirectors: 0,
        receivedFromDirectors: 0,
        clientCashKept: 0,
        profitSalaryCredited: 0,
        withdrawnFromFirm: 0,
        depositedToFirm: 0,
        netBalance: Number(d.openingBalance || 0),
      };
      const totalGivenOrSpent = st.paidForFirm + st.givenToDirectors + st.depositedToFirm;
      const totalTaken = st.clientCashKept + st.receivedFromDirectors + st.withdrawnFromFirm;
      return {
        director: d,
        ...st,
        totalGivenOrSpent,
        totalTaken,
      };
    });

    return {
      creditExpenses,
      directorPaidExpenses,
      payablesList,
      receivablesList,
      directorRows,
    };
  }, [ws.transactions, ws.parties, directorsList, directorStatsMap]);

  // Selected Director Ledger Statement Rows
  const selectedDirectorLedger = useMemo(() => {
    if (!selectedDirectorLedgerId) return null;
    const dir = directorsList.find((d) => d.id === selectedDirectorLedgerId);
    if (!dir) return null;

    let running = Number(dir.openingBalance || 0);
    const dirTxs = ws.transactions
      .filter((t) => {
        if ((t.type === "expense" || t.type === "due_settlement") && t.paidByMode === "director" && t.paidByDirectorId === dir.id) return true;
        if (t.type === "director_transfer" && (t.fromDirectorId === dir.id || t.toDirectorId === dir.id)) return true;
        if ((t.type === "income" || t.type === "profit_distribution") && t.directorAllocations?.some((a) => a.directorId === dir.id && Number(a.amount || 0) > 0)) return true;
        if (t.type === "director_settlement" && (t.paidByDirectorId === dir.id || t.fromDirectorId === dir.id || t.toDirectorId === dir.id)) return true;
        return false;
      })
      .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || "").localeCompare(b.createdAt || ""));

    const rows = dirTxs.map((t) => {
      let credit = 0; // + Firm owes director more
      let debit = 0;  // - Director took/received cash
      let summaryLabel = t.desc;

      if ((t.type === "expense" || t.type === "due_settlement") && t.paidByMode === "director" && t.paidByDirectorId === dir.id) {
        credit = Number(t.amount || 0);
        const partyNm = t.partyId ? ws.parties.find((p) => p.id === t.partyId)?.name : "";
        summaryLabel = `${t.type === "due_settlement" ? "Paid Baki" : "Paid Expense"}: ${t.desc}${partyNm ? ` (${partyNm})` : ""}`;
      } else if (t.type === "director_transfer") {
        const fromNm = directorsList.find((d) => d.id === t.fromDirectorId)?.name || "Director";
        const toNm = directorsList.find((d) => d.id === t.toDirectorId)?.name || "Director";
        if (t.fromDirectorId === dir.id) {
          credit = Number(t.amount || 0);
          summaryLabel = `Gave cash to ${toNm}${t.desc ? ` — ${t.desc}` : ""}`;
        }
        if (t.toDirectorId === dir.id) {
          debit = Number(t.amount || 0);
          summaryLabel = `Received cash from ${fromNm}${t.desc ? ` — ${t.desc}` : ""}`;
        }
      } else if (t.type === "income") {
        const alloc = t.directorAllocations?.find((a) => a.directorId === dir.id);
        debit = Number(alloc?.amount || 0);
        summaryLabel = `Retained from Client Bill (Total ৳${Number(t.amount || 0).toLocaleString()}): ${t.desc}`;
      } else if (t.type === "profit_distribution") {
        const alloc = t.directorAllocations?.find((a) => a.directorId === dir.id);
        credit = Number(alloc?.amount || 0);
        summaryLabel = `${t.desc}${alloc?.salaryAmount ? ` [Salary ৳${alloc.salaryAmount} + Profit ৳${alloc.profitShareAmount || 0}]` : ""}`;
      } else if (t.type === "director_settlement") {
        const acctNm = ws.accounts.find((a) => a.id === t.accountId)?.name || "Office Wallet";
        if (t.directorSettlementMode === "director_to_firm") {
          credit = Number(t.amount || 0);
          summaryLabel = `Deposited cash (Joma) to ${acctNm}${t.desc ? ` — ${t.desc}` : ""}`;
        } else {
          debit = Number(t.amount || 0);
          summaryLabel = `Paid by Firm (${acctNm})${t.desc ? ` — ${t.desc}` : ""}`;
        }
      }

      running = running + credit - debit;
      return {
        id: t.id,
        date: t.date,
        label: summaryLabel,
        credit,
        debit,
        running,
      };
    });

    return {
      director: dir,
      opening: Number(dir.openingBalance || 0),
      rows,
      finalBalance: running,
    };
  }, [selectedDirectorLedgerId, directorsList, ws.transactions, ws.parties, ws.accounts]);

  // Profit Distribution Calculation Engine (Salary Amount + Share Percentage)
  const profitDistCalculation = useMemo(() => {
    const periodTxs = ws.transactions.filter(
      (t) => (!distFrom || t.date >= distFrom) && (!distTo || t.date <= distTo)
    );
    let periodIncome = 0;
    let periodExpense = 0;
    periodTxs.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") periodIncome += amt;
      else if (t.type === "expense") periodExpense += amt;
    });
    const operatingProfit = periodIncome - periodExpense;
    const poolBase = distPoolOverride.trim() !== "" ? Number(distPoolOverride || 0) : operatingProfit;
    const monthsMult = Math.max(0, Number(distSalaryMonths || 1));

    const totalSharePct = directorsList.reduce((s, d) => s + Number(d.sharePercent || 0), 0);
    const totalSalaryBase = directorsList.reduce((s, d) => s + Number(d.salaryAmount || 0) * monthsMult, 0);

    const remainingProfitAfterSalary = poolBase - totalSalaryBase;

    const rows = directorsList.map((d) => {
      const periodSalary = Math.round(Number(d.salaryAmount || 0) * monthsMult * 100) / 100;
      const salaryWeightPct =
        totalSalaryBase > 0
          ? (periodSalary / totalSalaryBase) * 100
          : directorsList.length > 0
          ? 100 / directorsList.length
          : 0;
      const directPct = totalSharePct > 0 ? Number(d.sharePercent || 0) : directorsList.length > 0 ? 100 / directorsList.length : 0;

      let effectivePct = directPct;
      let salaryEntitlement = 0;
      let profitShare = 0;

      if (distMode === "salary_plus_percent") {
        salaryEntitlement = periodSalary;
        effectivePct = directPct;
        profitShare = remainingProfitAfterSalary * (effectivePct / 100);
      } else if (distMode === "salary_weighted_percent") {
        effectivePct = salaryWeightPct;
        salaryEntitlement = 0;
        profitShare = poolBase * (effectivePct / 100);
      } else {
        effectivePct = directPct;
        salaryEntitlement = 0;
        profitShare = poolBase * (effectivePct / 100);
      }

      salaryEntitlement = Math.round(salaryEntitlement * 100) / 100;
      profitShare = Math.round(profitShare * 100) / 100;
      const totalEarned = Math.round((salaryEntitlement + profitShare) * 100) / 100;
      const currentLedgerBal = directorStatsMap[d.id]?.netBalance || 0;
      const projectedNetPayable = Math.round((currentLedgerBal + totalEarned) * 100) / 100;

      return {
        director: d,
        effectivePct,
        salaryEntitlement,
        profitShare,
        totalEarned,
        currentLedgerBal,
        projectedNetPayable,
      };
    });

    return {
      periodIncome,
      periodExpense,
      operatingProfit,
      poolBase,
      totalSharePct,
      totalSalaryBase,
      remainingProfitAfterSalary,
      rows,
    };
  }, [ws.transactions, directorsList, distFrom, distTo, distMode, distSalaryMonths, distPoolOverride, directorStatsMap]);

  const getProjectStats = (p: AccountingProject) => {
    const txs = ws.transactions.filter((t) => t.projectId === p.id);
    let received = 0;
    let expense = 0;
    txs.forEach((t) => {
      if (t.type === "income") received += Number(t.amount || 0);
      else if (t.type === "expense") expense += Number(t.amount || 0);
    });
    const net = received - expense;
    const contract = Number(p.contract || 0);
    const due = Math.max(0, contract - received);
    const pct = contract > 0 ? Math.min(100, Math.round((received / contract) * 100)) : 0;
    return { received, expense, net, due, pct, txCount: txs.length };
  };

  // Monthly 6-Month Cashflow Chart Data
  const monthlyCashflow = useMemo(() => {
    const months: { key: string; label: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months.push({ key, label, income: 0, expense: 0 });
    }
    ws.transactions.forEach((t) => {
      const mKey = (t.date || "").slice(0, 7);
      const target = months.find((m) => m.key === mKey);
      if (target) {
        if (t.type === "income") target.income += Number(t.amount || 0);
        if (t.type === "expense") target.expense += Number(t.amount || 0);
      }
    });
    const maxVal = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
    return { months, maxVal };
  }, [ws.transactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    return [...ws.transactions]
      .filter((t) => {
        if (txFilterType !== "all" && t.type !== txFilterType) return false;
        if (txFilterCategory !== "all" && t.category !== txFilterCategory) return false;
        if (
          txFilterAccount !== "all" &&
          t.accountId !== txFilterAccount &&
          t.toAccountId !== txFilterAccount
        ) {
          return false;
        }
        if (txFilterProject !== "all" && t.projectId !== txFilterProject) return false;
        if (txFilterMonth && !(t.date || "").startsWith(txFilterMonth)) return false;
        if (q) {
          const pName = ws.parties.find((p) => p.id === t.partyId)?.name || "";
          const prName = ws.projects.find((p) => p.id === t.projectId)?.name || "";
          const acName = ws.accounts.find((a) => a.id === t.accountId)?.name || "";
          const dirNames = [
            directorsList.find((d) => d.id === t.paidByDirectorId)?.name || "",
            directorsList.find((d) => d.id === t.fromDirectorId)?.name || "",
            directorsList.find((d) => d.id === t.toDirectorId)?.name || "",
          ].join(" ");
          const hay = `${t.desc} ${t.category} ${t.note || ""} ${pName} ${prName} ${acName} ${dirNames}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [
    ws.transactions,
    ws.parties,
    ws.projects,
    ws.accounts,
    directorsList,
    txSearch,
    txFilterType,
    txFilterCategory,
    txFilterAccount,
    txFilterProject,
    txFilterMonth,
  ]);

  const filteredTxTotals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === "income") income += Number(t.amount || 0);
      if (t.type === "expense") expense += Number(t.amount || 0);
    });
    return { income, expense, net: income - expense };
  }, [filteredTransactions]);

  // Filtered Parties
  const filteredParties = useMemo(() => {
    const q = partySearch.trim().toLowerCase();
    return ws.parties.filter((p) => {
      if (partyFilterType !== "all" && p.type !== partyFilterType) return false;
      const b = getPartyBalance(p);
      if (partyBalanceFilter === "receivable" && b <= 0) return false;
      if (partyBalanceFilter === "payable" && b >= 0) return false;
      if (q) {
        const hay = `${p.name} ${p.phone || ""} ${p.email || ""} ${p.address || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ws.parties, ws.transactions, partySearch, partyFilterType, partyBalanceFilter]);

  // Selected Party Statement Rows
  const selectedPartyStatement = useMemo(() => {
    if (!selectedStatementPartyId) return null;
    const party = ws.parties.find((p) => p.id === selectedStatementPartyId);
    if (!party) return null;

    const openingSigned = (party.direction === "payable" ? -1 : 1) * Number(party.opening || 0);
    let running = openingSigned;

    const txs = ws.transactions
      .filter((t) => t.partyId === party.id)
      .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.createdAt || "").localeCompare(b.createdAt || ""));

    const rows = txs.map((t) => {
      const amt = Number(t.amount || 0);
      let labelSource = ws.accounts.find((a) => a.id === t.accountId)?.name || "Account";
      if (t.type === "income") {
        running -= amt;
      } else if (t.type === "due_settlement") {
        running += amt;
        if (t.paidByMode === "director") {
          const dNm = directorsList.find((d) => d.id === t.paidByDirectorId)?.name || "Director";
          labelSource = `Paid Baki (${dNm})`;
        } else {
          labelSource = `Paid Baki (${labelSource})`;
        }
      } else if (t.type === "expense") {
        if (t.paidByMode === "credit") {
          running -= amt;
          labelSource = "On Credit (Baki)";
        } else if (!t.paidByMode) {
          running += amt;
        } else if (t.paidByMode === "director") {
          const dNm = directorsList.find((d) => d.id === t.paidByDirectorId)?.name || "Director";
          labelSource = `Spot Paid (${dNm})`;
        } else {
          labelSource = `Spot Paid (${labelSource})`;
        }
      }
      const projName = ws.projects.find((p) => p.id === t.projectId)?.name || "";
      return { ...t, acctName: labelSource, projName, running };
    });

    return { party, openingSigned, rows, finalBalance: running };
  }, [selectedStatementPartyId, ws.parties, ws.transactions, ws.accounts, ws.projects, directorsList]);

  // Report Data for selected period
  const reportData = useMemo(() => {
    const txs = ws.transactions.filter(
      (t) => (!reportFrom || t.date >= reportFrom) && (!reportTo || t.date <= reportTo)
    );
    let income = 0;
    let expense = 0;
    const incomeByCat: Record<string, number> = {};
    const expenseByCat: Record<string, number> = {};
    const byProject: Record<string, { name: string; income: number; expense: number }> = {};

    txs.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "income") {
        income += amt;
        const cat = t.category || "Other Income";
        incomeByCat[cat] = (incomeByCat[cat] || 0) + amt;
      } else if (t.type === "expense") {
        expense += amt;
        const cat = t.category || "Other Expense";
        expenseByCat[cat] = (expenseByCat[cat] || 0) + amt;
      }
      if (t.projectId && (t.type === "income" || t.type === "expense")) {
        const pr = ws.projects.find((p) => p.id === t.projectId);
        const key = t.projectId;
        if (!byProject[key]) {
          byProject[key] = { name: pr?.name || "Unknown Project", income: 0, expense: 0 };
        }
        if (t.type === "income") byProject[key].income += amt;
        if (t.type === "expense") byProject[key].expense += amt;
      }
    });

    const net = income - expense;
    const margin = income > 0 ? (net / income) * 100 : 0;

    return {
      txs,
      income,
      expense,
      net,
      margin,
      incomeCats: Object.entries(incomeByCat).sort((a, b) => b[1] - a[1]),
      expenseCats: Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]),
      projectRows: Object.values(byProject).sort((a, b) => b.income - b.expense - (a.income - a.expense)),
    };
  }, [ws.transactions, ws.projects, reportFrom, reportTo]);

  // ---------------- FORM HANDLERS ----------------

  const resetTxForm = () => {
    setTxId("");
    setTxType("income");
    setTxDate(todayStr());
    setTxDesc("");
    setTxAmount("");
    setTxCategory("Consultancy Fee");
    setTxAccountId(ws.accounts[0]?.id || "");
    setTxToAccountId(ws.accounts[1]?.id || ws.accounts[0]?.id || "");
    setTxPartyId("");
    setTxProjectId("");
    setTxNote("");
    setTxPaidByMode("wallet");
    setTxPaidByDirectorId(directorsList[0]?.id || "");
    setTxFromDirectorId(directorsList[0]?.id || "");
    setTxToDirectorId((directorsList[1] || directorsList[0])?.id || "");
    setTxDirectorSettlementMode("firm_to_director");
    setTxSplitEnabled(false);
    setTxSplitAllocations([]);
    setQuickPartyOpen(false);
    setQuickPartyName("");
  };

  const handleQuickAddParty = async () => {
    const trimmed = quickPartyName.trim();
    if (!trimmed) {
      notify("Enter a shop or party name first.", "error");
      return;
    }
    const newParty: AccountingParty = {
      id: genId("pty"),
      type: quickPartyType,
      name: trimmed,
      opening: 0,
      direction: quickPartyType === "Client" ? "receivable" : "payable",
    };
    await commitWorkspace(
      { ...ws, parties: [newParty, ...ws.parties] },
      `Added "${trimmed}" (${quickPartyType}).`
    );
    setTxPartyId(newParty.id);
    setQuickPartyName("");
    setQuickPartyOpen(false);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      notify("Please enter an amount greater than 0.", "error");
      return;
    }
    if (!txDesc.trim()) {
      notify("Please enter transaction particulars / description.", "error");
      return;
    }

    if (txType === "transfer") {
      if (!txAccountId || !txToAccountId || txToAccountId === txAccountId) {
        notify("Please select different source and destination accounts for transfer.", "error");
        return;
      }
    } else if (txType === "director_transfer") {
      if (!txFromDirectorId || !txToDirectorId || txFromDirectorId === txToDirectorId) {
        notify("Please select two different directors for inter-director transfer.", "error");
        return;
      }
    } else if (txType === "director_settlement") {
      if (!txPaidByDirectorId || !txAccountId) {
        notify("Please select both a director and an office wallet.", "error");
        return;
      }
    } else if (txType === "expense") {
      if (txPaidByMode === "wallet" && !txAccountId) {
        notify("Please select an office wallet.", "error");
        return;
      }
      if (txPaidByMode === "credit" && !txPartyId) {
        notify("For On Credit (Baki), please select a Shop / Vendor / Supplier so the Baki is tracked properly.", "error");
        return;
      }
      if (txPaidByMode === "director" && !txPaidByDirectorId) {
        notify("Please select which Director paid this bill.", "error");
        return;
      }
    } else if (txType === "due_settlement") {
      if (!txPartyId) {
        notify("Please select the Shop / Supplier / Party whose Baki is being settled.", "error");
        return;
      }
      if (txPaidByMode === "director" && !txPaidByDirectorId) {
        notify("Please select the Director who paid this Baki.", "error");
        return;
      }
      if (txPaidByMode !== "director" && !txAccountId) {
        notify("Please select an office wallet.", "error");
        return;
      }
    } else if (txType === "income") {
      if (txSplitEnabled) {
        const cleanAllocs = txSplitAllocations
          .filter((a) => a.directorId && Number(a.amount || 0) > 0)
          .map((a) => ({ directorId: a.directorId, amount: Math.round(Number(a.amount) * 100) / 100 }));
        const totalAllocated = cleanAllocs.reduce((s, a) => s + a.amount, 0);
        if (totalAllocated > amountNum + 0.001) {
          notify("Director kept amounts exceed total client bill received.", "error");
          return;
        }
        const depositAmt = amountNum - totalAllocated;
        if (depositAmt > 0 && !txAccountId) {
          notify("Please select the office wallet where remaining cash is deposited (Joma).", "error");
          return;
        }
      } else if (!txAccountId) {
        notify("Please select an office wallet.", "error");
        return;
      }
    } else {
      if (!txAccountId) {
        notify("Please select a valid account.", "error");
        return;
      }
    }

    const cleanDirectorAllocs: AccountingDirectorAllocation[] | undefined =
      txType === "income" && txSplitEnabled
        ? txSplitAllocations
            .filter((a) => a.directorId && Number(a.amount || 0) > 0)
            .map((a) => ({
              directorId: a.directorId,
              amount: Math.round(Number(a.amount) * 100) / 100,
            }))
        : txId && txType === "profit_distribution"
        ? ws.transactions.find((x) => x.id === txId)?.directorAllocations
        : undefined;

    const now = new Date().toISOString();
    const existing = txId ? ws.transactions.find((t) => t.id === txId) : null;
    const item: AccountingTransaction = {
      id: txId || genId("tx"),
      type: txType,
      date: txDate || todayStr(),
      desc: txDesc.trim(),
      amount: Math.round(amountNum * 100) / 100,
      category:
        txType === "transfer"
          ? "Account Transfer"
          : txType === "opening"
          ? "Opening Balance"
          : txType === "due_settlement"
          ? "Baki / Due Settlement"
          : txType === "director_transfer"
          ? "Director Transfer"
          : txType === "director_settlement"
          ? "Director Settlement"
          : txCategory,
      accountId:
        txType === "director_transfer" || (txType === "expense" && txPaidByMode !== "wallet")
          ? ""
          : txAccountId,
      toAccountId: txType === "transfer" ? txToAccountId : null,
      partyId: txPartyId || null,
      projectId: txProjectId || null,
      note: txNote.trim(),
      paidByMode:
        txType === "expense"
          ? txPaidByMode
          : txType === "due_settlement"
          ? txPaidByMode === "director"
            ? "director"
            : "wallet"
          : undefined,
      paidByDirectorId:
        (txType === "expense" || txType === "due_settlement") && txPaidByMode === "director"
          ? txPaidByDirectorId
          : txType === "director_settlement"
          ? txPaidByDirectorId
          : null,
      fromDirectorId: txType === "director_transfer" ? txFromDirectorId : null,
      toDirectorId: txType === "director_transfer" ? txToDirectorId : null,
      directorSettlementMode: txType === "director_settlement" ? txDirectorSettlementMode : undefined,
      directorAllocations: cleanDirectorAllocs && cleanDirectorAllocs.length > 0 ? cleanDirectorAllocs : undefined,
      linkedVoucherId: existing?.linkedVoucherId,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const nextTxs = txId
      ? ws.transactions.map((t) => (t.id === txId ? item : t))
      : [item, ...ws.transactions];

    await commitWorkspace({ ...ws, transactions: nextTxs }, txId ? "Transaction updated." : "Transaction saved.");
    resetTxForm();
  };

  const handleEditTx = (t: AccountingTransaction) => {
    setTxId(t.id);
    setTxType(t.type);
    setTxDate(t.date);
    setTxDesc(t.desc);
    setTxAmount(String(t.amount));
    setTxCategory(t.category || "Consultancy Fee");
    setTxAccountId(t.accountId || ws.accounts[0]?.id || "");
    setTxToAccountId(t.toAccountId || "");
    setTxPartyId(t.partyId || "");
    setTxProjectId(t.projectId || "");
    setTxNote(t.note || "");
    setTxPaidByMode(t.paidByMode || "wallet");
    setTxPaidByDirectorId(t.paidByDirectorId || directorsList[0]?.id || "");
    setTxFromDirectorId(t.fromDirectorId || directorsList[0]?.id || "");
    setTxToDirectorId(t.toDirectorId || (directorsList[1] || directorsList[0])?.id || "");
    setTxDirectorSettlementMode(t.directorSettlementMode || "firm_to_director");
    if (t.type === "income" && t.directorAllocations && t.directorAllocations.length > 0) {
      setTxSplitEnabled(true);
      setTxSplitAllocations(
        t.directorAllocations.map((a) => ({
          directorId: a.directorId,
          amount: String(a.amount),
        }))
      );
    } else {
      setTxSplitEnabled(false);
      setTxSplitAllocations([]);
    }
    setActiveTab("transactions");
  };

  const handleDeleteTx = (t: AccountingTransaction) => {
    setConfirmAction({
      title: "Delete Transaction",
      message: `Delete "${t.desc}" (${fmtBdt(t.amount)}) dated ${t.date}? Account, party & director balances will recalculate automatically.`,
      confirmLabel: "Delete Transaction",
      danger: true,
      onConfirm: async () => {
        const nextTxs = ws.transactions.filter((x) => x.id !== t.id);
        await commitWorkspace({ ...ws, transactions: nextTxs }, "Transaction deleted.");
        if (txId === t.id) resetTxForm();
      },
    });
  };

  // ---------------- DIRECTOR & PROFIT DISTRIBUTION HANDLERS ----------------

  const resetDirectorForm = () => {
    setDirId("");
    setDirName("");
    setDirDesignation("Director");
    setDirPhone("");
    setDirSharePercent("25");
    setDirSalaryAmount("0");
    setDirOpeningBalance("0");
  };

  const handleSaveDirector = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirName.trim()) {
      notify("Director / Partner name is required.", "error");
      return;
    }
    const item: AccountingDirector = {
      id: dirId || genId("dir"),
      name: dirName.trim(),
      designation: dirDesignation.trim() || "Director",
      phone: dirPhone.trim(),
      sharePercent: Math.max(0, Number(dirSharePercent || 0)),
      salaryAmount: Math.max(0, Number(dirSalaryAmount || 0)),
      openingBalance: Number(dirOpeningBalance || 0),
    };
    const nextDirs = dirId
      ? directorsList.map((d) => (d.id === dirId ? item : d))
      : [...directorsList, item];

    await commitWorkspace(
      { ...ws, directors: nextDirs },
      dirId ? "Director updated." : `Director "${item.name}" added.`
    );
    resetDirectorForm();
  };

  const handleQuickAddFourDirectors = async () => {
    const sampleDirs: AccountingDirector[] = [
      { id: genId("dir") + "_a", name: "Director A", designation: "Managing Director", sharePercent: 25, salaryAmount: 25000, openingBalance: 0 },
      { id: genId("dir") + "_b", name: "Director B", designation: "Technical Director", sharePercent: 25, salaryAmount: 25000, openingBalance: 0 },
      { id: genId("dir") + "_c", name: "Director C", designation: "Finance Director", sharePercent: 25, salaryAmount: 25000, openingBalance: 0 },
      { id: genId("dir") + "_d", name: "Director D", designation: "Operations Director", sharePercent: 25, salaryAmount: 25000, openingBalance: 0 },
    ];
    await commitWorkspace(
      { ...ws, directors: [...directorsList, ...sampleDirs] },
      "Added 4 Directors (A, B, C, D) — edit their names, salaries, and % shares anytime."
    );
  };

  const handleSyncPercentFromSalary = async () => {
    if (directorsList.length === 0) return;
    const totalSal = directorsList.reduce((s, d) => s + Number(d.salaryAmount || 0), 0);
    if (totalSal <= 0) {
      notify("Set salary amounts greater than 0 first so percentages can be derived.", "error");
      return;
    }
    const nextDirs = directorsList.map((d) => ({
      ...d,
      sharePercent: Math.round(((Number(d.salaryAmount || 0) / totalSal) * 100) * 100) / 100,
    }));
    await commitWorkspace(
      { ...ws, directors: nextDirs },
      "Director profit percentages synced automatically from salary ratio!"
    );
  };

  const handleDeleteDirector = (d: AccountingDirector) => {
    const isLinked = ws.transactions.some(
      (t) =>
        t.paidByDirectorId === d.id ||
        t.fromDirectorId === d.id ||
        t.toDirectorId === d.id ||
        t.directorAllocations?.some((a) => a.directorId === d.id)
    );
    if (isLinked) {
      notify("This director has ledger transactions. Delete or reassign those entries first.", "error");
      return;
    }
    setConfirmAction({
      title: "Delete Director",
      message: `Remove "${d.name}" from Directors & Profit Share list?`,
      confirmLabel: "Delete Director",
      danger: true,
      onConfirm: async () => {
        await commitWorkspace(
          { ...ws, directors: directorsList.filter((x) => x.id !== d.id) },
          "Director removed."
        );
        if (selectedDirectorLedgerId === d.id) setSelectedDirectorLedgerId(null);
      },
    });
  };

  const handleQuickDirectorTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(quickDirTransferAmt);
    if (!quickDirTransferFrom || !quickDirTransferTo || quickDirTransferFrom === quickDirTransferTo) {
      notify("Select two different directors for handover.", "error");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      notify("Enter a valid transfer amount greater than 0.", "error");
      return;
    }
    const fromName = directorsList.find((d) => d.id === quickDirTransferFrom)?.name || "Director";
    const toName = directorsList.find((d) => d.id === quickDirTransferTo)?.name || "Director";
    const now = new Date().toISOString();
    const tx: AccountingTransaction = {
      id: genId("tx"),
      type: "director_transfer",
      date: quickDirTransferDate || todayStr(),
      desc: quickDirTransferNote.trim() || `${fromName} gave cash to ${toName}`,
      amount: Math.round(amt * 100) / 100,
      category: "Director Transfer",
      accountId: "",
      fromDirectorId: quickDirTransferFrom,
      toDirectorId: quickDirTransferTo,
      note: quickDirTransferNote.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await commitWorkspace(
      { ...ws, transactions: [tx, ...ws.transactions] },
      `Recorded transfer: ${fromName} → ${toName} (${fmtBdt(amt)})`
    );
    setQuickDirTransferAmt("");
    setQuickDirTransferNote("");
  };

  const handleQuickDirectorSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(dirSettleAmt);
    if (!dirSettleDirectorId || !dirSettleWalletId) {
      notify("Select a director and an office wallet.", "error");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      notify("Enter a valid settlement amount greater than 0.", "error");
      return;
    }
    const dirObj = directorsList.find((d) => d.id === dirSettleDirectorId);
    const walletObj = ws.accounts.find((a) => a.id === dirSettleWalletId);
    const now = new Date().toISOString();
    const tx: AccountingTransaction = {
      id: genId("tx"),
      type: "director_settlement",
      date: dirSettleDate || todayStr(),
      desc:
        dirSettleNote.trim() ||
        (dirSettleMode === "director_to_firm"
          ? `${dirObj?.name || "Director"} deposited cash (Joma) to ${walletObj?.name || "Office"}`
          : `Firm paid ${dirObj?.name || "Director"} from ${walletObj?.name || "Office"}`),
      amount: Math.round(amt * 100) / 100,
      category: "Director Settlement",
      accountId: dirSettleWalletId,
      paidByDirectorId: dirSettleDirectorId,
      directorSettlementMode: dirSettleMode,
      note: dirSettleNote.trim(),
      createdAt: now,
      updatedAt: now,
    };
    await commitWorkspace(
      { ...ws, transactions: [tx, ...ws.transactions] },
      "Director settlement recorded & synced!"
    );
    setDirSettleAmt("");
    setDirSettleNote("");
  };

  const handlePostProfitDistribution = () => {
    if (directorsList.length === 0) {
      notify("Add directors first before posting profit distribution.", "error");
      return;
    }
    const positiveRows = profitDistCalculation.rows.filter((r) => Math.abs(r.totalEarned) > 0.001);
    if (positiveRows.length === 0) {
      notify("Calculated distribution amounts are all ৳0. Check period profit or salaries.", "info");
      return;
    }
    const totalDistributed = positiveRows.reduce((s, r) => s + r.totalEarned, 0);
    setConfirmAction({
      title: "Post Profit & Salary Distribution",
      message: `Credit total ${fmtBdt(totalDistributed)} across ${positiveRows.length} director ledger(s) for ${distFrom || "Start"} to ${distTo || todayStr()}?`,
      confirmLabel: "Post to Ledgers",
      onConfirm: async () => {
        const now = new Date().toISOString();
        const tx: AccountingTransaction = {
          id: genId("tx"),
          type: "profit_distribution",
          date: distTo || todayStr(),
          desc: `Profit & Salary Distribution (${distFrom || "All"} to ${distTo || todayStr()})`,
          amount: Math.round(totalDistributed * 100) / 100,
          category: "Profit Distribution",
          accountId: "",
          directorAllocations: positiveRows.map((r) => ({
            directorId: r.director.id,
            amount: r.totalEarned,
            salaryAmount: r.salaryEntitlement,
            profitShareAmount: r.profitShare,
            percentUsed: Math.round(r.effectivePct * 100) / 100,
          })),
          note: `Mode: ${distMode} · Pool: ${fmtBdt(profitDistCalculation.poolBase)}`,
          createdAt: now,
          updatedAt: now,
        };
        await commitWorkspace(
          { ...ws, transactions: [tx, ...ws.transactions] },
          "Profit & salary distribution posted to every director's ledger!"
        );
      },
    });
  };

  const resetPartyForm = () => {
    setPartyId("");
    setPartyType("Client");
    setPartyName("");
    setPartyPhone("");
    setPartyEmail("");
    setPartyAddress("");
    setPartyOpening("0");
    setPartyDirection("receivable");
  };

  const handleSaveParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      notify("Party name is required.", "error");
      return;
    }
    const item: AccountingParty = {
      id: partyId || genId("pty"),
      type: partyType,
      name: partyName.trim(),
      phone: partyPhone.trim(),
      email: partyEmail.trim(),
      address: partyAddress.trim(),
      opening: Math.max(0, parseFloat(partyOpening) || 0),
      direction: partyDirection,
    };

    const nextParties = partyId
      ? ws.parties.map((p) => (p.id === partyId ? item : p))
      : [item, ...ws.parties];

    await commitWorkspace({ ...ws, parties: nextParties }, partyId ? "Party updated." : "Party added.");
    resetPartyForm();
  };

  const handleDeleteParty = (p: AccountingParty) => {
    if (ws.transactions.some((t) => t.partyId === p.id)) {
      notify("This party has linked transactions. Delete or unlink those transactions first to preserve ledger history.", "error");
      return;
    }
    setConfirmAction({
      title: "Delete Party",
      message: `Remove "${p.name}" from your Clients & Suppliers directory?`,
      confirmLabel: "Delete Party",
      danger: true,
      onConfirm: async () => {
        await commitWorkspace(
          { ...ws, parties: ws.parties.filter((x) => x.id !== p.id) },
          "Party removed."
        );
        if (selectedStatementPartyId === p.id) setSelectedStatementPartyId(null);
      },
    });
  };

  const resetProjectForm = () => {
    setProjId("");
    setProjName("");
    setProjClientId("");
    setProjContract("0");
    setProjStatus("Active");
    setProjNote("");
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projName.trim()) {
      notify("Project name is required.", "error");
      return;
    }
    const existing = projId ? ws.projects.find((p) => p.id === projId) : null;
    const item: AccountingProject = {
      id: projId || genId("prj"),
      name: projName.trim(),
      clientId: projClientId || null,
      contract: Math.max(0, parseFloat(projContract) || 0),
      status: projStatus,
      note: projNote.trim(),
      linkedBoqProjectId: existing?.linkedBoqProjectId,
    };

    const nextProjects = projId
      ? ws.projects.map((p) => (p.id === projId ? item : p))
      : [item, ...ws.projects];

    await commitWorkspace({ ...ws, projects: nextProjects }, projId ? "Project updated." : "Project added.");
    resetProjectForm();
  };

  const handleDeleteProject = (p: AccountingProject) => {
    if (ws.transactions.some((t) => t.projectId === p.id)) {
      notify("This project has linked transactions. Keep it or unlink its transactions first.", "error");
      return;
    }
    setConfirmAction({
      title: "Delete Project",
      message: `Delete project "${p.name}" from accounting tracker?`,
      confirmLabel: "Delete Project",
      danger: true,
      onConfirm: async () => {
        await commitWorkspace(
          { ...ws, projects: ws.projects.filter((x) => x.id !== p.id) },
          "Project deleted."
        );
      },
    });
  };

  const resetAccountForm = () => {
    setAcctId("");
    setAcctName("");
    setAcctType("Cash");
    setAcctOpening("0");
    setAcctNumber("");
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acctName.trim()) {
      notify("Account name is required.", "error");
      return;
    }
    const item: AccountWallet = {
      id: acctId || genId("acc"),
      name: acctName.trim(),
      type: acctType,
      opening: parseFloat(acctOpening) || 0,
      accountNumber: acctNumber.trim(),
    };

    const nextAccounts = acctId
      ? ws.accounts.map((a) => (a.id === acctId ? item : a))
      : [...ws.accounts, item];

    await commitWorkspace({ ...ws, accounts: nextAccounts }, acctId ? "Account updated." : "Account added.");
    resetAccountForm();
  };

  const handleDeleteAccount = (a: AccountWallet) => {
    if (ws.accounts.length <= 1) {
      notify("At least one account is required.", "error");
      return;
    }
    if (ws.transactions.some((t) => t.accountId === a.id || t.toAccountId === a.id)) {
      notify("This account has linked transactions. Keep it to preserve accurate balances.", "error");
      return;
    }
    setConfirmAction({
      title: "Delete Account",
      message: `Delete account "${a.name}"?`,
      confirmLabel: "Delete Account",
      danger: true,
      onConfirm: async () => {
        await commitWorkspace(
          { ...ws, accounts: ws.accounts.filter((x) => x.id !== a.id) },
          "Account removed."
        );
      },
    });
  };

  // ---------------- POWER FEATURES: SYNC VOUCHERS & BOQ PROJECTS ----------------

  const handleImportFromBoqProjects = async () => {
    if (!boqProjects || boqProjects.length === 0) {
      notify("No engineering BOQ projects available to import.", "info");
      return;
    }
    const existingLinks = new Set(ws.projects.map((p) => p.linkedBoqProjectId).filter(Boolean));
    const existingNames = new Set(ws.projects.map((p) => p.name.trim().toLowerCase()));
    const nextParties = [...ws.parties];
    const addedProjects: AccountingProject[] = [];

    boqProjects.forEach((bp) => {
      if (existingLinks.has(bp.id) || existingNames.has(bp.name.trim().toLowerCase())) return;
      let clientId: string | null = null;
      if (bp.client && bp.client.trim()) {
        const foundParty = nextParties.find(
          (pt) => pt.name.trim().toLowerCase() === bp.client.trim().toLowerCase()
        );
        if (foundParty) {
          clientId = foundParty.id;
        } else {
          const newParty: AccountingParty = {
            id: genId("pty") + "_" + Math.random().toString(36).slice(2, 4),
            type: "Client",
            name: bp.client.trim(),
            opening: 0,
            direction: "receivable",
          };
          nextParties.push(newParty);
          clientId = newParty.id;
        }
      }
      addedProjects.push({
        id: genId("prj") + "_" + Math.random().toString(36).slice(2, 4),
        name: bp.name.trim(),
        clientId,
        contract: 0,
        status: "Active",
        note: bp.location ? `Location: ${bp.location}` : "",
        linkedBoqProjectId: bp.id,
      });
    });

    if (addedProjects.length === 0) {
      notify("All your BOQ projects are already synced into Accounts.", "info");
      return;
    }

    await commitWorkspace(
      {
        ...ws,
        parties: nextParties,
        projects: [...addedProjects, ...ws.projects],
      },
      `Imported ${addedProjects.length} BOQ project(s) into Accounting.`
    );
  };

  const handleSyncServiceVouchers = async () => {
    const paidVouchers = serviceVouchers.filter((v) => Number(v.paid || 0) > 0);
    if (paidVouchers.length === 0) {
      notify("No paid or partial Service Vouchers found to sync.", "info");
      return;
    }

    const syncedIds = new Set(ws.transactions.map((t) => t.linkedVoucherId).filter(Boolean));
    const nextParties = [...ws.parties];
    const nextProjects = [...ws.projects];
    const addedTxs: AccountingTransaction[] = [];

    const matchAccountId = (method?: string): string => {
      const m = (method || "").toLowerCase();
      const found = ws.accounts.find((a) => {
        const n = a.name.toLowerCase();
        if (m.includes("bkash") && n.includes("bkash")) return true;
        if (m.includes("nagad") && n.includes("nagad")) return true;
        if ((m.includes("bank") || m.includes("cheque")) && (a.type === "Bank" || n.includes("bank"))) return true;
        if (m.includes("cash") && (a.type === "Cash" || n.includes("cash"))) return true;
        return false;
      });
      return found?.id || ws.accounts[0]?.id || "acc_cash";
    };

    paidVouchers.forEach((v) => {
      if (syncedIds.has(v.id)) return;
      let partyRefId: string | null = null;
      if (v.clientName && v.clientName.trim()) {
        const foundPt = nextParties.find(
          (p) => p.name.trim().toLowerCase() === v.clientName.trim().toLowerCase()
        );
        if (foundPt) {
          partyRefId = foundPt.id;
        } else {
          const newPt: AccountingParty = {
            id: genId("pty") + "_" + Math.random().toString(36).slice(2, 4),
            type: "Client",
            name: v.clientName.trim(),
            phone: v.phone || "",
            address: v.address || "",
            opening: 0,
            direction: "receivable",
          };
          nextParties.push(newPt);
          partyRefId = newPt.id;
        }
      }

      let projectRefId: string | null = null;
      if (v.projectName && v.projectName.trim()) {
        const foundPr = nextProjects.find(
          (pr) => pr.name.trim().toLowerCase() === v.projectName.trim().toLowerCase()
        );
        if (foundPr) {
          projectRefId = foundPr.id;
        }
      }

      addedTxs.push({
        id: genId("tx") + "_" + Math.random().toString(36).slice(2, 4),
        type: "income",
        date: (v.date || todayStr()).slice(0, 10),
        desc: `Consultancy Fee — ${v.clientName} (${v.voucherNo})`,
        amount: Math.round(Number(v.paid || 0) * 100) / 100,
        category: "Consultancy Fee",
        accountId: matchAccountId(v.paymentMethod),
        partyId: partyRefId,
        projectId: projectRefId,
        note: `Voucher ${v.voucherNo} • ${v.paymentMethod} • Total Bill ৳${v.netTotal}`,
        linkedVoucherId: v.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    if (addedTxs.length === 0) {
      notify("All paid Service Vouchers are already synced into Transactions.", "info");
      return;
    }

    await commitWorkspace(
      {
        ...ws,
        parties: nextParties,
        transactions: [...addedTxs, ...ws.transactions],
      },
      `Synced ${addedTxs.length} payment(s) from Service Vouchers!`
    );
  };

  // ---------------- BACKUP, RESTORE, CSV & PRINT ----------------

  const handleDownloadBackup = () => {
    const safeName = (ws.profile?.name || "business-accounts")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const blob = new Blob([JSON.stringify(ws, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeName || "dolphin-box"}-accounts-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Full JSON backup downloaded.", "success");
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || ""));
        if (!Array.isArray(raw.accounts) || !Array.isArray(raw.transactions)) {
          throw new Error("Invalid backup file format.");
        }

        // Normalize IDs whether imported from HTML backup (numeric IDs) or Dolphin Box JSON (string IDs)
        const mappedAccounts: AccountWallet[] = raw.accounts.map((a: any) => ({
          id: String(a.id),
          name: String(a.name || "Account"),
          type: (a.type || "Cash") as AccountWalletType,
          opening: Number(a.opening || 0),
          accountNumber: a.accountNumber || "",
        }));

        const mappedParties: AccountingParty[] = (raw.parties || []).map((p: any) => ({
          id: String(p.id),
          type: (p.type || "Client") as AccountingPartyType,
          name: String(p.name || "Party"),
          phone: p.phone || "",
          email: p.email || "",
          address: p.address || "",
          opening: Number(p.opening || 0),
          direction: p.direction === "payable" ? "payable" : "receivable",
        }));

        const mappedProjects: AccountingProject[] = (raw.projects || []).map((pr: any) => ({
          id: String(pr.id),
          name: String(pr.name || "Project"),
          clientId: pr.clientId ? String(pr.clientId) : pr.client ? String(pr.client) : null,
          contract: Number(pr.contract || 0),
          status: (pr.status || "Active") as AccountingProjectStatus,
          note: pr.note || "",
        }));

        const mappedTxs: AccountingTransaction[] = (raw.transactions || []).map((t: any) => ({
          id: String(t.id),
          type: (t.type || "income") as AccountingTxType,
          date: String(t.date || todayStr()),
          desc: String(t.desc || ""),
          amount: Number(t.amount || 0),
          category: String(t.category || "Other"),
          accountId: String(t.accountId ?? t.account ?? ""),
          toAccountId: t.toAccountId ? String(t.toAccountId) : t.to ? String(t.to) : null,
          partyId: t.partyId ? String(t.partyId) : t.party ? String(t.party) : null,
          projectId: t.projectId ? String(t.projectId) : t.project ? String(t.project) : null,
          note: t.note || "",
          paidByMode: t.paidByMode,
          paidByDirectorId: t.paidByDirectorId || null,
          fromDirectorId: t.fromDirectorId || null,
          toDirectorId: t.toDirectorId || null,
          directorSettlementMode: t.directorSettlementMode,
          directorAllocations: Array.isArray(t.directorAllocations) ? t.directorAllocations : undefined,
          linkedVoucherId: t.linkedVoucherId,
        }));

        const mappedDirectors: AccountingDirector[] = Array.isArray(raw.directors)
          ? raw.directors.map((d: any) => ({
              id: String(d.id),
              name: String(d.name || "Director"),
              designation: d.designation || "Director",
              phone: d.phone || "",
              sharePercent: Number(d.sharePercent || 0),
              salaryAmount: Number(d.salaryAmount || 0),
              openingBalance: Number(d.openingBalance || 0),
            }))
          : ws.directors || [];

        // Never leave generic "Hybrid Civil" name if restored from old HTML backup — preserve user's own name if legacy default
        let restoredName = String(raw.profile?.name || "").trim();
        if (!restoredName || restoredName.toLowerCase().includes("hybrid civil")) {
          restoredName = ws.profile?.name || `${currentUserName || "My"} — Engineering & Consultancy`;
        }

        setConfirmAction({
          title: "Restore Accounting Backup",
          message: `Restore ${mappedAccounts.length} accounts, ${mappedParties.length} parties, ${mappedProjects.length} projects, ${mappedDirectors.length} directors, and ${mappedTxs.length} transactions? This will replace your current ledger data.`,
          confirmLabel: "Restore Backup",
          danger: true,
          onConfirm: async () => {
            await commitWorkspace(
              {
                ...ws,
                profile: {
                  ...ws.profile,
                  ...(raw.profile || {}),
                  name: restoredName,
                },
                accounts: mappedAccounts,
                parties: mappedParties,
                projects: mappedProjects,
                directors: mappedDirectors,
                transactions: mappedTxs,
              },
              "Backup restored & synced to cloud!"
            );
          },
        });
      } catch {
        notify("Invalid JSON backup file. Please choose a valid accounts backup.", "error");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const handleExportTransactionsCsv = () => {
    const headers = [
      "Date",
      "Type",
      "Payment Source",
      "Description",
      "Category",
      "Account",
      "To Account",
      "Party",
      "Director / Split Details",
      "Project",
      "Amount (BDT)",
      "Note",
    ];
    const rows = filteredTransactions.map((t) => {
      const acct = ws.accounts.find((a) => a.id === t.accountId)?.name || "";
      const toAcct = t.toAccountId ? ws.accounts.find((a) => a.id === t.toAccountId)?.name || "" : "";
      const party = t.partyId ? ws.parties.find((p) => p.id === t.partyId)?.name || "" : "";
      const proj = t.projectId ? ws.projects.find((p) => p.id === t.projectId)?.name || "" : "";
      const source =
        t.paidByMode === "credit"
          ? "On Credit (Baki)"
          : t.paidByMode === "director"
          ? `Director (${directorsList.find((d) => d.id === t.paidByDirectorId)?.name || ""})`
          : t.type === "director_transfer"
          ? `${directorsList.find((d) => d.id === t.fromDirectorId)?.name || ""} -> ${directorsList.find((d) => d.id === t.toDirectorId)?.name || ""}`
          : acct || "-";
      const splitInfo =
        t.directorAllocations && t.directorAllocations.length > 0
          ? t.directorAllocations
              .map((a) => `${directorsList.find((d) => d.id === a.directorId)?.name || "Director"}: ${a.amount}`)
              .join("; ")
          : "";
      return [
        t.date,
        t.type,
        `"${source.replace(/"/g, '""')}"`,
        `"${(t.desc || "").replace(/"/g, '""')}"`,
        `"${(t.category || "").replace(/"/g, '""')}"`,
        `"${acct.replace(/"/g, '""')}"`,
        `"${toAcct.replace(/"/g, '""')}"`,
        `"${party.replace(/"/g, '""')}"`,
        `"${splitInfo.replace(/"/g, '""')}"`,
        `"${proj.replace(/"/g, '""')}"`,
        t.amount,
        `"${(t.note || "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `transactions_${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify("CSV spreadsheet exported.", "success");
  };

  const triggerPrint = (target: "report" | "statement" | "director" | "profit_sheet" | "summary_hisab") => {
    setPrintTarget(target);
    document.body.classList.add("accounts-print-active");
    const cleanup = () => {
      document.body.classList.remove("accounts-print-active");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 2500);
    }, 180);
  };

  const handleDownloadHtmlReport = () => {
    const bizName = ws.profile?.name || "Business Financial Report";
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(bizName)} — Financial Report</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;color:#0f172a;max-width:900px;margin:28px auto;padding:0 18px}
header{border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}
h1{margin:0;font-size:22px}.sub{color:#475569;font-size:12px;margin-top:4px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}
.kpi{border:1px solid #cbd5e1;border-radius:8px;padding:12px}.kpi small{color:#64748b;font-size:11px;display:block}.kpi strong{font-size:18px;font-family:monospace}
table{width:100%;border-collapse:collapse;margin-bottom:22px;font-size:12px}
th,td{border-bottom:1px solid #e2e8f0;padding:8px 6px;text-align:left}th{background:#f8fafc;color:#475569;font-size:11px}
td:last-child,th:last-child{text-align:right;font-family:monospace}
footer{margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:11px}
@media print{body{margin:0;max-width:none}}</style></head><body>
<header><div><h1>${escapeHtml(bizName)}</h1><div class="sub">${escapeHtml(ws.profile?.tagline || "Financial Statement & Profit/Loss Report")}${ws.profile?.address ? " • " + escapeHtml(ws.profile.address) : ""}${ws.profile?.phone ? " • " + escapeHtml(ws.profile.phone) : ""}</div></div>
<div style="text-align:right;font-size:12px"><strong>FINANCIAL REPORT</strong><div>Period: ${reportFrom || "Start"} to ${reportTo || "Today"}</div></div></header>
<div class="kpis">
<div class="kpi"><small>Total Income</small><strong style="color:#15803d">${fmtBdt(reportData.income)}</strong></div>
<div class="kpi"><small>Total Expense</small><strong style="color:#b91c1c">${fmtBdt(reportData.expense)}</strong></div>
<div class="kpi"><small>Net Profit / Loss</small><strong style="color:${reportData.net >= 0 ? "#15803d" : "#b91c1c"}">${fmtBdt(reportData.net)}</strong></div>
<div class="kpi"><small>Profit Margin</small><strong>${reportData.margin.toFixed(1)}%</strong></div>
</div>
<h3>Income & Expense by Category</h3>
<table><thead><tr><th>Type</th><th>Category</th><th>Amount (BDT)</th></tr></thead><tbody>
${reportData.incomeCats.map(([c, v]) => `<tr><td style="color:#15803d;font-weight:600">Income</td><td>${escapeHtml(c)}</td><td>${fmtBdt(v)}</td></tr>`).join("")}
${reportData.expenseCats.map(([c, v]) => `<tr><td style="color:#b91c1c;font-weight:600">Expense</td><td>${escapeHtml(c)}</td><td>${fmtBdt(v)}</td></tr>`).join("")}
</tbody></table>
<h3>Transaction Ledger (${reportData.txs.length})</h3>
<table><thead><tr><th>Date</th><th>Particulars</th><th>Category</th><th>Type</th><th>Amount</th></tr></thead><tbody>
${reportData.txs.map((t) => `<tr><td>${t.date}</td><td>${escapeHtml(t.desc)}</td><td>${escapeHtml(t.category)}</td><td>${t.type}</td><td>${fmtBdt(t.amount)}</td></tr>`).join("")}
</tbody></table>
<footer>Generated via Dolphin Box • Developer: Anonymous</footer>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `financial_report_${todayStr()}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Standalone HTML report downloaded.", "success");
  };

  if (!isOpen) return null;

  const surfaceBg = isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#152033] border-[#2d4a6a] text-[#f1f5f9]";
  const innerCardBg = isLight ? "bg-slate-50 border-slate-200" : "bg-[#1a2b42] border-[#2d4a6a]";
  const mutedText = isLight ? "text-slate-500" : "text-[#8ba3c1]";
  const inputCls = isLight
    ? "w-full bg-white border border-slate-300 focus:border-teal-600 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none font-medium"
    : "w-full bg-[#0e1624] border border-[#2d4a6a] focus:border-[#00c2c7] rounded-lg px-3 py-2 text-xs text-white outline-none";

  return (
    <div className="accounts-modal-backdrop fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div
        className={`accounts-modal-card w-full max-w-6xl h-[94vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          isLight ? "bg-slate-100 border-slate-300 text-slate-900" : "bg-[#0f1c2e] border-[#2d4a6a] text-[#f1f5f9]"
        }`}
      >
        {/* TOP HEADER (Hidden on print) */}
        <div
          className={`accounts-modal-header print:hidden px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 ${
            isLight ? "bg-white border-slate-200" : "bg-[#152033] border-[#2d4a6a]"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {editingHeaderName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={headerNameDraft}
                      onChange={(e) => setHeaderNameDraft(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && headerNameDraft.trim()) {
                          setEditingHeaderName(false);
                          await commitWorkspace(
                            {
                              ...ws,
                              profile: { ...ws.profile, name: headerNameDraft.trim() },
                            },
                            "Business name updated!"
                          );
                        } else if (e.key === "Escape") {
                          setEditingHeaderName(false);
                          setHeaderNameDraft(ws.profile.name || "");
                        }
                      }}
                      className={`px-2 py-0.5 text-sm font-bold rounded border outline-none ${
                        isLight
                          ? "bg-white border-teal-600 text-slate-900"
                          : "bg-[#0e1624] border-[#00c2c7] text-white"
                      }`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!headerNameDraft.trim()) return;
                        setEditingHeaderName(false);
                        await commitWorkspace(
                          {
                            ...ws,
                            profile: { ...ws.profile, name: headerNameDraft.trim() },
                          },
                          "Business name updated!"
                        );
                      }}
                      className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold truncate">
                      {ws.profile?.name || "My Business Accounts"}
                    </h2>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderNameDraft(ws.profile?.name || "");
                          setEditingHeaderName(true);
                        }}
                        className={`p-1 rounded hover:bg-slate-500/15 transition ${mutedText}`}
                        title="Edit your Business / Firm Name"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className={`text-[11px] truncate ${mutedText}`}>
                {ws.profile?.tagline || "Complete Business Accounting & Project Finance"} · Private User Ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSyncing && (
              <span className="text-[11px] font-mono text-teal-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
              </span>
            )}
            <button
              type="button"
              onClick={handleDownloadBackup}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                isLight
                  ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                  : "bg-[#1a2b42] hover:bg-[#243b55] text-slate-200 border-[#2d4a6a]"
              }`}
              title="Download JSON Backup"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Backup</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("reports");
                triggerPrint("report");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition whitespace-nowrap"
              title="Print Financial Report / Save PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print Report</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg border transition ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-[#1a2b42] hover:bg-[#243b55] text-[#8ba3c1] hover:text-white border-[#2d4a6a]"
              }`}
              title="Close Accounts"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS BAR (Hidden on print) */}
        <div
          className={`accounts-nav-bar print:hidden px-3 sm:px-4 py-2 border-b flex items-center gap-1.5 overflow-x-auto shrink-0 ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-[#121c2d] border-[#24374e]"
          }`}
        >
          {(
            [
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "summary", label: "Baki & Hisab Summary", icon: FileText },
              { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
              { id: "parties", label: "Clients, Shops & Baki", icon: Users },
              { id: "directors", label: "Directors & Profit Share", icon: Briefcase },
              { id: "projects", label: "Projects", icon: FolderKanban },
              { id: "accounts", label: "Accounts & Wallets", icon: Landmark },
              { id: "reports", label: "Financial Reports", icon: FileSpreadsheet },
              { id: "settings", label: "Profile & Backup", icon: Settings },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                  isActive
                    ? isLight
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-[#00c2c7] text-[#0f1c2e] font-bold shadow-sm"
                    : isLight
                    ? "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                    : "text-[#8ba3c1] hover:bg-[#1a2b42] hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* STATUS FEEDBACK BANNER (Hidden on print) */}
        {statusBanner && (
          <div
            className={`print:hidden mx-4 mt-3 px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center justify-between ${
              statusBanner.type === "error"
                ? "bg-rose-500/15 border-rose-500/40 text-rose-500"
                : statusBanner.type === "info"
                ? "bg-sky-500/15 border-sky-500/40 text-sky-400"
                : "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
            }`}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {statusBanner.msg}
            </span>
            <button type="button" onClick={() => setStatusBanner(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MAIN SCROLLABLE BODY */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-4 print:hidden">
          {/* ============================================================== */}
          {/* TAB 1: DASHBOARD                                               */}
          {/* ============================================================== */}
          {activeTab === "dashboard" && (
            <div className="space-y-4">
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`rounded-xl border p-4 ${surfaceBg}`}>
                  <div className={`text-xs font-medium ${mutedText}`}>Total Assets / Available Balance</div>
                  <div className="text-2xl font-bold font-mono tabular-nums mt-1.5">
                    {fmtBdt(totalAssets)}
                  </div>
                  <div className={`text-[11px] mt-1 ${mutedText}`}>
                    Across {ws.accounts.length} active wallet(s)
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${surfaceBg}`}>
                  <div className={`text-xs font-medium flex items-center justify-between ${mutedText}`}>
                    <span>Total Income</span>
                    <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-emerald-500 mt-1.5">
                    {fmtBdt(overallTotals.income)}
                  </div>
                  <div className={`text-[11px] mt-1 ${mutedText}`}>
                    {ws.transactions.filter((t) => t.type === "income").length} income entries
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${surfaceBg}`}>
                  <div className={`text-xs font-medium flex items-center justify-between ${mutedText}`}>
                    <span>Total Expense</span>
                    <ArrowUpRight className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-2xl font-bold font-mono tabular-nums text-rose-500 mt-1.5">
                    {fmtBdt(overallTotals.expense)}
                  </div>
                  <div className={`text-[11px] mt-1 ${mutedText}`}>
                    {ws.transactions.filter((t) => t.type === "expense").length} expense entries
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${surfaceBg}`}>
                  <div className={`text-xs font-medium ${mutedText}`}>Net Profit / Loss</div>
                  <div
                    className={`text-2xl font-bold font-mono tabular-nums mt-1.5 ${
                      overallTotals.net >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {fmtBdt(overallTotals.net)}
                  </div>
                  <div className={`text-[11px] mt-1 font-mono tabular-nums ${mutedText}`}>
                    Margin: {overallTotals.margin.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Quick Integrations & Daily Shortcuts Bar */}
              <div className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 ${surfaceBg}`}>
                <div className="text-xs">
                  <span className="font-bold">Quick Entry & Sync:</span>{" "}
                  <span className={mutedText}>
                    Log Cha/Biscuit Baki, Director-paid bills, Split client receipts, or sync Service Vouchers.
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetTxForm();
                      setTxType("expense");
                      setTxPaidByMode("credit");
                      setTxCategory("Tea & Snacks (Cha/Biscuit)");
                      setTxDesc("Cha & Biscuit (Office)");
                      setActiveTab("transactions");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isLight
                        ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>+ Office Baki (Cha/Shop)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetTxForm();
                      setTxType("expense");
                      setTxPaidByMode("director");
                      setActiveTab("transactions");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isLight
                        ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-300"
                        : "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/40"
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>+ Director Paid Bill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetTxForm();
                      setTxType("income");
                      setTxSplitEnabled(true);
                      if (directorsList[0]) {
                        setTxSplitAllocations([{ directorId: directorsList[0].id, amount: "" }]);
                      }
                      setActiveTab("transactions");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isLight
                        ? "bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-300"
                        : "bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border-teal-500/40"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>+ Split Client Bill</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncServiceVouchers}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isLight
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Sync Vouchers ({serviceVouchers.filter((v) => v.paid > 0).length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleImportFromBoqProjects}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isLight
                        ? "bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300"
                        : "bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/40"
                    }`}
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Import BOQ ({boqProjects.length})</span>
                  </button>
                </div>
              </div>

              {/* 2-Column Middle Grid: Account Balances & Receivables/Payables + Directors Position */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Account Balances</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("accounts")}
                      className="text-xs font-semibold text-teal-500 hover:underline flex items-center gap-0.5"
                    >
                      Manage <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-500/20">
                    {ws.accounts.map((a) => {
                      const bal = accountBalances[a.id]?.balance || 0;
                      return (
                        <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold">{a.name}</div>
                            <div className={`text-[11px] ${mutedText}`}>{a.type}</div>
                          </div>
                          <div className={`font-mono tabular-nums font-bold ${bal >= 0 ? "" : "text-rose-500"}`}>
                            {fmtBdt(bal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Baki, Dues & Directors Position</h3>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveTab("summary")}
                        className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-0.5"
                      >
                        Full Baki & Hisab <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab("directors")}
                        className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-0.5"
                      >
                        Directors ({directorsList.length}) <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-500/20 text-xs">
                    <div className="py-2 flex items-center justify-between">
                      <span className={mutedText}>Receivable from Clients / Parties (Kothay Pabo)</span>
                      <span className="font-mono tabular-nums font-bold text-emerald-500">
                        {fmtBdt(duesTotals.receivable)}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className={mutedText}>Payable / Office Baki ({hisabOverview.payablesList.length} places)</span>
                      <span className="font-mono tabular-nums font-bold text-rose-500">
                        {fmtBdt(duesTotals.payable)}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className={mutedText}>Directors Pabe (Paid Bills / Undrawn Profit)</span>
                      <span className="font-mono tabular-nums font-bold text-sky-400">
                        {fmtBdt(directorSummaryTotals.firmOwesDirectors)}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className={mutedText}>Directors Joma Dibe (Cash Held by Directors)</span>
                      <span className="font-mono tabular-nums font-bold text-amber-500">
                        {fmtBdt(directorSummaryTotals.directorsOweFirm)}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="font-semibold">Net Trade Position (Receivable − Baki)</span>
                      <span
                        className={`font-mono tabular-nums font-bold ${
                          duesTotals.receivable - duesTotals.payable >= 0 ? "text-emerald-500" : "text-rose-500"
                        }`}
                      >
                        {fmtBdt(duesTotals.receivable - duesTotals.payable)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* At-a-Glance: Kothai Koto Baki & Kon Director Koto Khoroch / Pabe */}
              {(hisabOverview.payablesList.length > 0 || hisabOverview.directorRows.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className={`rounded-xl border p-4 space-y-2.5 ${surfaceBg}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">Kothai Baki Ache (Unpaid Shop / Vendor Dues)</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("summary")}
                        className="text-xs font-semibold text-teal-500 hover:underline flex items-center gap-0.5"
                      >
                        See All <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {hisabOverview.payablesList.length === 0 ? (
                      <p className={`text-xs py-2 ${mutedText}`}>No unpaid shop/supplier Baki.</p>
                    ) : (
                      <div className="divide-y divide-slate-500/20 text-xs">
                        {hisabOverview.payablesList.slice(0, 5).map(({ party, bakiAmount }) => (
                          <div key={party.id} className="py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{party.name}</div>
                              <div className={`text-[10px] ${mutedText}`}>{party.type}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono tabular-nums font-bold text-rose-500">
                                {fmtBdt(bakiAmount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  resetTxForm();
                                  setTxType("due_settlement");
                                  setTxPartyId(party.id);
                                  setTxAmount(String(bakiAmount));
                                  setTxDesc(`Baki paid to ${party.name}`);
                                  setActiveTab("transactions");
                                }}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                              >
                                Pay Baki
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`rounded-xl border p-4 space-y-2.5 ${surfaceBg}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold">Directors Khoroch, Niyeche & Pabe/Dibe</h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("summary")}
                        className="text-xs font-semibold text-teal-500 hover:underline flex items-center gap-0.5"
                      >
                        Full Sheet <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {hisabOverview.directorRows.length === 0 ? (
                      <p className={`text-xs py-2 ${mutedText}`}>No directors added yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-500/20 text-xs">
                        {hisabOverview.directorRows.map((row) => (
                          <div key={row.director.id} className="py-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{row.director.name}</div>
                              <div className={`text-[10px] font-mono tabular-nums ${mutedText}`}>
                                Khoroch/Given: {fmtBdt(row.totalGivenOrSpent)} · Niyeche: {fmtBdt(row.totalTaken)}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div
                                className={`font-mono tabular-nums font-bold ${
                                  row.netBalance > 0
                                    ? "text-emerald-500"
                                    : row.netBalance < 0
                                    ? "text-amber-500"
                                    : mutedText
                                }`}
                              >
                                {fmtBdt(Math.abs(row.netBalance))}
                              </div>
                              <div className={`text-[10px] ${mutedText}`}>
                                {row.netBalance > 0 ? "Pabe (+)" : row.netBalance < 0 ? "Dibe (−)" : "Settled"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6-Month Cashflow Bar Chart */}
              <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold">6-Month Income vs Expense Overview</h3>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Income
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Expense
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2 sm:gap-4 pt-2 items-end h-36">
                  {monthlyCashflow.months.map((m) => {
                    const incPct = Math.round((m.income / monthlyCashflow.maxVal) * 100);
                    const expPct = Math.round((m.expense / monthlyCashflow.maxVal) * 100);
                    return (
                      <div key={m.key} className="flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="w-full flex items-end justify-center gap-1 flex-1">
                          <div
                            className="w-3 sm:w-5 bg-emerald-500/85 rounded-t transition-all"
                            style={{ height: `${Math.max(4, incPct)}%` }}
                            title={`Income: ${fmtBdt(m.income)}`}
                          />
                          <div
                            className="w-3 sm:w-5 bg-rose-500/85 rounded-t transition-all"
                            style={{ height: `${Math.max(4, expPct)}%` }}
                            title={`Expense: ${fmtBdt(m.expense)}`}
                          />
                        </div>
                        <span className={`text-[10px] font-mono ${mutedText}`}>{m.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold">Recent Transactions</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("transactions")}
                    className="text-xs font-semibold text-teal-500 hover:underline flex items-center gap-0.5"
                  >
                    View All ({ws.transactions.length}) <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">Date</th>
                        <th className="py-2 px-2.5 font-semibold">Description</th>
                        <th className="py-2 px-2.5 font-semibold">Account</th>
                        <th className="py-2 px-2.5 font-semibold">Type</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/20">
                      {[...ws.transactions]
                        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                        .slice(0, 8)
                        .map((t) => {
                          const acct = ws.accounts.find((a) => a.id === t.accountId)?.name || "—";
                          return (
                            <tr
                              key={t.id}
                              onClick={() => handleEditTx(t)}
                              className="hover:bg-slate-500/10 cursor-pointer transition"
                            >
                              <td className="py-2.5 px-2.5 font-mono tabular-nums whitespace-nowrap">{t.date}</td>
                              <td className="py-2.5 px-2.5 font-medium">{t.desc}</td>
                              <td className={`py-2.5 px-2.5 ${mutedText}`}>{acct}</td>
                              <td className="py-2.5 px-2.5 capitalize">{t.type}</td>
                              <td
                                className={`py-2.5 px-2.5 text-right font-mono tabular-nums font-bold ${
                                  t.type === "income"
                                    ? "text-emerald-500"
                                    : t.type === "expense"
                                    ? "text-rose-500"
                                    : ""
                                }`}
                              >
                                {fmtBdt(t.amount)}
                              </td>
                            </tr>
                          );
                        })}
                      {ws.transactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className={`py-8 text-center ${mutedText}`}>
                            No transactions recorded yet. Add your first transaction or sync from Service Vouchers.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1B: BAKI, DIRECTORS & SETTLEMENT SUMMARY ("KE KOTO PABE")  */}
          {/* ============================================================== */}
          {activeTab === "summary" && (
            <div className="space-y-4">
              {/* Top Action & Print Bar */}
              <div className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 ${surfaceBg}`}>
                <div>
                  <h3 className="text-sm font-bold">Baki, Director Khoroch/Niyeche & Settlement Summary</h3>
                  <p className={`text-xs ${mutedText}`}>
                    See every unpaid Baki expense, where money is owed (Kothai Baki), what each Director spent vs took, and who gets paid (Ke Koto Pabe).
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetTxForm();
                      setTxType("expense");
                      setTxPaidByMode("credit");
                      setTxCategory("Tea & Snacks (Cha/Biscuit)");
                      setActiveTab("transactions");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isLight
                        ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                        : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40"
                    }`}
                  >
                    + Add Baki Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPrint("summary_hisab")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Full Baki & Hisab</span>
                  </button>
                </div>
              </div>

              {/* 4 KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`rounded-xl border p-3.5 ${surfaceBg}`}>
                  <div className={`text-[11px] font-medium ${mutedText}`}>Total Expenses Baki (Logged)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-amber-500 mt-1">
                    {fmtBdt(overallTotals.creditExpenseTotal)}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                    {hisabOverview.creditExpenses.length} credit bill(s) recorded
                  </div>
                </div>
                <div className={`rounded-xl border p-3.5 ${surfaceBg}`}>
                  <div className={`text-[11px] font-medium ${mutedText}`}>Remaining Payable (Kothai Baki)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-rose-500 mt-1">
                    {fmtBdt(duesTotals.payable)}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                    Owed across {hisabOverview.payablesList.length} shop/supplier(s)
                  </div>
                </div>
                <div className={`rounded-xl border p-3.5 ${surfaceBg}`}>
                  <div className={`text-[11px] font-medium ${mutedText}`}>Directors Pabe (Firm Owes)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-500 mt-1">
                    {fmtBdt(directorSummaryTotals.firmOwesDirectors)}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                    Bills paid by directors + undrawn profit
                  </div>
                </div>
                <div className={`rounded-xl border p-3.5 ${surfaceBg}`}>
                  <div className={`text-[11px] font-medium ${mutedText}`}>Directors Dibe / Client Recv</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-sky-400 mt-1">
                    {fmtBdt(duesTotals.receivable)}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                    Dir cash held: {fmtBdt(directorSummaryTotals.directorsOweFirm)}
                  </div>
                </div>
              </div>

              {/* 1. KON DIRECTOR KOTO KHOROCH KORECHE, KOTO NIYECHE, KE KOTO PABE */}
              <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold">
                      Kon Director Koto Khoroch Koreche, Koto Niyeche & Ke Koto Pabe
                    </h4>
                    <p className={`text-xs ${mutedText}`}>
                      Positive (+) = Director pabe (Firm owes them) · Negative (−) = Director dibe / Joma (Cash held above their credit)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("directors")}
                    className="text-xs font-semibold text-teal-500 hover:underline flex items-center gap-0.5"
                  >
                    Manage Directors & Profit <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">Director</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Bills Paid (Khoroch)</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Given (C→D)</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Joma to Office</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Client Kept (Niyeche)</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Recv (C→D / Payout)</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Profit & Salary</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Net: Pabe / Dibe</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/20 font-mono tabular-nums">
                      {hisabOverview.directorRows.map((r) => (
                        <tr key={r.director.id} className="hover:bg-slate-500/10 transition">
                          <td className="py-2.5 px-2.5 font-sans">
                            <div className="font-bold">{r.director.name}</div>
                            <div className={`text-[10px] ${mutedText}`}>
                              {r.director.designation || "Director"} · {r.director.sharePercent}%
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-emerald-500 font-semibold">
                            {fmtBdt(r.paidForFirm)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right">{fmtBdt(r.givenToDirectors)}</td>
                          <td className="py-2.5 px-2.5 text-right">{fmtBdt(r.depositedToFirm)}</td>
                          <td className="py-2.5 px-2.5 text-right text-amber-500 font-semibold">
                            {fmtBdt(r.clientCashKept)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right">
                            {fmtBdt(r.receivedFromDirectors + r.withdrawnFromFirm)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right text-sky-400">
                            {fmtBdt(r.profitSalaryCredited)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right">
                            <div
                              className={`font-bold ${
                                r.netBalance > 0
                                  ? "text-emerald-500"
                                  : r.netBalance < 0
                                  ? "text-rose-500"
                                  : ""
                              }`}
                            >
                              {fmtBdt(r.netBalance)}
                            </div>
                            <div className={`font-sans text-[10px] ${mutedText}`}>
                              {r.netBalance > 0 ? "Pabe (+)" : r.netBalance < 0 ? "Joma Dibe (−)" : "Settled"}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-sans whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDirectorLedgerId(r.director.id);
                                  setActiveTab("directors");
                                }}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-teal-500/15 text-teal-500 hover:bg-teal-500/25"
                              >
                                Ledger
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDirSettleDirectorId(r.director.id);
                                  setDirSettleMode(r.netBalance < 0 ? "director_to_firm" : "firm_to_director");
                                  setDirSettleAmt(r.netBalance !== 0 ? String(Math.abs(r.netBalance)) : "");
                                  setActiveTab("directors");
                                }}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                              >
                                Settle
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {hisabOverview.directorRows.length === 0 && (
                        <tr>
                          <td colSpan={9} className={`py-6 text-center font-sans ${mutedText}`}>
                            No directors added yet. Go to Directors & Profit Share to add your partners.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. KOTHAI BAKI ACHE (PAYABLES) & KOTHAY PABO (RECEIVABLES) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold">Kothai Baki Ache (Shops / Vendors / Suppliers)</h4>
                      <p className={`text-[11px] ${mutedText}`}>Total unpaid Baki owed by the firm</p>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-sm text-rose-500">
                      {fmtBdt(duesTotals.payable)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                        <tr>
                          <th className="py-2 px-2.5 font-semibold">Kothai / Shop Name</th>
                          <th className="py-2 px-2.5 font-semibold">Type</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Baki Amount</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/20">
                        {hisabOverview.payablesList.map(({ party, bakiAmount }) => (
                          <tr key={party.id} className="hover:bg-slate-500/10 transition">
                            <td className="py-2.5 px-2.5">
                              <div className="font-bold">{party.name}</div>
                              {party.phone && <div className={`text-[10px] ${mutedText}`}>{party.phone}</div>}
                            </td>
                            <td className="py-2.5 px-2.5">{party.type}</td>
                            <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-bold text-rose-500">
                              {fmtBdt(bakiAmount)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStatementPartyId(party.id);
                                    setActiveTab("parties");
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-teal-500/15 text-teal-500 hover:bg-teal-500/25"
                                >
                                  Ledger
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    resetTxForm();
                                    setTxType("due_settlement");
                                    setTxPartyId(party.id);
                                    setTxAmount(String(bakiAmount));
                                    setTxDesc(`Baki paid to ${party.name}`);
                                    setActiveTab("transactions");
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                                >
                                  Pay Baki
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {hisabOverview.payablesList.length === 0 && (
                          <tr>
                            <td colSpan={4} className={`py-6 text-center ${mutedText}`}>
                              No unpaid Baki anywhere right now.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold">Kothay Taka Pabo (Client Receivables)</h4>
                      <p className={`text-[11px] ${mutedText}`}>Total pending dues from Clients & Parties</p>
                    </div>
                    <span className="font-mono tabular-nums font-bold text-sm text-emerald-500">
                      {fmtBdt(duesTotals.receivable)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                        <tr>
                          <th className="py-2 px-2.5 font-semibold">Client / Party Name</th>
                          <th className="py-2 px-2.5 font-semibold">Type</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Pabo (Due)</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/20">
                        {hisabOverview.receivablesList.map(({ party, recvAmount }) => (
                          <tr key={party.id} className="hover:bg-slate-500/10 transition">
                            <td className="py-2.5 px-2.5">
                              <div className="font-bold">{party.name}</div>
                              {party.phone && <div className={`text-[10px] ${mutedText}`}>{party.phone}</div>}
                            </td>
                            <td className="py-2.5 px-2.5">{party.type}</td>
                            <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-bold text-emerald-500">
                              {fmtBdt(recvAmount)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStatementPartyId(party.id);
                                    setActiveTab("parties");
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-teal-500/15 text-teal-500 hover:bg-teal-500/25"
                                >
                                  Ledger
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    resetTxForm();
                                    setTxType("income");
                                    setTxPartyId(party.id);
                                    setTxAmount(String(recvAmount));
                                    setTxDesc(`Payment received from ${party.name}`);
                                    setActiveTab("transactions");
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                                >
                                  Recv
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {hisabOverview.receivablesList.length === 0 && (
                          <tr>
                            <td colSpan={4} className={`py-6 text-center ${mutedText}`}>
                              No pending client receivables.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* 3. EXPENSES BAKI REGISTER & DIRECTOR PAID EXPENSES */}
              <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold">
                      Expenses Baki Register ({hisabOverview.creditExpenses.length} entries)
                    </h4>
                    <p className={`text-xs ${mutedText}`}>
                      All office expenses purchased on credit (e.g. Cha/Biscuit at XYZ Dokan) and their shop status
                    </p>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-bold text-amber-500">
                    Total Credit Bills: {fmtBdt(overallTotals.creditExpenseTotal)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">Date</th>
                        <th className="py-2 px-2.5 font-semibold">Expense Particulars</th>
                        <th className="py-2 px-2.5 font-semibold">Category</th>
                        <th className="py-2 px-2.5 font-semibold">Kothai / Shop</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Bill Amount</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Shop Total Baki</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/20">
                      {hisabOverview.creditExpenses.map((t) => {
                        const shop = ws.parties.find((p) => p.id === t.partyId);
                        const shopBal = shop ? getPartyBalance(shop) : 0;
                        const shopBaki = shopBal < 0 ? Math.abs(shopBal) : 0;
                        return (
                          <tr key={t.id} className="hover:bg-slate-500/10 transition">
                            <td className="py-2 px-2.5 font-mono tabular-nums whitespace-nowrap">{t.date}</td>
                            <td className="py-2 px-2.5 font-semibold">{t.desc}</td>
                            <td className={`py-2 px-2.5 ${mutedText}`}>{t.category}</td>
                            <td className="py-2 px-2.5 font-medium">{shop?.name || "—"}</td>
                            <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-rose-500">
                              {fmtBdt(t.amount)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                              {shopBaki > 0 ? (
                                <span className="font-bold text-amber-500">{fmtBdt(shopBaki)} Due</span>
                              ) : (
                                <span className="text-emerald-500 font-semibold">Settled</span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleEditTx(t)}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {hisabOverview.creditExpenses.length === 0 && (
                        <tr>
                          <td colSpan={7} className={`py-6 text-center ${mutedText}`}>
                            No credit (Baki) expenses recorded yet. Click "+ Add Baki Expense" above to log one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: TRANSACTIONS                                            */}
          {/* ============================================================== */}
          {activeTab === "transactions" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Form */}
              <form
                onSubmit={handleSaveTx}
                className={`lg:col-span-4 rounded-xl border p-4 space-y-3 ${surfaceBg}`}
              >
                <div className="flex items-center justify-between border-b border-slate-500/20 pb-2">
                  <h3 className="text-sm font-bold">{txId ? "Edit Transaction" : "New Transaction"}</h3>
                  {txId && (
                    <button
                      type="button"
                      onClick={resetTxForm}
                      className="text-[11px] font-semibold text-amber-500 hover:underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Transaction Type</label>
                    <select
                      value={txType}
                      onChange={(e) => {
                        const nextType = e.target.value as AccountingTxType;
                        setTxType(nextType);
                        if (nextType === "income" && EXPENSE_CATEGORIES.includes(txCategory)) {
                          setTxCategory("Consultancy Fee");
                        } else if (nextType === "expense" && INCOME_CATEGORIES.includes(txCategory)) {
                          setTxCategory("Tea & Snacks (Cha/Biscuit)");
                        }
                        if (nextType === "due_settlement") {
                          setTxPaidByMode("wallet");
                        }
                      }}
                      className={inputCls}
                    >
                      <option value="income">Income / Client Receipt</option>
                      <option value="expense">Expense (Wallet / Baki / Director)</option>
                      <option value="due_settlement">Pay Baki / Settle Shop Due</option>
                      <option value="director_transfer">Director Transfer (C → D)</option>
                      <option value="director_settlement">Director Joma / Firm Payout</option>
                      <option value="transfer">Wallet-to-Wallet Transfer</option>
                      <option value="opening">Opening Balance</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Date</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      required
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Description / Particulars</label>
                  <input
                    type="text"
                    value={txDesc}
                    onChange={(e) => setTxDesc(e.target.value)}
                    placeholder={
                      txType === "expense" && txPaidByMode === "credit"
                        ? "e.g. Cha & Biscuit on Baki from XYZ Dokan"
                        : txType === "expense" && txPaidByMode === "director"
                        ? "e.g. Tea bill or House rent paid by Director"
                        : txType === "director_transfer"
                        ? "e.g. Director C gave ৳1,500 to Director D"
                        : txType === "income" && txSplitEnabled
                        ? "e.g. Client bill 5000 (Director keeps 2000, rest Joma)"
                        : "e.g. Structural design fee received"
                    }
                    required
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                      {txType === "income" && txSplitEnabled ? "Total Client Paid (BDT)" : "Amount (BDT)"}
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Category</label>
                    <select
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      disabled={
                        txType === "transfer" ||
                        txType === "opening" ||
                        txType === "due_settlement" ||
                        txType === "director_transfer" ||
                        txType === "director_settlement"
                      }
                      className={inputCls}
                    >
                      {(txType === "expense" ? EXPENSE_CATEGORIES : ALL_CATEGORIES).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* EXPENSE PAYMENT MODE: OFFICE WALLET | ON CREDIT (BAKI) | PAID BY DIRECTOR */}
                {txType === "expense" && (
                  <div className={`rounded-lg border p-2.5 space-y-2 ${innerCardBg}`}>
                    <label className={`block text-[11px] font-bold ${mutedText}`}>How was this expense paid?</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: "wallet", label: "Office Wallet" },
                          { id: "credit", label: "Baki (বাকি)" },
                          { id: "director", label: "By Director" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTxPaidByMode(opt.id)}
                          className={`py-1.5 px-2 rounded-md text-[11px] font-semibold border transition ${
                            txPaidByMode === opt.id
                              ? "bg-teal-600 border-teal-600 text-white"
                              : isLight
                              ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                              : "bg-[#0e1624] border-[#2d4a6a] text-slate-300 hover:bg-[#1a2b42]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {txPaidByMode === "credit" && (
                      <p className="text-[11px] text-amber-500">
                        Records operating expense immediately & adds Payable (Baki) to the selected Shop/Vendor without deducting Office Wallets.
                      </p>
                    )}
                    {txPaidByMode === "director" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className={`text-[11px] font-semibold ${mutedText}`}>Which Director Paid?</label>
                          {directorsList.length === 0 && (
                            <button
                              type="button"
                              onClick={handleQuickAddFourDirectors}
                              className="text-[10px] font-bold text-teal-500 hover:underline"
                            >
                              + Add Directors (A–D)
                            </button>
                          )}
                        </div>
                        <select
                          value={txPaidByDirectorId}
                          onChange={(e) => setTxPaidByDirectorId(e.target.value)}
                          className={inputCls}
                        >
                          <option value="">Select director...</option>
                          {directorsList.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* DUE SETTLEMENT (PAY BAKI) CONTROLS */}
                {txType === "due_settlement" && (
                  <div className={`rounded-lg border p-2.5 space-y-2 ${innerCardBg}`}>
                    <label className={`block text-[11px] font-bold ${mutedText}`}>Baki Settled From</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTxPaidByMode("wallet")}
                        className={`py-1.5 px-2 rounded-md text-[11px] font-semibold border transition ${
                          txPaidByMode !== "director"
                            ? "bg-teal-600 border-teal-600 text-white"
                            : isLight
                            ? "bg-white border-slate-300 text-slate-700"
                            : "bg-[#0e1624] border-[#2d4a6a] text-slate-300"
                        }`}
                      >
                        Office Wallet
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxPaidByMode("director")}
                        className={`py-1.5 px-2 rounded-md text-[11px] font-semibold border transition ${
                          txPaidByMode === "director"
                            ? "bg-teal-600 border-teal-600 text-white"
                            : isLight
                            ? "bg-white border-slate-300 text-slate-700"
                            : "bg-[#0e1624] border-[#2d4a6a] text-slate-300"
                        }`}
                      >
                        Paid by Director
                      </button>
                    </div>
                    {txPaidByMode === "director" && (
                      <select
                        value={txPaidByDirectorId}
                        onChange={(e) => setTxPaidByDirectorId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select director...</option>
                        {directorsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* INTER-DIRECTOR TRANSFER (C -> D) */}
                {txType === "director_transfer" && (
                  <div className={`rounded-lg border p-2.5 grid grid-cols-2 gap-2 ${innerCardBg}`}>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>From Director (Giver)</label>
                      <select
                        value={txFromDirectorId}
                        onChange={(e) => setTxFromDirectorId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select...</option>
                        {directorsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>To Director (Receiver)</label>
                      <select
                        value={txToDirectorId}
                        onChange={(e) => setTxToDirectorId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select...</option>
                        {directorsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* DIRECTOR SETTLEMENT (JOMA TO OFFICE / FIRM PAYOUT) */}
                {txType === "director_settlement" && (
                  <div className={`rounded-lg border p-2.5 space-y-2 ${innerCardBg}`}>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Director</label>
                      <select
                        value={txPaidByDirectorId}
                        onChange={(e) => setTxPaidByDirectorId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select director...</option>
                        {directorsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Settlement Direction</label>
                      <select
                        value={txDirectorSettlementMode}
                        onChange={(e) => setTxDirectorSettlementMode(e.target.value as "firm_to_director" | "director_to_firm")}
                        className={inputCls}
                      >
                        <option value="director_to_firm">Director Deposits Cash to Office (Joma)</option>
                        <option value="firm_to_director">Firm Pays / Reimburses Director</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* OFFICE WALLET DROPDOWN (SHOWN WHEN RELEVANT) */}
                {!(
                  txType === "director_transfer" ||
                  (txType === "expense" && txPaidByMode !== "wallet") ||
                  (txType === "due_settlement" && txPaidByMode === "director")
                ) && (
                  <div className={`grid ${txType === "transfer" ? "grid-cols-2" : "grid-cols-1"} gap-2.5`}>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                        {txType === "transfer"
                          ? "From Account"
                          : txType === "income" && txSplitEnabled
                          ? "Deposit Remaining (Joma) To"
                          : txType === "director_settlement"
                          ? "Office Wallet"
                          : "Account / Wallet"}
                      </label>
                      <select
                        value={txAccountId}
                        onChange={(e) => setTxAccountId(e.target.value)}
                        className={inputCls}
                      >
                        {ws.accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({fmtBdt(accountBalances[a.id]?.balance || 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {txType === "transfer" && (
                      <div>
                        <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>To Account</label>
                        <select
                          value={txToAccountId}
                          onChange={(e) => setTxToAccountId(e.target.value)}
                          className={inputCls}
                        >
                          {ws.accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* SPLIT CLIENT BILL WITH DIRECTOR(S) */}
                {txType === "income" && (
                  <div className={`rounded-lg border p-2.5 space-y-2 ${innerCardBg}`}>
                    <label className="flex items-center justify-between gap-2 cursor-pointer text-[11px] font-bold">
                      <span>Split with Director(s)? (e.g. Director takes part, rest Joma)</span>
                      <input
                        type="checkbox"
                        checked={txSplitEnabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setTxSplitEnabled(checked);
                          if (checked && txSplitAllocations.length === 0 && directorsList[0]) {
                            setTxSplitAllocations([{ directorId: directorsList[0].id, amount: "" }]);
                          }
                        }}
                        className="accent-teal-600 w-3.5 h-3.5"
                      />
                    </label>

                    {txSplitEnabled && (
                      <div className="space-y-2 pt-1 border-t border-slate-500/20">
                        {directorsList.length === 0 ? (
                          <div className="text-[11px] space-y-1.5">
                            <p className={mutedText}>No directors added yet.</p>
                            <button
                              type="button"
                              onClick={handleQuickAddFourDirectors}
                              className="px-2.5 py-1 rounded bg-teal-600 text-white font-semibold text-[11px]"
                            >
                              + Quick Add Directors A, B, C, D
                            </button>
                          </div>
                        ) : (
                          <>
                            {txSplitAllocations.map((row, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <select
                                  value={row.directorId}
                                  onChange={(e) =>
                                    setTxSplitAllocations((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, directorId: e.target.value } : item))
                                    )
                                  }
                                  className={`${inputCls} flex-1`}
                                >
                                  {directorsList.map((d) => (
                                    <option key={d.id} value={d.id}>
                                      {d.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={row.amount}
                                  onChange={(e) =>
                                    setTxSplitAllocations((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, amount: e.target.value } : item))
                                    )
                                  }
                                  placeholder="Kept ৳"
                                  className={`${inputCls} w-24 font-mono tabular-nums`}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTxSplitAllocations((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="px-2 py-1.5 rounded bg-rose-500/15 text-rose-500 text-xs font-bold"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <button
                                type="button"
                                onClick={() =>
                                  setTxSplitAllocations((prev) => [
                                    ...prev,
                                    { directorId: directorsList[0].id, amount: "" },
                                  ])
                                }
                                className="text-teal-500 font-semibold hover:underline"
                              >
                                + Add Another Director
                              </button>
                              {(() => {
                                const tot = parseFloat(txAmount || "0") || 0;
                                const kept = txSplitAllocations.reduce(
                                  (s, r) => s + (parseFloat(r.amount || "0") || 0),
                                  0
                                );
                                const joma = tot - kept;
                                return (
                                  <span
                                    className={`font-mono font-bold ${
                                      joma < 0 ? "text-rose-500" : "text-emerald-500"
                                    }`}
                                  >
                                    Office Joma: {fmtBdt(joma)}
                                  </span>
                                );
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PARTY / SHOP & PROJECT SELECTORS */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className={`text-[11px] font-semibold ${mutedText}`}>
                          {txType === "expense" && txPaidByMode === "credit"
                            ? "Shop / Vendor (Required)"
                            : txType === "due_settlement"
                            ? "Shop / Party (Required)"
                            : "Party (optional)"}
                        </label>
                        <button
                          type="button"
                          onClick={() => setQuickPartyOpen((v) => !v)}
                          className="text-[10px] font-bold text-teal-500 hover:underline"
                        >
                          {quickPartyOpen ? "Close" : "+ New Shop"}
                        </button>
                      </div>
                      <select
                        value={txPartyId}
                        onChange={(e) => setTxPartyId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select party / shop...</option>
                        {ws.parties.map((p) => {
                          const bal = getPartyBalance(p);
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.type}
                              {bal < 0 ? ` · Baki ${fmtBdt(Math.abs(bal))}` : bal > 0 ? ` · Recv ${fmtBdt(bal)}` : ""})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Project (optional)</label>
                      <select
                        value={txProjectId}
                        onChange={(e) => setTxProjectId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">No project</option>
                        {ws.projects.map((pr) => (
                          <option key={pr.id} value={pr.id}>
                            {pr.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {quickPartyOpen && (
                    <div className={`rounded-lg border p-2 flex items-center gap-1.5 ${innerCardBg}`}>
                      <input
                        type="text"
                        value={quickPartyName}
                        onChange={(e) => setQuickPartyName(e.target.value)}
                        placeholder="e.g. XYZ Dokan (Cha/Biscuit)"
                        className={`${inputCls} flex-1`}
                      />
                      <select
                        value={quickPartyType}
                        onChange={(e) => setQuickPartyType(e.target.value as AccountingPartyType)}
                        className={`${inputCls} w-28`}
                      >
                        <option value="Vendor / Shop">Vendor / Shop</option>
                        <option value="Supplier">Supplier</option>
                        <option value="Client">Client</option>
                        <option value="Contractor">Contractor</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleQuickAddParty}
                        className="px-2.5 py-2 rounded-lg bg-teal-600 text-white text-[11px] font-bold shrink-0"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Reference / Note</label>
                  <input
                    type="text"
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                    placeholder="Voucher no, invoice, cheque no or remarks"
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={readOnly}
                  className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition"
                >
                  {txId ? "Update Transaction" : "Save Transaction"}
                </button>
              </form>

              {/* Right Register Table */}
              <div className={`lg:col-span-8 rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">Transaction Register</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSyncServiceVouchers}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                        isLight
                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Sync Vouchers</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportTransactionsCsv}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                        isLight
                          ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                          : "bg-[#1a2b42] hover:bg-[#243b55] text-slate-200 border-[#2d4a6a]"
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Filters Toolbar */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="relative col-span-2 sm:col-span-1">
                    <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${mutedText}`} />
                    <input
                      type="text"
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      placeholder="Search..."
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                  <select
                    value={txFilterType}
                    onChange={(e) => setTxFilterType(e.target.value)}
                    className={inputCls}
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="due_settlement">Pay Baki</option>
                    <option value="director_transfer">Director Transfer</option>
                    <option value="director_settlement">Director Joma/Payout</option>
                    <option value="profit_distribution">Profit Distribution</option>
                    <option value="transfer">Wallet Transfer</option>
                    <option value="opening">Opening</option>
                  </select>
                  <select
                    value={txFilterAccount}
                    onChange={(e) => setTxFilterAccount(e.target.value)}
                    className={inputCls}
                  >
                    <option value="all">All Accounts</option>
                    {ws.accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={txFilterProject}
                    onChange={(e) => setTxFilterProject(e.target.value)}
                    className={inputCls}
                  >
                    <option value="all">All Projects</option>
                    {ws.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="month"
                    value={txFilterMonth}
                    onChange={(e) => setTxFilterMonth(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Filtered Summary Line */}
                <div className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs ${innerCardBg}`}>
                  <span className={mutedText}>
                    Showing <strong>{filteredTransactions.length}</strong> entry(s)
                  </span>
                  <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
                    <span className="text-emerald-500 font-semibold">
                      In: {fmtBdt(filteredTxTotals.income)}
                    </span>
                    <span className="text-rose-500 font-semibold">
                      Out: {fmtBdt(filteredTxTotals.expense)}
                    </span>
                    <span className="font-bold">
                      Net: {fmtBdt(filteredTxTotals.net)}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">Date</th>
                        <th className="py-2 px-2.5 font-semibold">Details</th>
                        <th className="py-2 px-2.5 font-semibold">Source / Type</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Amount</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/20">
                      {filteredTransactions.map((t) => {
                        const acctName = ws.accounts.find((a) => a.id === t.accountId)?.name || "";
                        const toAcctName = t.toAccountId ? ws.accounts.find((a) => a.id === t.toAccountId)?.name : "";
                        const partyNameStr = t.partyId ? ws.parties.find((p) => p.id === t.partyId)?.name : "";
                        const projNameStr = t.projectId ? ws.projects.find((p) => p.id === t.projectId)?.name : "";
                        const paidDirNm = t.paidByDirectorId ? directorsList.find((d) => d.id === t.paidByDirectorId)?.name : "";
                        const fromDirNm = t.fromDirectorId ? directorsList.find((d) => d.id === t.fromDirectorId)?.name : "";
                        const toDirNm = t.toDirectorId ? directorsList.find((d) => d.id === t.toDirectorId)?.name : "";

                        let sourceBadge = acctName || "—";
                        let typeLabel: string = t.type;
                        if (t.type === "expense" && t.paidByMode === "credit") {
                          sourceBadge = "On Credit (Baki)";
                          typeLabel = "Expense · Baki";
                        } else if (t.type === "expense" && t.paidByMode === "director") {
                          sourceBadge = `By ${paidDirNm || "Director"}`;
                          typeLabel = "Expense · Director";
                        } else if (t.type === "due_settlement") {
                          sourceBadge = t.paidByMode === "director" ? `By ${paidDirNm || "Director"}` : acctName;
                          typeLabel = "Pay Baki";
                        } else if (t.type === "director_transfer") {
                          sourceBadge = `${fromDirNm || "Dir"} → ${toDirNm || "Dir"}`;
                          typeLabel = "Dir Transfer";
                        } else if (t.type === "director_settlement") {
                          sourceBadge = `${paidDirNm || "Dir"} ↔ ${acctName}`;
                          typeLabel = t.directorSettlementMode === "director_to_firm" ? "Dir Joma" : "Dir Payout";
                        } else if (t.type === "profit_distribution") {
                          sourceBadge = "Profit Pool";
                          typeLabel = "Profit Dist.";
                        } else if (t.type === "income" && t.directorAllocations && t.directorAllocations.length > 0) {
                          const keptTotal = t.directorAllocations.reduce((s, a) => s + Number(a.amount || 0), 0);
                          const jomaAmt = Math.max(0, Number(t.amount || 0) - keptTotal);
                          sourceBadge = `Split: Dir ${fmtBdt(keptTotal)} + ${acctName || "Wallet"} ${fmtBdt(jomaAmt)}`;
                          typeLabel = "Income · Split";
                        }

                        return (
                          <tr key={t.id} className="hover:bg-slate-500/10 transition">
                            <td className="py-2.5 px-2.5 font-mono tabular-nums whitespace-nowrap align-top">
                              {t.date}
                            </td>
                            <td className="py-2.5 px-2.5 align-top">
                              <div className="font-semibold">{t.desc}</div>
                              <div className={`text-[11px] mt-0.5 ${mutedText}`}>
                                {t.category}
                                {toAcctName ? ` · ${acctName} → ${toAcctName}` : ""}
                                {partyNameStr ? ` · ${partyNameStr}` : ""}
                                {projNameStr ? ` · ${projNameStr}` : ""}
                                {t.directorAllocations && t.directorAllocations.length > 0
                                  ? ` · [${t.directorAllocations
                                      .map(
                                        (a) =>
                                          `${directorsList.find((d) => d.id === a.directorId)?.name || "Dir"}: ${fmtBdt(a.amount)}`
                                      )
                                      .join(", ")}]`
                                  : ""}
                                {t.note ? ` · ${t.note}` : ""}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 align-top">
                              <div className="font-semibold whitespace-nowrap">{typeLabel}</div>
                              <div className={`text-[10px] ${t.paidByMode === "credit" ? "text-amber-500 font-semibold" : mutedText}`}>
                                {sourceBadge}
                              </div>
                            </td>
                            <td
                              className={`py-2.5 px-2.5 text-right font-mono tabular-nums font-bold align-top whitespace-nowrap ${
                                t.type === "income"
                                  ? "text-emerald-500"
                                  : t.type === "expense"
                                  ? "text-rose-500"
                                  : "text-sky-400"
                              }`}
                            >
                              {fmtBdt(t.amount)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right align-top whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                {t.type !== "profit_distribution" && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditTx(t)}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                                  >
                                    Edit
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTx(t)}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredTransactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className={`py-8 text-center ${mutedText}`}>
                            No transactions found matching your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CLIENTS & SUPPLIERS (PARTY LEDGER & STATEMENT)          */}
          {/* ============================================================== */}
          {activeTab === "parties" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Party Form */}
                <form
                  onSubmit={handleSaveParty}
                  className={`lg:col-span-4 rounded-xl border p-4 space-y-3 ${surfaceBg}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-500/20 pb-2">
                    <h3 className="text-sm font-bold">{partyId ? "Edit Party" : "Add Client / Supplier"}</h3>
                    {partyId && (
                      <button
                        type="button"
                        onClick={resetPartyForm}
                        className="text-[11px] font-semibold text-amber-500 hover:underline"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Party Type</label>
                    <select
                      value={partyType}
                      onChange={(e) => {
                        const val = e.target.value as AccountingPartyType;
                        setPartyType(val);
                        if (val === "Vendor / Shop" || val === "Supplier") {
                          setPartyDirection("payable");
                        } else if (val === "Client") {
                          setPartyDirection("receivable");
                        }
                      }}
                      className={inputCls}
                    >
                      <option value="Client">Client</option>
                      <option value="Vendor / Shop">Vendor / Shop (Tea, Snacks, Office Store)</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Staff">Staff / Engineer</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Party Name</label>
                    <input
                      type="text"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      required
                      placeholder="e.g. XYZ Dokan or Client Name"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Phone</label>
                      <input
                        type="text"
                        value={partyPhone}
                        onChange={(e) => setPartyPhone(e.target.value)}
                        placeholder="+880 1..."
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Email</label>
                      <input
                        type="email"
                        value={partyEmail}
                        onChange={(e) => setPartyEmail(e.target.value)}
                        placeholder="email@example.com"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Address</label>
                    <input
                      type="text"
                      value={partyAddress}
                      onChange={(e) => setPartyAddress(e.target.value)}
                      placeholder="Office or site address"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Opening Due (BDT)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={partyOpening}
                        onChange={(e) => setPartyOpening(e.target.value)}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Opening Direction</label>
                      <select
                        value={partyDirection}
                        onChange={(e) => setPartyDirection(e.target.value as "receivable" | "payable")}
                        className={inputCls}
                      >
                        <option value="receivable">They owe us (Receivable)</option>
                        <option value="payable">We owe them (Payable / Baki)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={readOnly}
                    className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition"
                  >
                    {partyId ? "Update Party" : "Save Party"}
                  </button>
                </form>

                {/* Party Ledger List */}
                <div className={`lg:col-span-8 rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Clients, Vendors & Baki Ledger ({filteredParties.length})</h3>
                    <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                      <span className="text-emerald-500 font-semibold">
                        Receivable: {fmtBdt(duesTotals.receivable)}
                      </span>
                      <span className="text-rose-500 font-semibold">
                        Payable (Baki): {fmtBdt(duesTotals.payable)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative">
                      <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${mutedText}`} />
                      <input
                        type="text"
                        value={partySearch}
                        onChange={(e) => setPartySearch(e.target.value)}
                        placeholder="Search name, phone, address..."
                        className={`${inputCls} pl-8`}
                      />
                    </div>
                    <select
                      value={partyFilterType}
                      onChange={(e) => setPartyFilterType(e.target.value)}
                      className={inputCls}
                    >
                      <option value="all">All Party Types</option>
                      <option value="Client">Client</option>
                      <option value="Vendor / Shop">Vendor / Shop</option>
                      <option value="Supplier">Supplier</option>
                      <option value="Contractor">Contractor</option>
                      <option value="Staff">Staff / Engineer</option>
                      <option value="Other">Other</option>
                    </select>
                    <select
                      value={partyBalanceFilter}
                      onChange={(e) => setPartyBalanceFilter(e.target.value as any)}
                      className={inputCls}
                    >
                      <option value="all">All Balances</option>
                      <option value="receivable">Receivable Only</option>
                      <option value="payable">Payable (Baki) Only</option>
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                        <tr>
                          <th className="py-2 px-2.5 font-semibold">Name & Contact</th>
                          <th className="py-2 px-2.5 font-semibold">Type</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Balance</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/20">
                        {filteredParties.map((p) => {
                          const bal = getPartyBalance(p);
                          return (
                            <tr key={p.id} className="hover:bg-slate-500/10 transition">
                              <td className="py-2.5 px-2.5">
                                <div className="font-bold">{p.name}</div>
                                <div className={`text-[11px] ${mutedText}`}>
                                  {[p.phone, p.address].filter(Boolean).join(" · ") || "No contact info"}
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5">{p.type}</td>
                              <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                                <div className={`font-bold ${bal >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {fmtBdt(Math.abs(bal))}
                                </div>
                                <div className={`text-[10px] ${mutedText}`}>
                                  {bal === 0 ? "Settled" : bal > 0 ? "Receivable" : "Baki / Payable"}
                                </div>
                              </td>
                              <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStatementPartyId(p.id)}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-teal-500/15 text-teal-500 hover:bg-teal-500/25"
                                  >
                                    Ledger
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetTxForm();
                                      setTxPartyId(p.id);
                                      setTxType("expense");
                                      setTxPaidByMode("credit");
                                      setTxCategory(p.type === "Vendor / Shop" ? "Tea & Snacks (Cha/Biscuit)" : "Material");
                                      setTxDesc(`Baki purchase from ${p.name}`);
                                      setActiveTab("transactions");
                                    }}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
                                    title="Add credit (Baki) purchase for this shop"
                                  >
                                    +Baki
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      resetTxForm();
                                      setTxPartyId(p.id);
                                      if (bal < 0) {
                                        setTxType("due_settlement");
                                        setTxAmount(String(Math.abs(bal)));
                                        setTxDesc(`Baki paid to ${p.name}`);
                                      } else {
                                        setTxType("income");
                                        if (bal > 0) setTxAmount(String(bal));
                                        setTxDesc(`Payment received from ${p.name}`);
                                      }
                                      setActiveTab("transactions");
                                    }}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                                    title={bal < 0 ? "Settle Baki / Payable due" : "Record payment from client"}
                                  >
                                    {bal < 0 ? "Pay Baki" : "Recv"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPartyId(p.id);
                                      setPartyType(p.type);
                                      setPartyName(p.name);
                                      setPartyPhone(p.phone || "");
                                      setPartyEmail(p.email || "");
                                      setPartyAddress(p.address || "");
                                      setPartyOpening(String(p.opening || 0));
                                      setPartyDirection(p.direction);
                                    }}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteParty(p)}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredParties.length === 0 && (
                          <tr>
                            <td colSpan={4} className={`py-8 text-center ${mutedText}`}>
                              No parties added yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* PARTY LEDGER STATEMENT DRAWER / PANEL */}
              {selectedPartyStatement && (
                <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-500/20 pb-2.5">
                    <div>
                      <h4 className="text-sm font-bold">
                        Party Ledger Statement — {selectedPartyStatement.party.name}
                      </h4>
                      <p className={`text-xs ${mutedText}`}>
                        {selectedPartyStatement.party.type}
                        {selectedPartyStatement.party.phone ? ` · ${selectedPartyStatement.party.phone}` : ""}
                        {selectedPartyStatement.party.address ? ` · ${selectedPartyStatement.party.address}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerPrint("statement")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Statement
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStatementPartyId(null)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${innerCardBg}`}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                        <tr>
                          <th className="py-2 px-2.5">Date</th>
                          <th className="py-2 px-2.5">Particulars</th>
                          <th className="py-2 px-2.5">Source / Account</th>
                          <th className="py-2 px-2.5 text-right">Baki / Expense</th>
                          <th className="py-2 px-2.5 text-right">Paid Baki / Recv</th>
                          <th className="py-2 px-2.5 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/20 font-mono tabular-nums">
                        <tr>
                          <td className="py-2 px-2.5 font-sans">—</td>
                          <td className="py-2 px-2.5 font-sans font-semibold">Opening Balance</td>
                          <td className="py-2 px-2.5 font-sans">—</td>
                          <td className="py-2 px-2.5 text-right">—</td>
                          <td className="py-2 px-2.5 text-right">—</td>
                          <td className="py-2 px-2.5 text-right font-bold">
                            {fmtBdt(selectedPartyStatement.openingSigned)}
                          </td>
                        </tr>
                        {selectedPartyStatement.rows.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 px-2.5 whitespace-nowrap">{r.date}</td>
                            <td className="py-2 px-2.5 font-sans">
                              {r.desc}
                              {r.projName ? ` (${r.projName})` : ""}
                            </td>
                            <td className="py-2 px-2.5 font-sans">{r.acctName}</td>
                            <td className="py-2 px-2.5 text-right text-rose-500">
                              {r.type === "expense" ? fmtBdt(r.amount) : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-right text-emerald-500">
                              {r.type === "income" || r.type === "due_settlement" ? fmtBdt(r.amount) : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold">
                              {fmtBdt(r.running)}
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

          {/* ============================================================== */}
          {/* TAB 3B: DIRECTORS, TRANSFERS & PROFIT DISTRIBUTION             */}
          {/* ============================================================== */}
          {activeTab === "directors" && (
            <div className="space-y-4">
              {/* Top KPI Summary Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`rounded-xl border p-3.5 ${surfaceBg}`}>
                  <div className={`text-[11px] font-medium ${mutedText}`}>Active Directors / Partners</div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xl font-bold font-mono tabular-nums">{directorsList.length}</span>
                    <span className={`text-[11px] font-mono ${mutedText}`}>
                      Total Share:{" "}
                      {directorsList.reduce((s, d) => s + Number(d.sharePercent || 0), 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className={`rounded-xl border p-3.5 ${surfaceBg}`}>
                  <div className={`text-[11px] font-medium ${mutedText}`}>Firm Owes Directors (+)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-500 mt-1">
                    {fmtBdt(directorSummaryTotals.firmOwesDirectors)}
                  </div>
                </div>
                <div className={`rounded-xl border p-3.5 ${surfaceBg}`}>
                  <div className={`text-[11px] font-medium ${mutedText}`}>Directors Hold Firm Cash (−)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-amber-500 mt-1">
                    {fmtBdt(directorSummaryTotals.directorsOweFirm)}
                  </div>
                </div>
              </div>

              {/* Section 1 & 2: Director Profile Form + Live Director Balances */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <form
                  onSubmit={handleSaveDirector}
                  className={`lg:col-span-4 rounded-xl border p-4 space-y-3 ${surfaceBg}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-500/20 pb-2">
                    <h3 className="text-sm font-bold">{dirId ? "Edit Director" : "Add Director / Partner"}</h3>
                    {dirId ? (
                      <button
                        type="button"
                        onClick={resetDirectorForm}
                        className="text-[11px] font-semibold text-amber-500 hover:underline"
                      >
                        Cancel Edit
                      </button>
                    ) : (
                      directorsList.length === 0 && (
                        <button
                          type="button"
                          onClick={handleQuickAddFourDirectors}
                          className="text-[11px] font-bold text-teal-500 hover:underline"
                        >
                          + Add A, B, C, D
                        </button>
                      )
                    )}
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Director Name</label>
                    <input
                      type="text"
                      value={dirName}
                      onChange={(e) => setDirName(e.target.value)}
                      required
                      placeholder="e.g. Director A (or full name)"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Designation</label>
                      <input
                        type="text"
                        value={dirDesignation}
                        onChange={(e) => setDirDesignation(e.target.value)}
                        placeholder="Managing Director"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Phone</label>
                      <input
                        type="text"
                        value={dirPhone}
                        onChange={(e) => setDirPhone(e.target.value)}
                        placeholder="+880 1..."
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Share %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={dirSharePercent}
                        onChange={(e) => setDirSharePercent(e.target.value)}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Salary (৳/mo)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={dirSalaryAmount}
                        onChange={(e) => setDirSalaryAmount(e.target.value)}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Opening Bal</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dirOpeningBalance}
                        onChange={(e) => setDirOpeningBalance(e.target.value)}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={readOnly}
                    className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition"
                  >
                    {dirId ? "Update Director" : "Save Director"}
                  </button>
                </form>

                {/* Live Directors Ledger Table */}
                <div className={`lg:col-span-8 rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">Directors Live Balance & Equity Ledger</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {directorsList.length === 0 && (
                        <button
                          type="button"
                          onClick={handleQuickAddFourDirectors}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-teal-600 hover:bg-teal-500 text-white"
                        >
                          + Quick Add Directors A, B, C, D
                        </button>
                      )}
                      {directorsList.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSyncPercentFromSalary}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition ${innerCardBg}`}
                          title="Auto-calculate each director's Share % based on their Salary amount"
                        >
                          <Percent className="w-3.5 h-3.5" />
                          <span>Derive % from Salary</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                        <tr>
                          <th className="py-2 px-2 font-semibold">Director</th>
                          <th className="py-2 px-2 font-semibold text-right">Share %</th>
                          <th className="py-2 px-2 font-semibold text-right">Salary</th>
                          <th className="py-2 px-2 font-semibold text-right">Paid Bills (Khoroch)</th>
                          <th className="py-2 px-2 font-semibold text-right">Given / Joma</th>
                          <th className="py-2 px-2 font-semibold text-right">Taken (Niyeche)</th>
                          <th className="py-2 px-2 font-semibold text-right">Profit Credited</th>
                          <th className="py-2 px-2 font-semibold text-right">Net: Pabe / Dibe</th>
                          <th className="py-2 px-2 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/20 font-mono tabular-nums">
                        {directorsList.map((d) => {
                          const st = directorStatsMap[d.id];
                          const net = st?.netBalance || 0;
                          const givenPlusJoma = (st?.givenToDirectors || 0) + (st?.depositedToFirm || 0);
                          const takenTotal =
                            (st?.clientCashKept || 0) +
                            (st?.receivedFromDirectors || 0) +
                            (st?.withdrawnFromFirm || 0);
                          return (
                            <tr key={d.id} className="hover:bg-slate-500/10 transition">
                              <td className="py-2.5 px-2 font-sans">
                                <div className="font-bold">{d.name}</div>
                                <div className={`text-[10px] ${mutedText}`}>{d.designation || "Director"}</div>
                              </td>
                              <td className="py-2.5 px-2 text-right">{Number(d.sharePercent || 0).toFixed(1)}%</td>
                              <td className="py-2.5 px-2 text-right">{fmtBdt(d.salaryAmount)}</td>
                              <td className="py-2.5 px-2 text-right text-emerald-500">
                                {fmtBdt(st?.paidForFirm || 0)}
                              </td>
                              <td className="py-2.5 px-2 text-right">{fmtBdt(givenPlusJoma)}</td>
                              <td className="py-2.5 px-2 text-right text-amber-500">
                                {fmtBdt(takenTotal)}
                              </td>
                              <td className="py-2.5 px-2 text-right text-sky-400">
                                {fmtBdt(st?.profitSalaryCredited || 0)}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <div className={`font-bold ${net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {fmtBdt(net)}
                                </div>
                                <div className={`font-sans text-[10px] ${mutedText}`}>
                                  {net > 0 ? "Pabe (+)" : net < 0 ? "Joma Dibe (−)" : "Settled"}
                                </div>
                              </td>
                              <td className="py-2.5 px-2 text-right font-sans whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedDirectorLedgerId(d.id)}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-teal-500/15 text-teal-500 hover:bg-teal-500/25"
                                  >
                                    Ledger
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDirSettleDirectorId(d.id);
                                      setDirSettleMode(net < 0 ? "director_to_firm" : "firm_to_director");
                                      setDirSettleAmt(net !== 0 ? String(Math.abs(net)) : "");
                                    }}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                                  >
                                    Settle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDirId(d.id);
                                      setDirName(d.name);
                                      setDirDesignation(d.designation || "Director");
                                      setDirPhone(d.phone || "");
                                      setDirSharePercent(String(d.sharePercent || 0));
                                      setDirSalaryAmount(String(d.salaryAmount || 0));
                                      setDirOpeningBalance(String(d.openingBalance || 0));
                                    }}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDirector(d)}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {directorsList.length === 0 && (
                          <tr>
                            <td colSpan={9} className={`py-8 text-center font-sans ${mutedText}`}>
                              No directors configured yet. Add partners manually or click "Quick Add Directors A, B, C, D".
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 3: 2-Column Quick Inter-Director Handover & Director Settlement */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <form
                  onSubmit={handleQuickDirectorTransfer}
                  className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}
                >
                  <div className="border-b border-slate-500/20 pb-2">
                    <h4 className="text-sm font-bold">Inter-Director Transfer (e.g. C gives ৳1,500 to D)</h4>
                    <p className={`text-[11px] ${mutedText}`}>
                      Adjusts only the two directors' personal ledgers without changing Office Wallets or P&L.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>From Director (Giver)</label>
                      <select
                        value={quickDirTransferFrom}
                        onChange={(e) => setQuickDirTransferFrom(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select...</option>
                        {directorsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>To Director (Receiver)</label>
                      <select
                        value={quickDirTransferTo}
                        onChange={(e) => setQuickDirTransferTo(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select...</option>
                        {directorsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Amount (BDT)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={quickDirTransferAmt}
                        onChange={(e) => setQuickDirTransferAmt(e.target.value)}
                        placeholder="1500"
                        required
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Date</label>
                      <input
                        type="date"
                        value={quickDirTransferDate}
                        onChange={(e) => setQuickDirTransferDate(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Note / Purpose</label>
                    <input
                      type="text"
                      value={quickDirTransferNote}
                      onChange={(e) => setQuickDirTransferNote(e.target.value)}
                      placeholder="e.g. Cash handover between directors"
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={readOnly || directorsList.length < 2}
                    className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition"
                  >
                    Record Director Handover
                  </button>
                </form>

                <form
                  onSubmit={handleQuickDirectorSettlement}
                  className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}
                >
                  <div className="border-b border-slate-500/20 pb-2">
                    <h4 className="text-sm font-bold">Director Settlement (Joma to Office / Firm Payout)</h4>
                    <p className={`text-[11px] ${mutedText}`}>
                      Move cash between a Director and an Office Wallet when settling held client cash or reimbursements.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Director</label>
                      <select
                        value={dirSettleDirectorId}
                        onChange={(e) => setDirSettleDirectorId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select...</option>
                        {directorsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({fmtBdt(directorStatsMap[d.id]?.netBalance || 0)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Office Wallet</label>
                      <select
                        value={dirSettleWalletId}
                        onChange={(e) => setDirSettleWalletId(e.target.value)}
                        className={inputCls}
                      >
                        {ws.accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3 sm:col-span-1">
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Direction</label>
                      <select
                        value={dirSettleMode}
                        onChange={(e) => setDirSettleMode(e.target.value as "director_to_firm" | "firm_to_director")}
                        className={inputCls}
                      >
                        <option value="director_to_firm">Director → Office (Joma)</option>
                        <option value="firm_to_director">Office → Director (Payout)</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Amount (BDT)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={dirSettleAmt}
                        onChange={(e) => setDirSettleAmt(e.target.value)}
                        placeholder="0.00"
                        required
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Date</label>
                      <input
                        type="date"
                        value={dirSettleDate}
                        onChange={(e) => setDirSettleDate(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Note</label>
                    <input
                      type="text"
                      value={dirSettleNote}
                      onChange={(e) => setDirSettleNote(e.target.value)}
                      placeholder="e.g. Monthly settlement or Joma deposit"
                      className={inputCls}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={readOnly || directorsList.length === 0}
                    className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition"
                  >
                    Record Settlement
                  </button>
                </form>
              </div>

              {/* Section 4: Selected Director Personal Ledger Statement */}
              {selectedDirectorLedger && (
                <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-500/20 pb-2.5">
                    <div>
                      <h4 className="text-sm font-bold">
                        Director Personal Ledger — {selectedDirectorLedger.director.name}
                      </h4>
                      <p className={`text-xs ${mutedText}`}>
                        {selectedDirectorLedger.director.designation || "Director"} · Share{" "}
                        {selectedDirectorLedger.director.sharePercent}% · Salary{" "}
                        {fmtBdt(selectedDirectorLedger.director.salaryAmount)}/mo
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => triggerPrint("director")}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" /> Print Director Statement
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedDirectorLedgerId(null)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${innerCardBg}`}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                        <tr>
                          <th className="py-2 px-2.5">Date</th>
                          <th className="py-2 px-2.5">Description</th>
                          <th className="py-2 px-2.5 text-right">Credit (+) Firm Owes</th>
                          <th className="py-2 px-2.5 text-right">Debit (−) Cash Held/Paid</th>
                          <th className="py-2 px-2.5 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/20 font-mono tabular-nums">
                        <tr>
                          <td className="py-2 px-2.5 font-sans">—</td>
                          <td className="py-2 px-2.5 font-sans font-semibold">Opening Balance</td>
                          <td className="py-2 px-2.5 text-right">—</td>
                          <td className="py-2 px-2.5 text-right">—</td>
                          <td className="py-2 px-2.5 text-right font-bold">
                            {fmtBdt(selectedDirectorLedger.opening)}
                          </td>
                        </tr>
                        {selectedDirectorLedger.rows.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 px-2.5 whitespace-nowrap">{r.date}</td>
                            <td className="py-2 px-2.5 font-sans">{r.label}</td>
                            <td className="py-2 px-2.5 text-right text-emerald-500">
                              {r.credit > 0 ? fmtBdt(r.credit) : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-right text-rose-500">
                              {r.debit > 0 ? fmtBdt(r.debit) : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold">{fmtBdt(r.running)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 5: Profit & Salary Distribution Engine */}
              <div className={`rounded-xl border p-4 space-y-4 ${surfaceBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-500/20 pb-2.5">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-teal-500" />
                      Profit & Salary Distribution Calculator
                    </h3>
                    <p className={`text-xs ${mutedText}`}>
                      Distribute firm Net Profit across Directors by Salary Amount, Share %, or combined Salary + % of Remaining Profit.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerPrint("profit_sheet")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${innerCardBg}`}
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Profit Sheet
                    </button>
                    <button
                      type="button"
                      disabled={readOnly || directorsList.length === 0}
                      onClick={handlePostProfitDistribution}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Post Distribution to Ledgers
                    </button>
                  </div>
                </div>

                {/* Calculator Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>From Date</label>
                    <input
                      type="date"
                      value={distFrom}
                      onChange={(e) => setDistFrom(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>To Date</label>
                    <input
                      type="date"
                      value={distTo}
                      onChange={(e) => setDistTo(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Distribution Formula</label>
                    <select
                      value={distMode}
                      onChange={(e) => setDistMode(e.target.value as any)}
                      className={inputCls}
                    >
                      <option value="salary_plus_percent">Salary + % Remaining Profit</option>
                      <option value="percent_only">Share % of Net Profit Only</option>
                      <option value="salary_weighted_percent">Salary-Ratio Weighted %</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Salary Months</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={distSalaryMonths}
                      onChange={(e) => setDistSalaryMonths(e.target.value)}
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                      Profit Pool Override (optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={distPoolOverride}
                      onChange={(e) => setDistPoolOverride(e.target.value)}
                      placeholder={`Auto: ${Math.round(profitDistCalculation.operatingProfit)}`}
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                  </div>
                </div>

                {/* Pool Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className={`rounded-lg border p-2.5 ${innerCardBg}`}>
                    <div className={`text-[10px] ${mutedText}`}>Period Operating Profit</div>
                    <div className="font-mono tabular-nums font-bold text-sm mt-0.5">
                      {fmtBdt(profitDistCalculation.operatingProfit)}
                    </div>
                  </div>
                  <div className={`rounded-lg border p-2.5 ${innerCardBg}`}>
                    <div className={`text-[10px] ${mutedText}`}>Distributable Pool Used</div>
                    <div className="font-mono tabular-nums font-bold text-sm text-teal-500 mt-0.5">
                      {fmtBdt(profitDistCalculation.poolBase)}
                    </div>
                  </div>
                  <div className={`rounded-lg border p-2.5 ${innerCardBg}`}>
                    <div className={`text-[10px] ${mutedText}`}>Total Directors Salary</div>
                    <div className="font-mono tabular-nums font-bold text-sm mt-0.5">
                      {fmtBdt(profitDistCalculation.totalSalaryBase)}
                    </div>
                  </div>
                  <div className={`rounded-lg border p-2.5 ${innerCardBg}`}>
                    <div className={`text-[10px] ${mutedText}`}>Remaining Profit After Salary</div>
                    <div className="font-mono tabular-nums font-bold text-sm text-emerald-500 mt-0.5">
                      {fmtBdt(profitDistCalculation.remainingProfitAfterSalary)}
                    </div>
                  </div>
                </div>

                {/* Live Distribution Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">Director</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Eff. Share %</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Salary Entitlement</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Profit Share</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Total Distribution</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Current Ledger</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Final Net Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/20 font-mono tabular-nums">
                      {profitDistCalculation.rows.map((r) => (
                        <tr key={r.director.id} className="hover:bg-slate-500/10">
                          <td className="py-2 px-2.5 font-sans font-bold">{r.director.name}</td>
                          <td className="py-2 px-2.5 text-right">{r.effectivePct.toFixed(2)}%</td>
                          <td className="py-2 px-2.5 text-right">{fmtBdt(r.salaryEntitlement)}</td>
                          <td className="py-2 px-2.5 text-right">{fmtBdt(r.profitShare)}</td>
                          <td className="py-2 px-2.5 text-right font-bold text-teal-500">
                            {fmtBdt(r.totalEarned)}
                          </td>
                          <td className="py-2 px-2.5 text-right">{fmtBdt(r.currentLedgerBal)}</td>
                          <td
                            className={`py-2 px-2.5 text-right font-bold ${
                              r.projectedNetPayable >= 0 ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            {fmtBdt(r.projectedNetPayable)}
                          </td>
                        </tr>
                      ))}
                      {profitDistCalculation.rows.length === 0 && (
                        <tr>
                          <td colSpan={7} className={`py-6 text-center font-sans ${mutedText}`}>
                            Add directors above to calculate salary & profit share splits.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: PROJECTS (CONTRACT & PROFITABILITY)                     */}
          {/* ============================================================== */}
          {activeTab === "projects" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <form
                onSubmit={handleSaveProject}
                className={`lg:col-span-4 rounded-xl border p-4 space-y-3 ${surfaceBg}`}
              >
                <div className="flex items-center justify-between border-b border-slate-500/20 pb-2">
                  <h3 className="text-sm font-bold">{projId ? "Edit Project" : "Add Project"}</h3>
                  {projId && (
                    <button
                      type="button"
                      onClick={resetProjectForm}
                      className="text-[11px] font-semibold text-amber-500 hover:underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Project Name</label>
                  <input
                    type="text"
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    required
                    placeholder="e.g. 5-Storied Residential Building"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Client</label>
                  <select
                    value={projClientId}
                    onChange={(e) => setProjClientId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select client (optional)</option>
                    {ws.parties
                      .filter((p) => p.type === "Client")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Agreed Amount (৳)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={projContract}
                      onChange={(e) => setProjContract(e.target.value)}
                      className={`${inputCls} font-mono tabular-nums`}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Status</label>
                    <select
                      value={projStatus}
                      onChange={(e) => setProjStatus(e.target.value as AccountingProjectStatus)}
                      className={inputCls}
                    >
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Location / Notes</label>
                  <input
                    type="text"
                    value={projNote}
                    onChange={(e) => setProjNote(e.target.value)}
                    placeholder="Site address or scope notes"
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={readOnly}
                  className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition"
                >
                  {projId ? "Update Project" : "Save Project"}
                </button>
              </form>

              <div className={`lg:col-span-8 rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">Project Performance ({ws.projects.length})</h3>
                  <button
                    type="button"
                    onClick={handleImportFromBoqProjects}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isLight
                        ? "bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300"
                        : "bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/40"
                    }`}
                  >
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>Import BOQ Projects</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                      <tr>
                        <th className="py-2 px-2.5 font-semibold">Project</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Received</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Expense</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Net Profit</th>
                        <th className="py-2 px-2.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/20">
                      {ws.projects.map((pr) => {
                        const stats = getProjectStats(pr);
                        const clientObj = ws.parties.find((p) => p.id === pr.clientId);
                        return (
                          <tr key={pr.id} className="hover:bg-slate-500/10 transition">
                            <td className="py-2.5 px-2.5">
                              <div className="font-bold">{pr.name}</div>
                              <div className={`text-[11px] ${mutedText}`}>
                                {clientObj ? `${clientObj.name} · ` : ""}
                                {pr.status} · Contract {fmtBdt(pr.contract)}
                                {pr.contract > 0 ? ` (${stats.pct}% collected)` : ""}
                              </div>
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-emerald-500 font-semibold">
                              {fmtBdt(stats.received)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-rose-500 font-semibold">
                              {fmtBdt(stats.expense)}
                            </td>
                            <td
                              className={`py-2.5 px-2.5 text-right font-mono tabular-nums font-bold ${
                                stats.net >= 0 ? "text-emerald-500" : "text-rose-500"
                              }`}
                            >
                              {fmtBdt(stats.net)}
                            </td>
                            <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTxFilterProject(pr.id);
                                    setActiveTab("transactions");
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-teal-500/15 text-teal-500 hover:bg-teal-500/25"
                                >
                                  Txs ({stats.txCount})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProjId(pr.id);
                                    setProjName(pr.name);
                                    setProjClientId(pr.clientId || "");
                                    setProjContract(String(pr.contract || 0));
                                    setProjStatus(pr.status);
                                    setProjNote(pr.note || "");
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProject(pr)}
                                  className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {ws.projects.length === 0 && (
                        <tr>
                          <td colSpan={5} className={`py-8 text-center ${mutedText}`}>
                            No projects added. Add a project or click "Import BOQ Projects".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: ACCOUNTS & WALLETS                                      */}
          {/* ============================================================== */}
          {activeTab === "accounts" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <form
                  onSubmit={handleSaveAccount}
                  className={`lg:col-span-4 rounded-xl border p-4 space-y-3 ${surfaceBg}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-500/20 pb-2">
                    <h3 className="text-sm font-bold">{acctId ? "Edit Account" : "Add Account / Wallet"}</h3>
                    {acctId && (
                      <button
                        type="button"
                        onClick={resetAccountForm}
                        className="text-[11px] font-semibold text-amber-500 hover:underline"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Account Name</label>
                    <input
                      type="text"
                      value={acctName}
                      onChange={(e) => setAcctName(e.target.value)}
                      required
                      placeholder="e.g. City Bank Business / Office Cash"
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Account Type</label>
                      <select
                        value={acctType}
                        onChange={(e) => setAcctType(e.target.value as AccountWalletType)}
                        className={inputCls}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank</option>
                        <option value="Mobile Banking">Mobile Banking</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Opening Balance (৳)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={acctOpening}
                        onChange={(e) => setAcctOpening(e.target.value)}
                        className={`${inputCls} font-mono tabular-nums`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Account / Wallet No (optional)</label>
                    <input
                      type="text"
                      value={acctNumber}
                      onChange={(e) => setAcctNumber(e.target.value)}
                      placeholder="Bank A/C or bKash/Nagad number"
                      className={inputCls}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={readOnly}
                    className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition"
                  >
                    {acctId ? "Update Account" : "Save Account"}
                  </button>
                </form>

                <div className={`lg:col-span-8 rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Account Register ({ws.accounts.length})</h3>
                    <button
                      type="button"
                      onClick={() => {
                        resetTxForm();
                        setTxType("transfer");
                        setActiveTab("transactions");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Quick Transfer
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className={isLight ? "bg-slate-100 text-slate-600" : "bg-[#1a2b42] text-[#8ba3c1]"}>
                        <tr>
                          <th className="py-2 px-2.5 font-semibold">Account</th>
                          <th className="py-2 px-2.5 font-semibold">Type</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Opening</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Current Balance</th>
                          <th className="py-2 px-2.5 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/20">
                        {ws.accounts.map((a) => {
                          const bal = accountBalances[a.id]?.balance || 0;
                          return (
                            <tr key={a.id} className="hover:bg-slate-500/10 transition">
                              <td className="py-2.5 px-2.5">
                                <div className="font-bold">{a.name}</div>
                                {a.accountNumber && (
                                  <div className={`text-[11px] font-mono ${mutedText}`}>{a.accountNumber}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-2.5">{a.type}</td>
                              <td className="py-2.5 px-2.5 text-right font-mono tabular-nums">
                                {fmtBdt(a.opening)}
                              </td>
                              <td className={`py-2.5 px-2.5 text-right font-mono tabular-nums font-bold ${bal < 0 ? "text-rose-500" : "text-emerald-500"}`}>
                                {fmtBdt(bal)}
                              </td>
                              <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAcctId(a.id);
                                      setAcctName(a.name);
                                      setAcctType(a.type);
                                      setAcctOpening(String(a.opening || 0));
                                      setAcctNumber(a.accountNumber || "");
                                    }}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-sky-500/15 text-sky-500 hover:bg-sky-500/25"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAccount(a)}
                                    className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border p-3 text-xs ${innerCardBg} ${mutedText}`}>
                Note: Transfers move money between your own wallets and do not count as Income or Expense. Opening balances represent starting funds and are excluded from Profit & Loss.
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: FINANCIAL REPORTS                                       */}
          {/* ============================================================== */}
          {activeTab === "reports" && (
            <div className={`rounded-xl border p-4 space-y-5 ${surfaceBg}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold">Financial Reports & P&L Statement</h3>
                  <p className={`text-xs ${mutedText}`}>
                    Generate Profit & Loss, Category Summary, and printable financial statements for your firm.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadHtmlReport}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                      isLight
                        ? "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-[#1a2b42] hover:bg-[#243b55] text-slate-200 border-[#2d4a6a]"
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" /> HTML Report
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPrint("report")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                  </button>
                </div>
              </div>

              {/* Date Controls */}
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>From Date</label>
                  <input
                    type="date"
                    value={reportFrom}
                    onChange={(e) => setReportFrom(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>To Date</label>
                  <input
                    type="date"
                    value={reportTo}
                    onChange={(e) => setReportTo(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setReportFrom(`${currentMonthPrefix()}-01`);
                      setReportTo(todayStr());
                    }}
                    className={`px-2.5 py-2 rounded-lg text-xs font-semibold border ${innerCardBg}`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const yr = new Date().getFullYear();
                      setReportFrom(`${yr}-01-01`);
                      setReportTo(todayStr());
                    }}
                    className={`px-2.5 py-2 rounded-lg text-xs font-semibold border ${innerCardBg}`}
                  >
                    This Year
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportFrom("");
                      setReportTo("");
                    }}
                    className={`px-2.5 py-2 rounded-lg text-xs font-semibold border ${innerCardBg}`}
                  >
                    All Time
                  </button>
                </div>
              </div>

              {/* Report KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`rounded-xl border p-3.5 ${innerCardBg}`}>
                  <div className={`text-[11px] ${mutedText}`}>Period Income</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-500 mt-1">
                    {fmtBdt(reportData.income)}
                  </div>
                </div>
                <div className={`rounded-xl border p-3.5 ${innerCardBg}`}>
                  <div className={`text-[11px] ${mutedText}`}>Period Expense</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-rose-500 mt-1">
                    {fmtBdt(reportData.expense)}
                  </div>
                </div>
                <div className={`rounded-xl border p-3.5 ${innerCardBg}`}>
                  <div className={`text-[11px] ${mutedText}`}>Net Profit / Loss</div>
                  <div
                    className={`text-xl font-bold font-mono tabular-nums mt-1 ${
                      reportData.net >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {fmtBdt(reportData.net)}
                  </div>
                </div>
                <div className={`rounded-xl border p-3.5 ${innerCardBg}`}>
                  <div className={`text-[11px] ${mutedText}`}>Transactions</div>
                  <div className="text-xl font-bold font-mono tabular-nums mt-1">
                    {reportData.txs.length}
                  </div>
                </div>
              </div>

              {/* Income & Expense Category Breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`rounded-xl border p-4 space-y-2.5 ${innerCardBg}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-emerald-500">
                    Income by Category
                  </h4>
                  {reportData.incomeCats.length === 0 ? (
                    <p className={`text-xs ${mutedText}`}>No income in selected period.</p>
                  ) : (
                    reportData.incomeCats.map(([cat, val]) => {
                      const share = reportData.income > 0 ? Math.round((val / reportData.income) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1 text-xs">
                          <div className="flex justify-between font-medium">
                            <span>{cat}</span>
                            <span className="font-mono tabular-nums font-bold">
                              {fmtBdt(val)} ({share}%)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-500/20 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className={`rounded-xl border p-4 space-y-2.5 ${innerCardBg}`}>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-rose-500">
                    Expense by Category
                  </h4>
                  {reportData.expenseCats.length === 0 ? (
                    <p className={`text-xs ${mutedText}`}>No expenses in selected period.</p>
                  ) : (
                    reportData.expenseCats.map(([cat, val]) => {
                      const share = reportData.expense > 0 ? Math.round((val / reportData.expense) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1 text-xs">
                          <div className="flex justify-between font-medium">
                            <span>{cat}</span>
                            <span className="font-mono tabular-nums font-bold">
                              {fmtBdt(val)} ({share}%)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-500/20 overflow-hidden">
                            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 7: BUSINESS PROFILE & BACKUP SETTINGS                      */}
          {/* ============================================================== */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Business Profile */}
              <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                <h3 className="text-sm font-bold border-b border-slate-500/20 pb-2">
                  Your Business Profile (Private to Your Account)
                </h3>
                <p className={`text-xs ${mutedText}`}>
                  Customize your own engineering firm, consultancy, or personal business name shown across reports, ledgers, and prints.
                </p>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                    Business / Firm Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Your Engineering & Consultancy Firm Name"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                    Tagline / Specialization
                  </label>
                  <input
                    type="text"
                    value={profileForm.tagline || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                    placeholder="e.g. Structural Design, BOQ & Construction Consultancy"
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Phone</label>
                    <input
                      type="text"
                      value={profileForm.phone || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+880 1..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Email</label>
                    <input
                      type="email"
                      value={profileForm.email || ""}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="firm@example.com"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Office Address</label>
                  <input
                    type="text"
                    value={profileForm.address || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    placeholder="City, Bangladesh"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>Authorized Signatory Name</label>
                  <input
                    type="text"
                    value={profileForm.signatoryName || ""}
                    onChange={(e) => setProfileForm({ ...profileForm, signatoryName: e.target.value })}
                    placeholder="Engineer / Proprietor Name"
                    className={inputCls}
                  />
                </div>

                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() =>
                    commitWorkspace(
                      { ...ws, profile: { ...profileForm, name: profileForm.name.trim() || "My Business Accounts" } },
                      "Business profile saved to cloud!"
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold transition"
                >
                  Save Business Profile
                </button>
              </div>

              {/* Backup & Restore */}
              <div className={`rounded-xl border p-4 space-y-3 ${surfaceBg}`}>
                <h3 className="text-sm font-bold border-b border-slate-500/20 pb-2">
                  Cloud Sync, Backup & Restore
                </h3>
                <p className={`text-xs ${mutedText}`}>
                  Your accounting ledger is strictly private to your login ({currentUserEmail || "current account"}) and automatically synced to cloud storage. Download periodic JSON backups for safekeeping.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Full JSON Backup
                  </button>

                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => restoreInputRef.current?.click()}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg border text-xs font-bold transition ${innerCardBg}`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Restore From JSON Backup
                  </button>
                </div>

                <div className={`rounded-lg border p-3 text-xs ${innerCardBg} ${mutedText}`}>
                  Supports restoring backups exported either from Dolphin Box Accounts or legacy accounting JSON backups (preserving all your wallets, parties, projects, and transactions).
                </div>

                <div className="pt-2 border-t border-slate-500/20">
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      setConfirmAction({
                        title: "Reset Accounting Data",
                        message:
                          "Permanently clear all transactions, parties, projects, and custom wallets in your accounting workspace? Download a JSON backup first!",
                        confirmLabel: "Clear Everything",
                        danger: true,
                        onConfirm: async () => {
                          const fresh = createDefaultAccountingWorkspace(
                            { uid: currentUserId || ws.ownerId, email: currentUserEmail || ws.ownerEmail },
                            currentUserName
                          );
                          fresh.profile = ws.profile;
                          await commitWorkspace(fresh, "Accounting workspace reset cleanly.");
                        },
                      })
                    }
                    className="w-full py-2 px-4 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-500 text-xs font-bold transition"
                  >
                    Reset All Accounting Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PRINT-ONLY A4 DOCUMENT CONTAINER */}
        <div id="printable-accounting-report" className="hidden print:block p-6 text-slate-900 bg-white">
          <div className="flex justify-between items-end border-b-2 border-slate-900 pb-3 mb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{ws.profile?.name || "Business Accounts"}</h1>
              <div className="text-xs text-slate-600 mt-0.5">
                {ws.profile?.tagline || "Engineering & Consultancy Finance"}
                {ws.profile?.address ? ` · ${ws.profile.address}` : ""}
                {ws.profile?.phone ? ` · ${ws.profile.phone}` : ""}
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold uppercase tracking-wide text-slate-900">
                {printTarget === "statement" && selectedPartyStatement
                  ? "Party Ledger Statement"
                  : printTarget === "director" && selectedDirectorLedger
                  ? "Director Ledger Statement"
                  : printTarget === "profit_sheet"
                  ? "Profit & Salary Distribution Sheet"
                  : printTarget === "summary_hisab"
                  ? "Baki, Directors & Settlement Hisab"
                  : "Financial Profit & Loss Report"}
              </div>
              <div className="text-slate-600">
                {printTarget === "statement" && selectedPartyStatement
                  ? selectedPartyStatement.party.name
                  : printTarget === "director" && selectedDirectorLedger
                  ? `${selectedDirectorLedger.director.name} (${selectedDirectorLedger.director.sharePercent}%)`
                  : printTarget === "profit_sheet"
                  ? `Period: ${distFrom || "Start"} to ${distTo || todayStr()}`
                  : printTarget === "summary_hisab"
                  ? `As of ${todayStr()}`
                  : `Period: ${reportFrom || "Start"} to ${reportTo || todayStr()}`}
              </div>
            </div>
          </div>

          {printTarget === "statement" && selectedPartyStatement ? (
            <div className="space-y-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-400 bg-slate-100">
                    <th className="py-2 px-2 text-left">Date</th>
                    <th className="py-2 px-2 text-left">Particulars</th>
                    <th className="py-2 px-2 text-left">Source</th>
                    <th className="py-2 px-2 text-right">Baki / Expense</th>
                    <th className="py-2 px-2 text-right">Paid Baki / Recv</th>
                    <th className="py-2 px-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  <tr>
                    <td className="py-1.5 px-2 font-sans">—</td>
                    <td className="py-1.5 px-2 font-sans font-bold">Opening Balance</td>
                    <td className="py-1.5 px-2 font-sans">—</td>
                    <td className="py-1.5 px-2 text-right">—</td>
                    <td className="py-1.5 px-2 text-right">—</td>
                    <td className="py-1.5 px-2 text-right font-bold">
                      {fmtBdt(selectedPartyStatement.openingSigned)}
                    </td>
                  </tr>
                  {selectedPartyStatement.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 px-2">{r.date}</td>
                      <td className="py-1.5 px-2 font-sans">{r.desc}</td>
                      <td className="py-1.5 px-2 font-sans">{r.acctName}</td>
                      <td className="py-1.5 px-2 text-right">{r.type === "expense" ? fmtBdt(r.amount) : "—"}</td>
                      <td className="py-1.5 px-2 text-right">
                        {r.type === "income" || r.type === "due_settlement" ? fmtBdt(r.amount) : "—"}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold">{fmtBdt(r.running)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-bold text-sm font-mono">
                Closing Balance: {fmtBdt(selectedPartyStatement.finalBalance)}
              </div>
            </div>
          ) : printTarget === "director" && selectedDirectorLedger ? (
            <div className="space-y-4">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-400 bg-slate-100">
                    <th className="py-2 px-2 text-left">Date</th>
                    <th className="py-2 px-2 text-left">Particulars</th>
                    <th className="py-2 px-2 text-right">Credit (+)</th>
                    <th className="py-2 px-2 text-right">Debit (−)</th>
                    <th className="py-2 px-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                  <tr>
                    <td className="py-1.5 px-2 font-sans">—</td>
                    <td className="py-1.5 px-2 font-sans font-bold">Opening Balance</td>
                    <td className="py-1.5 px-2 text-right">—</td>
                    <td className="py-1.5 px-2 text-right">—</td>
                    <td className="py-1.5 px-2 text-right font-bold">{fmtBdt(selectedDirectorLedger.opening)}</td>
                  </tr>
                  {selectedDirectorLedger.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-1.5 px-2">{r.date}</td>
                      <td className="py-1.5 px-2 font-sans">{r.label}</td>
                      <td className="py-1.5 px-2 text-right">{r.credit > 0 ? fmtBdt(r.credit) : "—"}</td>
                      <td className="py-1.5 px-2 text-right">{r.debit > 0 ? fmtBdt(r.debit) : "—"}</td>
                      <td className="py-1.5 px-2 text-right font-bold">{fmtBdt(r.running)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-bold text-sm font-mono">
                Closing Net Balance: {fmtBdt(selectedDirectorLedger.finalBalance)}
              </div>
            </div>
          ) : printTarget === "profit_sheet" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="text-[10px] text-slate-500">Operating Profit</div>
                  <div className="text-base font-bold font-mono">{fmtBdt(profitDistCalculation.operatingProfit)}</div>
                </div>
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="text-[10px] text-slate-500">Profit Pool Used</div>
                  <div className="text-base font-bold font-mono">{fmtBdt(profitDistCalculation.poolBase)}</div>
                </div>
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="text-[10px] text-slate-500">Total Salary Base</div>
                  <div className="text-base font-bold font-mono">{fmtBdt(profitDistCalculation.totalSalaryBase)}</div>
                </div>
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="text-[10px] text-slate-500">Remaining Profit</div>
                  <div className="text-base font-bold font-mono">
                    {fmtBdt(profitDistCalculation.remainingProfitAfterSalary)}
                  </div>
                </div>
              </div>

              <table className="w-full text-xs border-collapse font-mono tabular-nums">
                <thead>
                  <tr className="border-b-2 border-slate-400 bg-slate-100 font-sans">
                    <th className="py-2 px-2 text-left">Director</th>
                    <th className="py-2 px-2 text-right">Share %</th>
                    <th className="py-2 px-2 text-right">Salary</th>
                    <th className="py-2 px-2 text-right">Profit Share</th>
                    <th className="py-2 px-2 text-right">Total Dist.</th>
                    <th className="py-2 px-2 text-right">Ledger Bal</th>
                    <th className="py-2 px-2 text-right">Final Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {profitDistCalculation.rows.map((r) => (
                    <tr key={r.director.id}>
                      <td className="py-1.5 px-2 font-sans font-bold">{r.director.name}</td>
                      <td className="py-1.5 px-2 text-right">{r.effectivePct.toFixed(2)}%</td>
                      <td className="py-1.5 px-2 text-right">{fmtBdt(r.salaryEntitlement)}</td>
                      <td className="py-1.5 px-2 text-right">{fmtBdt(r.profitShare)}</td>
                      <td className="py-1.5 px-2 text-right font-bold">{fmtBdt(r.totalEarned)}</td>
                      <td className="py-1.5 px-2 text-right">{fmtBdt(r.currentLedgerBal)}</td>
                      <td className="py-1.5 px-2 text-right font-bold">{fmtBdt(r.projectedNetPayable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : printTarget === "summary_hisab" ? (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide mb-2">
                  1. Directors Khoroch (Spent), Niyeche (Taken) & Net Settlement
                </h4>
                <table className="w-full text-xs border-collapse font-mono tabular-nums">
                  <thead>
                    <tr className="border-b-2 border-slate-400 bg-slate-100 font-sans">
                      <th className="py-1.5 px-2 text-left">Director</th>
                      <th className="py-1.5 px-2 text-right">Bills Paid</th>
                      <th className="py-1.5 px-2 text-right">Given/Joma</th>
                      <th className="py-1.5 px-2 text-right">Taken/Kept</th>
                      <th className="py-1.5 px-2 text-right">Profit/Sal</th>
                      <th className="py-1.5 px-2 text-right">Net Pabe / Dibe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {hisabOverview.directorRows.map((r) => (
                      <tr key={r.director.id}>
                        <td className="py-1.5 px-2 font-sans font-bold">{r.director.name}</td>
                        <td className="py-1.5 px-2 text-right">{fmtBdt(r.paidForFirm)}</td>
                        <td className="py-1.5 px-2 text-right">{fmtBdt(r.givenToDirectors + r.depositedToFirm)}</td>
                        <td className="py-1.5 px-2 text-right">{fmtBdt(r.totalTaken)}</td>
                        <td className="py-1.5 px-2 text-right">{fmtBdt(r.profitSalaryCredited)}</td>
                        <td className="py-1.5 px-2 text-right font-bold">
                          {fmtBdt(r.netBalance)} ({r.netBalance > 0 ? "Pabe" : r.netBalance < 0 ? "Dibe" : "Settled"})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-2">
                    2. Kothai Baki Ache ({fmtBdt(duesTotals.payable)})
                  </h4>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-400 bg-slate-100">
                        <th className="py-1.5 px-2 text-left">Shop / Vendor</th>
                        <th className="py-1.5 px-2 text-right">Baki</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {hisabOverview.payablesList.map(({ party, bakiAmount }) => (
                        <tr key={party.id}>
                          <td className="py-1.5 px-2">{party.name} ({party.type})</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold">{fmtBdt(bakiAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide mb-2">
                    3. Client Receivable ({fmtBdt(duesTotals.receivable)})
                  </h4>
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-400 bg-slate-100">
                        <th className="py-1.5 px-2 text-left">Client / Party</th>
                        <th className="py-1.5 px-2 text-right">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {hisabOverview.receivablesList.map(({ party, recvAmount }) => (
                        <tr key={party.id}>
                          <td className="py-1.5 px-2">{party.name}</td>
                          <td className="py-1.5 px-2 text-right font-mono font-bold">{fmtBdt(recvAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wide mb-2">
                  4. Expenses Bought on Baki ({hisabOverview.creditExpenses.length})
                </h4>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-400 bg-slate-100">
                      <th className="py-1.5 px-2 text-left">Date</th>
                      <th className="py-1.5 px-2 text-left">Particulars</th>
                      <th className="py-1.5 px-2 text-left">Shop / Vendor</th>
                      <th className="py-1.5 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {hisabOverview.creditExpenses.map((t) => (
                      <tr key={t.id}>
                        <td className="py-1.5 px-2 font-mono">{t.date}</td>
                        <td className="py-1.5 px-2">{t.desc}</td>
                        <td className="py-1.5 px-2">{ws.parties.find((p) => p.id === t.partyId)?.name || "—"}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{fmtBdt(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="text-[10px] text-slate-500">Income</div>
                  <div className="text-base font-bold font-mono">{fmtBdt(reportData.income)}</div>
                </div>
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="text-[10px] text-slate-500">Expense</div>
                  <div className="text-base font-bold font-mono">{fmtBdt(reportData.expense)}</div>
                </div>
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="text-[10px] text-slate-500">Net Profit/Loss</div>
                  <div className="text-base font-bold font-mono">{fmtBdt(reportData.net)}</div>
                </div>
                <div className="border border-slate-300 rounded p-2.5">
                  <div className="text-[10px] text-slate-500">Transactions</div>
                  <div className="text-base font-bold font-mono">{reportData.txs.length}</div>
                </div>
              </div>

              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-400 bg-slate-100">
                    <th className="py-2 px-2 text-left">Date</th>
                    <th className="py-2 px-2 text-left">Description</th>
                    <th className="py-2 px-2 text-left">Category</th>
                    <th className="py-2 px-2 text-left">Type</th>
                    <th className="py-2 px-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.txs.map((t) => (
                    <tr key={t.id}>
                      <td className="py-1.5 px-2 font-mono">{t.date}</td>
                      <td className="py-1.5 px-2">{t.desc}</td>
                      <td className="py-1.5 px-2">{t.category}</td>
                      <td className="py-1.5 px-2 capitalize">{t.type}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{fmtBdt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-10 pt-3 border-t border-slate-300 flex justify-between text-[10px] text-slate-500">
            <span>Prepared by: {ws.profile?.signatoryName || ws.profile?.name || "Authorized Signatory"}</span>
            <span>Generated via Dolphin Box · Developer: Anonymous</span>
          </div>
        </div>

        {/* CONFIRMATION MODAL (In-App, No window.confirm) */}
        {confirmAction && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-xl border p-5 space-y-4 shadow-2xl ${surfaceBg}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">{confirmAction.title}</h4>
                  <p className={`text-xs mt-1 ${mutedText}`}>{confirmAction.message}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${innerCardBg}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const fn = confirmAction.onConfirm;
                    setConfirmAction(null);
                    await fn();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white ${
                    confirmAction.danger ? "bg-rose-600 hover:bg-rose-500" : "bg-teal-600 hover:bg-teal-500"
                  }`}
                >
                  {confirmAction.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
