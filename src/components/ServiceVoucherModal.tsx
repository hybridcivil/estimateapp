import React, { useState, useEffect, useMemo, useRef } from "react";
import { Project, ServiceVoucher, ServiceVoucherItem, VoucherUnit } from "../types";
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  X,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  Calendar,
  Building,
  User,
  Phone,
  MapPin,
  CreditCard,
  Edit,
  Copy,
  Download,
  Share2,
  FileText,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { numberToBengaliWords, toBengaliNumber } from "../utils/numberToWordsBengali";

interface ServiceVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: Project | null;
  vouchers: ServiceVoucher[];
  onSaveVoucher: (v: ServiceVoucher) => Promise<void>;
  onDeleteVoucher: (id: string) => Promise<void>;
  currentUserEmail?: string;
  currentUserId?: string;
}

// Preset standard civil & architectural consultancy services in Bangladesh
interface PresetService {
  name: string;
  nameBn: string;
  defaultUnit: VoucherUnit;
  defaultRate: number;
}

const PRESET_SERVICES: PresetService[] = [
  {
    name: "Architectural Floor Plan & Working Drawings",
    nameBn: "আর্কিটেকচারাল ফ্লোর প্ল্যান ও ওয়ার্কিং ড্রয়িং",
    defaultUnit: "sq.ft",
    defaultRate: 15,
  },
  {
    name: "Structural Analysis & Detailing (BNBC 2020)",
    nameBn: "স্ট্রাকচারাল এনালাইসিস ও বিএনবিসি রিবার শিডিউল",
    defaultUnit: "sq.ft",
    defaultRate: 20,
  },
  {
    name: "Plumbing, Sanitary & Drainage System Design",
    nameBn: "প্লাম্বিং, স্যানিটারি ও ড্রেনেজ লেআউট",
    defaultUnit: "sq.ft",
    defaultRate: 5,
  },
  {
    name: "Electrical Layout & Sub-station Design",
    nameBn: "ইলেকট্রিক্যাল ওয়্যারিং, লাইটিং ও লোড ক্যালকুলেশন",
    defaultUnit: "sq.ft",
    defaultRate: 5,
  },
  {
    name: "3D Realistic Building Exterior Rendering",
    nameBn: "থ্রিডি এক্সটেরিয়র ডিজাইন ও এলিভেশন রেন্ডারিং",
    defaultUnit: "Job",
    defaultRate: 15000,
  },
  {
    name: "3D Interior Design & Walkthrough",
    nameBn: "থ্রিডি ইন্টেরিয়র ডিজাইন ও স্পেস প্ল্যানিং",
    defaultUnit: "sq.ft",
    defaultRate: 50,
  },
  {
    name: "Municipality / RAJUK Approval Drawing Sheet",
    nameBn: "পৌরসভা / রাজউক অনুমোদন শিট ও ডকুমেন্টেশন",
    defaultUnit: "Job",
    defaultRate: 20000,
  },
  {
    name: "Geotechnical Soil Test & Borehole Investigation",
    nameBn: "সয়েল টেস্ট (বোরহোল) ও ফাউন্ডেশন রিপোর্ট",
    defaultUnit: "Job",
    defaultRate: 35000,
  },
  {
    name: "Digital Land Survey (Total Station / GPS)",
    nameBn: "ডিজিটাল ল্যান্ড সার্ভে ও মোজা ম্যাপ ডিমারকেশন",
    defaultUnit: "Job",
    defaultRate: 12000,
  },
  {
    name: "Construction Site Supervision & Quality Audit",
    nameBn: "সাইট ভিজিট, ঢালাই চেকিং ও কোয়ালিটি অডিট",
    defaultUnit: "Visit",
    defaultRate: 5000,
  },
  {
    name: "Detailed BOQ & Material Cost Estimation",
    nameBn: "ম্যাটেরিয়াল প্রাক্কলন ও আইটেমাইজড বিওকিউ",
    defaultUnit: "Job",
    defaultRate: 15000,
  },
  {
    name: "Fire Fighting & Safety Plan Approval",
    nameBn: "ফায়ার সেফটি ও ফায়ার হাইড্রেন্ট ড্রয়িং",
    defaultUnit: "Job",
    defaultRate: 18000,
  },
  {
    name: "Structural Health Assessment & Retrofitting",
    nameBn: "ভবন সুদৃঢ়করণ ও স্ট্রাকচারাল স্ট্যাবিলিটি অডিট",
    defaultUnit: "Job",
    defaultRate: 30000,
  },
  {
    name: "Other Consultancy Service",
    nameBn: "অন্যান্য বিশেষ ইঞ্জিনিয়ারিং সেবা",
    defaultUnit: "Job",
    defaultRate: 10000,
  },
];

const DEFAULT_TERMS =
  "১. কার্যাদেশ চূড়ান্ত হলে মোট বিলের ৫০% অগ্রিম প্রদেয়।\n" +
  "২. রাজউক/পৌরসভা ড্রয়িং অনুমোদন ও ফাইনাল আর্কিটেকচারাল/স্ট্রাকচারাল ফাইল হস্তান্তরের পূর্বে অবশিষ্ট বকেয়া পরিশোধ করতে হবে।\n" +
  "৩. সাইট ভিজিট ও ইঞ্জিনিয়ারিং কনসালটেন্সি সেবা সরকারি ও সাপ্তাহিক ছুটির দিন ব্যতীত কর্মদিবসে কার্যকর হবে।\n" +
  "৪. ক্লায়েন্ট কর্তৃক কোনো পরিবর্তন হলে অতিরিক্ত চার্জ প্রযোজ্য হতে পারে।";

export const ServiceVoucherModal: React.FC<ServiceVoucherModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  vouchers,
  onSaveVoucher,
  onDeleteVoucher,
  currentUserEmail,
  currentUserId,
}) => {
  // Navigation tabs: "editor" | "list" | "print"
  const [activeTab, setActiveTab] = useState<"editor" | "list" | "print">("editor");

  // Form State
  const [voucherId, setVoucherId] = useState<string>("");
  const [voucherNo, setVoucherNo] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [clientName, setClientName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [items, setItems] = useState<ServiceVoucherItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [paid, setPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "Cash" | "bKash" | "Nagad" | "Bank Transfer" | "Cheque" | "Other"
  >("Cash");
  const [terms, setTerms] = useState<string>(DEFAULT_TERMS);
  const [notes, setNotes] = useState<string>("");

  // New item drafting row
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customServiceName, setCustomServiceName] = useState<string>("");
  const [itemUnit, setItemUnit] = useState<VoucherUnit>("sq.ft");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemRate, setItemRate] = useState<number>(0);

  // Search & Filter in list view
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Paid" | "Partial" | "Due">("all");

  // State for voucher currently loaded in Print View
  const [printVoucher, setPrintVoucher] = useState<ServiceVoucher | null>(null);

  // Success / Status feedback
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Generate unique sequential voucher number
  const generateVoucherNo = () => {
    const year = new Date().getFullYear();
    const count = (vouchers.length + 1).toString().padStart(4, "0");
    return `HC-${year}-${count}`;
  };

  // Reset or create fresh voucher
  const handleNewVoucher = () => {
    const newId = `voucher_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setVoucherId(newId);
    setVoucherNo(generateVoucherNo());
    setDate(new Date().toISOString().slice(0, 10));
    setClientName(activeProject?.client || "");
    setPhone("");
    setProjectName(activeProject?.name || "");
    setProjectId(activeProject?.id || "");
    setAddress(activeProject?.location || "");
    setItems([]);
    setDiscount(0);
    setPaid(0);
    setPaymentMethod("Cash");
    setTerms(DEFAULT_TERMS);
    setNotes("");
    setActiveTab("editor");
    setSaveSuccessMsg(null);
  };

  // Pre-fill from active project with 1 click
  const handlePreFillFromProject = () => {
    if (!activeProject) return;
    setClientName(activeProject.client || "");
    setProjectName(activeProject.name || "");
    setProjectId(activeProject.id || "");
    setAddress(activeProject.location || "");
  };

  // Load existing voucher for editing
  const handleLoadVoucher = (v: ServiceVoucher) => {
    setVoucherId(v.id);
    setVoucherNo(v.voucherNo);
    setDate(v.date || new Date().toISOString().slice(0, 10));
    setClientName(v.clientName || "");
    setPhone(v.phone || "");
    setProjectName(v.projectName || "");
    setProjectId(v.projectId || "");
    setAddress(v.address || "");
    setItems(Array.isArray(v.items) ? [...v.items] : []);
    setDiscount(v.discount || 0);
    setPaid(v.paid || 0);
    setPaymentMethod(v.paymentMethod || "Cash");
    setTerms(v.terms || DEFAULT_TERMS);
    setNotes(v.notes || "");
    setActiveTab("editor");
    setSaveSuccessMsg(null);
  };

  // Duplicate voucher
  const handleDuplicateVoucher = (v: ServiceVoucher) => {
    const newId = `voucher_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setVoucherId(newId);
    setVoucherNo(generateVoucherNo());
    setDate(new Date().toISOString().slice(0, 10));
    setClientName(v.clientName || "");
    setPhone(v.phone || "");
    setProjectName(v.projectName ? `${v.projectName} (Copy)` : "");
    setProjectId(v.projectId || "");
    setAddress(v.address || "");
    setItems(
      Array.isArray(v.items)
        ? v.items.map((i) => ({ ...i, id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` }))
        : []
    );
    setDiscount(v.discount || 0);
    setPaid(0);
    setPaymentMethod(v.paymentMethod || "Cash");
    setTerms(v.terms || DEFAULT_TERMS);
    setNotes(v.notes || "");
    setActiveTab("editor");
  };

  // Load voucher for printing
  const handleOpenPrint = (v: ServiceVoucher) => {
    setPrintVoucher(v);
    setActiveTab("print");
  };

  // Initialize fresh voucher on first open
  useEffect(() => {
    if (isOpen && !voucherId) {
      handleNewVoucher();
    }
  }, [isOpen]);

  // When preset dropdown changes, prefill rate and unit
  const handlePresetChange = (name: string) => {
    setSelectedPreset(name);
    if (!name) return;
    const found = PRESET_SERVICES.find((p) => p.name === name);
    if (found) {
      setCustomServiceName("");
      setItemUnit(found.defaultUnit);
      setItemRate(found.defaultRate);
    }
  };

  // Add Item to table
  const handleAddItem = () => {
    const serviceTitle = customServiceName.trim() || selectedPreset;
    if (!serviceTitle) {
      alert("সার্ভিসের নাম নির্বাচন করুন অথবা কাস্টম নাম লিখুন");
      return;
    }
    if (itemQty <= 0) {
      alert("পরিমাণ ০ এর বেশি হতে হবে");
      return;
    }
    if (itemRate < 0) {
      alert("মূল্য ঋণাত্মক হতে পারে না");
      return;
    }

    const newItem: ServiceVoucherItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      service: serviceTitle,
      unit: itemUnit,
      qty: itemQty,
      rate: itemRate,
      total: Math.round(itemQty * itemRate),
    };

    setItems([...items, newItem]);
    setSelectedPreset("");
    setCustomServiceName("");
    setItemQty(1);
    setItemRate(0);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<ServiceVoucherItem>) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          const updated = { ...it, ...updates };
          updated.total = Math.round(updated.qty * updated.rate);
          return updated;
        }
        return it;
      })
    );
  };

  // Financial calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.total || 0), 0);
  }, [items]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - (Number(discount) || 0));
  }, [subtotal, discount]);

  const due = useMemo(() => {
    return Math.max(0, netTotal - (Number(paid) || 0));
  }, [netTotal, paid]);

  const paymentStatus: "Paid" | "Partial" | "Due" = useMemo(() => {
    if (netTotal === 0 && subtotal === 0) return "Paid";
    if (due <= 0 && (paid >= netTotal || netTotal === 0)) return "Paid";
    if (paid > 0 && due > 0) return "Partial";
    return "Due";
  }, [netTotal, subtotal, due, paid]);

  // Construct current voucher object
  const currentVoucher: ServiceVoucher = useMemo(() => {
    return {
      id: voucherId || `voucher_${Date.now()}`,
      voucherNo: voucherNo || generateVoucherNo(),
      date,
      clientName: clientName.trim(),
      phone: phone.trim(),
      projectName: projectName.trim(),
      projectId: projectId || undefined,
      address: address.trim(),
      items,
      subtotal,
      discount: Number(discount) || 0,
      netTotal,
      paid: Number(paid) || 0,
      due,
      paymentMethod,
      paymentStatus,
      terms,
      notes,
      ownerEmail: currentUserEmail,
      ownerId: currentUserId,
      createdAt: date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [
    voucherId,
    voucherNo,
    date,
    clientName,
    phone,
    projectName,
    projectId,
    address,
    items,
    subtotal,
    discount,
    netTotal,
    paid,
    due,
    paymentMethod,
    paymentStatus,
    terms,
    notes,
    currentUserEmail,
    currentUserId,
  ]);

  // Save Voucher
  const handleSave = async () => {
    if (!clientName.trim()) {
      alert("অনুগ্রহ করে ক্লায়েন্টের নাম লিখুন");
      return;
    }
    if (items.length === 0) {
      alert("কমপক্ষে একটি সেবা বা সার্ভিস যোগ করুন");
      return;
    }

    setIsSaving(true);
    try {
      await onSaveVoucher(currentVoucher);
      setSaveSuccessMsg(`ভাউচার নং ${currentVoucher.voucherNo} সফলভাবে সংরক্ষিত হয়েছে!`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error("Save voucher error:", err);
      alert("ভাউচার সংরক্ষণে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsSaving(false);
    }
  };

  // Direct print trigger
  const handleDirectPrint = () => {
    setPrintVoucher(currentVoucher);
    setActiveTab("print");
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Filtered list of vouchers
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchSearch =
        !searchQuery ||
        v.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.phone?.includes(searchQuery);

      const matchStatus = statusFilter === "all" || v.paymentStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [vouchers, searchQuery, statusFilter]);

  // Overall KPI Stats
  const stats = useMemo(() => {
    const totalBilled = vouchers.reduce((s, v) => s + (v.netTotal || 0), 0);
    const totalPaid = vouchers.reduce((s, v) => s + (v.paid || 0), 0);
    const totalDue = vouchers.reduce((s, v) => s + (v.due || 0), 0);
    return {
      count: vouchers.length,
      totalBilled,
      totalPaid,
      totalDue,
    };
  }, [vouchers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-[#0f172a] border border-[#2d4a6a] rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden text-slate-100">
        
        {/* TOP MODAL HEADER & TABS (Hidden on Print) */}
        <div className="print:hidden flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#152033] border-b border-[#2d4a6a] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-slate-950 font-black shadow-md">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-wide">
                  HYBRID CIVIL • SERVICE VOUCHER
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Business & Consultancy Billing
                </span>
              </div>
              <p className="text-[11px] text-[#8ba3c1]">
                সার্ভিস মেমো, ক্লায়েন্ট ভাউচার, প্রফেশনাল ড্রয়িং বিল ও পেমেন্ট রিসিট
              </p>
            </div>
          </div>

          {/* Navigation Mode Buttons */}
          <div className="flex items-center gap-1.5 bg-[#0e1624] p-1 rounded-xl border border-[#2d4a6a]">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "editor"
                  ? "bg-[#00c2c7] text-[#0f1c2e] shadow-sm"
                  : "text-[#8ba3c1] hover:text-white"
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Voucher Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition relative ${
                activeTab === "list"
                  ? "bg-[#00c2c7] text-[#0f1c2e] shadow-sm"
                  : "text-[#8ba3c1] hover:text-white"
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Saved Vouchers</span>
              {vouchers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500 text-slate-950 font-bold ml-1">
                  {vouchers.length}
                </span>
              )}
            </button>

            {printVoucher && (
              <button
                type="button"
                onClick={() => setActiveTab("print")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === "print"
                    ? "bg-[#00c2c7] text-[#0f1c2e] shadow-sm"
                    : "text-[#8ba3c1] hover:text-white"
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Preview</span>
              </button>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8ba3c1] hover:text-white hover:bg-[#243b55] rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFICATION BANNER */}
        {saveSuccessMsg && (
          <div className="print:hidden bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 px-4 py-2 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {saveSuccessMsg}
            </span>
            <button
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-400 hover:text-white text-xs underline font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {/* ============================================================== */}
          {/* TAB 1: VOUCHER EDITOR                                           */}
          {/* ============================================================== */}
          {activeTab === "editor" && (
            <div className="space-y-4">
              {/* Header Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-[#2d4a6a]/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-[#1a2b42] px-2.5 py-1 rounded-lg border border-[#2d4a6a]">
                    <span className="text-[10px] text-[#8ba3c1] font-bold uppercase tracking-wider">Voucher No:</span>
                    <input
                      type="text"
                      value={voucherNo}
                      onChange={(e) => setVoucherNo(e.target.value)}
                      className="bg-transparent text-emerald-400 font-mono font-extrabold text-xs outline-none w-28 sm:w-36"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#1a2b42] px-2.5 py-1 rounded-lg border border-[#2d4a6a]">
                    <Calendar className="w-3.5 h-3.5 text-[#00c2c7]" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent text-white text-xs font-mono outline-none"
                    />
                  </div>

                  {activeProject && (
                    <button
                      type="button"
                      onClick={handlePreFillFromProject}
                      className="flex items-center gap-1 bg-[#1a2b42] hover:bg-[#243b55] text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs font-semibold transition active:scale-95"
                      title="Load client name, project name, and site address from the current project"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pre-fill from "{activeProject.name}"</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNewVoucher}
                    className="flex items-center gap-1 bg-[#1a2b42] hover:bg-[#243b55] text-[#8ba3c1] hover:text-white px-2.5 py-1 rounded-lg text-xs font-semibold border border-[#2d4a6a] transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Voucher</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectPrint}
                    className="flex items-center gap-1.5 bg-[#243b55] hover:bg-[#2d4a6a] text-white border border-[#2d4a6a] px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#00c2c7]" />
                    <span>Print / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSaving ? "সংরক্ষণ হচ্ছে..." : "Voucher সংরক্ষণ করুন"}</span>
                  </button>
                </div>
              </div>

              {/* SECTION: CLIENT & PROJECT INFORMATION */}
              <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3.5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#2d4a6a]/60 pb-2">
                  <h4 className="text-xs font-bold text-[#00c2c7] uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    ক্লায়েন্ট ও প্রজেক্টের বিবরণ (Client & Project Details)
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1]">Bill To Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      ক্লায়েন্টের নাম (Client Name) <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-1.5 focus-within:border-[#00c2c7]">
                      <User className="w-3.5 h-3.5 text-[#8ba3c1] mr-1.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="যেমন: ইঞ্জিনিয়ার মো: রফিকুল ইসলাম"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none w-full font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      মোবাইল নম্বর (Phone / Mobile)
                    </label>
                    <div className="flex items-center bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-1.5 focus-within:border-[#00c2c7]">
                      <Phone className="w-3.5 h-3.5 text-[#8ba3c1] mr-1.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="01XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none w-full font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      প্রজেক্ট / ভবনের নাম (Project / Building)
                    </label>
                    <div className="flex items-center bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-1.5 focus-within:border-[#00c2c7]">
                      <Building className="w-3.5 h-3.5 text-[#8ba3c1] mr-1.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="যেমন: নাজনীন ভিলা (৬ তলা ভবন)"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      ঠিকানা / সাইট লোকেশন (Address / Location)
                    </label>
                    <div className="flex items-center bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-1.5 focus-within:border-[#00c2c7]">
                      <MapPin className="w-3.5 h-3.5 text-[#8ba3c1] mr-1.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="যেমন: ব্লক-ডি, বসুন্ধরা আ/এ, ঢাকা"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: ADD SERVICES TOOLBAR */}
              <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3.5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#2d4a6a]/60 pb-2">
                  <h4 className="text-xs font-bold text-[#f5a623] uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    ইঞ্জিনিয়ারিং ও পরামর্শ সার্ভিস নির্বাচন করুন (Add Engineering Services)
                  </h4>
                  <span className="text-[10px] text-[#8ba3c1]">Standard Market Consultancy Rates</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end text-xs">
                  {/* Preset Dropdown */}
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-bold text-[#8ba3c1] mb-1 uppercase tracking-wider">
                      সার্ভিস ক্যাটাগরি (Preset Service)
                    </label>
                    <select
                      value={selectedPreset}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-2 text-xs text-white outline-none cursor-pointer focus:border-[#00c2c7]"
                    >
                      <option value="">-- সার্ভিস নির্বাচন করুন --</option>
                      {PRESET_SERVICES.map((p) => (
                        <option key={p.name} value={p.name} className="bg-[#152033] text-white">
                          {p.name} ({p.nameBn})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Description or Name override */}
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-[#8ba3c1] mb-1 uppercase tracking-wider">
                      কাস্টম বিবরণ / নাম (Custom Title)
                    </label>
                    <input
                      type="text"
                      placeholder="অথবা কাস্টম সেবার নাম লিখুন..."
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-2 text-xs text-white outline-none focus:border-[#00c2c7]"
                    />
                  </div>

                  {/* Unit Selector */}
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold text-[#8ba3c1] mb-1 uppercase tracking-wider">
                      একক (Unit)
                    </label>
                    <select
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value as VoucherUnit)}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2 py-2 text-xs text-white outline-none focus:border-[#00c2c7]"
                    >
                      <option value="sq.ft">sq.ft</option>
                      <option value="Job">Job</option>
                      <option value="Floor">Floor</option>
                      <option value="Nos">Nos</option>
                      <option value="Visit">Visit</option>
                      <option value="Month">Month</option>
                      <option value="Item">Item</option>
                      <option value="Points">Points</option>
                    </select>
                  </div>

                  {/* Qty */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#8ba3c1] mb-1 uppercase tracking-wider">
                      পরিমাণ (Qty)
                    </label>
                    <input
                      type="number"
                      min={0.01}
                      step="any"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-2 text-xs text-white outline-none font-mono font-bold focus:border-[#00c2c7]"
                    />
                  </div>

                  {/* Rate */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-[#8ba3c1] mb-1 uppercase tracking-wider">
                      দর (৳ Rate)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="৳ দর"
                        value={itemRate || ""}
                        onChange={(e) => setItemRate(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-2 text-xs text-emerald-400 outline-none font-mono font-bold focus:border-[#00c2c7]"
                      />
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] font-black px-3 py-2 rounded-lg text-xs transition shrink-0 active:scale-95 shadow-sm"
                        title="Add this item"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: VOUCHER ITEMS TABLE */}
              <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl overflow-hidden shadow-sm">
                <div className="px-3.5 py-2.5 bg-[#152033] border-b border-[#2d4a6a] flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#00c2c7]" />
                    সার্ভিস আইটেম তালিকা ({items.length} Items Selected)
                  </h4>
                  <span className="text-[11px] font-mono text-[#8ba3c1]">
                    Subtotal: <strong className="text-emerald-400">৳ {subtotal.toLocaleString("en-IN")}</strong>
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Receipt className="w-8 h-8 text-[#2d4a6a] mx-auto mb-2 opacity-50" />
                    কোনো সার্ভিস যোগ করা হয়নি। উপরের ড্রপডাউন থেকে সেবা নির্বাচন করে "+ Add" বাটনে ক্লিক করুন।
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#1a2b42]/80 text-[#8ba3c1] font-bold border-b border-[#2d4a6a] text-[11px]">
                          <th className="py-2.5 px-3 text-center w-10">#</th>
                          <th className="py-2.5 px-3">সার্ভিস বিবরণ (Scope of Service)</th>
                          <th className="py-2.5 px-2 text-center w-20">একক (Unit)</th>
                          <th className="py-2.5 px-3 text-right w-24">পরিমাণ (Qty)</th>
                          <th className="py-2.5 px-3 text-right w-28">একক মূল্য (Rate ৳)</th>
                          <th className="py-2.5 px-3 text-right w-32">মোট মূল্য (Total ৳)</th>
                          <th className="py-2.5 px-2 text-center w-12">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2d4a6a]/60 text-white font-medium">
                        {items.map((it, idx) => (
                          <tr key={it.id} className="hover:bg-[#1a2b42]/40 transition">
                            <td className="py-2 px-3 text-center text-[#8ba3c1] font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={it.service}
                                onChange={(e) => handleUpdateItem(it.id, { service: e.target.value })}
                                className="bg-transparent text-white font-semibold text-xs outline-none w-full hover:bg-[#1a2b42]/60 px-1 py-0.5 rounded"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className="px-1.5 py-0.5 rounded bg-[#1a2b42] text-[10px] font-mono text-[#8ba3c1] border border-[#2d4a6a]">
                                {it.unit}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min={0.01}
                                step="any"
                                value={it.qty}
                                onChange={(e) =>
                                  handleUpdateItem(it.id, { qty: parseFloat(e.target.value) || 0 })
                                }
                                className="bg-[#1a2b42] text-right font-mono font-bold text-xs text-white outline-none w-20 px-1.5 py-0.5 rounded border border-[#2d4a6a]"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={it.rate}
                                onChange={(e) =>
                                  handleUpdateItem(it.id, { rate: parseFloat(e.target.value) || 0 })
                                }
                                className="bg-[#1a2b42] text-right font-mono font-bold text-xs text-emerald-400 outline-none w-24 px-1.5 py-0.5 rounded border border-[#2d4a6a]"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-400">
                              ৳ {it.total.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(it.id)}
                                className="p-1 text-[#8ba3c1] hover:text-rose-400 rounded transition"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* SECTION: FINANCIAL CALCULATION & PAYMENT TRACKING */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                {/* Terms and Payment Method (Col 7) */}
                <div className="lg:col-span-7 bg-[#121a2b] border border-[#2d4a6a] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2d4a6a]/60 pb-2">
                    <h4 className="text-xs font-bold text-[#00c2c7] uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      পেমেন্ট মাধ্যম ও শর্তাবলী (Payment Method & Terms)
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                        পেমেন্ট মাধ্যম (Payment Method)
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e: any) => setPaymentMethod(e.target.value)}
                        className="w-full bg-[#1a2b42] border border-[#2d4a6a] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer focus:border-[#00c2c7]"
                      >
                        <option value="Cash">Cash (নগদ)</option>
                        <option value="bKash">bKash (বিকাশ)</option>
                        <option value="Nagad">Nagad (নগদ)</option>
                        <option value="Bank Transfer">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                        <option value="Cheque">Bank Cheque (চেক)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                        পেমেন্ট স্ট্যাটাস (Payment Status)
                      </label>
                      <div className="flex items-center gap-2 py-1">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                            paymentStatus === "Paid"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : paymentStatus === "Partial"
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          }`}
                        >
                          {paymentStatus === "Paid" && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {paymentStatus === "Partial" && <Clock className="w-3.5 h-3.5" />}
                          {paymentStatus === "Due" && <AlertCircle className="w-3.5 h-3.5" />}
                          <span>{paymentStatus}</span>
                        </span>
                        <span className="text-[10px] text-[#8ba3c1]">
                          {paymentStatus === "Paid"
                            ? "সম্পূর্ণ পরিশোধিত"
                            : paymentStatus === "Partial"
                            ? "আংশিক অগ্রিম গৃহীত"
                            : "সম্পূর্ণ বকেয়া"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                      পেমেন্ট ও ডেলিভারি শর্তাবলী (Terms & Conditions)
                    </label>
                    <textarea
                      rows={3}
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="অফিসিয়াল নীতিমালা ও শর্ত..."
                      className="w-full bg-[#1a2b42] border border-[#2d4a6a] rounded-lg p-2 text-xs text-slate-200 outline-none focus:border-[#00c2c7] leading-relaxed resize-none"
                    />
                  </div>
                </div>

                {/* Calculation Totals Card (Col 5) */}
                <div className="lg:col-span-5 bg-[#152033] border border-[#2d4a6a] rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between shadow-lg">
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-[#2d4a6a]/60">
                      <span>সর্বমোট বিল (Subtotal):</span>
                      <span className="font-mono font-bold text-sm text-white">
                        ৳ {subtotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-[#2d4a6a]/60">
                      <span className="flex items-center gap-1 text-[#f5a623]">
                        <span>বিশেষ ছাড় (Discount ৳):</span>
                      </span>
                      <div className="w-32">
                        <input
                          type="number"
                          min={0}
                          value={discount}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#1a2b42] border border-[#f5a623]/40 text-right font-mono font-bold text-xs text-[#f5a623] px-2 py-1 rounded outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-200 py-1 bg-[#1a2b42]/80 px-2 rounded-lg">
                      <span className="font-bold text-white">ডিসকাউন্ট পরবর্তী মূল্য (Net Total):</span>
                      <span className="font-mono font-extrabold text-base text-[#00c2c7]">
                        ৳ {netTotal.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300 pb-1.5 border-b border-[#2d4a6a]/60">
                      <span className="text-emerald-400 font-semibold">অগ্রিম / পরিশোধিত (Paid ৳):</span>
                      <div className="w-32">
                        <input
                          type="number"
                          min={0}
                          value={paid}
                          onChange={(e) => setPaid(parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#1a2b42] border border-emerald-500/40 text-right font-mono font-bold text-xs text-emerald-400 px-2 py-1 rounded outline-none"
                        />
                      </div>
                    </div>

                    <div
                      className={`flex items-center justify-between p-2.5 rounded-xl border ${
                        due > 0
                          ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                          : "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-xs uppercase tracking-wider">
                          {due > 0 ? "বকেয়া পরিমাণ (Balance Due)" : "সম্পূর্ণ পরিশোধিত (Fully Paid)"}
                        </div>
                        <div className="text-[10px] opacity-80">
                          {due > 0 ? "ক্লায়েন্টের নিকট প্রাপ্য" : "কোনো বকেয়া নেই"}
                        </div>
                      </div>
                      <div className="font-mono font-black text-xl">
                        ৳ {due.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>

                  {/* Words */}
                  <div className="text-[10px] font-mono text-[#8ba3c1] bg-[#0e1624] p-2 rounded-lg border border-[#2d4a6a]/50">
                    <span className="font-bold text-white">কথায়:</span> {numberToBengaliWords(netTotal)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: SAVED VOUCHERS LIST & HISTORY                            */}
          {/* ============================================================== */}
          {activeTab === "list" && (
            <div className="space-y-4">
              {/* KPI STATS ROW */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-[#152033] border border-[#2d4a6a] rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-[#8ba3c1]">মোট ভাউচার (Vouchers)</div>
                  <div className="text-xl font-extrabold text-white mt-1 font-mono">{stats.count} টি</div>
                </div>

                <div className="bg-[#152033] border border-[#00c2c7]/30 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-[#00c2c7]">সর্বমোট বিল (Billed)</div>
                  <div className="text-lg font-black text-[#00c2c7] mt-1 font-mono">
                    ৳ {stats.totalBilled.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#152033] border border-emerald-500/30 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-emerald-400">মোট আদায়কৃত (Paid)</div>
                  <div className="text-lg font-black text-emerald-400 mt-1 font-mono">
                    ৳ {stats.totalPaid.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="bg-[#152033] border border-rose-500/30 rounded-xl p-3 text-center">
                  <div className="text-[10px] uppercase font-bold text-rose-400">মোট বকেয়া (Outstanding Due)</div>
                  <div className="text-lg font-black text-rose-400 mt-1 font-mono">
                    ৳ {stats.totalDue.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* SEARCH & FILTER CONTROLS */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#152033] p-2.5 rounded-xl border border-[#2d4a6a]">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-[#8ba3c1]" />
                  <input
                    type="text"
                    placeholder="ভাউচার নং, ক্লায়েন্টের নাম বা মোবাইল দিয়ে খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-white text-xs outline-none w-full"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-[#8ba3c1] hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["all", "Paid", "Partial", "Due"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition capitalize ${
                        statusFilter === st
                          ? "bg-[#00c2c7] text-[#0f1c2e]"
                          : "bg-[#1a2b42] text-[#8ba3c1] hover:text-white border border-[#2d4a6a]"
                      }`}
                    >
                      {st === "all" ? "All Vouchers" : st}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={handleNewVoucher}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded-lg text-xs transition active:scale-95 ml-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New</span>
                  </button>
                </div>
              </div>

              {/* VOUCHERS LIST TABLE */}
              <div className="bg-[#121a2b] border border-[#2d4a6a] rounded-xl overflow-hidden shadow-sm">
                {filteredVouchers.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <Receipt className="w-10 h-10 text-[#2d4a6a] mx-auto mb-2 opacity-50" />
                    কোনো ভাউচার পাওয়া যায়নি। নতুন ভাউচার তৈরি করতে "+ New" বাটনে ক্লিক করুন।
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#1a2b42] text-[#8ba3c1] font-bold border-b border-[#2d4a6a] text-[11px]">
                          <th className="py-2.5 px-3">Voucher #</th>
                          <th className="py-2.5 px-3">তারিখ (Date)</th>
                          <th className="py-2.5 px-3">ক্লায়েন্টের নাম (Client)</th>
                          <th className="py-2.5 px-3">প্রজেক্ট (Project)</th>
                          <th className="py-2.5 px-3 text-right">নেট বিল (Net ৳)</th>
                          <th className="py-2.5 px-3 text-right">পরিশোধিত (Paid ৳)</th>
                          <th className="py-2.5 px-3 text-right">বকেয়া (Due ৳)</th>
                          <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2d4a6a]/60 text-white">
                        {filteredVouchers.map((v) => (
                          <tr key={v.id} className="hover:bg-[#1a2b42]/40 transition font-medium">
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                              {v.voucherNo}
                            </td>
                            <td className="py-2.5 px-3 text-[#8ba3c1] font-mono text-[11px]">
                              {v.date}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-white">
                              {v.clientName}
                              {v.phone && (
                                <div className="text-[10px] text-[#8ba3c1] font-mono">{v.phone}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {v.projectName || "General Consultancy"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                              ৳ {v.netTotal.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                              ৳ {v.paid.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {v.due > 0 ? (
                                <span className="text-rose-400">৳ {v.due.toLocaleString("en-IN")}</span>
                              ) : (
                                <span className="text-slate-500">৳ 0</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  v.paymentStatus === "Paid"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                    : v.paymentStatus === "Partial"
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                                    : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                }`}
                              >
                                {v.paymentStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrint(v)}
                                  className="p-1 text-[#8ba3c1] hover:text-[#00c2c7] hover:bg-[#243b55] rounded transition"
                                  title="Print / View Voucher Memo"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLoadVoucher(v)}
                                  className="p-1 text-[#8ba3c1] hover:text-white hover:bg-[#243b55] rounded transition"
                                  title="Edit Voucher"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateVoucher(v)}
                                  className="p-1 text-[#8ba3c1] hover:text-amber-400 hover:bg-[#243b55] rounded transition"
                                  title="Duplicate as new Voucher"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`ভাউচার নং ${v.voucherNo} মুছে ফেলতে চান?`)) {
                                      await onDeleteVoucher(v.id);
                                    }
                                  }}
                                  className="p-1 text-[#8ba3c1] hover:text-rose-400 hover:bg-rose-500/20 rounded transition"
                                  title="Delete Voucher"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: HIGH-FIDELITY OFFICIAL PRINT & PDF MEMO                  */}
          {/* ============================================================== */}
          {activeTab === "print" && printVoucher && (
            <div className="space-y-4">
              {/* Print Toolbar (Hidden during actual print) */}
              <div className="print:hidden flex flex-wrap items-center justify-between gap-2.5 bg-[#152033] p-2.5 rounded-xl border border-[#2d4a6a]">
                <button
                  type="button"
                  onClick={() => setActiveTab("editor")}
                  className="flex items-center gap-1.5 text-xs text-[#8ba3c1] hover:text-white font-semibold transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Editor</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-4 py-1.5 rounded-lg text-xs shadow-md transition active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save as PDF (A4)</span>
                  </button>
                </div>
              </div>

              {/* OFFICIAL VOUCHER PAPER CONTAINER */}
              <div
                id="printable-service-voucher"
                className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-xl max-w-[800px] mx-auto border border-slate-300 font-sans leading-relaxed print:p-0 print:border-none print:shadow-none print:max-w-none print:rounded-none"
              >
                {/* 1. LETTERHEAD HEADER */}
                <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-black text-slate-950 tracking-tight leading-none">
                      HYBRID CIVIL
                    </h1>
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-widest mt-1">
                      Engineering & Consultancy
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1 max-w-sm">
                      Structural Analysis & Design • Architectural Planning • Geotechnical Soil Test • Digital Land Survey • BOQ & Estimation
                    </div>
                  </div>

                  <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                    <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-md mb-1.5">
                      SERVICE VOUCHER / BILL
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900">
                      Voucher No: <span className="text-blue-900 font-black">{printVoucher.voucherNo}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      Date: {new Date(printVoucher.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. CLIENT & PROJECT METADATA CARD */}
                <div className="grid grid-cols-2 gap-4 my-4 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">বিল প্রাপক / Bill To:</div>
                    <div className="font-bold text-slate-950 text-sm mt-0.5">{printVoucher.clientName}</div>
                    {printVoucher.phone && (
                      <div className="text-slate-700 font-mono text-[11px] mt-0.5">
                        মোবাইল: {printVoucher.phone}
                      </div>
                    )}
                    {printVoucher.address && (
                      <div className="text-slate-600 text-[10.5px] mt-0.5">
                        ঠিকানা: {printVoucher.address}
                      </div>
                    )}
                  </div>

                  <div className="border-l border-slate-200 pl-4">
                    <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">প্রজেক্ট বিবরণ / Project:</div>
                    <div className="font-bold text-slate-950 text-sm mt-0.5">
                      {printVoucher.projectName || "Civil Engineering Consultancy"}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-600">পেমেন্ট মাধ্যম:</span>
                      <span className="font-bold font-mono text-slate-900">{printVoucher.paymentMethod}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-600">স্ট্যাটাস:</span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.2 rounded ${
                          printVoucher.paymentStatus === "Paid"
                            ? "bg-green-100 text-green-900 border border-green-300"
                            : printVoucher.paymentStatus === "Partial"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-red-100 text-red-900 border border-red-300"
                        }`}
                      >
                        {printVoucher.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. ITEM SERVICE TABLE */}
                <div className="my-4 border border-slate-300 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px]">
                        <th className="py-2 px-3 text-center w-8 border-r border-slate-300">#</th>
                        <th className="py-2 px-3 border-r border-slate-300">সার্ভিস ও কনসালটেন্সির বিবরণ (Description)</th>
                        <th className="py-2 px-2 text-center w-16 border-r border-slate-300">একক (Unit)</th>
                        <th className="py-2 px-3 text-right w-20 border-r border-slate-300">পরিমাণ (Qty)</th>
                        <th className="py-2 px-3 text-right w-24 border-r border-slate-300">দর (Rate ৳)</th>
                        <th className="py-2 px-3 text-right w-28">মোট (Amount ৳)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-900">
                      {printVoucher.items.map((item, idx) => (
                        <tr key={item.id} className="leading-tight">
                          <td className="py-2 px-3 text-center font-mono text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold border-r border-slate-200">
                            {item.service}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-600 border-r border-slate-200">
                            {item.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-mono border-r border-slate-200">
                            {item.qty}
                          </td>
                          <td className="py-2 px-3 text-right font-mono border-r border-slate-200">
                            ৳ {item.rate.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            ৳ {item.total.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 4. FINANCIAL SUMMARY BLOCK */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start my-4">
                  <div className="sm:col-span-7 text-[11px] space-y-2">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-slate-900">কথায় (Amount in Words):</div>
                      <div className="text-slate-800 font-medium italic mt-0.5">
                        {numberToBengaliWords(printVoucher.netTotal)}
                      </div>
                    </div>

                    {printVoucher.terms && (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-700 leading-relaxed whitespace-pre-line">
                        <div className="font-bold text-slate-900 mb-1">শর্তাবলী (Terms & Conditions):</div>
                        {printVoucher.terms}
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-5 bg-slate-100 border border-slate-300 rounded-lg p-3 text-xs space-y-1.5 font-mono">
                    <div className="flex justify-between text-slate-700 pb-1 border-b border-slate-200">
                      <span>সর্বমোট (Subtotal):</span>
                      <span className="font-bold">৳ {printVoucher.subtotal.toLocaleString("en-IN")}</span>
                    </div>

                    {printVoucher.discount > 0 && (
                      <div className="flex justify-between text-amber-800 pb-1 border-b border-slate-200">
                        <span>বিশেষ ছাড় (Discount):</span>
                        <span className="font-bold">- ৳ {printVoucher.discount.toLocaleString("en-IN")}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-950 font-bold pb-1 border-b border-slate-300 text-sm">
                      <span>নেট মূল্য (Net Total):</span>
                      <span className="text-blue-900">৳ {printVoucher.netTotal.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between text-green-800 pb-1 border-b border-slate-200">
                      <span>পরিশোধিত / অগ্রিম (Paid):</span>
                      <span className="font-bold">৳ {printVoucher.paid.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between text-slate-950 font-black text-sm pt-0.5">
                      <span className={printVoucher.due > 0 ? "text-red-700" : "text-green-700"}>
                        {printVoucher.due > 0 ? "বকেয়া (Balance Due):" : "পরিশোধিত (Paid):"}
                      </span>
                      <span className={printVoucher.due > 0 ? "text-red-700" : "text-green-700"}>
                        ৳ {printVoucher.due.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. SIGNATURE & STAMP BLOCK */}
                <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="w-44 border-b border-dashed border-slate-400 mx-auto mb-1.5 pb-6"></div>
                    <div className="font-bold text-slate-900">ক্লায়েন্টের স্বাক্ষর (Client Signature)</div>
                    <div className="text-[10px] text-slate-500">গ্রাহক প্রাপ্তি ও অনুমোদন</div>
                  </div>

                  <div>
                    <div className="w-44 border-b border-dashed border-slate-400 mx-auto mb-1.5 pb-6"></div>
                    <div className="font-bold text-slate-900">কর্তৃপক্ষের স্বাক্ষর ও সিল (Authorized Seal)</div>
                    <div className="text-[10px] text-slate-500">HYBRID CIVIL • Engineering & Consultancy</div>
                  </div>
                </div>

                {/* FOOTER NOTE */}
                <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400">
                  This is a computer-generated voucher issued by Ashraf Civil Studio / Hybrid Civil Cloud System.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
