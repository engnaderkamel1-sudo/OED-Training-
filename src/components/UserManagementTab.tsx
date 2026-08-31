import React from 'react';
import { User, Role } from '../types';
import { DataField } from './DataField';
import { 
  Search, 
  X, 
  ArrowUpDown, 
  CheckCircle, 
  Edit2, 
  Trash2, 
  Save, 
  RotateCcw, 
  SearchX, 
  Users 
} from 'lucide-react';

interface UserManagementTabProps {
  users: User[];
  pendingUsers: User[];
  usersWithPendingUpdates: User[];
  processedUpdatesList: { user: User; history: any }[];
  userManagementTab: 'pending' | 'processed' | 'deleted' | 'updates' | 'processed_updates';
  setUserManagementTab: (tab: 'pending' | 'processed' | 'deleted' | 'updates' | 'processed_updates') => void;
  userSearchTerm: string;
  setUserSearchTerm: (term: string) => void;
  pendingSortOrder: 'asc' | 'desc';
  setPendingSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
  editingUserId: string | null;
  setEditingUserId: (id: string | null) => void;
  editFormData: Partial<User>;
  setEditFormData: React.Dispatch<React.SetStateAction<Partial<User>>>;
  editingUpdateUserId: string | null;
  setEditingUpdateUserId: (id: string | null) => void;
  updateEditFormData: Partial<User>;
  setUpdateEditFormData: React.Dispatch<React.SetStateAction<Partial<User>>>;
  setSelectedUserToEdit: (user: User) => void;
  handleOpenEditUser: (user: User) => void;
  handleApprove: (id: string) => void;
  handleReject: (id: string) => void;
  handleSaveUserEdit: (id: string) => void;
  handleApproveUpdate: (user: User) => void;
  handleRejectUpdate: (user: User) => void;
  handleSaveUpdateEdit: (user: User) => void;
  handleDeleteUser: (id: string) => void;
  handleRestoreUser: (id: string) => void;
  onViewImage: (url: string) => void;
  language: string;
  isDark: boolean;
  borderColor: string;
  textColor: string;
  textMuted: string;
  inputBg: string;
  tableHeaderBg: string;
  t: (key: string) => string;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  users,
  pendingUsers,
  usersWithPendingUpdates,
  processedUpdatesList,
  userManagementTab,
  setUserManagementTab,
  userSearchTerm,
  setUserSearchTerm,
  pendingSortOrder,
  setPendingSortOrder,
  editingUserId,
  setEditingUserId,
  editFormData,
  setEditFormData,
  editingUpdateUserId,
  setEditingUpdateUserId,
  updateEditFormData,
  setUpdateEditFormData,
  setSelectedUserToEdit,
  handleOpenEditUser,
  handleApprove,
  handleReject,
  handleSaveUserEdit,
  handleApproveUpdate,
  handleRejectUpdate,
  handleSaveUpdateEdit,
  handleDeleteUser,
  handleRestoreUser,
  onViewImage,
  language,
  isDark,
  borderColor,
  textColor,
  textMuted,
  inputBg,
  tableHeaderBg,
  t,
}) => {
  const UserAvatarWithName = ({ user }: { user: User }) => (
    <div className="flex items-center gap-3">
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt=""
          className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onViewImage(user.profileImageUrl!)}
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-200 font-bold text-base shrink-0">
          {(user.name || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-sm" style={{ color: textColor }}>
          <DataField>{user.name}</DataField>
        </span>
        {user.email && (
          <span className="text-xs truncate max-w-[180px]" style={{ color: textMuted }} dir="ltr">
            {user.email}
          </span>
        )}
      </div>
    </div>
  );

  const renderEmptyState = (title: string, subtitle?: string, onReset?: () => void) => (
    <div className="p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/40 flex flex-col items-center justify-center my-4 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#002D62] dark:text-[#93C5FD] flex items-center justify-center mb-3 shadow-xs border border-blue-100 dark:border-blue-900/40">
        <SearchX size={26} className="stroke-[2.2]" />
      </div>
      <h3 className="font-bold text-base text-gray-800 dark:text-gray-200 mb-1">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4 leading-relaxed">
          {subtitle}
        </p>
      )}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="px-4 py-2 bg-[#002D62] hover:bg-blue-900 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 hover:scale-105"
        >
          <RotateCcw size={14} className="text-[#FFC000]" />
          <span>{language === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡ ÙˆØªÙØ±ÙŠØº Ø´Ø±ÙŠØ· Ø§Ù„Ø¨Ø­Ø«' : 'Clear Search Filter'}</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar Tabs */}
        <div
          className="md:w-64 shrink-0 flex flex-col space-y-2 border-b md:border-b-0 md:border-r rtl:border-r-0 rtl:border-l pb-4 md:pb-0 md:pr-4 rtl:md:pl-4"
          style={{ borderColor }}
        >
          <button
            onClick={() => setUserManagementTab('pending')}
            className={`text-left rtl:text-right px-4 py-3 rounded-xl font-bold transition-all flex justify-between items-center cursor-pointer ${
              userManagementTab === 'pending'
                ? 'bg-[#002D62] text-white dark:bg-blue-600 shadow-sm'
                : 'hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            style={{ color: userManagementTab === 'pending' ? '#fff' : textMuted }}
          >
            <span>{language === 'ar' ? 'Ø·Ù„Ø¨Ø§Øª Ù…Ø¹Ù„Ù‚Ø©' : 'Pending Users'}</span>
            {pendingUsers.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-xs">
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setUserManagementTab('processed')}
            className={`text-left rtl:text-right px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${
              userManagementTab === 'processed'
                ? 'bg-[#002D62] text-white dark:bg-blue-600 shadow-sm'
                : 'hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            style={{ color: userManagementTab === 'processed' ? '#fff' : textMuted }}
          >
            {language === 'ar' ? 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ÙŠÙ†' : 'Approved Users'}
          </button>
          <button
            onClick={() => setUserManagementTab('deleted')}
            className={`text-left rtl:text-right px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${
              userManagementTab === 'deleted'
                ? 'bg-[#002D62] text-white dark:bg-blue-600 shadow-sm'
                : 'hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            style={{ color: userManagementTab === 'deleted' ? '#fff' : textMuted }}
          >
            {language === 'ar' ? 'Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ù…Ø­Ø°ÙˆÙÙŠÙ†' : 'Deleted Trainees'}
          </button>

          <div className="my-2 border-t" style={{ borderColor }} />

          <button
            onClick={() => setUserManagementTab('updates')}
            className={`text-left rtl:text-right px-4 py-3 rounded-xl font-bold transition-all flex justify-between items-center cursor-pointer ${
              userManagementTab === 'updates'
                ? 'bg-[#002D62] text-white dark:bg-blue-600 shadow-sm'
                : 'hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            style={{ color: userManagementTab === 'updates' ? '#fff' : textMuted }}
          >
            <span>{language === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' : 'Data Updates'}</span>
            {usersWithPendingUpdates.length > 0 && (
              <span className="bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full shadow-xs">
                {usersWithPendingUpdates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setUserManagementTab('processed_updates')}
            className={`text-left rtl:text-right px-4 py-3 rounded-xl font-bold transition-all flex justify-between items-center cursor-pointer ${
              userManagementTab === 'processed_updates'
                ? 'bg-[#002D62] text-white dark:bg-blue-600 shadow-sm'
                : 'hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            style={{ color: userManagementTab === 'processed_updates' ? '#fff' : textMuted }}
          >
            <span>{language === 'ar' ? 'Ø³Ø¬Ù„ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª' : 'Processed Updates'}</span>
          </button>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-x-auto">
          {/* User Search Input */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search
                size={16}
                className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'Ø§Ù„Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ Ø£Ùˆ Ø§Ù„Ø¥ÙŠÙ…ÙŠÙ„...'
                    : 'Search by name, HR Code, or email...'
                }
                className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-8 py-2 rounded-xl border text-sm font-medium focus:ring-2 focus:ring-[#002D62] dark:focus:ring-blue-500 outline-none shadow-2xs transition-all"
                style={{ backgroundColor: inputBg, borderColor, color: textColor }}
              />
              {userSearchTerm && (
                <button
                  onClick={() => setUserSearchTerm('')}
                  className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {userSearchTerm && (
              <div className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {language === 'ar' ? `Ù†ØªØ§Ø¦Ø¬ Ø§Ù„Ø¨Ø­Ø«: "${userSearchTerm}"` : `Filtered by: "${userSearchTerm}"`}
              </div>
            )}
          </div>

          {/* TAB 1: PENDING REGISTRATIONS */}
          {userManagementTab === 'pending' && (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold" style={{ color: textColor }}>
                    {language === 'ar' ? 'Ø·Ù„Ø¨Ø§Øª Ù…Ø¹Ù„Ù‚Ø©' : 'Pending Users'}
                  </h2>
                  <span className="bg-red-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    {pendingUsers.length}
                  </span>
                </div>
                <button
                  onClick={() => setPendingSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all cursor-pointer shadow-2xs hover:scale-105"
                  style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                >
                  <ArrowUpDown size={14} className="text-[#FFC000]" />
                  <span>
                    {pendingSortOrder === 'desc'
                      ? language === 'ar'
                        ? 'Ø§Ù„ØªØ±ØªÙŠØ¨: Ù…Ù† Ø§Ù„Ø£Ø­Ø¯Ø« Ù„Ù„Ø£Ù‚Ø¯Ù… â¬‡'
                        : 'Sort: Newest First â¬‡'
                      : language === 'ar'
                      ? 'Ø§Ù„ØªØ±ØªÙŠØ¨: Ù…Ù† Ø§Ù„Ø£Ù‚Ø¯Ù… Ù„Ù„Ø£Ø­Ø¯Ø« â¬†'
                      : 'Sort: Oldest First â¬†'}
                  </span>
                </button>
              </div>

              {pendingUsers
                .filter((u) => {
                  if (!userSearchTerm.trim()) return true;
                  const term = userSearchTerm.trim().toLowerCase();
                  return (
                    (u.name || '').toLowerCase().includes(term) ||
                    (u.hrCode || '').toLowerCase().includes(term) ||
                    (u.email || '').toLowerCase().includes(term) ||
                    (u.department || '').toLowerCase().includes(term) ||
                    (u.phone || '').includes(term)
                  );
                })
                .sort((a, b) => {
                  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return pendingSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
                }).length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className="border-b font-bold"
                        style={{ backgroundColor: tableHeaderBg, borderColor, color: '#FFFFFF' }}
                      >
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ' : 'HR Code'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ø§Ø³Ù…' : 'Name'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ù‚Ø³Ù…' : 'Department'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©' : 'Role'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„ØªØ§Ø±ÙŠØ®' : 'Date'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUsers
                        .filter((u) => {
                          if (!userSearchTerm.trim()) return true;
                          const term = userSearchTerm.trim().toLowerCase();
                          return (
                            (u.name || '').toLowerCase().includes(term) ||
                            (u.hrCode || '').toLowerCase().includes(term) ||
                            (u.email || '').toLowerCase().includes(term) ||
                            (u.department || '').toLowerCase().includes(term) ||
                            (u.phone || '').includes(term)
                          );
                        })
                        .sort((a, b) => {
                          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                          return pendingSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
                        })
                        .map((u) => (
                          <tr key={u.id} className="border-b transition-colors" style={{ borderColor, color: textColor }}>
                            {editingUserId === u.id ? (
                              <>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={editFormData.hrCode || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, hrCode: e.target.value })}
                                    className="border rounded-lg px-2.5 py-1.5 w-24 outline-none focus:ring-2 focus:ring-[#002D62]"
                                    style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={editFormData.name || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="border rounded-lg px-2.5 py-1.5 w-32 outline-none focus:ring-2 focus:ring-[#002D62]"
                                    style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                                  />
                                </td>
                                <td className="p-3">
                                  <input
                                    type="text"
                                    value={editFormData.department || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                                    className="border rounded-lg px-2.5 py-1.5 w-32 outline-none focus:ring-2 focus:ring-[#002D62]"
                                    style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                                  />
                                </td>
                                <td className="p-3">
                                  <select
                                    value={editFormData.role || 'trainee'}
                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as Role })}
                                    className="border rounded-lg px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-[#002D62]"
                                    style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                                  >
                                    <option value="trainee">{language === 'ar' ? 'Ù…ØªØ¯Ø±Ø¨ (Trainee)' : 'Trainee'}</option>
                                    <option value="supervisor">{language === 'ar' ? 'Ù…Ø´Ø±Ù (Supervisor)' : 'Supervisor'}</option>
                                    <option value="manager">{language === 'ar' ? 'Ù…Ø¯ÙŠØ± (Manager)' : 'Manager'}</option>
                                    <option value="admin">{language === 'ar' ? 'Ù…Ø³Ø¤ÙˆÙ„ (Admin)' : 'Admin'}</option>
                                  </select>
                                </td>
                                <td className="p-3">
                                  <DataField>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</DataField>
                                </td>
                                <td className="p-3 flex gap-2">
                                  <button
                                    onClick={() => handleSaveUserEdit(u.id)}
                                    className="text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-800 px-3 py-1.5 rounded-lg"
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-3">
                                  <DataField>{u.hrCode}</DataField>
                                </td>
                                <td className="p-3">
                                  <UserAvatarWithName user={u} />
                                </td>
                                <td className="p-3">
                                  <DataField>{u.department}</DataField>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
                                      u.role === 'admin'
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                        : u.role === 'manager'
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                                        : u.role === 'supervisor'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                    }`}
                                  >
                                    <span>
                                      {u.role === 'admin'
                                        ? 'ðŸ›¡ï¸ Admin'
                                        : u.role === 'manager'
                                        ? 'ðŸ‘” Manager'
                                        : u.role === 'supervisor'
                                        ? 'ðŸ‘· Supervisor'
                                        : 'ðŸŽ“ Trainee'}
                                    </span>
                                  </span>
                                </td>
                                <td className="p-3">
                                  <DataField>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</DataField>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleApprove(u.id)}
                                      className="flex items-center gap-1.5 text-green-700 dark:text-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-800 px-3.5 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[32px] rounded-xl cursor-pointer transition-all shadow-2xs font-bold text-xs active:scale-95"
                                    >
                                      {language === 'ar' ? 'Ù…ÙˆØ§ÙÙ‚' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => setSelectedUserToEdit(u)}
                                      className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 px-3.5 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[32px] rounded-xl cursor-pointer transition-all shadow-2xs font-bold text-xs active:scale-95"
                                    >
                                      {language === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„' : 'Edit'}
                                    </button>
                                    <button
                                      onClick={() => handleReject(u.id)}
                                      className="flex items-center gap-1.5 text-red-700 dark:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800 px-3.5 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[32px] rounded-xl cursor-pointer transition-all shadow-2xs font-bold text-xs active:scale-95"
                                    >
                                      {language === 'ar' ? 'Ø±ÙØ¶' : 'Reject'}
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : userSearchTerm.trim() ? (
                renderEmptyState(
                  language === 'ar' ? 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø·Ù„Ø¨Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø©' : 'No Matching Requests',
                  language === 'ar'
                    ? `Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ØªØ³Ø¬ÙŠÙ„ ØªØ·Ø§Ø¨Ù‚ "${userSearchTerm}".`
                    : `No pending requests match "${userSearchTerm}".`,
                  () => setUserSearchTerm('')
                )
              ) : (
                <div className="p-8 text-center rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/30 flex flex-col items-center justify-center my-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-xs">
                    <CheckCircle size={22} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">
                    {language === 'ar'
                      ? 'Ø±Ø§Ø¦Ø¹! Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ØªØ³Ø¬ÙŠÙ„ Ù…Ø¹Ù„Ù‚Ø© Ø­Ø§Ù„ÙŠØ§Ù‹'
                      : 'All caught up! No pending registration requests.'}
                  </h4>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PENDING DATA UPDATES */}
          {userManagementTab === 'updates' && (
            <div>
              <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>
                {language === 'ar' ? 'Ø·Ù„Ø¨Ø§Øª ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª' : 'Pending Data Updates'}
              </h2>
              {usersWithPendingUpdates.filter((u) => {
                if (!userSearchTerm.trim()) return true;
                const term = userSearchTerm.trim().toLowerCase();
                return (
                  (u.name || '').toLowerCase().includes(term) ||
                  (u.hrCode || '').toLowerCase().includes(term) ||
                  (u.email || '').toLowerCase().includes(term)
                );
              }).length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className="border-b font-bold"
                        style={{ backgroundColor: tableHeaderBg, borderColor, color: '#FFFFFF' }}
                      >
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ø§Ø³Ù…' : 'Name'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨' : 'Requested Change'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersWithPendingUpdates
                        .filter((u) => {
                          if (!userSearchTerm.trim()) return true;
                          const term = userSearchTerm.trim().toLowerCase();
                          return (
                            (u.name || '').toLowerCase().includes(term) ||
                            (u.hrCode || '').toLowerCase().includes(term) ||
                            (u.email || '').toLowerCase().includes(term)
                          );
                        })
                        .map((u) => (
                          <tr key={u.id} className="border-b transition-colors" style={{ borderColor, color: textColor }}>
                            <td className="p-3">
                              <UserAvatarWithName user={u} />
                            </td>
                            <td className="p-3">
                              {editingUpdateUserId === u.id ? (
                                <div className="space-y-2 max-w-sm">
                                  {u.pendingUpdates?.name && (
                                    <div>
                                      <span className="text-xs text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ø§Ø³Ù…:' : 'Name:'}</span>
                                      <input
                                        type="text"
                                        value={
                                          updateEditFormData.name !== undefined
                                            ? updateEditFormData.name
                                            : u.pendingUpdates.name || ''
                                        }
                                        onChange={(e) =>
                                          setUpdateEditFormData({ ...updateEditFormData, name: e.target.value })
                                        }
                                        className="border rounded-lg px-2.5 py-1.5 w-full mt-1 text-sm outline-none focus:ring-2 focus:ring-[#002D62]"
                                        style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                                      />
                                    </div>
                                  )}
                                  {u.pendingUpdates?.department && (
                                    <div>
                                      <span className="text-xs text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©:' : 'Department:'}</span>
                                      <input
                                        type="text"
                                        value={
                                          updateEditFormData.department !== undefined
                                            ? updateEditFormData.department
                                            : u.pendingUpdates.department || ''
                                        }
                                        onChange={(e) =>
                                          setUpdateEditFormData({ ...updateEditFormData, department: e.target.value })
                                        }
                                        className="border rounded-lg px-2.5 py-1.5 w-full mt-1 text-sm outline-none focus:ring-2 focus:ring-[#002D62]"
                                        style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                                      />
                                    </div>
                                  )}
                                  {u.pendingUpdates?.phone && (
                                    <div>
                                      <span className="text-xs text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ù‡Ø§ØªÙ:' : 'Phone:'}</span>
                                      <input
                                        type="text"
                                        value={
                                          updateEditFormData.phone !== undefined
                                            ? updateEditFormData.phone
                                            : u.pendingUpdates.phone || ''
                                        }
                                        onChange={(e) =>
                                          setUpdateEditFormData({ ...updateEditFormData, phone: e.target.value })
                                        }
                                        className="border rounded-lg px-2.5 py-1.5 w-full mt-1 text-sm outline-none focus:ring-2 focus:ring-[#002D62]"
                                        style={{ backgroundColor: inputBg, borderColor, color: textColor }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {u.pendingUpdates?.name && (
                                    <div>
                                      <span className="text-xs text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ø§Ø³Ù…:' : 'Name:'}</span>
                                      <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.name}</span>
                                      <span className="font-bold text-green-600">âž” {u.pendingUpdates.name}</span>
                                    </div>
                                  )}
                                  {u.pendingUpdates?.department && (
                                    <div>
                                      <span className="text-xs text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©:' : 'Department:'}</span>
                                      <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.department || 'N/A'}</span>
                                      <span className="font-bold text-green-600">âž” {u.pendingUpdates.department}</span>
                                    </div>
                                  )}
                                  {u.pendingUpdates?.phone && (
                                    <div>
                                      <span className="text-xs text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ù‡Ø§ØªÙ:' : 'Phone:'}</span>
                                      <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{u.phone || 'N/A'}</span>
                                      <span className="font-bold text-green-600">âž” {u.pendingUpdates.phone}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {editingUpdateUserId === u.id ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveUpdateEdit(u)}
                                      className="flex items-center gap-1 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl font-bold text-xs"
                                    >
                                      <Save size={14} /> {language === 'ar' ? 'Ø­ÙØ¸' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setEditingUpdateUserId(null)}
                                      className="flex items-center gap-1 text-gray-600 bg-gray-50 px-3 py-1.5 rounded-xl text-xs"
                                    >
                                      <X size={14} /> {language === 'ar' ? 'Ø¥Ù„ØºØ§Ø¡' : 'Cancel'}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleApproveUpdate(u)}
                                      className="flex items-center gap-1 text-green-700 dark:text-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer active:scale-95"
                                    >
                                      <CheckCircle size={14} /> {language === 'ar' ? 'Ù…ÙˆØ§ÙÙ‚' : 'Approve'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingUpdateUserId(u.id);
                                        setUpdateEditFormData({
                                          name: u.pendingUpdates?.name,
                                          department: u.pendingUpdates?.department,
                                          phone: u.pendingUpdates?.phone,
                                          hrCode: u.pendingUpdates?.hrCode,
                                          email: u.pendingUpdates?.email,
                                        });
                                      }}
                                      className="flex items-center gap-1 text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer active:scale-95"
                                    >
                                      <Edit2 size={14} /> {language === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„' : 'Edit'}
                                    </button>
                                    <button
                                      onClick={() => handleRejectUpdate(u)}
                                      className="flex items-center gap-1 text-red-700 dark:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer active:scale-95"
                                    >
                                      <X size={14} /> {language === 'ar' ? 'Ø±ÙØ¶' : 'Reject'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : userSearchTerm.trim() ? (
                renderEmptyState(
                  language === 'ar' ? 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø·Ù„Ø¨Ø§Øª ØªØ¹Ø¯ÙŠÙ„ Ù…Ø·Ø§Ø¨Ù‚Ø©' : 'No Matching Update Requests',
                  language === 'ar'
                    ? `Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª ØªØ·Ø§Ø¨Ù‚ "${userSearchTerm}".`
                    : `No update requests match "${userSearchTerm}".`,
                  () => setUserSearchTerm('')
                )
              ) : (
                <div className="p-8 text-center rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/30 flex flex-col items-center justify-center my-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-xs">
                    <CheckCircle size={22} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">
                    {language === 'ar' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ØªØ¹Ø¯ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø¹Ù„Ù‚Ø©' : 'No pending data update requests.'}
                  </h4>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROCESSED UPDATES HISTORY */}
          {userManagementTab === 'processed_updates' && (
            <div>
              <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>
                {language === 'ar' ? 'Ø³Ø¬Ù„ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„Ù…ÙƒØªÙ…Ù„Ø©' : 'Processed Data Updates'}
              </h2>
              {processedUpdatesList.filter((item) => {
                if (!userSearchTerm.trim()) return true;
                const term = userSearchTerm.trim().toLowerCase();
                return (
                  (item.user.name || '').toLowerCase().includes(term) ||
                  (item.user.hrCode || '').toLowerCase().includes(term) ||
                  (item.user.email || '').toLowerCase().includes(term)
                );
              }).length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className="border-b font-bold"
                        style={{ backgroundColor: tableHeaderBg, borderColor, color: '#FFFFFF' }}
                      >
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ø§Ø³Ù…' : 'Name'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø°ÙŠ Ø·ÙÙ„Ø¨' : 'Requested Change'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ø­Ø§Ù„Ø©' : 'Status'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'ÙˆÙ‚Øª Ø§Ù„ØªÙ†ÙÙŠØ°' : 'Processed At'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedUpdatesList
                        .filter((item) => {
                          if (!userSearchTerm.trim()) return true;
                          const term = userSearchTerm.trim().toLowerCase();
                          return (
                            (item.user.name || '').toLowerCase().includes(term) ||
                            (item.user.hrCode || '').toLowerCase().includes(term) ||
                            (item.user.email || '').toLowerCase().includes(term)
                          );
                        })
                        .map((item, index) => (
                          <tr key={`${item.user.id}_${index}`} className="border-b transition-colors" style={{ borderColor, color: textColor }}>
                            <td className="p-3">
                              <UserAvatarWithName user={item.user} />
                            </td>
                            <td className="p-3">
                              {item.history.name && (
                                <div className="mb-1 text-xs">
                                  <span className="text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ø§Ø³Ù…:' : 'Name:'}</span>
                                  {item.history.oldName && (
                                    <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{item.history.oldName}</span>
                                  )}
                                  <span className="font-bold text-green-600">âž” {item.history.name}</span>
                                </div>
                              )}
                              {item.history.department && (
                                <div className="mb-1 text-xs">
                                  <span className="text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©:' : 'Department:'}</span>
                                  {item.history.oldDepartment && (
                                    <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0">{item.history.oldDepartment}</span>
                                  )}
                                  <span className="font-bold text-green-600">âž” {item.history.department}</span>
                                </div>
                              )}
                              {item.history.phone && (
                                <div className="mb-1 text-xs">
                                  <span className="text-gray-500 block">{language === 'ar' ? 'Ø§Ù„Ù‡Ø§ØªÙ:' : 'Phone:'}</span>
                                  {item.history.oldPhone && (
                                    <span className="line-through text-red-500 mr-2 rtl:ml-2 rtl:mr-0 font-mono" dir="ltr">
                                      {item.history.oldPhone}
                                    </span>
                                  )}
                                  <span className="font-bold text-green-600 font-mono" dir="ltr">
                                    âž” {item.history.phone}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  item.history.status === 'approved'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {item.history.status === 'approved'
                                  ? language === 'ar'
                                    ? 'ØªÙ…Øª Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø©'
                                    : 'Approved'
                                  : language === 'ar'
                                  ? 'Ù…Ø±ÙÙˆØ¶'
                                  : 'Rejected'}
                              </span>
                            </td>
                            <td className="p-3 text-xs" style={{ color: textMuted }}>
                              {new Date(item.history.processedAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-GB')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : userSearchTerm.trim() ? (
                renderEmptyState(
                  language === 'ar' ? 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ø³Ø¬Ù„Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø©' : 'No Matching History',
                  language === 'ar'
                    ? `Ù„Ø§ ØªÙˆØ¬Ø¯ Ø³Ø¬Ù„Ø§Øª ØªØ¹Ø¯ÙŠÙ„ Ø³Ø§Ø¨Ù‚Ø© ØªØ·Ø§Ø¨Ù‚ "${userSearchTerm}".`
                    : `No update history matched "${userSearchTerm}".`,
                  () => setUserSearchTerm('')
                )
              ) : (
                renderEmptyState(
                  language === 'ar' ? 'Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø¬Ù„ Ù„Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©' : 'No Processed Updates History'
                )
              )}
            </div>
          )}

          {/* TAB 4: APPROVED / PROCESSED USERS */}
          {userManagementTab === 'processed' && (
            <div>
              <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>
                {language === 'ar' ? 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ø§Ù„Ù…Ø¹ØªÙ…Ø¯ÙŠÙ†' : 'Approved Users'}
              </h2>
              {users
                .filter((u) => (u.status === 'approved' || u.status === 'rejected') && u.createdAt)
                .filter((u) => {
                  if (!userSearchTerm.trim()) return true;
                  const term = userSearchTerm.trim().toLowerCase();
                  return (
                    (u.name || '').toLowerCase().includes(term) ||
                    (u.hrCode || '').toLowerCase().includes(term) ||
                    (u.email || '').toLowerCase().includes(term) ||
                    (u.phone || '').toLowerCase().includes(term) ||
                    (u.department || '').toLowerCase().includes(term) ||
                    (u.role || '').toLowerCase().includes(term)
                  );
                }).length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className="border-b font-bold"
                        style={{ backgroundColor: tableHeaderBg, borderColor, color: '#FFFFFF' }}
                      >
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ' : 'HR Code'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ø§Ø³Ù…' : 'Name'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ù‚Ø³Ù…' : 'Department'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©' : 'Role'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ø­Ø§Ù„Ø©' : 'Status'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter((u) => (u.status === 'approved' || u.status === 'rejected') && u.createdAt)
                        .filter((u) => {
                          if (!userSearchTerm.trim()) return true;
                          const term = userSearchTerm.trim().toLowerCase();
                          return (
                            (u.name || '').toLowerCase().includes(term) ||
                            (u.hrCode || '').toLowerCase().includes(term) ||
                            (u.email || '').toLowerCase().includes(term) ||
                            (u.phone || '').toLowerCase().includes(term) ||
                            (u.department || '').toLowerCase().includes(term) ||
                            (u.role || '').toLowerCase().includes(term)
                          );
                        })
                        .map((u) => (
                          <tr key={u.id} className="border-b transition-colors" style={{ borderColor, color: textColor }}>
                            <td className="p-3">
                              <DataField>{u.hrCode}</DataField>
                            </td>
                            <td className="p-3">
                              <UserAvatarWithName user={u} />
                            </td>
                            <td className="p-3">
                              <DataField>{u.department}</DataField>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${
                                  u.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                                    : u.role === 'manager'
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                                    : u.role === 'supervisor'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                                }`}
                              >
                                <span>
                                  {u.role === 'admin'
                                    ? 'ðŸ›¡ï¸ Admin'
                                    : u.role === 'manager'
                                    ? 'ðŸ‘” Manager'
                                    : u.role === 'supervisor'
                                    ? 'ðŸ‘· Supervisor'
                                    : 'ðŸŽ“ Trainee'}
                                </span>
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 rounded text-xs font-bold ${
                                  u.status === 'approved'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {u.status === 'approved'
                                  ? language === 'ar'
                                    ? 'Ù…Ø¹ØªÙ…Ø¯'
                                    : 'Approved'
                                  : language === 'ar'
                                  ? 'Ù…Ø±ÙÙˆØ¶'
                                  : 'Rejected'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3.5 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[32px] rounded-xl text-xs font-bold cursor-pointer transition-all border border-blue-200 dark:border-blue-800 shadow-2xs active:scale-95"
                                >
                                  <Edit2 size={14} /> {language === 'ar' ? 'ØªØ¹Ø¯ÙŠÙ„' : 'Edit'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="flex items-center gap-1.5 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/60 px-3.5 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[32px] rounded-xl text-xs font-bold cursor-pointer transition-all border border-red-200 dark:border-red-800 shadow-2xs active:scale-95"
                                >
                                  <Trash2 size={14} /> {language === 'ar' ? 'Ø­Ø°Ù' : 'Delete'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : userSearchTerm.trim() ? (
                renderEmptyState(
                  language === 'ar' ? 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù…Ø·Ø§Ø¨Ù‚ÙŠÙ†' : 'No Matching Users Found',
                  language === 'ar'
                    ? `Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø³ØªØ®Ø¯Ù… ÙŠØ·Ø§Ø¨Ù‚ Ø¨Ø­Ø«Ùƒ Ø§Ù„Ø­Ø§Ù„ÙŠ ("${userSearchTerm}").`
                    : `No user records matched "${userSearchTerm}".`,
                  () => setUserSearchTerm('')
                )
              ) : (
                renderEmptyState(
                  language === 'ar' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù…Ø¹ØªÙ…Ø¯Ø© Ø­Ø§Ù„ÙŠØ§Ù‹' : 'No active users found.'
                )
              )}
            </div>
          )}

          {/* TAB 5: DELETED TRAINEES */}
          {userManagementTab === 'deleted' && (
            <div>
              <h2 className="text-xl font-semibold mb-4" style={{ color: textColor }}>
                {language === 'ar' ? 'Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ù…Ø­Ø°ÙˆÙÙŠÙ†' : 'Deleted Trainees'}
              </h2>
              {users
                .filter((u) => u.status === 'deleted')
                .filter((u) => {
                  if (!userSearchTerm.trim()) return true;
                  const term = userSearchTerm.trim().toLowerCase();
                  return (
                    (u.name || '').toLowerCase().includes(term) ||
                    (u.hrCode || '').toLowerCase().includes(term) ||
                    (u.department || '').toLowerCase().includes(term)
                  );
                }).length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className="border-b font-bold"
                        style={{ backgroundColor: tableHeaderBg, borderColor, color: '#FFFFFF' }}
                      >
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„ÙƒÙˆØ¯ Ø§Ù„ÙˆØ¸ÙŠÙÙŠ' : 'HR Code'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ø§Ø³Ù…' : 'Name'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø§Ù„Ù‚Ø³Ù…' : 'Department'}</th>
                        <th className="p-3 text-white font-bold">{language === 'ar' ? 'Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users
                        .filter((u) => u.status === 'deleted')
                        .filter((u) => {
                          if (!userSearchTerm.trim()) return true;
                          const term = userSearchTerm.trim().toLowerCase();
                          return (
                            (u.name || '').toLowerCase().includes(term) ||
                            (u.hrCode || '').toLowerCase().includes(term) ||
                            (u.department || '').toLowerCase().includes(term)
                          );
                        })
                        .map((u) => (
                          <tr
                            key={u.id}
                            className="border-b opacity-80"
                            style={{
                              backgroundColor: isDark ? 'rgba(153, 27, 27, 0.1)' : '#fef2f2',
                              borderColor,
                              color: textColor,
                            }}
                          >
                            <td className="p-3">{u.hrCode}</td>
                            <td className="p-3">
                              <UserAvatarWithName user={u} />
                            </td>
                            <td className="p-3">{u.department}</td>
                            <td className="p-3">
                              <button
                                onClick={() => handleRestoreUser(u.id)}
                                className="flex items-center gap-1.5 text-green-700 dark:text-green-300 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-800 px-3.5 py-2 sm:py-1.5 min-h-[38px] sm:min-h-[32px] rounded-xl text-xs font-bold cursor-pointer transition-all shadow-2xs active:scale-95"
                              >
                                <RotateCcw size={14} /> {language === 'ar' ? 'Ø§Ø³ØªØ±Ø¬Ø§Ø¹' : 'Restore'}
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : userSearchTerm.trim() ? (
                renderEmptyState(
                  language === 'ar' ? 'Ù„Ù… ÙŠØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ Ù…ØªØ¯Ø±Ø¨ÙŠÙ† Ù…Ø­Ø°ÙˆÙÙŠÙ† Ù…Ø·Ø§Ø¨Ù‚ÙŠÙ†' : 'No Matching Deleted Users',
                  language === 'ar'
                    ? `Ù„Ø§ ØªÙˆØ¬Ø¯ Ø­Ø³Ø§Ø¨Ø§Øª Ù…Ø­Ø°ÙˆÙØ© ØªØ·Ø§Ø¨Ù‚ "${userSearchTerm}".`
                    : `No deleted accounts match "${userSearchTerm}".`,
                  () => setUserSearchTerm('')
                )
              ) : (
                <div className="p-8 text-center rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/40 dark:bg-slate-900/30 flex flex-col items-center justify-center my-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-2 shadow-xs">
                    <Users size={22} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">
                    {language === 'ar'
                      ? 'Ø³Ù„Ø© Ø§Ù„Ù…Ø­Ø°ÙˆÙØ§Øª ÙØ§Ø±ØºØ© (Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ† Ù…Ø­Ø°ÙˆÙÙŠÙ†)'
                      : 'Recycle bin is clean. No deleted users.'}
                  </h4>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};