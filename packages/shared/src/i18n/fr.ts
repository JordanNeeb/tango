import type { Messages } from './en';

// Canadian French UI strings. Typed as `Messages`, so a missing or extra key
// fails typecheck.
export const fr: Messages = {
  languageMenu: {
    label: 'Langue',
  },
  auth: {
    fields: {
      name: 'Nom',
      email: 'Adresse courriel',
      password: 'Mot de passe',
      newPassword: 'Nouveau mot de passe',
      passwordHint: 'Au moins 8 caractères.',
    },
    signIn: {
      title: 'Connectez-vous à votre compte',
      submit: 'Se connecter',
      submitting: 'Connexion…',
      forgotPassword: 'Mot de passe oublié?',
      noAccount: 'Nouveau sur Tango?',
      createAccount: 'Créer un compte',
      resend: 'Renvoyer le courriel de confirmation',
      resending: 'Envoi…',
    },
    signUp: {
      title: 'Créez votre compte',
      submit: 'Créer le compte',
      submitting: 'Création du compte…',
      haveAccount: 'Vous avez déjà un compte?',
      signIn: 'Se connecter',
      checkEmail:
        'Consultez vos courriels pour trouver le lien de confirmation de votre compte. Connectez-vous ensuite.',
    },
    google: {
      divider: 'Ou continuer avec',
      continue: 'Continuer avec Google',
      redirecting: 'Redirection vers Google…',
    },
    forgotPassword: {
      title: 'Réinitialiser votre mot de passe',
      description:
        'Entrez votre adresse courriel et nous vous enverrons un lien pour réinitialiser votre mot de passe.',
      submit: 'Envoyer le lien',
      submitting: 'Envoi…',
      sent: 'Si un compte existe pour cette adresse, nous avons envoyé un lien pour réinitialiser votre mot de passe.',
      backToSignIn: 'Retour à la connexion',
    },
    resetPassword: {
      title: 'Choisissez un nouveau mot de passe',
      submit: 'Mettre à jour le mot de passe',
      submitting: 'Mise à jour…',
    },
    profile: {
      title: 'Profil',
      description:
        "Votre nom est visible par l'autre parent et dans les dossiers exportés.",
      completePrompt:
        "Ajoutez votre nom. L'autre parent le verra dans les invitations, les messages et les dossiers exportés.",
      emailHint: "L'adresse courriel que vous utilisez pour vous connecter.",
      save: 'Enregistrer',
      saving: 'Enregistrement…',
      saved: 'Votre profil a été enregistré.',
      signOut: 'Se déconnecter',
      loading: 'Chargement de votre profil…',
    },
    notices: {
      passwordUpdated: 'Votre mot de passe a été mis à jour.',
      confirmationSent:
        'Nous avons envoyé un nouveau courriel de confirmation. Vérifiez votre boîte de réception.',
    },
    errors: {
      emailRequired: 'Entrez votre adresse courriel.',
      emailInvalid: 'Entrez une adresse courriel valide.',
      passwordRequired: 'Entrez votre mot de passe.',
      passwordLength: 'Utilisez entre 8 et 72 caractères.',
      passwordWeak: 'Choisissez un mot de passe plus robuste.',
      passwordSame: 'Choisissez un mot de passe différent de votre mot de passe actuel.',
      nameLength: "Entrez un nom d'au plus 100 caractères.",
      invalidCredentials: "L'adresse courriel ou le mot de passe est incorrect.",
      emailNotConfirmed:
        'Confirmez votre adresse courriel avant de vous connecter. Le lien se trouve dans votre boîte de réception.',
      rateLimited: 'Trop de tentatives. Attendez quelques minutes et réessayez.',
      linkInvalid: 'Ce lien est invalide ou a expiré. Demandez-en un nouveau.',
      sessionExpired: 'Votre lien de réinitialisation a expiré. Demandez-en un nouveau.',
      signedOut: 'Votre session a pris fin. Connectez-vous de nouveau.',
      googleFailed: "La connexion avec Google n'a pas abouti. Réessayez.",
      inviteUnavailable: "Cette invitation n'est plus disponible.",
      inviteExpired: "Cette invitation a expiré. Demandez à votre coparent d'en envoyer une nouvelle.",
      unexpected: "Une erreur s'est produite. Veuillez réessayer.",
    },
  },
  invite: {
    errors: {
      nameRequired: "Ajoutez votre nom à votre profil avant d'inviter votre coparent.",
      selfInvite: 'Entrez le courriel de votre coparent, pas le vôtre.',
      alreadyPaired: 'Vous êtes déjà coparents avec cette personne.',
      pendingExists: 'Il y a déjà une invitation en attente entre vous et cette personne.',
      tooSoon: 'Attendez une minute avant de renvoyer.',
      sendLimit:
        'Cette invitation a été envoyée 10 fois, le maximum permis. Demandez à votre coparent de vérifier ses courriels indésirables.',
      inviteLimit: "Vous avez envoyé 10 invitations aujourd'hui. Réessayez demain.",
      sendFailed: "Nous n'avons pas pu envoyer le courriel. Réessayez.",
      unavailable: "Cette invitation n'est plus disponible.",
      emailMismatch: 'Cette invitation a été envoyée à une autre adresse courriel.',
      ownInvite: "C'est l'invitation que vous avez envoyée. Votre coparent doit l'ouvrir.",
    },
  },
  dashboard: {
    title: 'Tableau de bord',
    navigation: {
      dashboard: 'Tableau de bord',
      messages: 'Messages',
      unread: '{count} non lus',
      team: 'Équipe',
      projects: 'Projets',
      calendar: 'Calendrier',
      documents: 'Documents',
      reports: 'Rapports',
    },
    teamsHeading: 'Vos équipes',
    teams: {
      heroicons: 'Heroicons',
      tailwindLabs: 'Tailwind Labs',
      workcation: 'Workcation',
    },
    settings: 'Paramètres',
    search: 'Rechercher',
    openSidebar: 'Ouvrir le menu latéral',
    closeSidebar: 'Fermer le menu latéral',
    viewNotifications: 'Voir les notifications',
    openUserMenu: 'Ouvrir le menu utilisateur',
    yourProfile: 'Votre profil',
    signOut: 'Se déconnecter',
    professional: {
      welcome: 'Bienvenue, {name}',
      emptyTitle: "Aucune famille pour l'instant",
      emptyDescription:
        "Lorsqu'un parent vous invite dans sa famille, elle apparaît ici. Vous ne verrez que les dossiers qu'il choisit de partager.",
    },
    welcome: {
      title: 'Bienvenue sur Tango',
      description:
        "La première étape consiste à ajouter un coparent. Invitez-le par courriel et nous créerons votre famille dès qu'il acceptera.",
      emailLabel: 'Courriel du coparent',
      emailRequired: "Entrez l'adresse courriel de votre coparent.",
      send: "Envoyer l'invitation",
      sending: 'Envoi',
      pending: 'Invitation envoyée à {email}. Elle expire le {date}.',
      sendAgain: 'Renvoyer',
      sent: 'Invitation envoyée.',
      nameRequired: "Ajoutez votre nom à votre profil avant d'inviter votre coparent.",
      addName: 'Aller à votre profil',
    },
  },
  conversations: {
    title: 'Messages',
    heading: 'Conversations',
    emptyTitle: "Aucune conversation pour l'instant",
    emptyDescription: 'Les conversations que vous et votre coparent commencez apparaîtront ici.',
    selectTitle: 'Choisissez une conversation',
    selectDescription: 'Choisissez une conversation pour lire ses messages.',
    startedBy: 'Commencée par {name}',
    back: 'Retour aux conversations',
    composerLabel: 'Écrire un message',
    composerPlaceholder: 'Écrivez votre message',
    send: 'Envoyer',
    noCoParent: {
      description:
        "Dans Tango, les messages s'échangent entre vous et votre coparent : ajoutez votre coparent pour commencer à échanger. Ou {upgrade} : avec Solo, vous pouvez appeler n'importe quel téléphone ou lui envoyer un texto, sans coparent.",
      pending: "Votre invitation à {email} attend d'être acceptée.",
      invite: 'Inviter votre coparent',
      viewInvite: 'Voir votre invitation',
      upgrade: 'passez à Solo',
    },
    sending: 'Envoi',
    newConversation: 'Nouvelle conversation',
    subjectLabel: 'Sujet',
    bodyLabel: 'Message',
    start: 'Commencer la conversation',
    starting: 'Création',
    cancel: 'Annuler',
    coParentFallback: 'Votre coparent',
    status: {
      label: 'État du message',
      sent: 'Envoyé {time}',
      delivered: 'Distribué {time}',
      received: 'Reçu {time}',
      previewed: 'Aperçu {time}',
      read: 'Lu {time}',
    },
    errors: {
      subjectRequired: 'Entrez un sujet.',
      subjectTooLong: 'Le sujet doit compter 150 caractères ou moins.',
      bodyRequired: 'Écrivez un message.',
      bodyTooLong: 'Le message doit compter 10 000 caractères ou moins.',
      unavailable: "Cette conversation n'est pas disponible.",
      sendFailed: "Nous n'avons pas pu envoyer votre message. Réessayez.",
    },
  },
  landing: {
    nav: {
      label: 'Principal',
      logIn: 'Se connecter',
    },
    headline: 'La coparentalité, sans le conflit.',
    description:
      'Conçu au Canada pour les familles canadiennes. Des messages permanents prêts pour le tribunal, un horaire que les deux parents respectent, et des dépenses et pensions payées depuis votre banque canadienne.',
    getStarted: 'Commencer',
    learnMore: 'En savoir plus',
    screenshotAlt: "Capture d'écran de l'application",
  },
  onboarding: {
    accountType: {
      title: "Qu'est-ce qui vous décrit le mieux?",
      description:
        "Choisissez l'option qui vous correspond. Nous adapterons Tango à votre façon de l'utiliser.",
      parent: {
        label: 'Parent',
        description:
          'Vous élevez vos enfants avec un coparent après une séparation. Écrivez à votre coparent, suivez votre horaire parental et partagez les dépenses et la pension alimentaire, avec des dossiers prêts pour le tribunal.',
        action: 'Continuer comme parent',
      },
      professional: {
        label: 'Professionnel',
        description:
          "Vous accompagnez des familles qui se séparent : avocats, médiateurs, thérapeutes et coordonnateurs parentaux. Les parents vous invitent à consulter les dossiers qu'ils choisissent de partager. Toujours gratuit.",
        action: 'Continuer comme professionnel',
      },
    },
  },
  pricing: {
    eyebrow: 'Tarifs',
    title: 'Choisissez votre forfait',
    description:
      "Tout ce qu'il vous faut pour une coparentalité avec moins de conflits, au même endroit. Vous ne serez pas facturé avant que votre coparent se joigne.",
    frequencyLabel: 'Fréquence de paiement',
    monthly: 'Mensuel',
    annually: 'Annuel',
    perMonth: '/mois',
    perYear: '/an',
    featured: 'Le plus populaire',
    choose: 'Choisir {tier}',
    tiers: {
      basic: {
        name: 'Essentiel',
        description: "L'essentiel pour une coparentalité bien documentée.",
        features: [
          'Messagerie permanente avec indicateur de ton',
          'Calendrier et ententes partagés',
          'Paiement des dépenses et de la pension alimentaire',
          'Exports PDF vérifiables',
          "60 min d'appels vidéo et 240 min d'appels vocaux par mois",
          '1 Go de stockage de documents',
        ],
      },
      standard: {
        name: 'Standard',
        description: "Tout ce qu'offre Essentiel, plus :",
        features: ['Appels illimités', 'Stockage de documents illimité', 'Dossiers certifiés (affidavits)'],
      },
      premium: {
        name: 'Premium',
        description: "Tout ce qu'offre Standard, plus :",
        features: [
          'Enregistrement illimité des appels vocaux et vidéo',
          'Transcription des appels vocaux et vidéo',
        ],
      },
    },
  },
};
