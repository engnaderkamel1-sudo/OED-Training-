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
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b-2 border-[#FFC000] pb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-[#002D62]">
          {language === "ar"
            ? "لوحة المشرف الميداني"
            : "Site Supervisor Dashboard"}
        </h1>
        <div className="text-gray-600 font-medium flex items-center gap-2">
          <span>{t("department")}:</span>{" "}
          <DataField className="text-[#002D62] text-lg">{department}</DataField>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compliance Widget */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CheckCircle size={100} className="text-green-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-700 mb-2 z-10">
            {language === "ar"
              ? "نسبة الامتثال للتدريب"
              : "Training Compliance"}
          </h2>
          <div className="text-5xl font-bold text-[#002D62] my-4 z-10">
            {compliancePercentage}%
          </div>
          <p className="text-sm text-gray-500 z-10">
            {compliantMembers.length} {language === "ar" ? "من" : "out of"}{" "}
            {teamMembers.length}{" "}
            {language === "ar"
              ? "موظفين تلقوا تدريباً"
              : "members received training"}
          </p>
          <div className="w-full bg-gray-200 h-3 mt-4 rounded-full overflow-hidden z-10">
            <div
              className={`h-full ${compliancePercentage >= 80 ? "bg-green-500" : compliancePercentage >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${compliancePercentage}%` }}
            />
          </div>
        </div>

        {/* Nominate Widget */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <BookOpen
              size={20}
              className="mr-2 rtl:ml-2 rtl:mr-0 text-[#FFC000]"
            />
            {language === "ar" ? "ترشيح لدورة قادمة" : "Nominate for Course"}
          </h2>
          <form onSubmit={handleNominate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "الموظف" : "Team Member"}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:border-[#002D62] focus:ring-1 focus:ring-[#002D62]"
                required
              >
                <option value="">
                  {language === "ar" ? "اختر موظف" : "Select member..."}
                </option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.hrCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "ar" ? "الدورة التدريبية" : "Upcoming Course"}
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:border-[#002D62] focus:ring-1 focus:ring-[#002D62]"
                required
              >
                <option value="">
                  {language === "ar" ? "اختر دورة" : "Select session..."}
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
              className="w-full bg-[#002D62] text-white py-2 rounded font-medium hover:bg-blue-900 transition-colors"
            >
              {language === "ar" ? "إرسال الترشيح" : "Submit Nomination"}
            </button>
          </form>
        </div>
      </div>

      {/* Team Members List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
          <Users size={20} className="mr-2 rtl:ml-2 rtl:mr-0 text-[#002D62]" />
          {language === "ar"
            ? "مهندسي الموقع"
            : "Site Engineers / Team Members"}
        </h2>
        {teamMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b">
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
              <tbody>
                {teamMembers.map((m) => {
                  const userRecords = records.filter((r) => r.userId === m.id);
                  return (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <DataField>{m.hrCode}</DataField>
                      </td>
                      <td className="p-3 font-medium text-[#002D62]">
                        <DataField>{m.name}</DataField>
                      </td>
                      <td className="p-3">
                        <DataField>{m.jobRole || m.role}</DataField>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${userRecords.length > 0 ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
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
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <AlertCircle size={48} className="mb-4 text-gray-300" />
            <p>
              {language === "ar"
                ? "لا يوجد موظفين في قسمك"
                : "No team members found in your department."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
