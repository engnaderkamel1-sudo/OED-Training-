import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarRange, 
  Search, 
  Filter, 
  BookOpen, 
  Clock, 
  Users, 
  Layers, 
  ExternalLink, 
  CalendarDays, 
  Award, 
  Printer, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2, 
  Info, 
  Download, 
  Flame, 
  Wrench, 
  Zap, 
  Compass, 
  HardHat, 
  X,
  PlusCircle,
  TrendingUp,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { Course, UpcomingSession } from '../types';

export interface AnnualPlanCourse {
  id: string;
  code: string;
  titleEn: string;
  titleAr: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  monthRangeEn: string;
  monthRangeAr: string;
  track: 'mechanical' | 'hydraulic' | 'electrical' | 'heavy_machinery' | 'tbm' | 'quality_sos';
  targetAudienceEn: string;
  targetAudienceAr: string;
  durationDays: number;
  totalHours: number;
  descriptionEn: string;
  descriptionAr: string;
  topics: { en: string; ar: string }[];
  venueEn: string;
  venueAr: string;
  prerequisitesEn?: string;
  prerequisitesAr?: string;
}

// 100% Verified Real Orascom Equipment Department Training Catalog
export const OFFICIAL_ANNUAL_PLAN: AnnualPlanCourse[] = [
  // --- Q1: Foundational Systems & Preventive Diagnostics (Jan - Mar) ---
  {
    id: 'oed_course_01',
    code: 'OED-MEC-101',
    titleEn: 'Diesel Engine Mechanical Fundamentals',
    titleAr: 'أساسيات ميكانيكا محركات الديزل',
    quarter: 'Q1',
    monthRangeEn: 'January - February',
    monthRangeAr: 'يناير - فبراير',
    track: 'mechanical',
    targetAudienceEn: 'Engineers & Workshop Technicians',
    targetAudienceAr: 'مهندسو وفنيو ورش الصيانة',
    durationDays: 5,
    totalHours: 35,
    descriptionEn: 'Core mechanical principles of heavy diesel internal combustion engines, cylinder blocks, cylinder heads, valve mechanisms, lubrication, and cooling circuits.',
    descriptionAr: 'المبادئ الميكانيكية الأساسية لمحركات الاحتراق الداخلي للمعدات الثقيلة، البلوف، الأسطوانات، دورات التزييت والتبريد.',
    topics: [
      { en: 'Four-stroke cycle & thermodynamic fundamentals', ar: 'دورة الأشواط الأربعة والمبادئ الحرارية' },
      { en: 'Cylinder head, valves, camshaft & crankshaft inspection', ar: 'فحص وش السلندر، الصبابات، عمود الكامات والكرنك' },
      { en: 'Lubrication circuits & oil pump pressure regulation', ar: 'دورة التزييت وضبط ضغوط طلمبة الزيت' },
      { en: 'Cooling system troubleshooting & thermostat diagnostics', ar: 'أعطال دورة التبريد واختبار الثرموستات' }
    ],
    venueEn: 'Katamia Central Workshop - Training Hall A',
    venueAr: 'ورشة القطامية المركزية - قاعة أ',
    prerequisitesEn: 'General mechanical background',
    prerequisitesAr: 'خلفية هندسية أو فنية ميكانيكية'
  },
  {
    id: 'oed_course_02',
    code: 'OED-HYD-101',
    titleEn: 'Hydraulic Fundamentals',
    titleAr: 'أساسيات الأنظمة الهيدروليكية',
    quarter: 'Q1',
    monthRangeEn: 'January - March',
    monthRangeAr: 'يناير - مارس',
    track: 'hydraulic',
    targetAudienceEn: 'Equipment Engineers & Hydraulic Technicians',
    targetAudienceAr: 'مهندسو وفنيو هيدروليك المعدات الثقيلة',
    durationDays: 5,
    totalHours: 35,
    descriptionEn: 'Fundamental principles of fluid power, Pascal\'s principle, positive displacement pumps, relief valves, directional control valves, and hydraulic schematics reading.',
    descriptionAr: 'مبادئ الهيدروليك وقانون باسكال، طلمبات الإزاحة الموجبة، صمامات تصريف الضغط والتحكم في الاتجاه، وقراءة المخططات الهيدروليكية.',
    topics: [
      { en: 'Pascal law & fluid power principles', ar: 'قانون باسكال ومبادئ القدرة المائعة' },
      { en: 'Gear, vane & variable displacement axial piston pumps', ar: 'طلمبات التروس والريش والمكبسية متغيرة الإزاحة' },
      { en: 'Pressure relief, counterbalance & pilot-operated valves', ar: 'صمامات تصريف الضغط والاتزان والصمامات الدليلية' },
      { en: 'ISO hydraulic symbols & schematic tracing', ar: 'الرموز القياسية وتتبع المخططات الهيدروليكية' }
    ],
    venueEn: 'Katamia Central Workshop - Hydraulics Lab',
    venueAr: 'ورشة القطامية المركزية - معمل الهيدروليك',
    prerequisitesEn: 'Diesel mechanical fundamentals',
    prerequisitesAr: 'أساسيات ميكانيكا محركات الديزل'
  },
  {
    id: 'oed_course_03',
    code: 'OED-QAL-101',
    titleEn: 'Scheduled Oil Sample S.O.S',
    titleAr: 'تحليل عينات الزيوت الدورية (S.O.S)',
    quarter: 'Q1',
    monthRangeEn: 'February - March',
    monthRangeAr: 'فبراير - مارس',
    track: 'quality_sos',
    targetAudienceEn: 'Maintenance Planners, Site Engineers & Inspectors',
    targetAudienceAr: 'مهندسو الصيانة والتخطيط ومفتشو الجودة بالمواقع',
    durationDays: 2,
    totalHours: 14,
    descriptionEn: 'Predictive maintenance techniques through wear metals analysis, soot, oxidation, nitration, fluid cleanliness levels (ISO 4406), and preventative oil sampling protocols.',
    descriptionAr: 'الصيانة التنبؤية عبر فحص برادة التآكل والشوائب والأكسدة ومستويات النظافة القياسية، والبروتوكول المعتمد لسحب العينات.',
    topics: [
      { en: 'Proper oil sampling methodology & hot-zone extraction', ar: 'الطريقة الصحيحة لسحب العينات من نقاط السحب المباشرة' },
      { en: 'Wear metals interpretation (Fe, Cu, Cr, Al, Pb, Si)', ar: 'قراءة نسب المعادن الميكروسكوبية ودلالات تآكل الأجزاء' },
      { en: 'Oil degradation: viscosity, oxidation, soot & sulfation', ar: 'مؤشرات انهيار الزيت ولزوجته ونسب الكربون' },
      { en: 'Action threshold matrix & condition monitoring decisions', ar: 'مصفوفة اتخاذ القرار وإجراءات التدخل الاستباقية' }
    ],
    venueEn: 'Katamia Central Workshop - Diagnostics Center',
    venueAr: 'ورشة القطامية المركزية - مركز الفحص والتشخيص'
  },
  {
    id: 'oed_course_04',
    code: 'OED-SYS-101',
    titleEn: 'SIS 2 (Service Information System)',
    titleAr: 'نظام معلومات الصيانة المعتمد (SIS 2.0)',
    quarter: 'Q1',
    monthRangeEn: 'March',
    monthRangeAr: 'مارس',
    track: 'heavy_machinery',
    targetAudienceEn: 'Maintenance Engineers & Spare Parts Specialists',
    targetAudienceAr: 'مهندسو الصيانة ومسؤولو قطع الغيار والمخازن',
    durationDays: 2,
    totalHours: 14,
    descriptionEn: 'Mastering Caterpillar SIS 2.0 online and offline systems, parts catalog navigation, service manuals extraction, disassembly & assembly procedures, and disassembly safety.',
    descriptionAr: 'احتراف استخدام برنامج SIS 2 للبحث عن قطع الغيار ومخططات الفك والتركيب والكتالوجات الفنية لأساطيل المعدات.',
    topics: [
      { en: 'Serial number prefix filtering & arrangement identification', ar: 'البحث المتقدم برقم الشاسيه والبادئة الفنية للمعدة' },
      { en: 'Parts breakdown schematics & 2D/3D parts identification', ar: 'تصفح أجزاء المعدة ومخططات قطع الغيار الثنائية والثلاثية' },
      { en: 'Disassembly & Assembly (D&A) manual extractions', ar: 'استخراج تعليمات الفك والتركيب وعزوم الربط المعتمدة' },
      { en: 'Service Information Letters (SIL) & safety bulletins', ar: 'نشرات الدعم الفني والتعديلات الهندسية للمصنع' }
    ],
    venueEn: 'OED IT & Training Lab - Katamia',
    venueAr: 'معمل الحاسب الآلي والتدريب - ورش القطامية'
  },

  // --- Q2: Heavy Machinery, Power Train & Advanced Hydraulics (Apr - Jun) ---
  {
    id: 'oed_course_05',
    code: 'OED-HYD-201',
    titleEn: 'Advanced Hydraulic Control Systems',
    titleAr: 'أنظمة التحكم الهيدروليكي المتقدمة',
    quarter: 'Q2',
    monthRangeEn: 'April - May',
    monthRangeAr: 'أبريل - مايو',
    track: 'hydraulic',
    targetAudienceEn: 'Senior Hydraulic Engineers & Specialists',
    targetAudienceAr: 'كبار مهندسي الهيدروليك وأخصائيو الصيانة الميدانية',
    durationDays: 5,
    totalHours: 35,
    descriptionEn: 'Load-sensing (LS), pressure-compensated (PC) proportional systems, electro-hydraulic proportional valves, and hydrostatic closed-loop transmission circuits.',
    descriptionAr: 'أنظمة الهيدروليك الحساسة للحمل (Load Sensing) وصمامات التناسب الإلكتروهيدروليكية، ودوائر الدفع الهيدروستاتيكي المغلقة.',
    topics: [
      { en: 'Load Sensing & Flow Compensation pump governors', ar: 'منظمات طلمبات استشعار الحمل وتعويض التدفق' },
      { en: 'Electro-hydraulic proportional valves & PWM drivers', ar: 'صمامات التناسب الكهرومغناطيسية وإشارات PWM' },
      { en: 'Closed-loop hydrostatic drive circuits & charge pressure', ar: 'دوائر الحركة المغلقة وضغوط طلمبة التعويض (Charge Pump)' },
      { en: 'Pressure testing, relief margin calibration & diagnostics', ar: 'معايرة هوامش الضغط وتحديد أسباب بطء الحركات' }
    ],
    venueEn: 'Katamia Central Workshop - Advanced Test Bench',
    venueAr: 'ورشة القطامية المركزية - منصة الاختبارات المتقدمة',
    prerequisitesEn: 'Hydraulic Fundamentals (OED-HYD-101)',
    prerequisitesAr: 'اجتياز أساسيات الهيدروليك (OED-HYD-101)'
  },
  {
    id: 'oed_course_06',
    code: 'OED-POW-101',
    titleEn: 'Power Train',
    titleAr: 'منظومة نقل الحركة ومجموعة القوى (Power Train)',
    quarter: 'Q2',
    monthRangeEn: 'May - June',
    monthRangeAr: 'مايو - يونيو',
    track: 'heavy_machinery',
    targetAudienceEn: 'Heavy Equipment Engineers & Technicians',
    targetAudienceAr: 'مهندسو وفنيو أساطيل المعدات الثقيلة',
    durationDays: 5,
    totalHours: 35,
    descriptionEn: 'Torque converters, lockup clutches, planetary powershift transmissions, differential locks, final drives, and hydraulic brake systems in heavy earthmoving equipment.',
    descriptionAr: 'محولات العزم، الفتيس الباورشيفت الكوكبي، التروس التفاضلية، ومجموعات تخفيض السرعة النهائية ودورات الفرامل الهيدروليكية.',
    topics: [
      { en: 'Torque converter impellers, turbines, stators & lockup', ar: 'أجزاء محول العزم (المروحة، التوربينة، الموجه وكلاتش الإغلاق)' },
      { en: 'Planetary gear trains & hydraulic clutch engagement', ar: 'مجموعات التروس الكوكبية وكلاتشات التعشيق الهيدروليكي' },
      { en: 'Differential systems, bevel gears & final drive reductions', ar: 'مجموعات الكرونة وتخفيضات العجلات النهائية (Final Drives)' },
      { en: 'Transmission hydraulic control valve calibration', ar: 'معايرة بلوف التحكم الهيدروليكي في ناقل الحركة' }
    ],
    venueEn: 'Katamia Central Workshop - Heavy Bays',
    venueAr: 'ورشة القطامية المركزية - عنبر المعدات الثقيلة'
  },
  {
    id: 'oed_course_07',
    code: 'OED-GRD-101',
    titleEn: '14M Motor Grader Engineers',
    titleAr: 'هندسة وصيانة الجريدر 14M للمهندسين',
    quarter: 'Q2',
    monthRangeEn: 'May - June',
    monthRangeAr: 'مايو - يونيو',
    track: 'heavy_machinery',
    targetAudienceEn: 'Site Fleet Engineers & Field Service Teams',
    targetAudienceAr: 'مهندسو صيانة المواقع وفرق الصيانة السريعة',
    durationDays: 4,
    totalHours: 28,
    descriptionEn: 'Comprehensive engineering study of CAT 14M Grader: electro-hydraulic joystick controls, advanced steering systems, moldboard circle drive, and tandem drives.',
    descriptionAr: 'دراسة هندسية شاملة لجريدر 14M: التحكم بعصا القيادة الإلكتروهيدروليكية، دائرة التوجيه، صينية السكينة ومجموعات التاندوم.',
    topics: [
      { en: 'Electro-hydraulic implement joystick architecture', ar: 'هيكل التحكم الإلكتروهيدروليكي لعصيان التوجيه' },
      { en: 'Circle drive gear lubrication & blade slide adjustments', ar: 'ضبط خلوص صينية السكينة وتزييت مجموعة الدوران' },
      { en: 'Tandem drive chain tensioning & axle alignment', ar: 'ضبط شد سلاسل التاندوم ومحاذاة المحاور الخلفية' },
      { en: 'Electronic calibration of blade positioning sensors', ar: 'معايرة حساسات وضعية السكينة إلكترونياً' }
    ],
    venueEn: 'New Capital Site / Katamia Yard',
    venueAr: 'موقع العاصمة الإدارية / ساحة القطامية'
  },
  {
    id: 'oed_course_08',
    code: 'OED-UND-101',
    titleEn: 'Undercarriage Engineers',
    titleAr: 'هندسة وفحص مجموعات السير والكاتينة للمعدات المجنزرة',
    quarter: 'Q2',
    monthRangeEn: 'June',
    monthRangeAr: 'يونيو',
    track: 'heavy_machinery',
    targetAudienceEn: 'Undercarriage Inspectors, Field Engineers & Planners',
    targetAudienceAr: 'مفتشو ومخططو صيانة مجموعات السير بالمواقع والورش',
    durationDays: 3,
    totalHours: 21,
    descriptionEn: 'Wear measurement methodologies, track link pitch, bushing wear, sprocket tooth wear, carrier rollers, idler alignment, and remaining life forecasting (CTS).',
    descriptionAr: 'طرق قياس تآكل مجموعات السير، مسافة خطوة الجنزير، تآكل الجلب والتروس المسننة، ضبط شد الكاتينة وتقدير العمر المتبقي (CTS).',
    topics: [
      { en: 'Custom Track Service (CTS) measurement protocols', ar: 'استخدام أدوات القياس المعتمدة (CTS) والموجات فوق الصوتية' },
      { en: 'Link wear, pin & bushing internal/external wear metrics', ar: 'قياس تآكل الوصلات والجلب والبنزات الداخلية والخارجية' },
      { en: 'Sprocket profile wear & track tension hydraulic adjustment', ar: 'تآكل تروس الجر وضبط الشد الهيدروليكي للكاتينة' },
      { en: 'Cost-per-hour optimization & track turning decisions', ar: 'حساب تكلفة ساعة التشغيل وقرارات تدوير الجلب' }
    ],
    venueEn: 'Katamia Central Workshop - Track Shop',
    venueAr: 'ورشة القطامية المركزية - ورشة الكاتينات ومجموعات السير'
  },

  // --- Q3: Electrical, Controls & Power Generation (Jul - Sep) ---
  {
    id: 'oed_course_09',
    code: 'OED-ELE-101',
    titleEn: 'Electricity Fundamentals',
    titleAr: 'أساسيات الكهرباء للمعدات الثقيلة',
    quarter: 'Q3',
    monthRangeEn: 'July - August',
    monthRangeAr: 'يوليو - أغسطس',
    track: 'electrical',
    targetAudienceEn: 'Electrical & Mechanical Engineers, Auto Electricians',
    targetAudienceAr: 'مهندسو وفنيو الكهرباء والميكانيكا بالمشاريع والورش',
    durationDays: 5,
    totalHours: 35,
    descriptionEn: 'Ohm’s law, DC circuits, relays, solenoids, lead-acid batteries, starters, charging alternators, voltage drop testing, and multimeter diagnostics on heavy machinery.',
    descriptionAr: 'قانون أوم، الدوائر الكهربائية المستمرة، الريليهات والملفات، بطاريات الديزل، المارش، الدينامو، واختبار هبوط الجهد (Voltage Drop).',
    topics: [
      { en: 'Ohm’s & Kirchhoff’s laws applied to equipment wiring', ar: 'قوانين أوم وكيرشوف وتطبيقها في تمديدات المعدات' },
      { en: 'Heavy-duty starting motors & starter relay circuits', ar: 'مواتير بدء الحركة (المارش) ودائرة مفتاح التشغيل' },
      { en: 'Alternators with internal voltage regulators diagnostics', ar: 'الدينامو ومنظم الجهد الداخلي واختبار الشحن تحت الحمل' },
      { en: 'Parasitic drain test & systematic voltage drop analysis', ar: 'اختبار التسريب الخفي للتيار وتحليل هبوط الجهد' }
    ],
    venueEn: 'Katamia Central Workshop - Electrical Lab',
    venueAr: 'ورشة القطامية المركزية - معمل الكهرباء والتحكم'
  },
  {
    id: 'oed_course_10',
    code: 'OED-CAT-201',
    titleEn: 'Caterpillar Electronic Technician (ET)',
    titleAr: 'برنامج فحص وتشخيص الأعطال الإلكترونية (CAT ET)',
    quarter: 'Q3',
    monthRangeEn: 'August - September',
    monthRangeAr: 'أغسطس - سبتمبر',
    track: 'electrical',
    targetAudienceEn: 'Senior Diagnostic Engineers & Electrical Specialists',
    targetAudienceAr: 'مهندسو الفحص والتشخيص وكبار الفنيين الإلكترونيين',
    durationDays: 3,
    totalHours: 21,
    descriptionEn: 'Connecting Comm Adapter 3, reading active/logged diagnostic trouble codes (CID/FMI), sensor calibrations, injector solenoids tests, and ECM flashing protocols.',
    descriptionAr: 'توصيل محول الاتصال Comm Adapter 3، قراءة أكواد الأعطال المسجلة والنشطة، معايرة الحساسات، واختبار الرشاشات وبرمجة الـ ECM.',
    topics: [
      { en: 'Comm Adapter 3 setup, J1939 & CDL data links', ar: 'إعداد وصلة الاتصال والتعامل مع بروتوكولات CAN/J1939 و CDL' },
      { en: 'Diagnostic trouble codes: CID, FMI, Event codes', ar: 'تحليل دقيق لأكواد المكونات وأكواد الخلل والتحذيرات' },
      { en: 'Override parameters, cylinder cut-out & wiggle tests', ar: 'اختبار فصل الأسطوانات (Cylinder Cutout) واختبار الاهتزاز' },
      { en: 'ECM configuration flashing & snapshot recording', ar: 'حفظ واسترجاع ملفات التكوين والتقاط تسجيلات البيانات الحية' }
    ],
    venueEn: 'OED Diagnostics Center - Katamia',
    venueAr: 'مركز تشخيص الأعطال - ورش القطامية',
    prerequisitesEn: 'Electricity Fundamentals (OED-ELE-101)',
    prerequisitesAr: 'اجتياز أساسيات الكهرباء (OED-ELE-101)'
  },
  {
    id: 'oed_course_11',
    code: 'OED-ENG-201',
    titleEn: 'Electronic Diesel Engine',
    titleAr: 'محركات الديزل الإلكترونية المتقدمة',
    quarter: 'Q3',
    monthRangeEn: 'August - September',
    monthRangeAr: 'أغسطس - سبتمبر',
    track: 'mechanical',
    targetAudienceEn: 'Engine Rebuild Specialists & Site Engineers',
    targetAudienceAr: 'مهندسو وفنيو عمرات المحركات والصيانة الميدانية',
    durationDays: 5,
    totalHours: 35,
    descriptionEn: 'Electronic unit injectors (MEUI / HEUI), common rail high pressure systems, wastegate turbochargers, air-to-air aftercoolers, and exhaust emissions aftertreatment.',
    descriptionAr: 'منظومات الحقن الإلكتروني MEUI و HEUI، نظام الحقن المشترك (Common Rail)، الشواحن التوربينية، وأنظمة معالجة العادم.',
    topics: [
      { en: 'MEUI mechanically actuated electronically controlled injectors', ar: 'الرشاشات الإلكترونية ميكانيكية التحفيز (MEUI)' },
      { en: 'HEUI hydraulic electronic unit injection & actuation oil', ar: 'نظام الحقن الهيدروليكي الإلكتروني (HEUI) وضغوط التفعيل' },
      { en: 'Common rail high-pressure pumps & fuel pressure relief', ar: 'طلمبات الضغط العالي ومسطرة الوقود وحساسات الضغط' },
      { en: 'Wastegate & variable geometry turbocharger diagnostics', ar: 'فحص الشواحن التوربينية ذات الهندسة المتغيرة وصمامات التنفيس' }
    ],
    venueEn: 'Katamia Central Workshop - Engine Rebuild Center',
    venueAr: 'ورشة القطامية المركزية - مركز عمرات المحركات'
  },
  {
    id: 'oed_course_12',
    code: 'OED-GEN-101',
    titleEn: 'Electrical Power Generation',
    titleAr: 'توليد الطاقة الكهربائية ومولدات الديزل للمشاريع',
    quarter: 'Q3',
    monthRangeEn: 'September',
    monthRangeAr: 'سبتمبر',
    track: 'electrical',
    targetAudienceEn: 'Site Power Engineers & Generator Specialists',
    targetAudienceAr: 'مهندسو وفنيو مولدات الطاقة الكهربائية بالمواقع الإنشائية',
    durationDays: 3,
    totalHours: 21,
    descriptionEn: 'Synchronous brushless alternators, automatic voltage regulators (AVR), EMCP generator controllers, paralleling switchgear, load banking, and fault protection.',
    descriptionAr: 'المولدات التزامنية بدون فحمات، كروت تنظيم الجهد (AVR)، لوحات التحكم EMCP، موازاة وتزامن المولدات، واختبارات الأحمال.',
    topics: [
      { en: 'Brushless excitation, rotating diodes & permanent magnet exciters', ar: 'أنظمة الإثارة بدون فحمات والدايودات الدوارة' },
      { en: 'Automatic Voltage Regulator (AVR) stability & droop tuning', ar: 'ضبط استقرار كروت الـ AVR وخاصية Droop' },
      { en: 'EMCP digital control panel programming & sensor calibration', ar: 'برمجة لوحات EMCP ومعايرة حساسات الزيت والحرارة' },
      { en: 'Generator synchronization, load sharing & protective relays', ar: 'تزامن ومشاركة الأحمال بين المولدات وريليهات الحماية' }
    ],
    venueEn: 'Power Generation Workshop - Katamia Yard',
    venueAr: 'عنبر المولدات ومحطات الطاقة - ورش القطامية'
  },

  // --- Q4: Tunneling (TBM), Multi-Service Vehicles & Lessons Learned (Oct - Dec) ---
  {
    id: 'oed_course_13',
    code: 'OED-TBM-101',
    titleEn: '01. Basic Knowledge of TBM',
    titleAr: 'المعرفة الأساسية لماكينات حفر الأنفاق العملاقة (TBM)',
    quarter: 'Q4',
    monthRangeEn: 'October',
    monthRangeAr: 'أكتوبر',
    track: 'tbm',
    targetAudienceEn: 'TBM Project Engineers, Tunnel Technicians & Operators',
    targetAudienceAr: 'مهندسو وفنيو ومشغلو مشاريع حفر الأنفاق والمترو',
    durationDays: 3,
    totalHours: 21,
    descriptionEn: 'Comprehensive overview of Earth Pressure Balance (EPB) and Slurry TBMs: cutterhead, shield, segment erector, screw conveyor, backup gantries, and thrust cylinders.',
    descriptionAr: 'نظرة شاملة على ماكينات حفر الأنفاق EPB والـ Slurry: رأس الحفر، الدرع الحامي، مركب الخرسانة، البريمة، والقاطرات الخلفية.',
    topics: [
      { en: 'Earth Pressure Balance (EPB) vs. Slurry shield technologies', ar: 'مقارنة بين تقنيات موازنة الضغط الأرضي وماكينات الطين السائل' },
      { en: 'TBM main drive assembly, seals & lubrication systems', ar: 'منظومة المحرك الرئيسي ورولمان البلي العملاق وحلقات الإحكام' },
      { en: 'Thrust cylinder hydraulic systems & steering principles', ar: 'هيدروليك بساتم الدفع وتوجيه مسار الماكينة تحت الأرض' },
      { en: 'Segment erector mechanical, vacuum & hydraulic operations', ar: 'تشغيل مركب قطاعات الخرسانة (Segment Erector) بنظام الفاكيوم' }
    ],
    venueEn: 'Metro Line 4 Project Site / Katamia Training Center',
    venueAr: 'موقع مشروع الخط الرابع للمترو / مركز تدريب القطامية'
  },
  {
    id: 'oed_course_14',
    code: 'OED-TBM-102',
    titleEn: '02. TBM Cutterhead',
    titleAr: 'هندسة وفحص رأس الحفر وسكاكين القطع لماكينات TBM',
    quarter: 'Q4',
    monthRangeEn: 'October - November',
    monthRangeAr: 'أكتوبر - نوفمبر',
    track: 'tbm',
    targetAudienceEn: 'TBM Mechanical Engineers & Cutterhead Inspectors',
    targetAudienceAr: 'مهندسو ميكانيكا وفاحصو سكاكين ودوار حفر الأنفاق',
    durationDays: 3,
    totalHours: 21,
    descriptionEn: 'Disc cutters, ripper teeth, scrapers, bucket tools, foam injection nozzles, hyperbaric interventions, and wear monitoring on massive TBM cutterheads.',
    descriptionAr: 'السكاكين القرصية، أسنان التفتيت، كاشطات التربة، فتحات حقن الفوم، وإجراءات الدخول في غرف الضغط المرتفع (Hyperbaric).',
    topics: [
      { en: 'Disc cutter bearing pre-load & rotational resistance checks', ar: 'فحص مسبق لتحميل رولمان بلي السكاكين ومقاومة الدوران' },
      { en: 'Ripper & scraper carbide tip wear profiling', ar: 'متابعة تآكل قمم الكربيد المقاومة للاحتكاك في السكاكين' },
      { en: 'Foam & polymer injection port cleaning and non-return valves', ar: 'صيانة خطوط حقن البوليمر والفوم وصمامات عدم الرجوع' },
      { en: 'Hyperbaric cutterhead chamber safety & lock-in protocols', ar: 'إجراءات السلامة للدخول لغرفة الحفر تحت الضغط الجوي المرتفع' }
    ],
    venueEn: 'Tunneling Equipment Overhaul Yard',
    venueAr: 'ساحة صيانة وتجهيز معدات الأنفاق المركزية'
  },
  {
    id: 'oed_course_15',
    code: 'OED-TBM-103',
    titleEn: '03. TBM Hydraulic & Fluid Systems',
    titleAr: 'أنظمة الهيدروليك والموائع لماكينات حفر الأنفاق TBM',
    quarter: 'Q4',
    monthRangeEn: 'November',
    monthRangeAr: 'نوفمبر',
    track: 'tbm',
    targetAudienceEn: 'TBM Hydraulic Engineers & Specialists',
    targetAudienceAr: 'مهندسو وأخصائيو هيدروليك ماكينات حفر الأنفاق',
    durationDays: 4,
    totalHours: 28,
    descriptionEn: 'Deep-dive into main drive hydraulic motors, high-flow proportional valves, screw conveyor drives, grout injection pumps, and water-glycol fire-resistant fluids.',
    descriptionAr: 'دراسة متعمقة لهيدروليك المحرك الرئيسي، صمامات التناسب عالية التدفق، هيدروليك بريمة استخراج نواتج الحفر، وسوائل الهيدروليك المقاومة للحريق.',
    topics: [
      { en: 'Multi-motor main drive synchronization & displacement control', ar: 'تزامن مواتير الهيدروليك المتعددة لمحرك الحفر الرئيسي' },
      { en: 'Screw conveyor variable speed hydraulic drive & emergency gate', ar: 'التحكم الهيدروليكي في سرعة البريمة وبوابة الطوارئ' },
      { en: 'Tail void two-component grout injection system maintenance', ar: 'صيانة منظومة حقن مادة الحقن الثنائية (Grout A+B)' },
      { en: 'Water-glycol (HFC) fluid maintenance & contamination control', ar: 'إدارة وفحص سوائل الهيدروليك المائية المقاومة للاشتعال' }
    ],
    venueEn: 'Tunneling Specialized Maintenance Center',
    venueAr: 'مركز صيانة معدات الأنفاق المتخصص'
  },
  {
    id: 'oed_course_16',
    code: 'OED-MSV-101',
    titleEn: '04. MSV DCY30E Multi-Service Vehicle',
    titleAr: 'معدات نقل قطاعات الأنفاق متعددة الخدمات (MSV DCY30E)',
    quarter: 'Q4',
    monthRangeEn: 'November - December',
    monthRangeAr: 'نوفمبر - ديسمبر',
    track: 'heavy_machinery',
    targetAudienceEn: 'Tunnel Fleet Engineers, Technicians & Certified Operators',
    targetAudienceAr: 'مهندسو وفنيو وسائقو معدات النقل داخل أنفاق المترو',
    durationDays: 3,
    totalHours: 21,
    descriptionEn: 'Operational principles and maintenance of rubber-tired multi-service tunnel vehicles (MSV): all-wheel hydrostatic steering, crab steering, fail-safe braking, and heavy segment transport.',
    descriptionAr: 'تشغيل وصيانة عربات النقل متعددة المهام داخل الأنفاق: التوجيه الهيدروستاتيكي لجميع العجلات، التوجيه العرضي (Crab)، ونظام فرامل الأمان التلقائي.',
    topics: [
      { en: 'All-wheel steering modes: 2-wheel, 4-wheel, crab & counter-phase', ar: 'أنماط التوجيه: الثنائي، الرباعي، التوجيه العرضي وتوجيه الدوران في المكان' },
      { en: 'Dual-circuit hydrostatic drive & fail-safe spring-applied brakes', ar: 'دائرة الدفع الهيدروستاتيكي المزدوج وفرامل الأمان بنابض الضغط' },
      { en: 'Heavy segment payload securing & hydraulic clamping mechanisms', ar: 'تأمين حمولة قطاعات الخرسانة وبساتم التثبيت الهيدروليكي' },
      { en: 'Emergency towing protocols inside confined tunnel bore', ar: 'خطة سحب الطوارئ والمناورة داخل القطر الضيق للأنفاق' }
    ],
    venueEn: 'Tunnel Logistics Center & Project Track',
    venueAr: 'مركز الدعم اللوجستي للأنفاق وساحة التدريب'
  },
  {
    id: 'oed_course_17',
    code: 'OED-QAL-201',
    titleEn: 'Technical Inspection & Equipment Audit',
    titleAr: 'الفحص الفني الشامل وتدقيق جاهزية المعدات',
    quarter: 'Q4',
    monthRangeEn: 'December',
    monthRangeAr: 'ديسمبر',
    track: 'quality_sos',
    targetAudienceEn: 'QA/QC Engineers, Fleet Auditors & Chief Inspectors',
    targetAudienceAr: 'مهندسو الجودة والرقابة الفنية وكبار مفتشي المعدات',
    durationDays: 3,
    totalHours: 21,
    descriptionEn: 'Standardized Orascom equipment inspection protocols (OED-STD): structural crack inspection, cylinder drift testing, hydraulic cycle times benchmarking, and safety system validation.',
    descriptionAr: 'المعايير المعتمدة لشركة أوراسكوم للفحص الفني: فحص الشروخ الهيكلية، قياس هبوط البساتم (Drift)، زمن الدورات الهيدروليكية، وأجهزة الأمان.',
    topics: [
      { en: 'Standardized walkaround & structural NDT inspection points', ar: 'نقاط الفحص الهيكلي الظاهري واختبارات اللحام غير الإتلافية' },
      { en: 'Hydraulic cycle times measurement against OEM benchmark', ar: 'قياس أزمنة الحركات الهيدروليكية ومقارنتها بمعايير المصنع الأصلية' },
      { en: 'Cylinder internal bypass & drift test verification', ar: 'اختبار تهريب الزيت الداخلي في البساتم ومعدل الهبوط المسموح' },
      { en: 'Safety shutdown valves, emergency stops & fire suppression checks', ar: 'اختبار صمامات إيقاف الطوارئ وأجهزة الإطفاء الذاتي' }
    ],
    venueEn: 'Katamia Inspection Bay & Fleet Dispatch Yard',
    venueAr: 'عنبر الفحص الفني وساحة الإفراج الفني بالقطامية'
  },
  {
    id: 'oed_course_18',
    code: 'OED-LES-101',
    titleEn: 'Maintenance & Repair Lessons Learned',
    titleAr: 'الدروس المستفادة في الصيانة والإصلاح الميداني',
    quarter: 'Q4',
    monthRangeEn: 'December',
    monthRangeAr: 'ديسمبر',
    track: 'quality_sos',
    targetAudienceEn: 'All Site Engineers, Section Heads & Senior Technicians',
    targetAudienceAr: 'كافة مهندسي المواقع ورؤساء الأقسام وكبار الفنيين',
    durationDays: 2,
    totalHours: 14,
    descriptionEn: 'Annual review of real catastrophic equipment failure case studies from 2024-2026, root cause analysis (RCA), corrective actions implemented, and preventive standard operating procedures.',
    descriptionAr: 'مراجعة سنوية تفصيلية لدراسات حالة لأعطال جسيمة حقيقية من مواقع العمل، تحليل الأسباب الجذرية (RCA)، والإجراءات الوقائية المقررة.',
    topics: [
      { en: 'Real catastrophic failures RCA (Engines, Hydraulics, Booms)', ar: 'تحليل أسباب حوادث وأعطال المحركات والهيدروليك والبومات' },
      { en: 'Common human errors in torquing, filtration & oil change', ar: 'الأخطاء الشائعة في عزوم الربط، الفلاتر والخلط في الزيوت' },
      { en: 'Winter/Summer extreme weather operating precautions', ar: 'احتياطات تشغيل الأساطيل في درجات الحرارة المرتفعة والمواقع الصحراوية' },
      { en: 'Annual updates to OED Standard Operating Procedures (SOP)', ar: 'تحديثات أدلة التشغيل القياسية لإدارة المعدات (SOP)' }
    ],
    venueEn: 'Orascom Central Auditorium & Virtual Broadcast',
    venueAr: 'قاعة المؤتمرات الرئيسية لشركة أوراسكوم والبث المرئي'
  }
];

export const AnnualTrainingPlanPage: React.FC = () => {
  const { language, courses, upcomingSessions, user, setCurrentView } = useAppContext();
  const isAdmin = user?.role === 'admin';
  const isAr = language === 'ar';

  const [selectedQuarter, setSelectedQuarter] = useState<'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('ALL');
  const [selectedTrack, setSelectedTrack] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'roadmap' | 'matrix' | 'table'>('roadmap');
  const [selectedCourseModal, setSelectedCourseModal] = useState<AnnualPlanCourse | null>(null);

  // Filtered annual plan courses
  const filteredPlanCourses = useMemo(() => {
    return OFFICIAL_ANNUAL_PLAN.filter(c => {
      // Quarter filter
      if (selectedQuarter !== 'ALL' && c.quarter !== selectedQuarter) return false;
      // Track filter
      if (selectedTrack !== 'ALL' && c.track !== selectedTrack) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = c.titleEn.toLowerCase().includes(q) || c.titleAr.toLowerCase().includes(q);
        const matchCode = c.code.toLowerCase().includes(q);
        const matchAudience = c.targetAudienceEn.toLowerCase().includes(q) || c.targetAudienceAr.toLowerCase().includes(q);
        const matchTopics = c.topics.some(t => t.en.toLowerCase().includes(q) || t.ar.toLowerCase().includes(q));
        if (!matchTitle && !matchCode && !matchAudience && !matchTopics) return false;
      }
      return true;
    });
  }, [selectedQuarter, selectedTrack, searchQuery]);

  // Statistics & KPIs
  const totalPrograms = OFFICIAL_ANNUAL_PLAN.length;
  const totalHoursAnnual = OFFICIAL_ANNUAL_PLAN.reduce((acc, c) => acc + c.totalHours, 0);
  const totalDaysAnnual = OFFICIAL_ANNUAL_PLAN.reduce((acc, c) => acc + c.durationDays, 0);

  // Grouped by quarter for roadmap
  const q1Courses = useMemo(() => OFFICIAL_ANNUAL_PLAN.filter(c => c.quarter === 'Q1'), []);
  const q2Courses = useMemo(() => OFFICIAL_ANNUAL_PLAN.filter(c => c.quarter === 'Q2'), []);
  const q3Courses = useMemo(() => OFFICIAL_ANNUAL_PLAN.filter(c => c.quarter === 'Q3'), []);
  const q4Courses = useMemo(() => OFFICIAL_ANNUAL_PLAN.filter(c => c.quarter === 'Q4'), []);

  // Check if live upcoming session exists for a given course title
  const getLiveSessionsForCourse = (titleEn: string, titleAr: string) => {
    return upcomingSessions.filter(s => {
      const sTitle = (s.courseTitle || '').toLowerCase();
      return sTitle.includes(titleEn.toLowerCase()) || (titleAr && sTitle.includes(titleAr.toLowerCase()));
    });
  };

  const getTrackBadge = (track: AnnualPlanCourse['track']) => {
    switch (track) {
      case 'mechanical':
        return { label: isAr ? 'المسار الميكانيكي' : 'Mechanical Track', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30', icon: Wrench };
      case 'hydraulic':
        return { label: isAr ? 'الهيدروليك والقوى' : 'Hydraulics Track', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30', icon: Flame };
      case 'electrical':
        return { label: isAr ? 'الكهرباء والإلكترونيات' : 'Electrical Track', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30', icon: Zap };
      case 'heavy_machinery':
        return { label: isAr ? 'المعدات الثقيلة' : 'Heavy Fleet Track', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30', icon: HardHat };
      case 'tbm':
        return { label: isAr ? 'حفر الأنفاق TBM' : 'Tunneling TBM Track', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30', icon: Compass };
      case 'quality_sos':
      default:
        return { label: isAr ? 'الجودة وفحص الزيوت S.O.S' : 'Diagnostics & S.O.S', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30', icon: ShieldCheck };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#001f42] via-[#002D62] to-[#001833] text-white p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#FFC000]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFC000]/20 text-[#FFC000] border border-[#FFC000]/40 text-xs font-black tracking-wide">
              <Sparkles size={13} />
              <span>{isAr ? 'الخطة التدريبية المعتمدة رسمياً لعام 2026' : 'Official Certified 2026 Annual Training Plan'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <CalendarRange className="text-[#FFC000] shrink-0" size={36} />
              <span>{isAr ? 'خطة التدريب السنوية - إدارة المعدات' : 'Annual Training Plan - Equipment Dept (OED)'}</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              {isAr 
                ? 'البرنامج الفني التخصصي المتكامل لتأهيل الكوادر الهندسية والفنية ومشغلي أساطيل شركة أوراسكوم للإنشاءات، وفق أعلى معايير الصانع الأصلي (OEM) والسلامة المهنية.'
                : 'Comprehensive technical program for developing engineering cadres, workshop technicians, and heavy equipment operators across Orascom Construction projects.'}
            </p>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-white/20 backdrop-blur-md transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
              title={isAr ? 'طباعة تقرير الخطة السنوية' : 'Print Annual Plan'}
            >
              <Printer size={16} className="text-[#FFC000]" />
              <span>{isAr ? 'طباعة الخطة' : 'Print Plan'}</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setCurrentView('tools_parent')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFC000] via-yellow-400 to-[#FFC000] text-[#001D42] font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <PlusCircle size={16} />
                <span>{isAr ? 'جدولة جلسة جديدة' : 'Schedule Session'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Executive KPI Stats Bar */}
        <div className="mt-8 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
            <div className="flex items-center gap-2 text-[#FFC000] mb-1">
              <Award size={18} />
              <span className="text-xs font-semibold text-slate-300">{isAr ? 'البرامج المعتمدة' : 'Certified Courses'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">{totalPrograms} {isAr ? 'برنامجاً' : 'Courses'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'موزعة على 4 فصول' : 'Across 4 Quarters'}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Clock size={18} />
              <span className="text-xs font-semibold text-slate-300">{isAr ? 'ساعات التدريب' : 'Training Hours'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">{totalHoursAnnual} {isAr ? 'ساعة' : 'Hours'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{totalDaysAnnual} {isAr ? 'أيام تدريبية' : 'Training Days'}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
            <div className="flex items-center gap-2 text-cyan-400 mb-1">
              <Users size={18} />
              <span className="text-xs font-semibold text-slate-300">{isAr ? 'المتدربون المستهدفون' : 'Target Trainees'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">980+ {isAr ? 'متدرب' : 'Participants'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'مهندسون وفنيون ومشغلون' : 'Engineers & Technicians'}</div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-white/10">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Building2 size={18} />
              <span className="text-xs font-semibold text-slate-300">{isAr ? 'المقرات والورش' : 'Training Venues'}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white">{isAr ? 'ورشة القطامية + المواقع' : 'Katamia & Sites'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{isAr ? 'معامل فنية متخصصة' : 'Specialized Technical Labs'}</div>
          </div>
        </div>
      </div>

      {/* 2. Controls Toolbar: Search, Filters, View Modes */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 print:hidden">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'بحث باسم الدورة، الكود، المحاور أو الفئة المستهدفة...' : 'Search by course title, code, topic or audience...'}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#002D62] dark:focus:ring-[#FFC000] text-slate-900 dark:text-white transition-all"
          />
          {searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Quarter Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {(['ALL', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setSelectedQuarter(q)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedQuarter === q
                  ? 'bg-[#002D62] text-white dark:bg-[#FFC000] dark:text-[#001D42] shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {q === 'ALL' 
                ? (isAr ? 'جميع الفصول' : 'All Quarters')
                : (isAr 
                    ? (q === 'Q1' ? 'الربع 1 (شتاء)' : q === 'Q2' ? 'الربع 2 (ربيع)' : q === 'Q3' ? 'الربع 3 (صيف)' : 'الربع 4 (خريف)')
                    : q)}
            </button>
          ))}
        </div>

        {/* Track Filter Dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={selectedTrack}
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#002D62] cursor-pointer"
          >
            <option value="ALL">{isAr ? 'جميع المسارات الهندسية' : 'All Engineering Tracks'}</option>
            <option value="mechanical">{isAr ? 'المسار الميكانيكي' : 'Mechanical Track'}</option>
            <option value="hydraulic">{isAr ? 'الهيدروليك والقوى' : 'Hydraulics Track'}</option>
            <option value="electrical">{isAr ? 'الكهرباء والإلكترونيات' : 'Electrical Track'}</option>
            <option value="heavy_machinery">{isAr ? 'المعدات الثقيلة والأسطول' : 'Heavy Fleet Track'}</option>
            <option value="tbm">{isAr ? 'حفر الأنفاق TBM' : 'Tunneling TBM'}</option>
            <option value="quality_sos">{isAr ? 'الجودة وفحص الزيوت S.O.S' : 'Quality & Diagnostics'}</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('roadmap')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'roadmap'
                  ? 'bg-white dark:bg-slate-800 text-[#002D62] dark:text-[#FFC000] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isAr ? 'عرض خريطة الأرباع السنوية' : 'Roadmap View'}
            >
              <CalendarRange size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-800 text-[#002D62] dark:text-[#FFC000] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isAr ? 'عرض مصفوفة التخصصات' : 'Matrix View'}
            >
              <Layers size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-[#002D62] dark:text-[#FFC000] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={isAr ? 'عرض الجدول المفصل' : 'Table View'}
            >
              <BookOpen size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Content Views */}

      {/* VIEW A: Quarterly Roadmap View */}
      {viewMode === 'roadmap' && (
        <div className="space-y-8">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as const)
            .filter(q => selectedQuarter === 'ALL' || selectedQuarter === q)
            .map((quarter) => {
              const quarterCourses = OFFICIAL_ANNUAL_PLAN.filter(c => {
                if (c.quarter !== quarter) return false;
                if (selectedTrack !== 'ALL' && c.track !== selectedTrack) return false;
                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase();
                  return c.titleEn.toLowerCase().includes(q) || c.titleAr.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
                }
                return true;
              });

              const quarterMeta = {
                Q1: {
                  titleEn: 'Quarter 1: Foundational Systems & Diagnostics',
                  titleAr: 'الربع الأول: الأنظمة التأسيسية والفحص الوقائي (S.O.S)',
                  periodEn: 'January - March 2026',
                  periodAr: 'يناير - مارس 2026',
                  color: 'from-blue-600 to-indigo-700',
                  accentBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
                },
                Q2: {
                  titleEn: 'Quarter 2: Heavy Fleet, Advanced Hydraulics & Power Train',
                  titleAr: 'الربع الثاني: أساطيل المعدات الثقيلة، الهيدروليك المتقدم ومجموعات القوى',
                  periodEn: 'April - June 2026',
                  periodAr: 'أبريل - يونيو 2026',
                  color: 'from-amber-600 to-orange-700',
                  accentBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30'
                },
                Q3: {
                  titleEn: 'Quarter 3: Electrical, Electronic Engines & Power Gen',
                  titleAr: 'الربع الثالث: الكهرباء، المحركات الإلكترونية ومولدات الطاقة',
                  periodEn: 'July - September 2026',
                  periodAr: 'يوليو - سبتمبر 2026',
                  color: 'from-emerald-600 to-teal-700',
                  accentBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                },
                Q4: {
                  titleEn: 'Quarter 4: Tunnel Boring (TBM), Specialized Fleet & Audits',
                  titleAr: 'الربع الرابع: ماكينات حفر الأنفاق العملاقة (TBM)، المعدات الخاصة والدروس المستفادة',
                  periodEn: 'October - December 2026',
                  periodAr: 'أكتوبر - ديسمبر 2026',
                  color: 'from-purple-600 to-rose-700',
                  accentBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                }
              }[quarter];

              return (
                <div key={quarter} className="space-y-4">
                  {/* Quarter Header Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b-2 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-[#002D62] text-white dark:bg-[#FFC000] dark:text-[#001D42] text-sm font-black shadow-xs">
                        {quarter}
                      </span>
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {isAr ? quarterMeta.titleAr : quarterMeta.titleEn}
                      </h2>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                      📅 {isAr ? quarterMeta.periodAr : quarterMeta.periodEn} ({quarterCourses.length} {isAr ? 'برامج' : 'Courses'})
                    </span>
                  </div>

                  {quarterCourses.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
                      {isAr ? 'لا توجد برامج مطابقة لخيارات الفلترة في هذا الربع' : 'No courses matching current filters in this quarter'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {quarterCourses.map((course) => {
                        const trackInfo = getTrackBadge(course.track);
                        const TrackIcon = trackInfo.icon;
                        const liveSessions = getLiveSessionsForCourse(course.titleEn, course.titleAr);
                        const hasLiveSessions = liveSessions.length > 0;

                        return (
                          <motion.div
                            key={course.id}
                            whileHover={{ y: -3 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setSelectedCourseModal(course)}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between cursor-pointer group transition-all relative overflow-hidden"
                          >
                            {/* Top row: Code + Track badge */}
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono font-black text-[#002D62] dark:text-[#FFC000] bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                                  {course.code}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${trackInfo.color}`}>
                                  <TrackIcon size={11} />
                                  <span>{trackInfo.label}</span>
                                </span>
                              </div>

                              {/* Course Title */}
                              <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#002D62] dark:group-hover:text-[#FFC000] transition-colors leading-snug">
                                  {isAr ? course.titleAr : course.titleEn}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                  {isAr ? course.descriptionAr : course.descriptionEn}
                                </p>
                              </div>

                              {/* Meta Strip: Duration, Audience, Hours */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1.5">
                                  <Clock size={13} className="text-[#FFC000] shrink-0" />
                                  <span>{course.durationDays} {isAr ? 'أيام' : 'Days'} ({course.totalHours}h)</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Users size={13} className="text-emerald-500 shrink-0" />
                                  <span className="truncate">{isAr ? course.targetAudienceAr : course.targetAudienceEn}</span>
                                </div>
                              </div>
                            </div>

                            {/* Bottom row: Live Sessions indicator & View Details */}
                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                              {hasLiveSessions ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/30 animate-pulse">
                                  <CheckCircle2 size={12} />
                                  <span>{liveSessions.length} {isAr ? 'جلسات مجدولة' : 'Sessions Active'}</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  📅 {isAr ? course.monthRangeAr : course.monthRangeEn}
                                </span>
                              )}

                              <div className="text-xs font-bold text-[#002D62] dark:text-[#FFC000] flex items-center gap-1 group-hover:underline">
                                <span>{isAr ? 'تفاصيل المنهج' : 'Syllabus'}</span>
                                {isAr ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* VIEW B: Technical Matrix View */}
      {viewMode === 'matrix' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['mechanical', 'hydraulic', 'electrical', 'heavy_machinery', 'tbm', 'quality_sos'] as const).map((trackKey) => {
            const trackCourses = OFFICIAL_ANNUAL_PLAN.filter(c => c.track === trackKey);
            const trackInfo = getTrackBadge(trackKey);
            const TrackIcon = trackInfo.icon;

            return (
              <div 
                key={trackKey}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${trackInfo.color}`}>
                      <TrackIcon size={18} />
                    </div>
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">{trackInfo.label}</h3>
                      <span className="text-[11px] text-slate-400">{trackCourses.length} {isAr ? 'برامج تدريبية معتمدة' : 'Certified Courses'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {trackCourses.map(course => (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourseModal(course)}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border border-slate-200/60 dark:border-slate-700/50 cursor-pointer transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-mono font-bold text-slate-500">{course.code}</span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {course.quarter}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {isAr ? course.titleAr : course.titleEn}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                        <span>⏱️ {course.durationDays} {isAr ? 'أيام' : 'Days'}</span>
                        <span className="text-[#002D62] dark:text-[#FFC000] font-semibold">{isAr ? 'عرض' : 'View'} →</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW C: Executive Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 select-none">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'الكود' : 'Code'}</th>
                  <th className="py-3 px-4">{isAr ? 'اسم الدورة التدريبية' : 'Course Title'}</th>
                  <th className="py-3 px-4">{isAr ? 'الفصل' : 'Quarter'}</th>
                  <th className="py-3 px-4">{isAr ? 'المسار الفني' : 'Technical Track'}</th>
                  <th className="py-3 px-4">{isAr ? 'المدة / الساعات' : 'Duration / Hours'}</th>
                  <th className="py-3 px-4">{isAr ? 'الفئة المستهدفة' : 'Target Audience'}</th>
                  <th className="py-3 px-4">{isAr ? 'المقر المعتمد' : 'Venue'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPlanCourses.map((course) => {
                  const trackInfo = getTrackBadge(course.track);
                  const TrackIcon = trackInfo.icon;

                  return (
                    <tr 
                      key={course.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedCourseModal(course)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#002D62] dark:text-[#FFC000]">
                        {course.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {isAr ? course.titleAr : course.titleEn}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isAr ? course.titleEn : course.titleAr}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 font-black text-slate-700 dark:text-slate-200">
                          {course.quarter}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${trackInfo.color}`}>
                          <TrackIcon size={11} />
                          <span>{trackInfo.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {course.durationDays} {isAr ? 'أيام' : 'Days'} ({course.totalHours}h)
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {isAr ? course.targetAudienceAr : course.targetAudienceEn}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {isAr ? course.venueAr : course.venueEn}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCourseModal(course);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#002D62] dark:bg-[#FFC000] text-white dark:text-[#001D42] font-bold text-[11px] hover:scale-105 transition-all"
                        >
                          {isAr ? 'تفاصيل' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Course Detail Modal */}
      <AnimatePresence>
        {selectedCourseModal && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-700 relative my-8"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedCourseModal(null)}
                className="absolute top-5 right-5 rtl:right-auto rtl:left-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>

              {/* Modal Header */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-[#002D62] dark:text-[#FFC000] bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-900">
                    {selectedCourseModal.code}
                  </span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-[#002D62] text-white dark:bg-[#FFC000] dark:text-[#001D42]">
                    {selectedCourseModal.quarter} ({isAr ? selectedCourseModal.monthRangeAr : selectedCourseModal.monthRangeEn})
                  </span>
                  {(() => {
                    const track = getTrackBadge(selectedCourseModal.track);
                    const Icon = track.icon;
                    return (
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${track.color}`}>
                        <Icon size={12} />
                        <span>{track.label}</span>
                      </span>
                    );
                  })()}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                  {isAr ? selectedCourseModal.titleAr : selectedCourseModal.titleEn}
                </h2>
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {isAr ? selectedCourseModal.titleEn : selectedCourseModal.titleAr}
                </div>
              </div>

              {/* Quick Info Grid */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'مدة التدريب' : 'Duration'}</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {selectedCourseModal.durationDays} {isAr ? 'أيام' : 'Days'} ({selectedCourseModal.totalHours}h)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'الفئة المستهدفة' : 'Target'}</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {isAr ? selectedCourseModal.targetAudienceAr : selectedCourseModal.targetAudienceEn}
                  </strong>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block mb-0.5">{isAr ? 'المقر المعتمد' : 'Venue'}</span>
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {isAr ? selectedCourseModal.venueAr : selectedCourseModal.venueEn}
                  </strong>
                </div>
              </div>

              {/* Description */}
              <div className="mt-5 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isAr ? 'نبذة عن البرنامج التدريبي' : 'Course Overview'}
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {isAr ? selectedCourseModal.descriptionAr : selectedCourseModal.descriptionEn}
                </p>
              </div>

              {/* Topics Covered */}
              <div className="mt-5 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {isAr ? 'المحاور الفنية والموضوعات المقررة' : 'Modules & Topics Covered'}
                </h4>
                <ul className="space-y-2">
                  {selectedCourseModal.topics.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <span>{isAr ? t.ar : t.en}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Live Scheduled Sessions Info (if any) */}
              {(() => {
                const live = getLiveSessionsForCourse(selectedCourseModal.titleEn, selectedCourseModal.titleAr);
                if (live.length === 0) return null;
                return (
                  <div className="mt-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                      <CalendarDays size={16} />
                      <span>{isAr ? 'توجد جلسات تدريبية نشطة ومجدولة لهذه الدورة حالياً:' : 'Active Scheduled Sessions in Progress:'}</span>
                    </div>
                    <div className="space-y-1.5">
                      {live.map(s => (
                        <div key={s.id} className="text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between">
                          <span>📍 {s.venue || s.location} ({s.sessionDate || s.startDate})</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{s.status || 'Active'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCourseModal(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourseModal(null);
                      setCurrentView('tools_parent');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#002D62] to-[#001833] text-white hover:from-[#001833] hover:to-[#002D62] font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <PlusCircle size={15} className="text-[#FFC000]" />
                    <span>{isAr ? 'جدولة جلسة تدريب لهذه الدورة' : 'Schedule Session for Course'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCourseModal(null);
                      setCurrentView('suggestions');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#002D62] text-white hover:bg-blue-950 font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <span>{isAr ? 'طلب التسجيل أو اقتراح موعد' : 'Request Enrollment / Suggest Date'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
