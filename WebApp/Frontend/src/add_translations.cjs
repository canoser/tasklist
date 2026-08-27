const fs = require('fs');
const path = require('path');

const localesDir = 'c:\\\\YazilimCalisma\\\\planlama_app\\\\WebApp\\\\Frontend\\\\src\\\\locales';
const translations = {
  tr: {
    "ws_how_to_title": "Alanlarım Nasıl Kullanılır?",
    "ws_how_to_title_buddy": "Nasıl Kullanılır?",
    "ws_members_label": "üye",
    "ws_members_label_buddy": "kişi",
    "ws_tasks_label": "görev",
    "ws_tasks_label_buddy": "iş",
    "ws_type_team": "Ekip",
    "ws_type_team_buddy": "Tayfa",
    "ws_role_owner": "Yönetici",
    "ws_role_owner_buddy": "Patron",
    "ws_role_member": "Üye",
    "ws_role_member_buddy": "Eleman",
    "ws_empty_owned_title": "Henüz alanınız yok",
    "ws_empty_owned_title_buddy": "Ortalık bomboş",
    "ws_empty_joined_title": "Bir alana katılmadınız",
    "ws_empty_joined_title_buddy": "Hiçbir gruba girmedin",
    "ws_search_empty_title": "Başka alan bulunamadı",
    "ws_search_empty_title_buddy": "Yok böyle bir yer",
    "ws_search_empty_sub": "Davet kodu ile yeni bir alana katılabilirsiniz.",
    "ws_search_empty_sub_buddy": "Davet kodun varsa içeri dal.",
    "ws_btn_join_empty": "Kod ile katıl",
    "ws_btn_join_empty_buddy": "Kodla gir",
    "ws_search_placeholder": "Alan adı veya davet kodu...",
    "ws_search_placeholder_buddy": "Ne aramıştın..."
  },
  en: {
    "ws_how_to_title": "How to Use Workspaces?",
    "ws_how_to_title_buddy": "How does this work?",
    "ws_members_label": "members",
    "ws_members_label_buddy": "people",
    "ws_tasks_label": "tasks",
    "ws_tasks_label_buddy": "jobs",
    "ws_type_team": "Team",
    "ws_type_team_buddy": "Squad",
    "ws_role_owner": "Owner",
    "ws_role_owner_buddy": "Boss",
    "ws_role_member": "Member",
    "ws_role_member_buddy": "Mate",
    "ws_empty_owned_title": "You have no workspaces yet",
    "ws_empty_owned_title_buddy": "Nothing here yet",
    "ws_empty_joined_title": "You haven't joined any workspace",
    "ws_empty_joined_title_buddy": "You ain't in any group",
    "ws_search_empty_title": "No other workspaces found",
    "ws_search_empty_title_buddy": "Can't find it anywhere",
    "ws_search_empty_sub": "You can join a new workspace with an invite code.",
    "ws_search_empty_sub_buddy": "Got an invite code? Sneak in.",
    "ws_btn_join_empty": "Join with code",
    "ws_btn_join_empty_buddy": "Sneak in",
    "ws_search_placeholder": "Workspace name or invite code...",
    "ws_search_placeholder_buddy": "What ya looking for..."
  },
  es: {
    "ws_how_to_title": "¿Cómo usar los Espacios?",
    "ws_how_to_title_buddy": "¿Cómo funciona esto?",
    "ws_members_label": "miembros",
    "ws_members_label_buddy": "personas",
    "ws_tasks_label": "tareas",
    "ws_tasks_label_buddy": "cosas",
    "ws_type_team": "Equipo",
    "ws_type_team_buddy": "Pandilla",
    "ws_role_owner": "Propietario",
    "ws_role_owner_buddy": "Jefe",
    "ws_role_member": "Miembro",
    "ws_role_member_buddy": "Compa",
    "ws_empty_owned_title": "Aún no tienes espacios",
    "ws_empty_owned_title_buddy": "Nada por aquí",
    "ws_empty_joined_title": "No te has unido a ningún espacio",
    "ws_empty_joined_title_buddy": "No estás en ningún grupo",
    "ws_search_empty_title": "No se encontraron otros espacios",
    "ws_search_empty_title_buddy": "No hay nada con ese nombre",
    "ws_search_empty_sub": "Puedes unirte a un nuevo espacio con un código de invitación.",
    "ws_search_empty_sub_buddy": "Si tienes código, métete.",
    "ws_btn_join_empty": "Unirse con código",
    "ws_btn_join_empty_buddy": "Entrar",
    "ws_search_placeholder": "Nombre del espacio o código...",
    "ws_search_placeholder_buddy": "¿Qué buscas?..."
  },
  fr: {
    "ws_how_to_title": "Comment utiliser les espaces ?",
    "ws_how_to_title_buddy": "Comment ça marche ?",
    "ws_members_label": "membres",
    "ws_members_label_buddy": "potes",
    "ws_tasks_label": "tâches",
    "ws_tasks_label_buddy": "boulots",
    "ws_type_team": "Équipe",
    "ws_type_team_buddy": "Bande",
    "ws_role_owner": "Propriétaire",
    "ws_role_owner_buddy": "Boss",
    "ws_role_member": "Membre",
    "ws_role_member_buddy": "Gars",
    "ws_empty_owned_title": "Vous n'avez pas encore d'espaces",
    "ws_empty_owned_title_buddy": "C'est vide ici",
    "ws_empty_joined_title": "Vous n'avez rejoint aucun espace",
    "ws_empty_joined_title_buddy": "T'es dans aucun groupe",
    "ws_search_empty_title": "Aucun autre espace trouvé",
    "ws_search_empty_title_buddy": "Y'a rien ici",
    "ws_search_empty_sub": "Vous pouvez rejoindre un espace avec un code d'invitation.",
    "ws_search_empty_sub_buddy": "T'as un code ? Rentre.",
    "ws_btn_join_empty": "Rejoindre avec code",
    "ws_btn_join_empty_buddy": "S'incruster",
    "ws_search_placeholder": "Nom de l'espace ou code...",
    "ws_search_placeholder_buddy": "Tu cherches quoi..."
  },
  de: {
    "ws_how_to_title": "Wie verwende ich Bereiche?",
    "ws_how_to_title_buddy": "Wie geht das?",
    "ws_members_label": "Mitglieder",
    "ws_members_label_buddy": "Leute",
    "ws_tasks_label": "Aufgaben",
    "ws_tasks_label_buddy": "Dinge",
    "ws_type_team": "Team",
    "ws_type_team_buddy": "Truppe",
    "ws_role_owner": "Besitzer",
    "ws_role_owner_buddy": "Chef",
    "ws_role_member": "Mitglied",
    "ws_role_member_buddy": "Kumpel",
    "ws_empty_owned_title": "Sie haben noch keine Bereiche",
    "ws_empty_owned_title_buddy": "Noch nix los hier",
    "ws_empty_joined_title": "Sie sind keinem Bereich beigetreten",
    "ws_empty_joined_title_buddy": "Bist in gar keiner Truppe",
    "ws_search_empty_title": "Keine weiteren Bereiche gefunden",
    "ws_search_empty_title_buddy": "Hier ist nix",
    "ws_search_empty_sub": "Sie können mit einem Einladungscode beitreten.",
    "ws_search_empty_sub_buddy": "Hast nen Code? Rein mit dir.",
    "ws_btn_join_empty": "Mit Code beitreten",
    "ws_btn_join_empty_buddy": "Reinschleichen",
    "ws_search_placeholder": "Name oder Code...",
    "ws_search_placeholder_buddy": "Was suchste..."
  },
  ro: {
    "ws_how_to_title": "Cum să utilizați Spațiile?",
    "ws_how_to_title_buddy": "Cum merge treaba?",
    "ws_members_label": "membri",
    "ws_members_label_buddy": "persoane",
    "ws_tasks_label": "sarcini",
    "ws_tasks_label_buddy": "treburi",
    "ws_type_team": "Echipă",
    "ws_type_team_buddy": "Gașcă",
    "ws_role_owner": "Proprietar",
    "ws_role_owner_buddy": "Șef",
    "ws_role_member": "Membru",
    "ws_role_member_buddy": "Frate",
    "ws_empty_owned_title": "Nu aveți încă spații",
    "ws_empty_owned_title_buddy": "Nu-i nimic aici încă",
    "ws_empty_joined_title": "Nu v-ați alăturat niciunui spațiu",
    "ws_empty_joined_title_buddy": "Nu ești în nicio trupă",
    "ws_search_empty_title": "Nu s-au găsit alte spații",
    "ws_search_empty_title_buddy": "N-am găsit nimic",
    "ws_search_empty_sub": "Vă puteți alătura unui spațiu nou cu un cod de invitație.",
    "ws_search_empty_sub_buddy": "Ai cod? Bagă-te.",
    "ws_btn_join_empty": "Alăturați-vă cu cod",
    "ws_btn_join_empty_buddy": "Bagă-te cu cod",
    "ws_search_placeholder": "Nume spațiu sau cod...",
    "ws_search_placeholder_buddy": "Ce cauți..."
  }
};

for (const [lang, keys] of Object.entries(translations)) {
  const filePath = path.join(localesDir, lang, 'common.json');
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let json = JSON.parse(content);
    let changed = false;
    for (const [k, v] of Object.entries(keys)) {
      if (!json[k]) {
        json[k] = v;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
      console.log('Updated ' + lang);
    }
  }
}
