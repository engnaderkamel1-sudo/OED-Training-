import React, { useState } from "react";
import { useAppContext } from "../context";
import { DataField } from "./DataField";
import { CheckCircle, Users, AlertCircle, BookOpen } from "lucide-react";

export const SiteSupervisorDashboard: React.FC = () => {
  const {
    t,
    language,
    user,
    users,
    records,
    upcomingSessions,
    registerTrainee,
  } = useAppContext();
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  // Get department of the supervisor
  const department = user?.department || "Heavy Machinery";

  // Get all trainees in this department
  const teamMembers = users.filter(
    (u) => u.department === department && u.role === "trainee",
  );

  // Calculate compliance (example logic: a trainee is compliant if they have at least 1 record)
  const compliantMembers = teamMembers.filter((member) =>
    records.some((r) => r.userId === member.id),
  );

  const compliancePercentage =
    teamMembers.length > 0
      ? Math.round((compliantMembers.length / teamMembers.length) * 100)
      : 0;

  const handleNominate = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSessionId && selectedUserId) {
      const selectedUser = users.find((u) => u.id === selectedUserId);
      registerTrainee(
        selectedSessionId,
        selectedUser?.hrCode || selectedUserId,
      );
      alert(
        language === "ar"
          ? "تم ترشيح الموظف بنجاح!"
          : "Team member nominated successfully!",
      );
      setSelectedSessionId("");
      setSelectedUserId("");
    }
  };

  const activeSessions = upcomingSessions.filter(
    (s) => s.status !== "Cancelled",
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b-2 border-[#FFC000] pb-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#002D62] dark:text-blue-400">
            {language === "ar"
              ? "لوحة المشرف الميداني"
              : "Site Supervisor Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Site Engineers Compliance & Course Nominations
          </p>
        </div>
        <div className="text-gray-700 dark:text-gray-300 font-bold flex items-center gap-2 bg-white dark:bg-[#193158] px-4 py-2 rounded-xl shadow-xs border border-gray-200 dark:border-slate-700">
          <span>{t("department")}:</span>{" "}
          <DataField className="text-[#002D62] dark:text-[#FFC000] text-lg font-black">{department}</DataField>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Widget */}
        <div className="bg-white dark:bg-[#193158] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle size={100} className="text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 z-10">
            {language === "ar"
              ? "نسبة الامتثال للتدريب"
              : "Training Compliance"}
          </h2>
          <div className="text-5xl font-black text-[#002D62] dark:text-white my-4 z-10">
            {compliancePercentage}%
          </div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 z-10">
            {compliantMembers.length} {language === "ar" ? "من" : "out of"}{" "}
            {teamMembers.length}{" "}
            {language === "ar"
              ? "موظفين تلقوا تدريباً"
              : "members received training"}
          </p>
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-3 mt-4 rounded-full overflow-hidden z-10">
            <div
              className={`h-full ${compliancePercentage >= 80 ? "bg-green-500" : compliancePercentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${compliancePercentage}%` }}
            />
          </div>
        </div>

        {/* Nominate Widget */}
        <div className="bg-white dark:bg-[#193158] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <BookOpen
              size={20}
              className="mr-2 rtl:ml-2 rtl:mr-0 text-[#FFC000]"
            />
            {language === "ar" ? "ترشيح لدورة قادمة" : "Nominate for Course"}
          </h2>
          <form onSubmit={handleNominate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                {language === "ar" ? "الموظف" : "Team Member"}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              >
                <option value="">
                  {language === "ar" ? "اختر موظف..." : "Select member..."}
                </option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.hrCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                {language === "ar" ? "الدورة التدريبية" : "Upcoming Course"}
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-xl px-3.5 py-2.5 bg-white dark:bg-[#091426] text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              >
                <option value="">
                  {language === "ar" ? "اختر دورة..." : "Select session..."}
                </option>
                {activeSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.courseTitle} - {s.startDate}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-[#002D62] dark:bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-900 dark:hover:bg-blue-700 transition-colors shadow-sm text-sm"
            >
              {language === "ar" ? "إرسال الترشيح" : "Submit Nomination"}
            </button>
          </form>
        </div>
      </div>

      {/* Team Members List */}
      <section className="bg-white dark:bg-[#193158] p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <Users size={20} className="mr-2 rtl:ml-2 rtl:mr-0 text-[#002D62] dark:text-blue-400" />
          {language === "ar"
            ? "مهندسي الموقع"
            : "Site Engineers / Team Members"}
        </h2>
        {teamMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-[#0F1E36] text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider border-b dark:border-slate-700">
                  <th className="p-3">
                    {language === "ar" ? "الرقم الوظيفي" : "HR Code"}
                  </th>
                  <th className="p-3">{t("name")}</th>
                  <th className="p-3">
                    {language === "ar" ? "المسمى الوظيفي" : "Job Role"}
                  </th>
                  <th className="p-3">
                    {language === "ar"
                      ? "الدورات المنجزة"
                      : "Completed Courses"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {teamMembers.map((m) => {
                  const userRecords = records.filter((r) => r.userId === m.id);
                  return (
                    <tr key={m.id} className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${m.status === "deleted" ? "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300" : "text-gray-900 dark:text-gray-200"}`}>
                      <td className="p-3 font-mono font-bold text-sm">
                        <DataField>{m.hrCode}</DataField>
                      </td>
                      <td className="p-3 font-bold text-[#002D62] dark:text-blue-400 text-sm">
                        <DataField>{m.name}</DataField>
                      </td>
                      <td className="p-3 text-sm">
                        <DataField>{m.jobRole || m.role}</DataField>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${userRecords.length > 0 ? "bg-green-100 dark:bg-green-900/60 text-green-800 dark:text-green-300" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400"}`}
                        >
                          {userRecords.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <AlertCircle size={48} className="mb-4 text-gray-300 dark:text-slate-600" />
            <p>
              {language === "ar"
                ? "لا يوجد موظفين في قسمك"
                : "No team members found in your department."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
