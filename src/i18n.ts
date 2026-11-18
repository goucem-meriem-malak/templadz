export type Lang = 'en' | 'fr' | 'ar';
const RAW = `
mFile|File|Fichier|ملف
mEdit|Edit|Édition|تحرير
mView|View|Affichage|عرض
mInsert|Insert|Insertion|إدراج
mFormat|Format|Format|تنسيق
mTools|Tools|Outils|أدوات
mHelp|Help|Aide|مساعدة
new|New|Nouveau|جديد
open|Open template|Ouvrir un modèle|فتح قالب
save|Save master template|Enregistrer le modèle|حفظ القالب الرئيسي
pdf|Export PDF|Exporter en PDF|تصدير PDF
docx|Export DOCX|Exporter en DOCX|تصدير DOCX
share|Share .tpz by email|Partager .tpz par e-mail|مشاركة .tpz عبر البريد
print|Print|Imprimer|طباعة
undo|Undo|Annuler|تراجع
redo|Redo|Rétablir|إعادة
cut|Cut|Couper|قص
copy|Copy|Copier|نسخ
paste|Paste|Coller|لصق
find|Find|Rechercher|بحث
replace|Find & replace|Rechercher et remplacer|بحث واستبدال
selectAll|Select all|Tout sélectionner|تحديد الكل
printLayout|Print layout|Mode page|تخطيط الطباعة
readMode|Read mode|Mode lecture|وضع القراءة
webLayout|Web layout|Mode web|تخطيط الويب
ruler|Ruler & page margins|Règle et marges|المسطرة والهوامش
theme|Dark / light mode|Mode sombre / clair|الوضع الداكن / الفاتح
focus|Focus mode|Mode concentration|وضع التركيز
field|Variable field|Champ variable|حقل متغير
table|Table…|Tableau…|جدول…
addRow|Add row|Ajouter une ligne|إضافة صف
delRow|Delete row|Supprimer la ligne|حذف الصف
addCol|Add column|Ajouter une colonne|إضافة عمود
delCol|Delete column|Supprimer la colonne|حذف العمود
delTable|Delete table|Supprimer le tableau|حذف الجدول
image|Image…|Image…|صورة…
hr|Horizontal line|Ligne horizontale|خط أفقي
pageBreak|Page break|Saut de page|فاصل صفحة
headerFooter|Header & footer…|En-tête et pied de page…|الرأس والتذييل…
date|Date|Date|التاريخ
pageNum|Page number|Numéro de page|رقم الصفحة
bold|Bold|Gras|غامق
italic|Italic|Italique|مائل
underline|Underline|Souligné|تسطير
strike|Strikethrough|Barré|يتوسطه خط
clear|Clear formatting|Effacer la mise en forme|مسح التنسيق
ltr|Left-to-right|Gauche à droite|من اليسار إلى اليمين
rtl|Right-to-left|Droite à gauche|من اليمين إلى اليسار
bullets|Bulleted list|Liste à puces|قائمة نقطية
numbered|Numbered list|Liste numérotée|قائمة رقمية
aLeft|Align left|Aligner à gauche|محاذاة لليسار
aCenter|Center|Centrer|توسيط
aRight|Align right|Aligner à droite|محاذاة لليمين
aJustify|Justify|Justifier|ضبط
lineSp|Line spacing|Interligne|تباعد الأسطر
font|Font|Police|الخط
size|Size|Taille|الحجم
color|Text color|Couleur du texte|لون النص
highlight|Highlight|Surlignage|تمييز
quickFill|Quick-fill form|Remplissage rapide|تعبئة سريعة
wordCount|Word count|Nombre de mots|عدد الكلمات
language|Language|Langue|اللغة
editor|Back to editor|Retour à l'éditeur|العودة إلى المحرر
shortcuts|Keyboard shortcuts|Raccourcis clavier|اختصارات لوحة المفاتيح
about|About|À propos|حول
fieldsT|Fields|Champs|الحقول
batchT|Quick batch|Lot rapide|دفعة سريعة
batchHint|fname[ali; sara] bday[21/11/2001]|fname[ali; sara] bday[21/11/2001]|fname[ali; sara] bday[21/11/2001]
csv|Import CSV|Importer un CSV|استيراد CSV
csvRows|CSV rows:|Lignes CSV :|صفوف CSV:
clearCsv|Clear|Retirer|إزالة
rowsN|Copies:|Copies :|النسخ:
noFields|No fields yet. Insert some with Ctrl+Shift+V.|Aucun champ. Insérez-en avec Ctrl+Maj+V.|لا توجد حقول. أدرج حقلاً بـ Ctrl+Shift+V.
saved|Saved|Enregistré|تم الحفظ
done|Files created in|Fichiers créés dans|تم إنشاء الملفات في
errUnknown|Unknown field:|Champ inconnu :|حقل غير معروف:
errLen|Different list lengths:|Longueurs différentes :|أطوال مختلفة:
errSyntax|Unexpected text outside brackets|Texte inattendu hors crochets|نص غير متوقع خارج الأقواس
errMissing|Missing CSV columns:|Colonnes CSV manquantes :|أعمدة ناقصة:
errImg|Image too large (max 5 MB)|Image trop lourde (5 Mo max)|الصورة كبيرة جدًا (5 ميغابايت)
tplName|Template name|Nom du modèle|اسم القالب
fieldName|Field name|Nom du champ|اسم الحقل
rows|Rows|Lignes|الصفوف
cols|Columns|Colonnes|الأعمدة
insert|Insert|Insérer|إدراج
close|Close|Fermer|إغلاق
headerT|Header|En-tête|الرأس
footerT|Footer|Pied de page|التذييل
hfHint|Tokens: {{page}} {{pages}} {{date}}|Jetons : {{page}} {{pages}} {{date}}|الرموز: {{page}} {{pages}} {{date}}
replaceT|Replace with|Remplacer par|استبدال بـ
next|Next|Suivant|التالي
replaceOne|Replace|Remplacer|استبدال
replaceAll|Replace all|Tout remplacer|استبدال الكل
matches|matches|résultats|نتائج
words|words|mots|كلمة
chars|Characters|Caractères|الأحرف
page|Page|Page|صفحة
of|of|sur|من
activate|Activate|Activer|تفعيل
code|License code|Code de licence|رمز الترخيص
invalid|Invalid code|Code invalide|رمز غير صالح
newTpl|New template|Nouveau modèle|قالب جديد
fill|Fill|Remplir|تعبئة
edit|Edit|Modifier|تعديل
del|Delete|Supprimer|حذف
importTpl|Import .tpz|Importer .tpz|استيراد .tpz
empty|No templates yet|Aucun modèle|لا توجد قوالب بعد
library|Templates|Modèles|القوالب
confirmDel|Delete this template?|Supprimer ce modèle ?|حذف هذا القالب؟
untitled|Untitled|Sans titre|بدون عنوان
`;
export const dict: Record<Lang, Record<string, string>> = { en: {}, fr: {}, ar: {} };
RAW.trim().split('\n').forEach((l) => {
  const [k, en, fr, ar] = l.split('|');
  dict.en[k] = en; dict.fr[k] = fr; dict.ar[k] = ar;
});
export const dirOf = (l: Lang) => (l === 'ar' ? 'rtl' : 'ltr');
export const LANG_NAME: Record<Lang, string> = { en: 'English', fr: 'Français', ar: 'العربية' };
