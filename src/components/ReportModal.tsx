import React from "react";
import { Project } from "../types";
import { X, Printer, Download, FileSpreadsheet } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  if (!isOpen || !project) return null;

  const estimates = project.estimates || [];

  // Aggregated totals
  let totalCementBags = 0;
  let totalSandCft = 0;
  let totalAggCft = 0;
  let totalSteelKg = 0;
  let totalBricks = 0;

  estimates.forEach((e) => {
    const s = e.summary || {};
    if (s.cementBags) totalCementBags += s.cementBags;
    if (s.totalCementBags) totalCementBags += s.totalCementBags;

    if (s.sandVolume) totalSandCft += s.sandVolume;
    if (s.sandVol) totalSandCft += s.sandVol;
    if (s.totalSand) totalSandCft += s.totalSand;
    if (s.totalSandCft) totalSandCft += s.totalSandCft;

    if (s.aggregateVolume) totalAggCft += s.aggregateVolume;
    if (s.aggregateVol) totalAggCft += s.aggregateVol;
    if (s.totalAggCft) totalAggCft += s.totalAggCft;

    if (s.totalSteel) totalSteelKg += s.totalSteel;
    if (s.totalSteelKg) totalSteelKg += s.totalSteelKg;

    if (s.totalBricks) totalBricks += s.totalBricks;
    if (s.brickQty) totalBricks += s.brickQty;
  });

  const grandTotalCost = estimates.reduce((sum, e) => sum + (e.totalCost || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let csv = `ASHRAF CIVIL STUDIO - BILL OF QUANTITIES REPORT\n`;
    csv += `Project:,"${project.name}"\n`;
    csv += `Client:,"${project.client || "N/A"}"\n`;
    csv += `Location:,"${project.location || "N/A"}"\n`;
    csv += `Engineer:,"${project.engineer || "Engr. Ashraf"}"\n`;
    csv += `Date:,"${new Date().toLocaleDateString()}"\n\n`;

    csv += `CONSOLIDATED MATERIALS SUMMARY\n`;
    csv += `Item,Quantity,Unit\n`;
    csv += `Cement,${totalCementBags},Bags (50kg)\n`;
    csv += `Sand,${Math.round(totalSandCft)},cft\n`;
    csv += `Stone Aggregate / Picket Chips,${Math.round(totalAggCft)},cft\n`;
    csv += `Rebar Steel,${Math.round(totalSteelKg)},kg (${(totalSteelKg / 1000).toFixed(2)} MT)\n`;
    csv += `Bricks,${totalBricks},pcs\n\n`;

    csv += `ITEMIZED ESTIMATES BREAKDOWN\n`;
    csv += `Estimate Name,Type,Date,Cost (BDT)\n`;
    estimates.forEach((e) => {
      csv += `"${e.name}","${e.type}","${new Date(e.date).toLocaleDateString()}","${Math.round(e.totalCost)}"\n`;
    });
    csv += `\nGRAND TOTAL COST (BDT),,,${Math.round(grandTotalCost)}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${project.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_boq_report.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#152033] border border-[#2d4a6a] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls */}
        <div className="px-4 py-3 bg-[#1a2b42] border-b border-[#2d4a6a] flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#00c2c7]" />
            <h3 className="text-sm font-bold text-white">
              Consolidated BOQ & Materials Report
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1 bg-[#243b55] hover:bg-[#2d4a6a] text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition"
              title="Export as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-[#00c2c7]" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] px-3 py-1.5 rounded-lg text-xs font-bold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#8ba3c1] hover:text-white transition p-1 ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#0f1c2e] text-[#f1f5f9] print:bg-white print:text-black print:p-0">
          {/* Document Header */}
          <div className="border-b border-[#2d4a6a] print:border-black pb-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold tracking-widest text-[#00c2c7] print:text-blue-700 uppercase">
                ASHRAF CIVIL STUDIO · ashraf.ai.studio
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white print:text-black tracking-tight">
                Bill of Quantities (BOQ)
              </h1>
              <p className="text-xs text-[#8ba3c1] print:text-gray-600 mt-0.5">
                Comprehensive Civil Engineering Materials & Cost Estimation
              </p>
            </div>

            <div className="text-xs text-right text-[#8ba3c1] print:text-gray-600 space-y-0.5">
              <div>
                Date:{" "}
                <strong className="text-white print:text-black">
                  {new Date().toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>
              </div>
              <div>
                Engineer:{" "}
                <strong className="text-white print:text-black">
                  {project.engineer || "Engr. Ashraf"}
                </strong>
              </div>
            </div>
          </div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-[#152033] print:bg-gray-100 border border-[#2d4a6a] print:border-gray-300 rounded-xl p-3">
            <div>
              <span className="text-[#8ba3c1] print:text-gray-500 block text-[10px]">
                Project Name:
              </span>
              <strong className="text-white print:text-black text-sm">
                {project.name}
              </strong>
            </div>
            <div>
              <span className="text-[#8ba3c1] print:text-gray-500 block text-[10px]">
                Client:
              </span>
              <strong className="text-white print:text-black">
                {project.client || "General Client"}
              </strong>
            </div>
            <div>
              <span className="text-[#8ba3c1] print:text-gray-500 block text-[10px]">
                Site Location:
              </span>
              <strong className="text-white print:text-black">
                {project.location || "Bangladesh"}
              </strong>
            </div>
            <div>
              <span className="text-[#8ba3c1] print:text-gray-500 block text-[10px]">
                Saved Sheets:
              </span>
              <strong className="text-white print:text-black">
                {estimates.length} Estimate Files
              </strong>
            </div>
          </div>

          {/* Consolidated Materials Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-800 uppercase tracking-wider">
              1. Consolidated Structural Materials Summary
            </h4>
            <div className="border border-[#2d4a6a] print:border-gray-300 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1a2b42] print:bg-gray-200 text-[#8ba3c1] print:text-gray-700 font-semibold border-b border-[#2d4a6a] print:border-gray-300">
                  <tr>
                    <th className="p-2.5">Material Description</th>
                    <th className="p-2.5">Unit</th>
                    <th className="p-2.5 text-right">Consolidated Quantity</th>
                    <th className="p-2.5 text-right">Specification / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-gray-300">
                  <tr>
                    <td className="p-2.5 font-medium">Portland Composite Cement</td>
                    <td className="p-2.5 text-[#8ba3c1] print:text-gray-600">Bags (50 kg)</td>
                    <td className="p-2.5 text-right font-bold text-[#f5a623] print:text-black">
                      {totalCementBags.toLocaleString()} bags
                    </td>
                    <td className="p-2.5 text-right text-[11px] text-[#8ba3c1] print:text-gray-600">
                      ~{(totalCementBags * 50).toLocaleString()} kg total
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Coarse / Medium Sand (Sylhet & Local)</td>
                    <td className="p-2.5 text-[#8ba3c1] print:text-gray-600">cft</td>
                    <td className="p-2.5 text-right font-bold text-[#f5a623] print:text-black">
                      {Math.round(totalSandCft).toLocaleString()} cft
                    </td>
                    <td className="p-2.5 text-right text-[11px] text-[#8ba3c1] print:text-gray-600">
                      FM 1.5 - 2.5
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Stone Aggregate / Brick Chips (Picket)</td>
                    <td className="p-2.5 text-[#8ba3c1] print:text-gray-600">cft</td>
                    <td className="p-2.5 text-right font-bold text-[#f5a623] print:text-black">
                      {Math.round(totalAggCft).toLocaleString()} cft
                    </td>
                    <td className="p-2.5 text-right text-[11px] text-[#8ba3c1] print:text-gray-600">
                      3/4" down graded
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Thermo-Mechanically Treated Rebar (500W / 60G)</td>
                    <td className="p-2.5 text-[#8ba3c1] print:text-gray-600">kg</td>
                    <td className="p-2.5 text-right font-bold text-[#f5a623] print:text-black">
                      {Math.round(totalSteelKg).toLocaleString()} kg
                    </td>
                    <td className="p-2.5 text-right text-[11px] text-[#8ba3c1] print:text-gray-600">
                      {(totalSteelKg / 1000).toFixed(2)} Metric Tons
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">First Class Clay Bricks (Auto/Manual)</td>
                    <td className="p-2.5 text-[#8ba3c1] print:text-gray-600">pcs</td>
                    <td className="p-2.5 text-right font-bold text-[#f5a623] print:text-black">
                      {totalBricks.toLocaleString()} pcs
                    </td>
                    <td className="p-2.5 text-right text-[11px] text-[#8ba3c1] print:text-gray-600">
                      Walls & Pickets
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Itemized Estimates Breakdown Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#00c2c7] print:text-blue-800 uppercase tracking-wider">
              2. Individual Estimates in This Project ({estimates.length})
            </h4>
            <div className="border border-[#2d4a6a] print:border-gray-300 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1a2b42] print:bg-gray-200 text-[#8ba3c1] print:text-gray-700 font-semibold border-b border-[#2d4a6a] print:border-gray-300">
                  <tr>
                    <th className="p-2.5">Estimate Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-right">Cost (৳ BDT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d4a6a]/60 print:divide-gray-300">
                  {estimates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[#8ba3c1]">
                        No estimate sheets saved yet.
                      </td>
                    </tr>
                  ) : (
                    estimates.map((e) => (
                      <tr key={e.id}>
                        <td className="p-2.5 font-medium text-white print:text-black">
                          {e.name}
                        </td>
                        <td className="p-2.5 uppercase font-mono text-[11px] text-[#00c2c7] print:text-blue-700">
                          {e.type}
                        </td>
                        <td className="p-2.5 text-[#8ba3c1] print:text-gray-600">
                          {new Date(e.date).toLocaleDateString()}
                        </td>
                        <td className="p-2.5 text-right font-bold text-[#2ecc71] print:text-black">
                          ৳ {Math.round(e.totalCost).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-[#1a2b42] print:bg-gray-200 font-bold border-t-2 border-[#00c2c7] print:border-black">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-right text-white print:text-black">
                      Consolidated Project Estimate Grand Total:
                    </td>
                    <td className="p-2.5 text-right text-base text-[#2ecc71] print:text-black">
                      ৳ {Math.round(grandTotalCost).toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Signatures & Certification for print */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-[#8ba3c1] print:text-black">
            <div className="border-t border-[#2d4a6a] print:border-black pt-2">
              <div className="font-bold text-white print:text-black">
                {project.engineer || "Engr. Ashraf"}
              </div>
              <div className="text-[10px]">Lead Civil & Structural Engineer</div>
            </div>
            <div className="border-t border-[#2d4a6a] print:border-black pt-2">
              <div className="font-bold text-white print:text-black">
                {project.client || "Client Representative"}
              </div>
              <div className="text-[10px]">Client Verification & Approval</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
