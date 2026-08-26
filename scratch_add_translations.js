const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'WebApp', 'Frontend', 'src', 'locales');
const langs = ['tr', 'en', 'es', 'fr', 'de', 'ro'];

const translations = {
  tr: {
    "ws_btn_assign_task": "Görev Ata",
    "ws_btn_assign_task_buddy": "Görev Ver",
    "ws_btn_settings": "Alan Ayarları",
    "ws_invite_label": "Davet",
    "ws_btn_copy_code": "Kodu kopyala",
    "ws_btn_copy_code_buddy": "Kodu al",
    "ws_btn_share_link": "Bağlantıyı paylaş",
    "ws_btn_share_link_buddy": "Linki yolla",
    "ws_stats_total": "Toplam",
    "ws_stats_done": "Tamam",
    "ws_stats_pending": "Bekliyor",
    "ws_acc_members": "Üyeler",
    "ws_acc_members_buddy": "Ekiptekiler",
    "ws_acc_manage": "Yönet",
    "ws_acc_recent_tasks": "Son Görevler",
    "ws_acc_recent_tasks_buddy": "Son İşler",
    "ws_acc_view_all": "Tümü",
    "ws_badge_active": "Aktif",
    "ws_more_tasks_count": "+ {{count}} görev daha göster",
    "ws_more_tasks_count_buddy": "+ {{count}} iş daha göster",
    "ws_task_done": "Tamamlandı",
    "ws_btn_create_empty": "Alan Oluştur",
    "ws_btn_join_empty": "Kod ile katıl"
  },
  en: {
    "ws_btn_assign_task": "Assign Task",
    "ws_btn_assign_task_buddy": "Give Task",
    "ws_btn_settings": "Workspace Settings",
    "ws_invite_label": "Invite",
    "ws_btn_copy_code": "Copy code",
    "ws_btn_copy_code_buddy": "Grab code",
    "ws_btn_share_link": "Share link",
    "ws_btn_share_link_buddy": "Send link",
    "ws_stats_total": "Total",
    "ws_stats_done": "Done",
    "ws_stats_pending": "Pending",
    "ws_acc_members": "Members",
    "ws_acc_members_buddy": "The Squad",
    "ws_acc_manage": "Manage",
    "ws_acc_recent_tasks": "Recent Tasks",
    "ws_acc_recent_tasks_buddy": "Latest Stuff",
    "ws_acc_view_all": "All",
    "ws_badge_active": "Active",
    "ws_more_tasks_count": "+ {{count}} more tasks",
    "ws_more_tasks_count_buddy": "+ {{count}} more stuff",
    "ws_task_done": "Completed",
    "ws_btn_create_empty": "Create Workspace",
    "ws_btn_join_empty": "Join with Code"
  },
  es: {
    "ws_btn_assign_task": "Asignar Tarea",
    "ws_btn_assign_task_buddy": "Dar Tarea",
    "ws_btn_settings": "Ajustes de Espacio",
    "ws_invite_label": "Invitar",
    "ws_btn_copy_code": "Copiar código",
    "ws_btn_copy_code_buddy": "Pillar código",
    "ws_btn_share_link": "Compartir enlace",
    "ws_btn_share_link_buddy": "Pasar enlace",
    "ws_stats_total": "Total",
    "ws_stats_done": "Hecho",
    "ws_stats_pending": "Pendiente",
    "ws_acc_members": "Miembros",
    "ws_acc_members_buddy": "El grupo",
    "ws_acc_manage": "Gestionar",
    "ws_acc_recent_tasks": "Tareas recientes",
    "ws_acc_recent_tasks_buddy": "Últimos curros",
    "ws_acc_view_all": "Todos",
    "ws_badge_active": "Activo",
    "ws_more_tasks_count": "+ {{count}} tareas más",
    "ws_more_tasks_count_buddy": "+ {{count}} cosas más",
    "ws_task_done": "Completado",
    "ws_btn_create_empty": "Crear Espacio",
    "ws_btn_join_empty": "Unirse con Código"
  },
  fr: {
    "ws_btn_assign_task": "Assigner Tâche",
    "ws_btn_assign_task_buddy": "Donner un taf",
    "ws_btn_settings": "Paramètres",
    "ws_invite_label": "Invit.",
    "ws_btn_copy_code": "Copier code",
    "ws_btn_copy_code_buddy": "Prendre code",
    "ws_btn_share_link": "Partager",
    "ws_btn_share_link_buddy": "Envoyer lien",
    "ws_stats_total": "Total",
    "ws_stats_done": "Terminé",
    "ws_stats_pending": "En attente",
    "ws_acc_members": "Membres",
    "ws_acc_members_buddy": "La clique",
    "ws_acc_manage": "Gérer",
    "ws_acc_recent_tasks": "Tâches récentes",
    "ws_acc_recent_tasks_buddy": "Derniers trucs",
    "ws_acc_view_all": "Tout",
    "ws_badge_active": "Actif",
    "ws_more_tasks_count": "+ {{count}} tâches de plus",
    "ws_more_tasks_count_buddy": "+ {{count}} trucs de plus",
    "ws_task_done": "Terminé",
    "ws_btn_create_empty": "Créer Espace",
    "ws_btn_join_empty": "Rejoindre avec Code"
  },
  de: {
    "ws_btn_assign_task": "Aufgabe zuweisen",
    "ws_btn_assign_task_buddy": "Aufgabe geben",
    "ws_btn_settings": "Einstellungen",
    "ws_invite_label": "Einladen",
    "ws_btn_copy_code": "Code kopieren",
    "ws_btn_copy_code_buddy": "Code schnappen",
    "ws_btn_share_link": "Link teilen",
    "ws_btn_share_link_buddy": "Link schicken",
    "ws_stats_total": "Gesamt",
    "ws_stats_done": "Fertig",
    "ws_stats_pending": "Ausstehend",
    "ws_acc_members": "Mitglieder",
    "ws_acc_members_buddy": "Die Truppe",
    "ws_acc_manage": "Verwalten",
    "ws_acc_recent_tasks": "Letzte Aufgaben",
    "ws_acc_recent_tasks_buddy": "Letzte Sachen",
    "ws_acc_view_all": "Alle",
    "ws_badge_active": "Aktiv",
    "ws_more_tasks_count": "+ {{count}} weitere Aufgaben",
    "ws_more_tasks_count_buddy": "+ {{count}} weitere Sachen",
    "ws_task_done": "Erledigt",
    "ws_btn_create_empty": "Bereich erstellen",
    "ws_btn_join_empty": "Mit Code beitreten"
  },
  ro: {
    "ws_btn_assign_task": "Asignare Sarcină",
    "ws_btn_assign_task_buddy": "Dă-i o treabă",
    "ws_btn_settings": "Setări Spațiu",
    "ws_invite_label": "Invitație",
    "ws_btn_copy_code": "Copiază codul",
    "ws_btn_copy_code_buddy": "Ia codul",
    "ws_btn_share_link": "Distribuie",
    "ws_btn_share_link_buddy": "Dă linkul",
    "ws_stats_total": "Total",
    "ws_stats_done": "Gata",
    "ws_stats_pending": "În așteptare",
    "ws_acc_members": "Membri",
    "ws_acc_members_buddy": "Echipa",
    "ws_acc_manage": "Gestionează",
    "ws_acc_recent_tasks": "Sarcini recente",
    "ws_acc_recent_tasks_buddy": "Ultimele treburi",
    "ws_acc_view_all": "Toate",
    "ws_badge_active": "Activ",
    "ws_more_tasks_count": "+ {{count}} sarcini suplimentare",
    "ws_more_tasks_count_buddy": "+ {{count}} chestii în plus",
    "ws_task_done": "Finalizat",
    "ws_btn_create_empty": "Creați un Spațiu",
    "ws_btn_join_empty": "Alăturați-vă cu Cod"
  }
};

langs.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'common.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Remove "+ " from ws_btn_create* keys
    Object.keys(data).forEach(k => {
      if (k.startsWith('ws_btn_create') && data[k].startsWith('+ ')) {
        data[k] = data[k].replace('+ ', '');
      }
    });
    
    // Merge new translations
    if (translations[lang]) {
      Object.assign(data, translations[lang]);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}/common.json`);
  }
});
