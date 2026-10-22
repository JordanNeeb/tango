// English UI strings. The shape of this object is the `Messages` contract that
// every other language must match exactly.
export const en = {
  languageMenu: {
    // Accessible name of the language menu button. Each language in the menu
    // is named in its own language, so those names are not translated here.
    label: 'Language',
  },
  auth: {
    fields: {
      name: 'Name',
      email: 'Email address',
      password: 'Password',
      newPassword: 'New password',
      passwordHint: 'At least 8 characters.',
    },
    signIn: {
      title: 'Sign in to your account',
      submit: 'Sign in',
      submitting: 'Signing in…',
      forgotPassword: 'Forgot password?',
      noAccount: 'New to Tango?',
      createAccount: 'Create an account',
      resend: 'Resend confirmation email',
      resending: 'Sending…',
    },
    signUp: {
      title: 'Create your account',
      submit: 'Create account',
      submitting: 'Creating account…',
      haveAccount: 'Already have an account?',
      signIn: 'Sign in',
      checkEmail:
        'Check your email for a link to confirm your account. Then sign in.',
    },
    google: {
      divider: 'Or continue with',
      continue: 'Continue with Google',
      redirecting: 'Redirecting to Google…',
    },
    forgotPassword: {
      title: 'Reset your password',
      description:
        "Enter your email and we'll send you a link to reset your password.",
      submit: 'Send reset link',
      submitting: 'Sending…',
      sent: "If an account exists for that email, we've sent a link to reset your password.",
      backToSignIn: 'Back to sign in',
    },
    resetPassword: {
      title: 'Choose a new password',
      submit: 'Update password',
      submitting: 'Updating…',
    },
    profile: {
      title: 'Profile',
      description:
        'Your name is shown to your co-parent and in exported records.',
      completePrompt:
        'Add your name. Your co-parent will see it on invites, messages, and exported records.',
      emailHint: 'The email you sign in with.',
      save: 'Save',
      saving: 'Saving…',
      saved: 'Your profile has been saved.',
      signOut: 'Sign out',
      loading: 'Loading your profile…',
    },
    notices: {
      passwordUpdated: 'Your password has been updated.',
      confirmationSent: "We've sent a new confirmation email. Check your inbox.",
    },
    errors: {
      emailRequired: 'Enter your email address.',
      emailInvalid: 'Enter a valid email address.',
      passwordRequired: 'Enter your password.',
      passwordLength: 'Use between 8 and 72 characters.',
      passwordWeak: 'Choose a stronger password.',
      passwordSame: 'Choose a password different from your current one.',
      nameLength: 'Enter a name of up to 100 characters.',
      invalidCredentials: 'The email or password is incorrect.',
      emailNotConfirmed:
        'Confirm your email before signing in. Check your inbox for the link.',
      rateLimited: 'Too many attempts. Wait a few minutes and try again.',
      linkInvalid: 'That link is invalid or has expired. Request a new one.',
      sessionExpired: 'Your reset link has expired. Request a new one.',
      signedOut: 'Your session has ended. Sign in again.',
      googleFailed: "Google sign-in didn't complete. Try again.",
      inviteUnavailable: "This invite isn't available anymore.",
      inviteExpired: 'This invite has expired. Ask your co-parent to send a new one.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
  // Navigation items, teams, and search are Tailwind Plus placeholders until
  // the features behind them exist. Team names are brand names.
  dashboard: {
    title: 'Dashboard',
    navigation: {
      dashboard: 'Dashboard',
      messages: 'Messages',
      unread: '{count} unread',
      team: 'Team',
      projects: 'Projects',
      calendar: 'Calendar',
      documents: 'Documents',
      reports: 'Reports',
    },
    teamsHeading: 'Your teams',
    teams: {
      heroicons: 'Heroicons',
      tailwindLabs: 'Tailwind Labs',
      workcation: 'Workcation',
    },
    settings: 'Settings',
    search: 'Search',
    openSidebar: 'Open sidebar',
    closeSidebar: 'Close sidebar',
    viewNotifications: 'View notifications',
    openUserMenu: 'Open user menu',
    yourProfile: 'Your profile',
    signOut: 'Sign out',
    professional: {
      welcome: 'Welcome, {name}',
      emptyTitle: 'No families yet',
      emptyDescription:
        "When a parent invites you to their family, it appears here. You'll only see the records they choose to share.",
    },
    welcome: {
      title: 'Welcome to Tango',
      description:
        "The first step is to add a co-parent. Invite them by email and we'll set up your family as soon as they accept.",
      emailLabel: "Co-parent's email",
      emailRequired: "Enter your co-parent's email address.",
      send: 'Send invite',
      sending: 'Sending',
      pending: 'Invite sent to {email}. It expires on {date}.',
      sendAgain: 'Send again',
      sent: 'Invite sent.',
      nameRequired: 'Add your name to your profile before inviting your co-parent.',
      addName: 'Go to your profile',
    },
  },
  conversations: {
    title: 'Messages',
    heading: 'Conversations',
    emptyTitle: 'No conversations yet',
    emptyDescription: 'Conversations you and your co-parent start will appear here.',
    selectTitle: 'Select a conversation',
    selectDescription: 'Choose a conversation to read its messages.',
    startedBy: 'Started by {name}',
    back: 'Back to conversations',
    composerLabel: 'Write a message',
    composerPlaceholder: 'Write your message',
    send: 'Send',
    noCoParent: {
      title: 'Add a co-parent to start messaging',
      description:
        "Conversations are between you and your co-parent. Invite them from your dashboard, and you can start one as soon as they accept.",
      pending: 'Your invite to {email} is waiting for them to accept.',
      invite: 'Invite your co-parent',
      viewInvite: 'View your invite',
    },
    sending: 'Sending',
    newConversation: 'New conversation',
    subjectLabel: 'Subject',
    bodyLabel: 'Message',
    start: 'Start conversation',
    starting: 'Starting',
    cancel: 'Cancel',
    coParentFallback: 'Your co-parent',
    status: {
      label: 'Message status',
      sent: 'Sent {time}',
      delivered: 'Delivered {time}',
      received: 'Received {time}',
      previewed: 'Previewed {time}',
      read: 'Read {time}',
    },
    errors: {
      subjectRequired: 'Enter a subject.',
      subjectTooLong: 'Keep the subject to 150 characters or fewer.',
      bodyRequired: 'Write a message.',
      bodyTooLong: 'Keep the message to 10,000 characters or fewer.',
      unavailable: "This conversation isn't available.",
      sendFailed: "We couldn't send your message. Try again.",
    },
  },
  invite: {
    errors: {
      nameRequired: 'Add your name to your profile before inviting your co-parent.',
      selfInvite: "Enter your co-parent's email, not your own.",
      alreadyPaired: "You're already co-parents with this person.",
      pendingExists: "There's already a pending invite between you and this person.",
      tooSoon: 'Wait a minute before sending again.',
      sendLimit:
        'This invite has been sent 10 times, the most allowed. Ask your co-parent to check their spam folder.',
      inviteLimit: "You've sent 10 invites today. Try again tomorrow.",
      sendFailed: "We couldn't send the email. Try again.",
      unavailable: "This invite isn't available anymore.",
      emailMismatch: 'This invite was sent to another email address.',
      ownInvite: 'This is the invite you sent. Your co-parent needs to open it.',
    },
  },
  // "Learn more" and the screenshot text are Tailwind Plus placeholders, kept
  // until real content exists.
  landing: {
    nav: {
      label: 'Main',
      logIn: 'Log in',
    },
    headline: 'Co-parent without the conflict.',
    description:
      'Built in Canada for Canadian families. Permanent, court-ready messages, a schedule both parents stick to, and expenses and support paid from your Canadian bank.',
    getStarted: 'Get started',
    learnMore: 'Learn more',
    screenshotAlt: 'App screenshot',
  },
  onboarding: {
    accountType: {
      title: 'What best describes you?',
      description:
        "Choose the option that fits you. We'll set up Tango for the way you'll use it.",
      parent: {
        label: 'Parent',
        description:
          "You're raising children with a co-parent after a separation. Message your co-parent, follow your parenting schedule, and share expenses and child support, with records ready for court.",
        action: 'Continue as a parent',
      },
      professional: {
        label: 'Professional',
        description:
          'You support families through separation: lawyers, mediators, therapists, and parenting coordinators. Parents invite you to see the records they choose to share. Always free.',
        action: 'Continue as a professional',
      },
    },
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Choose your plan',
    description:
      "Everything you need to co-parent with less conflict, all in one place. You won't be charged until your co-parent joins.",
    frequencyLabel: 'Payment frequency',
    monthly: 'Monthly',
    annually: 'Annually',
    perMonth: '/month',
    perYear: '/year',
    featured: 'Most popular',
    // {tier} is replaced with the tier name.
    choose: 'Choose {tier}',
    tiers: {
      basic: {
        name: 'Basic',
        description: 'The essentials for co-parenting on the record.',
        features: [
          'Permanent messaging with tone meter',
          'Shared calendar and agreements',
          'Expenses and child support payments',
          'Verifiable PDF exports',
          '60 min of video and 240 min of voice calls a month',
          '1 GB of document storage',
        ],
      },
      standard: {
        name: 'Standard',
        description: 'Everything in Basic, plus:',
        features: ['Unlimited calls', 'Unlimited document storage', 'Certified records (affidavits)'],
      },
      premium: {
        name: 'Premium',
        description: 'Everything in Standard, plus:',
        features: ['Unlimited call and video recording', 'Call and video transcription'],
      },
    },
  },
} as const;

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Messages = Widen<typeof en>;
