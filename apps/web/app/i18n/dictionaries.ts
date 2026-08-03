import type { Locale } from './config';

export interface Dictionary {
  brand: {
    administrativePanel: string;
    description: string;
    features: Array<{ description: string; title: string }>;
    featuresLabel: string;
    footer: string;
    productName: string;
    title: string;
  };
  dashboard: {
    activeChurch: string;
    activeStatus: string;
    adminPanel: string;
    backToLogin: string;
    churchLabel: string;
    errorDescription: string;
    errorTitle: string;
    hello: string;
    identityDescription: string;
    identityLabel: string;
    identityTitle: string;
    logout: string;
    membersDescription: string;
    membersTitle: string;
    modulesStateLabel: string;
    navigation: {
      donations: string;
      members: string;
      overview: string;
      reports: string;
      soon: string;
    };
    nextModule: string;
    plannedStatus: string;
    preparing: string;
    roles: {
      auditor: string;
      churchAdmin: string;
      financialOperator: string;
      platformAdmin: string;
    };
    securityDescription: string;
    securityTitle: string;
  };
  languageLabel: string;
  login: {
    apiUnavailable: string;
    emailLabel: string;
    emailPlaceholder: string;
    environmentProtected: string;
    genericError: string;
    hidePassword: string;
    invalidCredentials: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    secureAccess: string;
    secureSession: string;
    showPassword: string;
    submit: string;
    submitting: string;
    subtitle: string;
    supportAction: string;
    supportPrefix: string;
    title: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  'pt-BR': {
    brand: {
      administrativePanel: 'Painel administrativo',
      description:
        'Uma visão responsável das contribuições, com isolamento por igreja e rastreabilidade para cada operação.',
      features: [
        {
          description: 'Dados separados por congregação',
          title: 'Multi-igreja',
        },
        {
          description: 'Histórico íntegro e verificável',
          title: 'Auditoria contínua',
        },
        {
          description: 'Permissões definidas por função',
          title: 'Acesso protegido',
        },
      ],
      featuresLabel: 'Características da plataforma',
      footer: 'Universal • Sistema de Gestão Financeira',
      productName: 'Gestão Financeira',
      title: 'Clareza para cuidar. Segurança para servir.',
    },
    dashboard: {
      activeChurch: 'Congregação ativa',
      activeStatus: 'Ativo',
      adminPanel: 'Painel administrativo',
      backToLogin: 'Voltar ao login',
      churchLabel: 'Igreja',
      errorDescription:
        'Verifique sua conexão ou peça ao administrador para revisar seu acesso.',
      errorTitle: 'Não foi possível carregar o painel',
      hello: 'Olá,',
      identityDescription:
        'Sessão, igreja e permissões validadas para este usuário.',
      identityLabel: 'Identidade',
      identityTitle: 'Acesso configurado',
      logout: 'Sair do sistema',
      membersDescription:
        'A base multi-igreja está pronta para receber o domínio de membros.',
      membersTitle: 'Cadastro de membros',
      modulesStateLabel: 'Estado dos módulos',
      navigation: {
        donations: 'Doações',
        members: 'Membros',
        overview: 'Visão geral',
        reports: 'Relatórios',
        soon: 'Em breve',
      },
      nextModule: 'Próximo módulo',
      plannedStatus: 'Planejado',
      preparing: 'Preparando seu ambiente…',
      roles: {
        auditor: 'Auditoria',
        churchAdmin: 'Administrador local',
        financialOperator: 'Operação financeira',
        platformAdmin: 'Administrador global',
      },
      securityDescription:
        'Todas as próximas operações serão vinculadas à igreja selecionada e verificadas pela API.',
      securityTitle: 'Ambiente protegido por tenant',
    },
    languageLabel: 'Idioma',
    login: {
      apiUnavailable:
        'A API não está disponível. Confirme se o ambiente local está em execução.',
      emailLabel: 'E-mail',
      emailPlaceholder: 'nome@universal.org',
      environmentProtected: 'Ambiente protegido',
      genericError:
        'Não foi possível entrar agora. Tente novamente em instantes.',
      hidePassword: 'Ocultar senha',
      invalidCredentials:
        'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
      passwordLabel: 'Senha',
      passwordPlaceholder: 'Digite sua senha',
      secureAccess: 'Acesso seguro',
      secureSession: 'Sessão segura de 12 horas',
      showPassword: 'Mostrar senha',
      submit: 'Entrar no painel',
      submitting: 'Entrando…',
      subtitle:
        'Entre com suas credenciais para acessar o painel da sua igreja.',
      supportAction: 'Fale com o administrador do sistema.',
      supportPrefix: 'Problemas para acessar?',
      title: 'Bem-vindo de volta',
    },
  },
  en: {
    brand: {
      administrativePanel: 'Administrative dashboard',
      description:
        'A responsible view of contributions, with church-level isolation and traceability for every operation.',
      features: [
        {
          description: 'Data separated by congregation',
          title: 'Multi-church',
        },
        {
          description: 'Complete, verifiable history',
          title: 'Continuous audit',
        },
        { description: 'Role-based permissions', title: 'Protected access' },
      ],
      featuresLabel: 'Platform features',
      footer: 'Universal • Financial Management System',
      productName: 'Financial Management',
      title: 'Clarity to care. Security to serve.',
    },
    dashboard: {
      activeChurch: 'Active congregation',
      activeStatus: 'Active',
      adminPanel: 'Administrative dashboard',
      backToLogin: 'Back to login',
      churchLabel: 'Church',
      errorDescription:
        'Check your connection or ask the administrator to review your access.',
      errorTitle: 'The dashboard could not be loaded',
      hello: 'Hello,',
      identityDescription:
        'Session, church and permissions have been validated for this user.',
      identityLabel: 'Identity',
      identityTitle: 'Access configured',
      logout: 'Sign out',
      membersDescription:
        'The multi-church foundation is ready for the members domain.',
      membersTitle: 'Member registration',
      modulesStateLabel: 'Module status',
      navigation: {
        donations: 'Donations',
        members: 'Members',
        overview: 'Overview',
        reports: 'Reports',
        soon: 'Coming soon',
      },
      nextModule: 'Next module',
      plannedStatus: 'Planned',
      preparing: 'Preparing your environment…',
      roles: {
        auditor: 'Audit',
        churchAdmin: 'Local administrator',
        financialOperator: 'Financial operations',
        platformAdmin: 'Platform administrator',
      },
      securityDescription:
        'All upcoming operations will be linked to the selected church and verified by the API.',
      securityTitle: 'Tenant-protected environment',
    },
    languageLabel: 'Language',
    login: {
      apiUnavailable:
        'The API is unavailable. Confirm that the local environment is running.',
      emailLabel: 'Email',
      emailPlaceholder: 'name@universal.org',
      environmentProtected: 'Protected environment',
      genericError: 'Unable to sign in right now. Please try again shortly.',
      hidePassword: 'Hide password',
      invalidCredentials:
        'Incorrect email or password. Check your details and try again.',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      secureAccess: 'Secure access',
      secureSession: 'Secure 12-hour session',
      showPassword: 'Show password',
      submit: 'Open dashboard',
      submitting: 'Signing in…',
      subtitle: 'Use your credentials to access your church dashboard.',
      supportAction: 'Contact the system administrator.',
      supportPrefix: 'Having trouble signing in?',
      title: 'Welcome back',
    },
  },
  es: {
    brand: {
      administrativePanel: 'Panel administrativo',
      description:
        'Una visión responsable de las contribuciones, con aislamiento por iglesia y trazabilidad en cada operación.',
      features: [
        {
          description: 'Datos separados por congregación',
          title: 'Multiiglesia',
        },
        {
          description: 'Historial íntegro y verificable',
          title: 'Auditoría continua',
        },
        {
          description: 'Permisos definidos por función',
          title: 'Acceso protegido',
        },
      ],
      featuresLabel: 'Características de la plataforma',
      footer: 'Universal • Sistema de Gestión Financiera',
      productName: 'Gestión Financiera',
      title: 'Claridad para cuidar. Seguridad para servir.',
    },
    dashboard: {
      activeChurch: 'Congregación activa',
      activeStatus: 'Activo',
      adminPanel: 'Panel administrativo',
      backToLogin: 'Volver al inicio de sesión',
      churchLabel: 'Iglesia',
      errorDescription:
        'Verifica tu conexión o solicita al administrador que revise tu acceso.',
      errorTitle: 'No se pudo cargar el panel',
      hello: 'Hola,',
      identityDescription:
        'La sesión, la iglesia y los permisos fueron validados para este usuario.',
      identityLabel: 'Identidad',
      identityTitle: 'Acceso configurado',
      logout: 'Cerrar sesión',
      membersDescription:
        'La base multiiglesia está lista para recibir el dominio de miembros.',
      membersTitle: 'Registro de miembros',
      modulesStateLabel: 'Estado de los módulos',
      navigation: {
        donations: 'Donaciones',
        members: 'Miembros',
        overview: 'Vista general',
        reports: 'Informes',
        soon: 'Próximamente',
      },
      nextModule: 'Próximo módulo',
      plannedStatus: 'Planificado',
      preparing: 'Preparando tu entorno…',
      roles: {
        auditor: 'Auditoría',
        churchAdmin: 'Administrador local',
        financialOperator: 'Operación financiera',
        platformAdmin: 'Administrador de plataforma',
      },
      securityDescription:
        'Todas las próximas operaciones estarán vinculadas a la iglesia seleccionada y serán verificadas por la API.',
      securityTitle: 'Entorno protegido por tenant',
    },
    languageLabel: 'Idioma',
    login: {
      apiUnavailable:
        'La API no está disponible. Confirma que el entorno local esté en ejecución.',
      emailLabel: 'Correo electrónico',
      emailPlaceholder: 'nombre@universal.org',
      environmentProtected: 'Entorno protegido',
      genericError:
        'No fue posible iniciar sesión ahora. Inténtalo nuevamente en unos instantes.',
      hidePassword: 'Ocultar contraseña',
      invalidCredentials:
        'Correo o contraseña incorrectos. Verifica los datos e inténtalo nuevamente.',
      passwordLabel: 'Contraseña',
      passwordPlaceholder: 'Ingresa tu contraseña',
      secureAccess: 'Acceso seguro',
      secureSession: 'Sesión segura de 12 horas',
      showPassword: 'Mostrar contraseña',
      submit: 'Entrar al panel',
      submitting: 'Ingresando…',
      subtitle: 'Ingresa tus credenciales para acceder al panel de tu iglesia.',
      supportAction: 'Contacta al administrador del sistema.',
      supportPrefix: '¿Problemas para acceder?',
      title: 'Bienvenido de nuevo',
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
