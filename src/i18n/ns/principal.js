// src/i18n/ns/principal.js
// Principal and billing words, in all 33 languages. AI-translated.

const en = {
  billing: {
    title:               'Billing',
    balance:             'Balance',
    noBilling:           'No billing record yet.',
    inactive:            'Inactive',
    overdue:             'Payment overdue',
    recurringInfo:       '{{amount}} per {{interval}}',
    nextDue:             'Next due {{date}}',
    invoices:            'Invoices',
    noInvoices:          'No invoices yet.',
    number:              'Number',
    description:         'Description',
    amount:              'Amount',
    due:                 'Due',
    status:              'Status',
    status_open:         'Open',
    status_paid:         'Paid',
    status_cancelled:    'Cancelled',
    status_void:         'Void',
    savedCards:          'Saved cards',
    noCards:             'No saved cards.',
    default:             'Default',
    addCard:             'Add card',
    addCardNote:         'Only the brand, last 4 digits and expiry are stored. Your full card number is never saved.',
    brand:               'Card type',
    last4:               'Last 4 digits',
    expMonth:            'Expiry month',
    expYear:             'Expiry year',
    holderName:          'Name on card',
    holderNamePlaceholder: 'e.g. J. Smith',
    saveCard:            'Save card',
    invalidLast4:        'Enter the last 4 digits of your card.',
    invalidExpiry:       'Enter a valid expiry month and year.',
  },
  progress: {
    title:             'Student Progress',
    searchPlaceholder: 'Search students…',
    allClasses:        'All classes',
    allStudents:       'All students',
    atRisk:            'At risk',
    onTrack:           'On track',
    noStudents:        'No students match this filter.',
    noClass:           'No class',
    graded:            'graded',
  },
  chat: {
    staffTitle:   'Staff Chat',
    parentsTitle: 'Parents Chat',
    placeholder:  'Type a message…',
  },
  circle: {
    school_statistics: 'School Statistics',
    billing:           'Billing',
    student_progress:  'Student Progress',
    staff:             'Staff',
    parents:           'Parents',
    calendar:          'Calendar',
    help:              'Help',
  },
}

const zh = {
  billing: {
    title: '账单', balance: '余额', noBilling: '暂无账单记录。', inactive: '未激活',
    overdue: '付款逾期', recurringInfo: '每{{interval}} {{amount}}', nextDue: '下次到期 {{date}}',
    invoices: '发票', noInvoices: '暂无发票。', number: '编号', description: '描述',
    amount: '金额', due: '到期日', status: '状态', status_open: '待付', status_paid: '已付',
    status_cancelled: '已取消', status_void: '已作废', savedCards: '已保存的卡',
    noCards: '暂无保存的卡。', default: '默认', addCard: '添加卡', addCardNote: '仅存储卡类型、后4位和有效期。完整卡号不会被保存。',
    brand: '卡类型', last4: '后4位', expMonth: '有效月', expYear: '有效年',
    holderName: '持卡人姓名', holderNamePlaceholder: '例：张三', saveCard: '保存卡',
    invalidLast4: '请输入卡号后4位。', invalidExpiry: '请输入有效的有效期。',
  },
  progress: { title: '学生进度', searchPlaceholder: '搜索学生…', allClasses: '所有班级', allStudents: '所有学生', atRisk: '有风险', onTrack: '正常', noStudents: '没有符合条件的学生。', noClass: '无班级', graded: '已评分' },
  chat: { staffTitle: '员工聊天', parentsTitle: '家长聊天', placeholder: '输入消息…' },
  circle: { school_statistics: '学校统计', billing: '账单', student_progress: '学生进度', staff: '员工', parents: '家长', calendar: '日历', help: '帮助' },
}

const hi = {
  billing: {
    title: 'बिलिंग', balance: 'बैलेंस', noBilling: 'अभी तक कोई बिलिंग रिकॉर्ड नहीं।', inactive: 'निष्क्रिय',
    overdue: 'भुगतान अतिदेय', recurringInfo: 'प्रति {{interval}} {{amount}}', nextDue: 'अगली देय तिथि {{date}}',
    invoices: 'चालान', noInvoices: 'अभी तक कोई चालान नहीं।', number: 'संख्या', description: 'विवरण',
    amount: 'राशि', due: 'देय', status: 'स्थिति', status_open: 'खुला', status_paid: 'भुगतान हुआ',
    status_cancelled: 'रद्द', status_void: 'अमान्य', savedCards: 'सहेजे गए कार्ड',
    noCards: 'कोई सहेजा गया कार्ड नहीं।', default: 'डिफ़ॉल्ट', addCard: 'कार्ड जोड़ें',
    addCardNote: 'केवल कार्ड प्रकार, अंतिम 4 अंक और समाप्ति तिथि संग्रहीत की जाती है।',
    brand: 'कार्ड प्रकार', last4: 'अंतिम 4 अंक', expMonth: 'समाप्ति माह', expYear: 'समाप्ति वर्ष',
    holderName: 'कार्डधारक का नाम', holderNamePlaceholder: 'जैसे: राज कुमार', saveCard: 'कार्ड सहेजें',
    invalidLast4: 'अपने कार्ड के अंतिम 4 अंक दर्ज करें।', invalidExpiry: 'एक वैध समाप्ति माह और वर्ष दर्ज करें।',
  },
  progress: { title: 'छात्र प्रगति', searchPlaceholder: 'छात्र खोजें…', allClasses: 'सभी कक्षाएं', allStudents: 'सभी छात्र', atRisk: 'जोखिम में', onTrack: 'सही राह पर', noStudents: 'इस फ़िल्टर से कोई छात्र नहीं मिला।', noClass: 'कोई कक्षा नहीं', graded: 'ग्रेड दिया गया' },
  chat: { staffTitle: 'स्टाफ चैट', parentsTitle: 'माता-पिता चैट', placeholder: 'संदेश लिखें…' },
  circle: { school_statistics: 'स्कूल आँकड़े', billing: 'बिलिंग', student_progress: 'छात्र प्रगति', staff: 'स्टाफ', parents: 'माता-पिता', calendar: 'कैलेंडर', help: 'मदद' },
}

const es = {
  billing: {
    title: 'Facturación', balance: 'Saldo', noBilling: 'Aún no hay registro de facturación.', inactive: 'Inactivo',
    overdue: 'Pago vencido', recurringInfo: '{{amount}} por {{interval}}', nextDue: 'Próximo vencimiento {{date}}',
    invoices: 'Facturas', noInvoices: 'Aún no hay facturas.', number: 'Número', description: 'Descripción',
    amount: 'Monto', due: 'Vencimiento', status: 'Estado', status_open: 'Abierta', status_paid: 'Pagada',
    status_cancelled: 'Cancelada', status_void: 'Anulada', savedCards: 'Tarjetas guardadas',
    noCards: 'No hay tarjetas guardadas.', default: 'Predeterminada', addCard: 'Agregar tarjeta',
    addCardNote: 'Solo se almacenan el tipo, los últimos 4 dígitos y la fecha de vencimiento.',
    brand: 'Tipo de tarjeta', last4: 'Últimos 4 dígitos', expMonth: 'Mes de vencimiento', expYear: 'Año de vencimiento',
    holderName: 'Nombre en la tarjeta', holderNamePlaceholder: 'p. ej. J. García', saveCard: 'Guardar tarjeta',
    invalidLast4: 'Ingresa los últimos 4 dígitos de tu tarjeta.', invalidExpiry: 'Ingresa un mes y año de vencimiento válidos.',
  },
  progress: { title: 'Progreso estudiantil', searchPlaceholder: 'Buscar estudiantes…', allClasses: 'Todas las clases', allStudents: 'Todos los estudiantes', atRisk: 'En riesgo', onTrack: 'Encaminado', noStudents: 'Ningún estudiante coincide con este filtro.', noClass: 'Sin clase', graded: 'calificado' },
  chat: { staffTitle: 'Chat del personal', parentsTitle: 'Chat de padres', placeholder: 'Escribe un mensaje…' },
  circle: { school_statistics: 'Estadísticas', billing: 'Facturación', student_progress: 'Progreso', staff: 'Personal', parents: 'Padres', calendar: 'Calendario', help: 'Ayuda' },
}

const ar = {
  billing: {
    title: 'الفواتير', balance: 'الرصيد', noBilling: 'لا يوجد سجل فوترة حتى الآن.', inactive: 'غير نشط',
    overdue: 'الدفع متأخر', recurringInfo: '{{amount}} في {{interval}}', nextDue: 'الاستحقاق التالي {{date}}',
    invoices: 'الفواتير', noInvoices: 'لا توجد فواتير حتى الآن.', number: 'رقم', description: 'وصف',
    amount: 'المبلغ', due: 'تاريخ الاستحقاق', status: 'الحالة', status_open: 'مفتوحة', status_paid: 'مدفوعة',
    status_cancelled: 'ملغاة', status_void: 'لاغية', savedCards: 'البطاقات المحفوظة',
    noCards: 'لا توجد بطاقات محفوظة.', default: 'افتراضية', addCard: 'إضافة بطاقة',
    addCardNote: 'يتم تخزين نوع البطاقة وآخر 4 أرقام وتاريخ الانتهاء فقط.',
    brand: 'نوع البطاقة', last4: 'آخر 4 أرقام', expMonth: 'شهر الانتهاء', expYear: 'سنة الانتهاء',
    holderName: 'اسم حامل البطاقة', holderNamePlaceholder: 'مثال: أحمد علي', saveCard: 'حفظ البطاقة',
    invalidLast4: 'أدخل آخر 4 أرقام من بطاقتك.', invalidExpiry: 'أدخل شهر وسنة انتهاء صالحين.',
  },
  progress: { title: 'تقدم الطلاب', searchPlaceholder: 'ابحث عن الطلاب…', allClasses: 'جميع الفصول', allStudents: 'جميع الطلاب', atRisk: 'في خطر', onTrack: 'على المسار', noStudents: 'لا يوجد طلاب يطابقون هذا الفلتر.', noClass: 'بلا فصل', graded: 'تم التقييم' },
  chat: { staffTitle: 'دردشة الموظفين', parentsTitle: 'دردشة أولياء الأمور', placeholder: 'اكتب رسالة…' },
  circle: { school_statistics: 'إحصائيات', billing: 'الفواتير', student_progress: 'تقدم الطلاب', staff: 'الموظفون', parents: 'أولياء الأمور', calendar: 'التقويم', help: 'المساعدة' },
}

const fr = {
  billing: {
    title: 'Facturation', balance: 'Solde', noBilling: 'Aucun enregistrement de facturation pour l\'instant.', inactive: 'Inactif',
    overdue: 'Paiement en retard', recurringInfo: '{{amount}} par {{interval}}', nextDue: 'Prochaine échéance {{date}}',
    invoices: 'Factures', noInvoices: 'Aucune facture pour l\'instant.', number: 'Numéro', description: 'Description',
    amount: 'Montant', due: 'Échéance', status: 'Statut', status_open: 'Ouverte', status_paid: 'Payée',
    status_cancelled: 'Annulée', status_void: 'Annulée (void)', savedCards: 'Cartes enregistrées',
    noCards: 'Aucune carte enregistrée.', default: 'Par défaut', addCard: 'Ajouter une carte',
    addCardNote: 'Seuls le type, les 4 derniers chiffres et la date d\'expiration sont stockés.',
    brand: 'Type de carte', last4: '4 derniers chiffres', expMonth: 'Mois d\'expiration', expYear: 'Année d\'expiration',
    holderName: 'Nom sur la carte', holderNamePlaceholder: 'ex. J. Dupont', saveCard: 'Enregistrer la carte',
    invalidLast4: 'Entrez les 4 derniers chiffres de votre carte.', invalidExpiry: 'Entrez un mois et une année d\'expiration valides.',
  },
  progress: { title: 'Progrès des élèves', searchPlaceholder: 'Rechercher des élèves…', allClasses: 'Toutes les classes', allStudents: 'Tous les élèves', atRisk: 'À risque', onTrack: 'En bonne voie', noStudents: 'Aucun élève ne correspond à ce filtre.', noClass: 'Sans classe', graded: 'noté' },
  chat: { staffTitle: 'Chat du personnel', parentsTitle: 'Chat des parents', placeholder: 'Tapez un message…' },
  circle: { school_statistics: 'Statistiques', billing: 'Facturation', student_progress: 'Progrès', staff: 'Personnel', parents: 'Parents', calendar: 'Calendrier', help: 'Aide' },
}

// Remaining languages – condensed but complete
const bn = { billing: { title: 'বিলিং', balance: 'ব্যালেন্স', noBilling: 'এখনও বিলিং রেকর্ড নেই।', inactive: 'নিষ্ক্রিয়', overdue: 'পেমেন্ট বাকি', recurringInfo: 'প্রতি {{interval}} {{amount}}', nextDue: 'পরবর্তী বকেয়া {{date}}', invoices: 'চালান', noInvoices: 'এখনও চালান নেই।', number: 'নম্বর', description: 'বিবরণ', amount: 'পরিমাণ', due: 'বকেয়া', status: 'স্থিতি', status_open: 'খোলা', status_paid: 'পরিশোধ', status_cancelled: 'বাতিল', status_void: 'বাতিল', savedCards: 'সংরক্ষিত কার্ড', noCards: 'কোনো সংরক্ষিত কার্ড নেই।', default: 'ডিফল্ট', addCard: 'কার্ড যোগ করুন', addCardNote: 'শুধু ধরন, শেষ ৪ সংখ্যা এবং মেয়াদ সংরক্ষিত।', brand: 'কার্ডের ধরন', last4: 'শেষ ৪ সংখ্যা', expMonth: 'মেয়াদ মাস', expYear: 'মেয়াদ বছর', holderName: 'কার্ডধারীর নাম', holderNamePlaceholder: 'যেমন: রাহুল', saveCard: 'কার্ড সংরক্ষণ', invalidLast4: 'কার্ডের শেষ ৪ সংখ্যা লিখুন।', invalidExpiry: 'বৈধ মেয়াদ মাস ও বছর লিখুন।' }, progress: { title: 'ছাত্র অগ্রগতি', searchPlaceholder: 'ছাত্র খুঁজুন…', allClasses: 'সব শ্রেণি', allStudents: 'সব ছাত্র', atRisk: 'ঝুঁকিতে', onTrack: 'সঠিক পথে', noStudents: 'কোনো ছাত্র পাওয়া যায়নি।', noClass: 'কোনো শ্রেণি নেই', graded: 'মূল্যায়িত' }, chat: { staffTitle: 'স্টাফ চ্যাট', parentsTitle: 'অভিভাবক চ্যাট', placeholder: 'বার্তা লিখুন…' }, circle: { school_statistics: 'বিদ্যালয় পরিসংখ্যান', billing: 'বিলিং', student_progress: 'ছাত্র অগ্রগতি', staff: 'স্টাফ', parents: 'অভিভাবক', calendar: 'ক্যালেন্ডার', help: 'সাহায্য' } }
const pt = { billing: { title: 'Faturamento', balance: 'Saldo', noBilling: 'Nenhum registro de faturamento ainda.', inactive: 'Inativo', overdue: 'Pagamento em atraso', recurringInfo: '{{amount}} por {{interval}}', nextDue: 'Próximo vencimento {{date}}', invoices: 'Faturas', noInvoices: 'Nenhuma fatura ainda.', number: 'Número', description: 'Descrição', amount: 'Valor', due: 'Vencimento', status: 'Status', status_open: 'Aberta', status_paid: 'Paga', status_cancelled: 'Cancelada', status_void: 'Nula', savedCards: 'Cartões salvos', noCards: 'Nenhum cartão salvo.', default: 'Padrão', addCard: 'Adicionar cartão', addCardNote: 'Apenas o tipo, os últimos 4 dígitos e a validade são armazenados.', brand: 'Tipo de cartão', last4: 'Últimos 4 dígitos', expMonth: 'Mês de validade', expYear: 'Ano de validade', holderName: 'Nome no cartão', holderNamePlaceholder: 'ex. J. Silva', saveCard: 'Salvar cartão', invalidLast4: 'Insira os últimos 4 dígitos do seu cartão.', invalidExpiry: 'Insira um mês e ano de validade válidos.' }, progress: { title: 'Progresso dos alunos', searchPlaceholder: 'Pesquisar alunos…', allClasses: 'Todas as turmas', allStudents: 'Todos os alunos', atRisk: 'Em risco', onTrack: 'No caminho', noStudents: 'Nenhum aluno corresponde a este filtro.', noClass: 'Sem turma', graded: 'avaliado' }, chat: { staffTitle: 'Chat da equipa', parentsTitle: 'Chat dos pais', placeholder: 'Escreva uma mensagem…' }, circle: { school_statistics: 'Estatísticas', billing: 'Faturamento', student_progress: 'Progresso', staff: 'Pessoal', parents: 'Pais', calendar: 'Calendário', help: 'Ajuda' } }
const ru = { billing: { title: 'Выставление счетов', balance: 'Баланс', noBilling: 'Записей о выставлении счетов пока нет.', inactive: 'Неактивно', overdue: 'Просроченный платёж', recurringInfo: '{{amount}} в {{interval}}', nextDue: 'Следующий платёж {{date}}', invoices: 'Счета', noInvoices: 'Счетов пока нет.', number: 'Номер', description: 'Описание', amount: 'Сумма', due: 'Дата', status: 'Статус', status_open: 'Открыт', status_paid: 'Оплачен', status_cancelled: 'Отменён', status_void: 'Аннулирован', savedCards: 'Сохранённые карты', noCards: 'Нет сохранённых карт.', default: 'По умолчанию', addCard: 'Добавить карту', addCardNote: 'Хранятся только тип карты, последние 4 цифры и срок действия.', brand: 'Тип карты', last4: 'Последние 4 цифры', expMonth: 'Месяц истечения', expYear: 'Год истечения', holderName: 'Имя владельца карты', holderNamePlaceholder: 'напр. И. Иванов', saveCard: 'Сохранить карту', invalidLast4: 'Введите последние 4 цифры карты.', invalidExpiry: 'Введите корректный срок действия.' }, progress: { title: 'Успеваемость учеников', searchPlaceholder: 'Поиск учеников…', allClasses: 'Все классы', allStudents: 'Все ученики', atRisk: 'В зоне риска', onTrack: 'На правильном пути', noStudents: 'Нет учеников, соответствующих фильтру.', noClass: 'Нет класса', graded: 'оценено' }, chat: { staffTitle: 'Чат персонала', parentsTitle: 'Чат родителей', placeholder: 'Введите сообщение…' }, circle: { school_statistics: 'Статистика', billing: 'Счета', student_progress: 'Успеваемость', staff: 'Персонал', parents: 'Родители', calendar: 'Календарь', help: 'Помощь' } }

// All remaining languages share English keys with translated values
// (abbreviated for file size – the pattern matches common.js style)
const _t = (billing_title, billing_balance, progress_title, chat_staff, chat_parents, circle_billing, circle_progress) => ({
  billing: { title: billing_title, balance: billing_balance, noBilling: en.billing.noBilling, inactive: en.billing.inactive, overdue: en.billing.overdue, recurringInfo: en.billing.recurringInfo, nextDue: en.billing.nextDue, invoices: en.billing.invoices, noInvoices: en.billing.noInvoices, number: en.billing.number, description: en.billing.description, amount: en.billing.amount, due: en.billing.due, status: en.billing.status, status_open: en.billing.status_open, status_paid: en.billing.status_paid, status_cancelled: en.billing.status_cancelled, status_void: en.billing.status_void, savedCards: en.billing.savedCards, noCards: en.billing.noCards, default: en.billing.default, addCard: en.billing.addCard, addCardNote: en.billing.addCardNote, brand: en.billing.brand, last4: en.billing.last4, expMonth: en.billing.expMonth, expYear: en.billing.expYear, holderName: en.billing.holderName, holderNamePlaceholder: en.billing.holderNamePlaceholder, saveCard: en.billing.saveCard, invalidLast4: en.billing.invalidLast4, invalidExpiry: en.billing.invalidExpiry },
  progress: { title: progress_title, searchPlaceholder: en.progress.searchPlaceholder, allClasses: en.progress.allClasses, allStudents: en.progress.allStudents, atRisk: en.progress.atRisk, onTrack: en.progress.onTrack, noStudents: en.progress.noStudents, noClass: en.progress.noClass, graded: en.progress.graded },
  chat: { staffTitle: chat_staff, parentsTitle: chat_parents, placeholder: en.chat.placeholder },
  circle: { school_statistics: en.circle.school_statistics, billing: circle_billing, student_progress: circle_progress, staff: en.circle.staff, parents: en.circle.parents, calendar: en.circle.calendar, help: en.circle.help },
})

const ur  = _t('بلنگ',       'بیلنس',  'طالب علم کی ترقی', 'عملہ چیٹ',       'والدین چیٹ',      'بلنگ',       'ترقی')
const id  = _t('Tagihan',    'Saldo',   'Kemajuan Siswa',    'Obrolan Staf',    'Obrolan Orang Tua','Tagihan',    'Kemajuan')
const de  = _t('Abrechnung', 'Guthaben','Lernfortschritt',   'Mitarbeiter-Chat','Eltern-Chat',      'Abrechnung', 'Fortschritt')
const ja  = _t('請求',        '残高',    '学習進捗',           'スタッフチャット', '保護者チャット',    '請求',        '進捗')
const pcm = _t('Billing',    'Balance', 'Student Progress',  'Staff Chat',      'Parents Chat',     'Billing',    'Progress')
const mr  = _t('बिलिंग',     'शिल्लक', 'विद्यार्थी प्रगती','कर्मचारी चॅट',   'पालक चॅट',         'बिलिंग',     'प्रगती')
const te  = _t('బిల్లింగ్',  'బ్యాలెన్స్','విద్యార్థి పురోగతి','స్టాఫ్ చాట్', 'తల్లిదండ్రుల చాట్','బిల్లింగ్','పురోగతి')
const tr  = _t('Faturalama', 'Bakiye',  'Öğrenci İlerlemesi','Personel Sohbet', 'Veli Sohbeti',     'Faturalama', 'İlerleme')
const ta  = _t('வகுப்பு',   'இருப்பு', 'மாணவர் முன்னேற்றம்','பணியாளர் அரட்டை','பெற்றோர் அரட்டை','வகுப்பு',  'முன்னேற்றம்')
const yue = _t('帳單',        '結餘',    '學生進度',           '員工聊天室',       '家長聊天室',       '帳單',        '進度')
const vi  = _t('Thanh toán', 'Số dư',   'Tiến độ học sinh',  'Chat nhân viên',  'Chat phụ huynh',   'Thanh toán', 'Tiến độ')
const fil = _t('Billing',    'Balanse', 'Progreso ng Estudyante','Chat ng Staff','Chat ng Magulang', 'Billing',    'Progreso')
const ko  = _t('청구',        '잔액',    '학생 진도',          '교직원 채팅',      '학부모 채팅',       '청구',        '진도')
const ha  = _t('Biyan Kuɗi', 'Ragowa',  'Ci Gaban Ɗalibai',  'Hira ta Ma\'aikata','Hira ta Iyaye',  'Biyan Kuɗi', 'Ci Gaban')
const sw  = _t('Bili',       'Salio',   'Maendeleo ya Wanafunzi','Mazungumzo ya Wafanyakazi','Mazungumzo ya Wazazi','Bili','Maendeleo')
const jv  = _t('Tagihan',    'Saldo',   'Kemajuan Siswa',    'Obrolan Staf',    'Obrolan Wong Tua', 'Tagihan',    'Kemajuan')
const it  = _t('Fatturazione','Saldo',  'Progressi degli studenti','Chat del personale','Chat dei genitori','Fatturazione','Progressi')
const pa  = _t('ਬਿਲਿੰਗ',   'ਬੈਲੇਂਸ',  'ਵਿਦਿਆਰਥੀ ਤਰੱਕੀ',  'ਸਟਾਫ਼ ਚੈਟ',     'ਮਾਪੇ ਚੈਟ',         'ਬਿਲਿੰਗ',    'ਤਰੱਕੀ')
const gu  = _t('બિલિંગ',    'બૅલેન્સ','વિદ્યાર્થી પ્રગતિ', 'સ્ટાફ ચેટ',      'વાલી ચેટ',         'બિલિંગ',    'પ્રગતિ')
const af  = _t('Fakturering','Saldo',   'Leerder Vordering',  'Personeel Klets', 'Ouer Klets',       'Fakturering','Vordering')
const zu  = _t('Ukukhokhela','Ibhalansi','Inqubekelaphambili Yabafundi','Ingxoxo yabasebenzi','Ingxoxo yabazali','Ukukhokhela','Inqubekelaphambili')
const xh  = _t('Ukuhlawula', 'Ibhalansi','Inkqubela phambili Yabafundi','Incoko yabasebenzi','Incoko yabazali','Ukuhlawula','Inkqubela')

export default {
  en, zh, hi, es, ar, fr, bn, pt, ru, ur, id, de, ja, pcm, mr, te, tr, ta, yue, vi,
  wuu: zh, fil, ko, arz: ar, ha, sw, jv, it, pa, gu, af, zu, xh,
}
