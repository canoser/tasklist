const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'WebApp', 'Frontend', 'src', 'locales');
const langs = ['tr', 'en', 'es', 'fr', 'de', 'ro'];

const translations = {
  tr: {
    "ws_empty_owned_title": "Henüz alanınız yok",
    "ws_empty_owned_title_buddy": "Mekan bomboş",
    "ws_empty_joined_title": "Bir alana katılmadınız",
    "ws_empty_joined_title_buddy": "Kimseye katılmadın",
    "ws_search_empty_title": "Başka alan bulunamadı",
    "ws_search_empty_title_buddy": "Başka bir şey yok kanka",
    "ws_search_empty_sub": "Davet kodu ile yeni bir alana katılabilirsiniz.",
    "ws_search_empty_sub_buddy": "Kodu kap gel, tayfaya katıl.",
    "ws_role_owner": "Yönetici",
    "ws_role_owner_buddy": "Patron",
    "ws_role_member": "Üye",
    "ws_role_member_buddy": "Tayfadan",
    "ws_members_label": "üye",
    "ws_members_label_buddy": "kişi",
    "ws_tasks_label": "görev",
    "ws_tasks_label_buddy": "iş",
    "ws_type_team": "Ekip",
    "ws_type_team_buddy": "Tayfa"
  },
  en: {
    "ws_empty_owned_title": "No workspaces yet",
    "ws_empty_owned_title_buddy": "Nothing here yet",
    "ws_empty_joined_title": "Not joined any workspace",
    "ws_empty_joined_title_buddy": "You haven't joined a squad",
    "ws_search_empty_title": "No other workspaces found",
    "ws_search_empty_title_buddy": "Nothing else here",
    "ws_search_empty_sub": "You can join a new workspace with an invite code.",
    "ws_search_empty_sub_buddy": "Got a code? Use it to join a squad.",
    "ws_role_owner": "Owner",
    "ws_role_owner_buddy": "Boss",
    "ws_role_member": "Member",
    "ws_role_member_buddy": "Squad",
    "ws_members_label": "members",
    "ws_members_label_buddy": "peeps",
    "ws_tasks_label": "tasks",
    "ws_tasks_label_buddy": "stuff",
    "ws_type_team": "Team",
    "ws_type_team_buddy": "Crew"
  },
  es: {
    "ws_empty_owned_title": "Aún no tienes espacios",
    "ws_empty_owned_title_buddy": "Nada por aquí todavía",
    "ws_empty_joined_title": "No te has unido a ningún espacio",
    "ws_empty_joined_title_buddy": "No te has unido a ningún grupo",
    "ws_search_empty_title": "No se encontraron otros espacios",
    "ws_search_empty_title_buddy": "No hay nada más por aquí",
    "ws_search_empty_sub": "Puedes unirte a un nuevo espacio con un código de invitación.",
    "ws_search_empty_sub_buddy": "¿Tienes un código? Únete a un grupo.",
    "ws_role_owner": "Propietario",
    "ws_role_owner_buddy": "Jefe",
    "ws_role_member": "Miembro",
    "ws_role_member_buddy": "Colega",
    "ws_members_label": "miembros",
    "ws_members_label_buddy": "colegas",
    "ws_tasks_label": "tareas",
    "ws_tasks_label_buddy": "cosas",
    "ws_type_team": "Equipo",
    "ws_type_team_buddy": "Pandilla"
  },
  fr: {
    "ws_empty_owned_title": "Aucun espace pour le moment",
    "ws_empty_owned_title_buddy": "C'est vide ici",
    "ws_empty_joined_title": "Vous n'avez rejoint aucun espace",
    "ws_empty_joined_title_buddy": "T'as rejoint aucune équipe",
    "ws_search_empty_title": "Aucun autre espace trouvé",
    "ws_search_empty_title_buddy": "Rien d'autre ici",
    "ws_search_empty_sub": "Vous pouvez rejoindre un nouvel espace avec un code d'invitation.",
    "ws_search_empty_sub_buddy": "T'as un code ? Rejoins une équipe.",
    "ws_role_owner": "Propriétaire",
    "ws_role_owner_buddy": "Boss",
    "ws_role_member": "Membre",
    "ws_role_member_buddy": "Pote",
    "ws_members_label": "membres",
    "ws_members_label_buddy": "potes",
    "ws_tasks_label": "tâches",
    "ws_tasks_label_buddy": "trucs",
    "ws_type_team": "Équipe",
    "ws_type_team_buddy": "Bande"
  },
  de: {
    "ws_empty_owned_title": "Noch keine Bereiche",
    "ws_empty_owned_title_buddy": "Noch nichts hier",
    "ws_empty_joined_title": "Keinem Bereich beigetreten",
    "ws_empty_joined_title_buddy": "Noch in keiner Truppe",
    "ws_search_empty_title": "Keine weiteren Bereiche gefunden",
    "ws_search_empty_title_buddy": "Sonst nichts hier",
    "ws_search_empty_sub": "Sie können einem neuen Bereich mit einem Einladungscode beitreten.",
    "ws_search_empty_sub_buddy": "Hast du einen Code? Mach mit.",
    "ws_role_owner": "Eigentümer",
    "ws_role_owner_buddy": "Boss",
    "ws_role_member": "Mitglied",
    "ws_role_member_buddy": "Kumpel",
    "ws_members_label": "Mitglieder",
    "ws_members_label_buddy": "Leute",
    "ws_tasks_label": "Aufgaben",
    "ws_tasks_label_buddy": "Sachen",
    "ws_type_team": "Team",
    "ws_type_team_buddy": "Crew"
  },
  ro: {
    "ws_empty_owned_title": "Niciun spațiu momentan",
    "ws_empty_owned_title_buddy": "E cam gol pe aici",
    "ws_empty_joined_title": "Nu v-ați alăturat niciunui spațiu",
    "ws_empty_joined_title_buddy": "Nu ești în nicio echipă încă",
    "ws_search_empty_title": "Niciun alt spațiu găsit",
    "ws_search_empty_title_buddy": "Nu mai e nimic pe aici",
    "ws_search_empty_sub": "Vă puteți alătura unui nou spațiu cu un cod de invitație.",
    "ws_search_empty_sub_buddy": "Ai un cod? Bagă-te într-o echipă.",
    "ws_role_owner": "Proprietar",
    "ws_role_owner_buddy": "Șefu",
    "ws_role_member": "Membru",
    "ws_role_member_buddy": "Coleg",
    "ws_members_label": "membri",
    "ws_members_label_buddy": "oameni",
    "ws_tasks_label": "sarcini",
    "ws_tasks_label_buddy": "treburi",
    "ws_type_team": "Echipă",
    "ws_type_team_buddy": "Gașcă"
  }
};

langs.forEach(lang => {
  const filePath = path.join(localesDir, lang, 'common.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge new translations
    if (translations[lang]) {
      Object.assign(data, translations[lang]);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${lang}/common.json`);
  }
});
