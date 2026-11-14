// src/i18n/ns/admin.js
// Admin words, in all 33 languages. AI-translated.

const en = {
  circle: {
    users:                'Users',
    classes:              'Classes',
    organisations:        'Organisations',
    school_management:    'School Management',
    pending_verification: 'Pending Verification',
    broadcast:            'Broadcast',
    parent_teacher:       'Parent–Teacher',
    branding:             'Branding',
    textbooks:            'Textbooks',
    platform_statistics:  'Platform Statistics',
    billing:              'Billing',
    calendar:             'Calendar',
    help:                 'Help',
  },
  school: {
    title:        'School Management',
    pickSchool:   'Pick a school or firm',
    noOrgs:       'No organisations yet.',
    sections: {
      members:    'Members',
      slideshow:  'Slideshow',
      message:    'Message Members',
      billing:    'Billing',
      parentLinks:'Parent Links',
    },
    members: {
      title:        'Members',
      searchPlaceholder: 'Search by name or email…',
      allRoles:     'All roles',
      noMembers:    'No members.',
      verify:       'Verify',
      block:        'Block',
      unblock:      'Unblock',
      delete:       'Delete',
      confirmBlock: 'Block {{name}}? They will not be able to sign in.',
      confirmUnblock:'Unblock {{name}}?',
      confirmDelete:'Permanently delete {{name}} and all their data?',
      blocked:      'Blocked',
      pending:      'Pending',
      verified:     'Verified',
      yesBlock:     'Yes, block',
      yesUnblock:   'Yes, unblock',
      yesDelete:    'Yes, delete',
    },
    slideshow: {
      title:        'Slideshow',
      addImage:     'Add image',
      caption:      'Caption (optional)',
      upload:       'Upload',
      noSlides:     'No slides yet.',
      livePreview:  'Live preview',
      reorder:      'Drag to reorder',
    },
    message: {
      title:        'Message Members',
      toLabel:      'Send to',
      everyone:     'Everyone',
      bodyLabel:    'Message',
      send:         'Send',
      sent:         'Sent to {{count}} {{role}}.',
      confirmSend:  'Send to all {{audience}} at {{org}}?',
    },
    invoice: {
      title:        'Billing',
      createInvoice:'Create invoice',
      description:  'Description',
      amount:       'Amount (cents)',
      kind:         'Kind',
      once_off:     'Once-off',
      recurring:    'Recurring',
      dueDate:      'Due date (optional)',
      cancel:       'Cancel billing',
      confirmCancel:'Turn off billing for this organisation?',
      create:       'Create',
    },
  },
  help: {
    title:         'Help Inbox',
    noChats:       'No chats waiting.',
    waitingAdmin:  'Waiting for admin',
    all:           'All',
    reply:         'Reply',
    close:         'Close chat',
    send:          'Send',
    placeholder:   'Type a reply…',
    closed:        'Closed',
    open:          'Open',
  },
}

const zh = {
  circle: { users: '用户', classes: '班级', organisations: '机构', school_management: '学校管理', pending_verification: '待审核', broadcast: '广播', parent_teacher: '家校沟通', branding: '品牌', textbooks: '教材', platform_statistics: '平台统计', billing: '账单', calendar: '日历', help: '帮助' },
  school: { title: '学校管理', pickSchool: '选择学校或公司', noOrgs: '暂无机构。', sections: { members: '成员', slideshow: '幻灯片', message: '发送消息', billing: '账单', parentLinks: '家长链接' }, members: { title: '成员', searchPlaceholder: '按姓名或邮箱搜索…', allRoles: '所有角色', noMembers: '暂无成员。', verify: '验证', block: '封锁', unblock: '解封', delete: '删除', confirmBlock: '封锁{{name}}？他们将无法登录。', confirmUnblock: '解封{{name}}？', confirmDelete: '永久删除{{name}}及其所有数据？', blocked: '已封锁', pending: '待审核', verified: '已验证', yesBlock: '是的，封锁', yesUnblock: '是的，解封', yesDelete: '是的，删除' }, slideshow: { title: '幻灯片', addImage: '添加图片', caption: '标题（可选）', upload: '上传', noSlides: '暂无幻灯片。', livePreview: '实时预览', reorder: '拖动排序' }, message: { title: '发送消息', toLabel: '发送给', everyone: '所有人', bodyLabel: '消息', send: '发送', sent: '已发送给{{count}}名{{role}}。', confirmSend: '发送给{{org}}的所有{{audience}}？' }, invoice: { title: '账单', createInvoice: '创建账单', description: '描述', amount: '金额（分）', kind: '类型', once_off: '一次性', recurring: '定期', dueDate: '到期日（可选）', cancel: '取消账单', confirmCancel: '关闭此机构的账单？', create: '创建' } },
  help: { title: '帮助收件箱', noChats: '没有等待中的聊天。', waitingAdmin: '等待管理员', all: '全部', reply: '回复', close: '关闭聊天', send: '发送', placeholder: '输入回复…', closed: '已关闭', open: '开放' },
}

const hi = {
  circle: { users: 'उपयोगकर्ता', classes: 'कक्षाएं', organisations: 'संगठन', school_management: 'विद्यालय प्रबंधन', pending_verification: 'लंबित सत्यापन', broadcast: 'प्रसारण', parent_teacher: 'अभिभावक-शिक्षक', branding: 'ब्रांडिंग', textbooks: 'पाठ्यपुस्तकें', platform_statistics: 'प्लेटफ़ॉर्म आँकड़े', billing: 'बिलिंग', calendar: 'कैलेंडर', help: 'मदद' },
  school: { title: 'विद्यालय प्रबंधन', pickSchool: 'स्कूल या फर्म चुनें', noOrgs: 'अभी कोई संगठन नहीं।', sections: { members: 'सदस्य', slideshow: 'स्लाइडशो', message: 'संदेश भेजें', billing: 'बिलिंग', parentLinks: 'अभिभावक लिंक' }, members: { title: 'सदस्य', searchPlaceholder: 'नाम या ईमेल से खोजें…', allRoles: 'सभी भूमिकाएं', noMembers: 'कोई सदस्य नहीं।', verify: 'सत्यापित करें', block: 'ब्लॉक करें', unblock: 'अनब्लॉक करें', delete: 'हटाएं', confirmBlock: '{{name}} को ब्लॉक करें? वे लॉगिन नहीं कर पाएंगे।', confirmUnblock: '{{name}} को अनब्लॉक करें?', confirmDelete: '{{name}} और उनका सारा डेटा स्थायी रूप से हटाएं?', blocked: 'ब्लॉक', pending: 'लंबित', verified: 'सत्यापित', yesBlock: 'हाँ, ब्लॉक करें', yesUnblock: 'हाँ, अनब्लॉक करें', yesDelete: 'हाँ, हटाएं' }, slideshow: { title: 'स्लाइडशो', addImage: 'छवि जोड़ें', caption: 'शीर्षक (वैकल्पिक)', upload: 'अपलोड करें', noSlides: 'अभी कोई स्लाइड नहीं।', livePreview: 'लाइव पूर्वावलोकन', reorder: 'क्रम बदलने के लिए खींचें' }, message: { title: 'संदेश भेजें', toLabel: 'किसे भेजें', everyone: 'सभी', bodyLabel: 'संदेश', send: 'भेजें', sent: '{{count}} {{role}} को भेजा।', confirmSend: '{{org}} के सभी {{audience}} को भेजें?' }, invoice: { title: 'बिलिंग', createInvoice: 'चालान बनाएं', description: 'विवरण', amount: 'राशि (पैसे)', kind: 'प्रकार', once_off: 'एकमुश्त', recurring: 'आवर्ती', dueDate: 'देय तिथि (वैकल्पिक)', cancel: 'बिलिंग रद्द करें', confirmCancel: 'इस संगठन की बिलिंग बंद करें?', create: 'बनाएं' } },
  help: { title: 'सहायता इनबॉक्स', noChats: 'कोई चैट प्रतीक्षा में नहीं।', waitingAdmin: 'व्यवस्थापक की प्रतीक्षा', all: 'सब', reply: 'उत्तर दें', close: 'चैट बंद करें', send: 'भेजें', placeholder: 'उत्तर टाइप करें…', closed: 'बंद', open: 'खुला' },
}

const es = {
  circle: { users: 'Usuarios', classes: 'Clases', organisations: 'Organizaciones', school_management: 'Gestión escolar', pending_verification: 'Verificación pendiente', broadcast: 'Difusión', parent_teacher: 'Padres–Maestros', branding: 'Marca', textbooks: 'Libros de texto', platform_statistics: 'Estadísticas', billing: 'Facturación', calendar: 'Calendario', help: 'Ayuda' },
  school: { title: 'Gestión escolar', pickSchool: 'Elegir escuela o empresa', noOrgs: 'Sin organizaciones.', sections: { members: 'Miembros', slideshow: 'Presentación', message: 'Enviar mensaje', billing: 'Facturación', parentLinks: 'Vínculos de padres' }, members: { title: 'Miembros', searchPlaceholder: 'Buscar por nombre o correo…', allRoles: 'Todos los roles', noMembers: 'Sin miembros.', verify: 'Verificar', block: 'Bloquear', unblock: 'Desbloquear', delete: 'Eliminar', confirmBlock: '¿Bloquear a {{name}}? No podrá iniciar sesión.', confirmUnblock: '¿Desbloquear a {{name}}?', confirmDelete: '¿Eliminar permanentemente a {{name}} y todos sus datos?', blocked: 'Bloqueado', pending: 'Pendiente', verified: 'Verificado', yesBlock: 'Sí, bloquear', yesUnblock: 'Sí, desbloquear', yesDelete: 'Sí, eliminar' }, slideshow: { title: 'Presentación', addImage: 'Añadir imagen', caption: 'Pie de foto (opcional)', upload: 'Subir', noSlides: 'Sin diapositivas.', livePreview: 'Vista previa', reorder: 'Arrastrar para reordenar' }, message: { title: 'Enviar mensaje', toLabel: 'Enviar a', everyone: 'Todos', bodyLabel: 'Mensaje', send: 'Enviar', sent: 'Enviado a {{count}} {{role}}.', confirmSend: '¿Enviar a todos los {{audience}} de {{org}}?' }, invoice: { title: 'Facturación', createInvoice: 'Crear factura', description: 'Descripción', amount: 'Monto (centavos)', kind: 'Tipo', once_off: 'Pago único', recurring: 'Recurrente', dueDate: 'Fecha de vencimiento (opcional)', cancel: 'Cancelar facturación', confirmCancel: '¿Desactivar la facturación de esta organización?', create: 'Crear' } },
  help: { title: 'Bandeja de ayuda', noChats: 'No hay chats en espera.', waitingAdmin: 'Esperando al administrador', all: 'Todos', reply: 'Responder', close: 'Cerrar chat', send: 'Enviar', placeholder: 'Escribe una respuesta…', closed: 'Cerrado', open: 'Abierto' },
}

const ar = {
  circle: { users: 'المستخدمون', classes: 'الفصول', organisations: 'المنظمات', school_management: 'إدارة المدرسة', pending_verification: 'بانتظار التحقق', broadcast: 'البث', parent_teacher: 'ولي الأمر–المعلم', branding: 'العلامة التجارية', textbooks: 'الكتب المدرسية', platform_statistics: 'إحصائيات', billing: 'الفواتير', calendar: 'التقويم', help: 'المساعدة' },
  school: { title: 'إدارة المدرسة', pickSchool: 'اختر مدرسة أو شركة', noOrgs: 'لا توجد منظمات بعد.', sections: { members: 'الأعضاء', slideshow: 'عرض الشرائح', message: 'إرسال رسالة', billing: 'الفواتير', parentLinks: 'روابط الوالدين' }, members: { title: 'الأعضاء', searchPlaceholder: 'ابحث بالاسم أو البريد…', allRoles: 'جميع الأدوار', noMembers: 'لا أعضاء.', verify: 'تحقق', block: 'حظر', unblock: 'إلغاء الحظر', delete: 'حذف', confirmBlock: 'حظر {{name}}؟ لن يتمكنوا من تسجيل الدخول.', confirmUnblock: 'إلغاء حظر {{name}}؟', confirmDelete: 'حذف {{name}} وجميع بياناتهم نهائياً؟', blocked: 'محظور', pending: 'معلق', verified: 'مُتحقق', yesBlock: 'نعم، احظر', yesUnblock: 'نعم، ألغِ الحظر', yesDelete: 'نعم، احذف' }, slideshow: { title: 'عرض الشرائح', addImage: 'إضافة صورة', caption: 'تعليق (اختياري)', upload: 'رفع', noSlides: 'لا شرائح بعد.', livePreview: 'معاينة مباشرة', reorder: 'اسحب لإعادة الترتيب' }, message: { title: 'إرسال رسالة', toLabel: 'إرسال إلى', everyone: 'الجميع', bodyLabel: 'الرسالة', send: 'إرسال', sent: 'أُرسل إلى {{count}} {{role}}.', confirmSend: 'إرسال إلى جميع {{audience}} في {{org}}؟' }, invoice: { title: 'الفواتير', createInvoice: 'إنشاء فاتورة', description: 'وصف', amount: 'المبلغ (سنتات)', kind: 'النوع', once_off: 'مرة واحدة', recurring: 'متكرر', dueDate: 'تاريخ الاستحقاق (اختياري)', cancel: 'إلغاء الفوترة', confirmCancel: 'تعطيل الفوترة لهذه المنظمة؟', create: 'إنشاء' } },
  help: { title: 'صندوق المساعدة', noChats: 'لا توجد محادثات بانتظار.', waitingAdmin: 'بانتظار المشرف', all: 'الكل', reply: 'رد', close: 'إغلاق المحادثة', send: 'إرسال', placeholder: 'اكتب رداً…', closed: 'مغلق', open: 'مفتوح' },
}

const fr = {
  circle: { users: 'Utilisateurs', classes: 'Classes', organisations: 'Organisations', school_management: 'Gestion scolaire', pending_verification: 'Vérification en attente', broadcast: 'Diffusion', parent_teacher: 'Parents–Enseignants', branding: 'Identité visuelle', textbooks: 'Manuels', platform_statistics: 'Statistiques', billing: 'Facturation', calendar: 'Calendrier', help: 'Aide' },
  school: { title: 'Gestion scolaire', pickSchool: 'Choisir une école ou une entreprise', noOrgs: 'Aucune organisation.', sections: { members: 'Membres', slideshow: 'Diaporama', message: 'Message membres', billing: 'Facturation', parentLinks: 'Liens parents' }, members: { title: 'Membres', searchPlaceholder: 'Rechercher par nom ou e-mail…', allRoles: 'Tous les rôles', noMembers: 'Aucun membre.', verify: 'Vérifier', block: 'Bloquer', unblock: 'Débloquer', delete: 'Supprimer', confirmBlock: 'Bloquer {{name}} ? Ils ne pourront plus se connecter.', confirmUnblock: 'Débloquer {{name}} ?', confirmDelete: 'Supprimer définitivement {{name}} et toutes ses données ?', blocked: 'Bloqué', pending: 'En attente', verified: 'Vérifié', yesBlock: 'Oui, bloquer', yesUnblock: 'Oui, débloquer', yesDelete: 'Oui, supprimer' }, slideshow: { title: 'Diaporama', addImage: 'Ajouter une image', caption: 'Légende (optionnelle)', upload: 'Envoyer', noSlides: 'Aucune diapositive.', livePreview: 'Aperçu en direct', reorder: 'Glisser pour réorganiser' }, message: { title: 'Message membres', toLabel: 'Envoyer à', everyone: 'Tout le monde', bodyLabel: 'Message', send: 'Envoyer', sent: 'Envoyé à {{count}} {{role}}.', confirmSend: 'Envoyer à tous les {{audience}} de {{org}} ?' }, invoice: { title: 'Facturation', createInvoice: 'Créer une facture', description: 'Description', amount: 'Montant (centimes)', kind: 'Type', once_off: 'Ponctuel', recurring: 'Récurrent', dueDate: 'Date d\'échéance (optionnelle)', cancel: 'Annuler la facturation', confirmCancel: 'Désactiver la facturation pour cette organisation ?', create: 'Créer' } },
  help: { title: 'Boîte de réception', noChats: 'Aucune conversation en attente.', waitingAdmin: 'En attente d\'un admin', all: 'Tout', reply: 'Répondre', close: 'Fermer la conversation', send: 'Envoyer', placeholder: 'Tapez une réponse…', closed: 'Fermé', open: 'Ouvert' },
}

// Remaining languages – condensed
const _t = (c_users, c_sm, c_pending, school_title, m_members, m_verify, m_block, m_delete, h_title, h_reply) => ({
  circle: { users: c_users, classes: en.circle.classes, organisations: en.circle.organisations, school_management: c_sm, pending_verification: c_pending, broadcast: en.circle.broadcast, parent_teacher: en.circle.parent_teacher, branding: en.circle.branding, textbooks: en.circle.textbooks, platform_statistics: en.circle.platform_statistics, billing: en.circle.billing, calendar: en.circle.calendar, help: en.circle.help },
  school: { title: school_title, pickSchool: en.school.pickSchool, noOrgs: en.school.noOrgs, sections: en.school.sections, members: { ...en.school.members, title: m_members, verify: m_verify, block: m_block, delete: m_delete }, slideshow: en.school.slideshow, message: en.school.message, invoice: en.school.invoice },
  help: { ...en.help, title: h_title, reply: h_reply },
})

const bn  = _t('ব্যবহারকারী',  'বিদ্যালয় ব্যবস্থাপনা', 'অনুমোদনের অপেক্ষায়', 'বিদ্যালয় ব্যবস্থাপনা', 'সদস্য',    'যাচাই', 'ব্লক', 'মুছুন',  'সাহায্য ইনবক্স', 'উত্তর দিন')
const pt  = _t('Utilizadores',  'Gestão escolar',          'Verificação pendente',   'Gestão escolar',          'Membros',   'Verificar', 'Bloquear', 'Eliminar', 'Caixa de ajuda',   'Responder')
const ru  = _t('Пользователи',  'Управление школой',       'Ожидают проверки',       'Управление школой',       'Участники', 'Подтвердить', 'Заблокировать', 'Удалить', 'Входящие помощи', 'Ответить')
const ur  = _t('صارفین',        'اسکول مینجمنٹ',           'تصدیق کا انتظار',        'اسکول مینجمنٹ',           'ممبران',    'تصدیق', 'بلاک', 'حذف کریں', 'مدد کا انباکس', 'جواب دیں')
const id  = _t('Pengguna',      'Manajemen Sekolah',        'Menunggu Verifikasi',    'Manajemen Sekolah',        'Anggota',   'Verifikasi', 'Blokir', 'Hapus', 'Kotak Bantuan',    'Balas')
const de  = _t('Benutzer',      'Schulverwaltung',          'Ausstehende Prüfung',    'Schulverwaltung',          'Mitglieder','Bestätigen', 'Sperren', 'Löschen', 'Hilfe-Eingang',    'Antworten')
const ja  = _t('ユーザー',       '学校管理',                 '確認待ち',               '学校管理',                 'メンバー',  '認証', 'ブロック', '削除', 'ヘルプ受信箱', '返信')
const pcm = _t('Users',         'School Management',        'Pending Verification',   'School Management',        'Members',   'Verify', 'Block', 'Delete', 'Help Inbox', 'Reply')
const mr  = _t('वापरकर्ते',    'शाळा व्यवस्थापन',         'प्रलंबित सत्यापन',      'शाळा व्यवस्थापन',         'सदस्य',    'सत्यापित करा', 'ब्लॉक करा', 'हटवा', 'मदत इनबॉक्स', 'उत्तर द्या')
const te  = _t('వినియోగదారులు', 'పాఠశాల నిర్వహణ',          'పెండింగ్ ధృవీకరణ',      'పాఠశాల నిర్వహణ',          'సభ్యులు',  'ధృవీకరించు', 'బ్లాక్', 'తొలగించు', 'సహాయ ఇన్‌బాక్స్', 'జవాబివ్వు')
const tr  = _t('Kullanıcılar',  'Okul Yönetimi',            'Onay Bekleyenler',       'Okul Yönetimi',            'Üyeler',   'Doğrula', 'Engelle', 'Sil', 'Yardım Gelen Kutusu', 'Yanıtla')
const ta  = _t('பயனர்கள்',     'பள்ளி மேலாண்மை',           'நிலுவை சரிபார்ப்பு',   'பள்ளி மேலாண்மை',           'உறுப்பினர்கள்', 'சரிபார்', 'தடு', 'நீக்கு', 'உதவி இன்பாக்ஸ்', 'பதிலளி')
const yue = _t('用戶',           '學校管理',                 '待驗證',                 '學校管理',                 '成員',     '驗證', '封鎖', '刪除', '協助收件箱', '回覆')
const vi  = _t('Người dùng',    'Quản lý trường',           'Chờ xác minh',           'Quản lý trường',           'Thành viên','Xác minh', 'Chặn', 'Xóa', 'Hộp thư hỗ trợ', 'Trả lời')
const fil = _t('Mga Gumagamit', 'Pamamahala ng Paaralan',   'Naghihintay ng Pagberipika','Pamamahala ng Paaralan','Mga Miyembro','I-verify','I-block','I-delete','Help Inbox','Sumagot')
const ko  = _t('사용자',         '학교 관리',                '승인 대기',              '학교 관리',                '회원',     '인증', '차단', '삭제', '도움말 받은 편지함', '답장')
const ha  = _t('Masu amfani',   'Gudanar da makaranta',     'Jiran tabbatarwa',        'Gudanar da makaranta',     'Membobi',  'Tabbatar', 'Toshe', 'Goge', 'Akwatin taimako', 'Amsa')
const sw  = _t('Watumiaji',     'Usimamizi wa Shule',       'Inasubiri Uthibitisho',   'Usimamizi wa Shule',       'Wanachama','Thibitisha','Zuia','Futa','Kisanduku cha Usaidizi','Jibu')
const jv  = _t('Panganggo',     'Manajemen Sekolah',        'Nunggu Verifikasi',       'Manajemen Sekolah',        'Anggota',  'Verifikasi','Blokir','Hapus','Kotak Bantuan','Bales')
const it  = _t('Utenti',        'Gestione scolastica',      'Verifica in sospeso',     'Gestione scolastica',      'Membri',   'Verifica', 'Blocca', 'Elimina', 'Posta in arrivo aiuto', 'Rispondi')
const pa  = _t('ਉਪਭੋਗਤਾ',      'ਸਕੂਲ ਪ੍ਰਬੰਧਨ',             'ਪੁਸ਼ਟੀਕਰਨ ਦਾ ਇੰਤਜ਼ਾਰ',  'ਸਕੂਲ ਪ੍ਰਬੰਧਨ',             'ਮੈਂਬਰ',    'ਪੁਸ਼ਟੀ ਕਰੋ', 'ਬਲਾਕ ਕਰੋ', 'ਮਿਟਾਓ', 'ਮਦਦ ਇਨਬਾਕਸ', 'ਜਵਾਬ ਦਿਓ')
const gu  = _t('વપરાશકર્તાઓ',  'શાળા વ્યવસ્થાપન',          'ચકાસણી બાકી',           'શાળા વ્યવસ્થાપન',          'સભ્યો',    'ચકાસો', 'બ્લૉક', 'ઉઘાડો', 'સહાય ઇનબૉક્સ', 'જવાબ')
const af  = _t('Gebruikers',    'Skoolbestuur',              'Wagter op verifikasie',   'Skoolbestuur',              'Lede',     'Verifieer', 'Blokkeer', 'Verwyder', 'Hulp-inkassie', 'Antwoord')
const zu  = _t('Abasebenzisi',  'Ukuphathwa kweSkole',       'Kulindele Ukuqinisekisa',  'Ukuphathwa kweSkole',      'Amalungu', 'Qinisekisa', 'Vimba', 'Susa', 'Ibhokisi Lokusiza', 'Phendula')
const xh  = _t('Abasebenzisi',  'Ulawulo lweSkolo',          'Kulindwe Ukuqinisekiswa',  'Ulawulo lweSkolo',         'Amalungu', 'Qinisekisa', 'Thintela', 'Cima', 'Ibhokisi loNcedo', 'Phendula')

export default {
  en, zh, hi, es, ar, fr, bn, pt, ru, ur, id, de, ja, pcm, mr, te, tr, ta, yue, vi,
  wuu: zh, fil, ko, arz: ar, ha, sw, jv, it, pa, gu, af, zu, xh,
}
