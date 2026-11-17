export type Lang = 'en' | 'fr' | 'ar';
const en = {
  bold: 'Bold', italic: 'Italic', h1: 'Heading', list: 'List', save: 'Save', back: 'Back',
  share: 'Share by email', newTpl: 'New template', fill: 'Fill', edit: 'Edit', del: 'Delete',
  pdf: 'Export PDF', batch: 'Batch from CSV', fieldName: 'Field name', addField: 'Insert field',
  tplName: 'Template name', empty: 'No templates yet', importTpl: 'Import .tpz', code: 'License code',
  activate: 'Activate', invalid: 'Invalid code', expired: 'License expired', saved: 'Saved',
  csvEmpty: 'The CSV has no data rows', missing: 'Missing CSV columns:', done: 'PDFs created in',
  library: 'Templates', activateTitle: 'Activate', validUntil: 'Valid until', noFields: 'This template has no fields yet',
  confirmDel: 'Delete this template?', noKey: 'This build has no license key (run: npm run keys)',
};
export const dict: Record<Lang, Record<keyof typeof en, string>> = {
  en,
  fr: {
    bold: 'Gras', italic: 'Italique', h1: 'Titre', list: 'Liste', save: 'Enregistrer', back: 'Retour',
    share: 'Partager par e-mail', newTpl: 'Nouveau modèle', fill: 'Remplir', edit: 'Modifier', del: 'Supprimer',
    pdf: 'Exporter en PDF', batch: 'Lot depuis CSV', fieldName: 'Nom du champ', addField: 'Insérer le champ',
    tplName: 'Nom du modèle', empty: 'Aucun modèle', importTpl: 'Importer .tpz', code: 'Code de licence',
    activate: 'Activer', invalid: 'Code invalide', expired: 'Licence expirée', saved: 'Enregistré',
    csvEmpty: 'Le CSV ne contient aucune ligne', missing: 'Colonnes CSV manquantes :', done: 'PDF créés dans',
    library: 'Modèles', activateTitle: 'Activer', validUntil: "Valide jusqu'au", noFields: "Ce modèle n'a pas encore de champs",
    confirmDel: 'Supprimer ce modèle ?', noKey: "Cette version n'a pas de clé de licence (npm run keys)",
  },
  ar: {
    bold: 'غامق', italic: 'مائل', h1: 'عنوان', list: 'قائمة', save: 'حفظ', back: 'رجوع',
    share: 'مشاركة عبر البريد', newTpl: 'قالب جديد', fill: 'تعبئة', edit: 'تعديل', del: 'حذف',
    pdf: 'تصدير PDF', batch: 'دفعة من CSV', fieldName: 'اسم الحقل', addField: 'إدراج حقل',
    tplName: 'اسم القالب', empty: 'لا توجد قوالب بعد', importTpl: 'استيراد .tpz', code: 'رمز الترخيص',
    activate: 'تفعيل', invalid: 'رمز غير صالح', expired: 'انتهى الترخيص', saved: 'تم الحفظ',
    csvEmpty: 'ملف CSV لا يحتوي على بيانات', missing: 'أعمدة ناقصة:', done: 'تم إنشاء ملفات PDF في',
    library: 'القوالب', activateTitle: 'تفعيل', validUntil: 'صالح حتى', noFields: 'لا يحتوي هذا القالب على حقول بعد',
    confirmDel: 'حذف هذا القالب؟', noKey: 'لا يوجد مفتاح ترخيص في هذا الإصدار (npm run keys)',
  },
};
export const dirOf = (l: Lang) => (l === 'ar' ? 'rtl' : 'ltr');
