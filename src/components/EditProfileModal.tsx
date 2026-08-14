import React, { useState } from 'react';
import { User } from '../types';
import { X, Upload, Save, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppContext } from '../context';

interface EditProfileModalProps {
  user: User;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose }) => {
  const { language } = useAppContext();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [department, setDepartment] = useState(user.department);
  const [profileImage, setProfileImage] = useState<string | undefined>(user.profileImageUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setProfileImage(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError(language === 'ar' ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    if (phone.trim() && (phone.length !== 10 || !/^(10|11|12|15)/.test(phone))) {
      setError(language === 'ar' ? 'رقم الهاتف غير صالح' : 'Invalid phone number format');
      return;
    }

    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        name,
        phone,
        department,
        profileImageUrl: profileImage || null
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X size={24} />
        </button>
        
        <div className="p-6">
          <h2 className="text-xl font-bold text-[#002D62] mb-6 border-b pb-2">
            {language === 'ar' ? 'تعديل البيانات' : 'Edit Profile'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-col items-center justify-center mb-6">
              <label className="relative cursor-pointer w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden hover:border-[#002D62] transition-colors group">
                {profileImage ? (
                  <>
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="text-white h-6 w-6" />
                    </div>
                  </>
                ) : (
                  <div className="text-center p-2">
                    <Upload className="mx-auto h-6 w-6 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {language === 'ar' ? 'تغيير الصورة' : 'Change Photo'}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'الاسم' : 'Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'القسم' : 'Department'}
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'رقم التليفون (+20)' : 'Phone (+20)'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-[#002D62] outline-none"
                placeholder="10xxxxxxxx"
                dir="ltr"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#002D62] text-white px-6 py-2 rounded font-bold hover:bg-blue-900 transition-colors flex items-center gap-2 disabled:opacity-70"
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>{language === 'ar' ? 'حفظ البيانات' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
