import React, { useState } from 'react';
import { useAppContext, generateUUID } from '../context';
import { Course } from '../types';
import { sanitizeUrl } from '../utils/securityUtils';
import { 
  BookOpen, 
  Plus, 
  ExternalLink, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  FileText, 
  Clock, 
  Layers, 
  CheckCircle,
  FolderOpen
} from 'lucide-react';

export const CoursesPage: React.FC = () => {
  const { language, courses, addCourse, updateCourse, deleteCourse, user, t, fetchTrainingRecords, isFetchingRecords, recordsLoaded } = useAppContext();
  const isAdmin = user?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDuration, setFormDuration] = useState('1');
  const [formMaterialLink, setFormMaterialLink] = useState('');
  const [formTopics, setFormTopics] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter courses by search
  const filteredCourses = courses.filter(c => {
    const q = searchQuery.toLowerCase();
    const matchesTitle = c.title.toLowerCase().includes(q);
    const topicsStr = Array.isArray(c.topicsCovered) ? c.topicsCovered.join(' ') : (c.topicsCovered || '');
    const matchesTopics = topicsStr.toLowerCase().includes(q);
    return matchesTitle || matchesTopics;
  });

  const openAddModal = () => {
    setFormTitle('');
    setFormDuration('1');
    setFormMaterialLink('');
    setFormTopics('');
    setEditingCourse(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormTitle(course.title);
    setFormDuration(String(course.durationDays || course.duration || '1').replace(/[^0-9]/g, '') || '1');
    setFormMaterialLink(course.materialLink || course.sharedResourceLink || '');
    const topics = Array.isArray(course.topicsCovered) ? course.topicsCovered.join('\n') : (course.topicsCovered || '');
    setFormTopics(topics);
    setIsAddModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSaving(true);
    try {
      const topicsArray = formTopics
        .split(/[\n,]/)
        .map(t => t.trim())
        .filter(Boolean);

      const courseObj: Course = {
        id: editingCourse ? editingCourse.id : `course_${generateUUID().substring(0, 8)}`,
        title: formTitle.trim(),
        duration: `${formDuration.trim()} ${Number(formDuration) > 1 ? (language === 'ar' ? 'أيام' : 'Days') : (language === 'ar' ? 'يوم' : 'Day')}`,
        durationDays: formDuration.trim() || '1',
        materialLink: formMaterialLink.trim(),
        topicsCovered: topicsArray,
        isUpcoming: editingCourse?.isUpcoming || false
      };

      if (editingCourse) {
        await updateCourse(courseObj);
        alert(language === 'ar' ? 'تم تحديث بيانات الكورس بنجاح!' : 'Course updated successfully!');
      } else {
        await addCourse(courseObj);
        alert(language === 'ar' ? 'تمت إضافة الكورس الجديد بنجاح!' : 'New course added successfully!');
      }

      setIsAddModalOpen(false);
      setEditingCourse(null);
    } catch (err: any) {
      console.error('Error saving course:', err);
      alert(language === 'ar' ? `حدث خطأ: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (id: string, title: string) => {
    if (window.confirm(language === 'ar' ? `هل أنت متأكد من حذف كورس "${title}"؟` : `Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteCourse(id);
      } catch (err: any) {
        console.error('Error deleting course:', err);
        alert(language === 'ar' ? `حدث خطأ أثناء الحذف: ${err.message}` : `Error deleting: ${err.message}`);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* الشريط الذهبي والترحيب على اليمين */}
      <div className="w-full flex items-center justify-end border-b-2 border-[#FFC000] pb-2 mb-2 print:hidden">
        <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 md:hidden ml-auto rtl:ml-0 rtl:mr-auto text-right">
          {language === 'ar' ? '👋 أهلاً بك، ' : '👋 Welcome, '}
          <span className="text-[#002D62] dark:text-[#FFC000] font-black">{user?.name?.split(' ')[0]}</span>
        </p>
      </div>

      {/* Top Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#002D62] text-[#FFC000] rounded-xl shadow-sm">
              <BookOpen size={26} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#002D62] tracking-tight">
                {language === 'ar' ? 'دليل ومكتبة الكورسات التدريبية' : 'Training Courses & Material Catalog'}
              </h2>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                {language === 'ar' ? 'استعراض جميع الدورات التدريبية، عدد الأيام، المحاور، وروابط المواد التعليمية' : 'Explore all courses, duration, covered topics, and download training materials'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={language === 'ar' ? 'بحث عن كورس أو موضوع...' : 'Search course or topic...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#002D62] outline-none bg-gray-50/50"
            />
          </div>

          {/* Admin Action Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={openAddModal}
                className="bg-[#002D62] hover:bg-blue-900 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap cursor-pointer hover:scale-105"
              >
                <Plus size={18} className="text-[#FFC000]" />
                <span>{language === 'ar' ? 'إضافة كورس جديد' : 'Add New Course'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Courses Table Container */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left rtl:text-right border-collapse text-sm">
            <thead>
              <tr className="bg-[#002D62] text-xs uppercase tracking-wider font-bold" style={{ backgroundColor: '#002D62' }}>
                <th className="p-4 w-12 text-center" style={{ color: '#ffffff' }}>#</th>
                <th className="p-4 min-w-[220px]" style={{ color: '#ffffff' }}>{language === 'ar' ? 'اسم الكورس' : 'Course Title'}</th>
                <th className="p-4 min-w-[130px]" style={{ color: '#ffffff' }}>{language === 'ar' ? 'عدد الأيام' : 'Duration'}</th>
                <th className="p-4 min-w-[160px]" style={{ color: '#ffffff' }}>{language === 'ar' ? 'ماتريال الدورة' : 'Training Material'}</th>
                <th className="p-4 min-w-[300px]" style={{ color: '#ffffff' }}>{language === 'ar' ? 'المواضيع والمحاور المغطاة' : 'Topics Covered'}</th>
                {isAdmin && <th className="p-4 w-28 text-center" style={{ color: '#ffffff' }}>{language === 'ar' ? 'إجراءات' : 'Actions'}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCourses.map((c, index) => {
                const topics = Array.isArray(c.topicsCovered) 
                  ? c.topicsCovered 
                  : (c.topicsCovered ? String(c.topicsCovered).split(/[\n,]/).filter(Boolean) : []);

                return (
                  <tr key={c.id || index} className="hover:bg-blue-50/40 transition-colors">
                    {/* Index */}
                    <td className="p-4 text-center text-gray-400 dark:text-gray-500 font-semibold text-xs">
                      {index + 1}
                    </td>

                    {/* Course Title */}
                    <td className="p-4 font-bold text-[#002D62] dark:text-[#70B2FF]">
                      <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-amber-600 dark:text-[#FFC000] shrink-0" />
                        <span>{c.title}</span>
                      </div>
                    </td>

                    {/* Duration / Days */}
                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock size={15} className="text-gray-400 dark:text-gray-500" />
                        <span>{c.duration || `${c.durationDays || 1} Days`}</span>
                      </div>
                    </td>

                    {/* Material Link */}
                    <td className="p-4">
                      {c.materialLink || c.sharedResourceLink ? (
                        <a
                          href={sanitizeUrl(c.materialLink || c.sharedResourceLink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-bold transition-colors border border-blue-200 dark:border-blue-700/50"
                        >
                          <FolderOpen size={14} className="text-blue-600 dark:text-blue-400" />
                          <span>{language === 'ar' ? 'فتح الماتريال' : 'Open Material'}</span>
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        isAdmin ? (
                          <button
                            onClick={() => openEditModal(c)}
                            className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1 italic cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>{language === 'ar' ? 'إضافة رابط' : 'Add Link'}</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-600 italic">{language === 'ar' ? 'غير متوفر' : 'Not available'}</span>
                        )
                      )}
                    </td>

                    {/* Topics Covered */}
                    <td className="p-4 text-gray-600 dark:text-gray-300">
                      {topics.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {topics.slice(0, 3).map((topic, i) => (
                            <span 
                              key={i} 
                              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-white/[0.08] text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-white/[0.1]"
                            >
                              {topic.trim()}
                            </span>
                          ))}
                          {topics.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.04]">
                              +{topics.length - 3} {language === 'ar' ? 'محاور أخرى' : 'more'}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-600 italic">{language === 'ar' ? 'لم تُحدد محاور بعد' : 'No topics specified'}</span>
                      )}
                    </td>

                    {/* Actions (Admin) */}
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-2.5 min-w-[38px] min-h-[38px] flex items-center justify-center text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                            title={language === 'ar' ? 'تعديل الكورس' : 'Edit Course'}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id, c.title)}
                            className="p-2.5 min-w-[38px] min-h-[38px] flex items-center justify-center text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer"
                            title={language === 'ar' ? 'حذف الكورس' : 'Delete Course'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}

              {filteredCourses.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="p-12 text-center text-gray-500">
                    <BookOpen size={40} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold">{language === 'ar' ? 'لا توجد كورسات مطابقة للبحث' : 'No courses match your search'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Course Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[99999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#002D62] text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-[#FFC000]" />
                <h3 className="font-bold text-lg" style={{ color: '#ffffff' }}>
                  {editingCourse 
                    ? (language === 'ar' ? 'تعديل بيانات الكورس' : 'Edit Course') 
                    : (language === 'ar' ? 'إضافة كورس تدريبي جديد' : 'Add New Training Course')}
                </h3>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingCourse(null); }}
                className="text-gray-300 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 overflow-y-auto space-y-4">
              {/* Course Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === 'ar' ? 'اسم الكورس / الدورة' : 'Course Title'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Fundamentals"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
                />
              </div>

              {/* Duration (Days) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === 'ar' ? 'عدد أيام الدورة (Days)' : 'Duration (Days)'} *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 2"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
                />
              </div>

              {/* Material Link */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === 'ar' ? 'رابط الماتريال التدريبي (Material Link / Drive / SharePoint)' : 'Material URL (Google Drive / OneDrive / SharePoint)'}
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... or https://..."
                  value={formMaterialLink}
                  onChange={(e) => setFormMaterialLink(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
                  dir="ltr"
                />
              </div>

              {/* Topics Covered */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  {language === 'ar' ? 'المواضيع والمحاور المغطاة (اكتب كل موضوع في سطر أو افصل بفاصلة)' : 'Topics Covered (Separate with new lines or commas)'}
                </label>
                <textarea
                  rows={4}
                  placeholder={language === 'ar' ? "1. السلامة المهنية\n2. الدوائر الكهربائية\n3. الصيانة الدورية" : "1. Safety Standards\n2. Electrical Circuits\n3. Maintenance"}
                  value={formTopics}
                  onChange={(e) => setFormTopics(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#002D62] outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingCourse(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#002D62] hover:bg-blue-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{isSaving ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ الكورس' : 'Save Course')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};