import type { Locale } from './config';

export interface ProductCopy {
  common: {
    active: string;
    anonymous: string;
    back: string;
    cancel: string;
    church: string;
    inactive: string;
    loading: string;
    optional: string;
    save: string;
    saving: string;
  };
  churches: {
    create: string;
    created: string;
    creating: string;
    delete: string;
    deleteConfirm: string;
    deleteError: string;
    deleted: string;
    edit: string;
    empty: string;
    error: string;
    intro: string;
    lastChurchError: string;
    listTitle: string;
    name: string;
    namePlaceholder: string;
    restricted: string;
    title: string;
    updateError: string;
    updated: string;
  };
  profile: {
    changePassword: string;
    changed: string;
    changing: string;
    confirmPassword: string;
    currentPassword: string;
    email: string;
    error: string;
    intro: string;
    invalidCurrent: string;
    loginAgain: string;
    mismatch: string;
    name: string;
    newPassword: string;
    passwordHint: string;
    personalTitle: string;
    save: string;
    saved: string;
    securityTitle: string;
    title: string;
  };
  users: {
    active: string;
    auditor: string;
    create: string;
    created: string;
    createTitle: string;
    disabled: string;
    email: string;
    empty: string;
    error: string;
    financialOperator: string;
    intro: string;
    listTitle: string;
    name: string;
    password: string;
    passwordHint: string;
    restricted: string;
    role: string;
    saveAccess: string;
    saving: string;
    status: string;
    title: string;
    updateError: string;
    updated: string;
    churchAdmin: string;
  };
  members: {
    actions: string;
    address1: string;
    address2: string;
    city: string;
    country: string;
    created: string;
    empty: string;
    formIntro: string;
    historyEmpty: string;
    historyIntro: string;
    historyTitle: string;
    listIntro: string;
    name: string;
    new: string;
    notes: string;
    phone: string;
    postalCode: string;
    region: string;
    search: string;
    searchAction: string;
    status: string;
    title: string;
    email: string;
    edit: string;
    details: string;
    delete: string;
    deleteConfirm: string;
    deleteError: string;
    deleted: string;
    deleting: string;
    saved: string;
    error: string;
  };
  envelopes: {
    addImage: string;
    allMembers: string;
    amount: string;
    cameraAction: string;
    cameraIntro: string;
    cameraPermissionError: string;
    cameraStarting: string;
    cameraTitle: string;
    cameraUnavailable: string;
    card: string;
    cash: string;
    check: string;
    chooseImage: string;
    closeCamera: string;
    count: string;
    date: string;
    details: string;
    empty: string;
    endDate: string;
    error: string;
    image: string;
    imageError: string;
    imageHint: string;
    imageReady: string;
    imageSaved: string;
    imageUploadError: string;
    imageUploading: string;
    listIntro: string;
    member: string;
    new: string;
    notes: string;
    operator: string;
    paymentMethod: string;
    previewAlt: string;
    removeImage: string;
    retakePhoto: string;
    saved: string;
    startDate: string;
    title: string;
    takePhoto: string;
    total: string;
    usePhoto: string;
    view: string;
  };
  dashboard: {
    annualBook: string;
    annualBookDescription: string;
    churches: string;
    churchesDescription: string;
    donations: string;
    donationsDescription: string;
    launch: string;
    launchDescription: string;
    members: string;
    membersDescription: string;
    open: string;
    reports: string;
    reportsDescription: string;
    subtitle: string;
    title: string;
  };
  reports: {
    archive: string;
    allMembers: string;
    annualBook: string;
    annualBookDescription: string;
    annualBookFilterHint: string;
    annualBookDays: string;
    annualMembers: string;
    annualMembersDescription: string;
    annualMembersFilterHint: string;
    contentDescription: string;
    contentTitle: string;
    customPeriod: string;
    detailed: string;
    detailedDescription: string;
    donor: string;
    download: string;
    downloadError: string;
    empty: string;
    generate: string;
    imagesIntro: string;
    imagesTitle: string;
    includeImages: string;
    includeImagesDescription: string;
    intro: string;
    last30Days: string;
    lastMonth: string;
    memberTotals: string;
    memberTotalsDescription: string;
    memberFilterDescription: string;
    memberFilterLabel: string;
    memberFilterTitle: string;
    memberSearchEmpty: string;
    memberSearchPlaceholder: string;
    monthLabel: string;
    monthMode: string;
    monthModeHint: string;
    nextYear: string;
    noResults: string;
    paymentMethods: string;
    paymentMethodsDescription: string;
    period: string;
    periodDescription: string;
    periodTitle: string;
    previewTitle: string;
    previousYear: string;
    reportType: string;
    savedReports: string;
    selectionSummary: string;
    thisMonth: string;
    thisYear: string;
    title: string;
    customPeriodHint: string;
    useEntireYear: string;
    athMobile: string;
    designated: string;
    totalWithoutAth: string;
    undesignated: string;
    withImages: string;
    withoutImages: string;
    yearLabel: string;
    yearMode: string;
    yearModeHint: string;
  };
}

export const productCopies: Record<Locale, ProductCopy> = {
  'pt-BR': {
    common: {
      active: 'Ativo',
      anonymous: 'Anônimo',
      back: 'Voltar',
      cancel: 'Cancelar',
      church: 'Igreja',
      inactive: 'Inativo',
      loading: 'Carregando…',
      optional: 'Opcional',
      save: 'Salvar',
      saving: 'Salvando…',
    },
    churches: {
      create: 'Criar igreja',
      created: 'Igreja criada com sucesso.',
      creating: 'Criando…',
      delete: 'Excluir igreja',
      deleteConfirm:
        'Excluir “{name}” do menu? Os membros, doações e relatórios serão preservados.',
      deleteError: 'Não foi possível excluir a igreja. Tente novamente.',
      deleted: 'Igreja excluída do menu com sucesso.',
      edit: 'Editar igreja',
      empty: 'Nenhuma igreja cadastrada.',
      error:
        'Não foi possível criar a igreja. Revise o nome e tente novamente.',
      intro:
        'Cadastre apenas o nome necessário para separar membros, lançamentos e relatórios.',
      lastChurchError: 'A última igreja ativa não pode ser excluída.',
      listTitle: 'Igrejas disponíveis',
      name: 'Nome da igreja',
      namePlaceholder: 'Ex.: UCKG New York',
      restricted: 'Esta área é exclusiva do administrador da plataforma.',
      title: 'Igrejas',
      updateError:
        'Não foi possível salvar o novo nome da igreja. Tente novamente.',
      updated: 'Nome da igreja atualizado com sucesso.',
    },
    profile: {
      changePassword: 'Alterar senha',
      changed: 'Senha alterada com sucesso.',
      changing: 'Alterando…',
      confirmPassword: 'Confirme a nova senha',
      currentPassword: 'Senha atual',
      email: 'E-mail de acesso',
      error: 'Não foi possível salvar seu perfil. Verifique os dados.',
      intro: 'Atualize seus dados de acesso e mantenha sua conta protegida.',
      invalidCurrent: 'A senha atual está incorreta.',
      loginAgain: 'Entre novamente usando sua nova senha.',
      mismatch: 'As novas senhas não coincidem.',
      name: 'Nome de exibição',
      newPassword: 'Nova senha',
      passwordHint: 'Use entre 6 e 128 caracteres.',
      personalTitle: 'Dados pessoais',
      save: 'Salvar perfil',
      saved: 'Perfil atualizado com sucesso.',
      securityTitle: 'Segurança da conta',
      title: 'Meu perfil',
    },
    users: {
      active: 'Ativo',
      auditor: 'Auditoria',
      churchAdmin: 'Administrador local',
      create: 'Cadastrar usuário',
      created: 'Usuário cadastrado com sucesso.',
      createTitle: 'Novo acesso',
      disabled: 'Acesso suspenso',
      email: 'E-mail de acesso',
      empty: 'Nenhum usuário cadastrado nesta igreja.',
      error: 'Não foi possível cadastrar o usuário. Tente novamente.',
      financialOperator: 'Operação financeira',
      intro:
        'Crie acessos e defina o que cada usuário pode fazer nesta igreja.',
      listTitle: 'Usuários desta igreja',
      name: 'Nome de exibição',
      password: 'Senha inicial',
      passwordHint: 'Entre 6 e 128 caracteres.',
      restricted: 'Esta área é exclusiva dos administradores da igreja.',
      role: 'Perfil de acesso',
      saveAccess: 'Salvar acesso',
      saving: 'Salvando…',
      status: 'Situação',
      title: 'Usuários',
      updateError:
        'Não foi possível alterar o acesso. Mantenha ao menos um administrador ativo.',
      updated: 'Acesso atualizado com sucesso.',
    },
    members: {
      actions: 'Ações',
      address1: 'Endereço',
      address2: 'Complemento',
      city: 'Cidade',
      country: 'País',
      created: 'Cadastrado em',
      details: 'Detalhes do membro',
      delete: 'Excluir membro',
      deleteConfirm:
        'Excluir este membro? O histórico de doações será preservado.',
      deleteError: 'Não foi possível excluir o membro. Tente novamente.',
      deleted: 'Membro excluído com sucesso.',
      deleting: 'Excluindo…',
      edit: 'Editar membro',
      email: 'E-mail',
      empty: 'Nenhum membro encontrado.',
      error:
        'Não foi possível salvar o membro. Revise os dados e tente novamente.',
      formIntro: 'Dados pessoais, endereço e vínculo com a igreja selecionada.',
      historyEmpty: 'Nenhum lançamento foi feito no nome deste membro.',
      historyIntro:
        'Doações registradas para este membro, da mais recente para a mais antiga.',
      historyTitle: 'Histórico de lançamentos',
      listIntro: 'Consulte, pesquise e mantenha os membros desta igreja.',
      name: 'Nome completo',
      new: 'Novo membro',
      notes: 'Observações',
      phone: 'Telefone',
      postalCode: 'ZIP Code',
      region: 'Estado',
      saved: 'Membro salvo com sucesso.',
      search: 'Nome, e-mail ou telefone',
      searchAction: 'Buscar',
      status: 'Status',
      title: 'Membros',
    },
    envelopes: {
      addImage: 'Adicionar imagem',
      allMembers: 'Todos os membros',
      amount: 'Valor',
      cameraAction: 'Fotografar envelope',
      cameraIntro: 'Posicione o envelope inteiro dentro da área da câmera.',
      cameraPermissionError:
        'Não foi possível acessar a câmera. Autorize o acesso e tente novamente.',
      cameraStarting: 'Abrindo câmera…',
      cameraTitle: 'Câmera do envelope',
      cameraUnavailable:
        'A câmera não está disponível neste dispositivo ou navegador.',
      card: 'Cartão',
      cash: 'Dinheiro',
      check: 'Cheque',
      chooseImage: 'Selecionar imagem',
      closeCamera: 'Fechar câmera',
      count: 'Envelopes',
      date: 'Data de recebimento',
      details: 'Detalhes do envelope',
      empty: 'Nenhum envelope encontrado.',
      endDate: 'Data final',
      error: 'Não foi possível salvar o envelope.',
      image: 'Imagem do envelope',
      imageError:
        'Não foi possível preparar a imagem. Use uma foto JPEG ou PNG e tente novamente.',
      imageHint:
        'A imagem será enviada somente ao salvar o envelope e não será adicionada à galeria.',
      imageReady: 'Imagem pronta para envio',
      imageSaved: 'Imagem adicionada ao lançamento com sucesso.',
      imageUploadError:
        'O lançamento foi salvo, mas a imagem não foi enviada. Selecione-a novamente para tentar outra vez.',
      imageUploading: 'Enviando imagem…',
      listIntro: 'Consulte lançamentos e imagens da igreja ativa.',
      member: 'Membro relacionado',
      new: 'Lançar envelope',
      notes: 'Observação',
      operator: 'Operador',
      paymentMethod: 'Forma de pagamento',
      previewAlt: 'Prévia da imagem do envelope',
      removeImage: 'Remover imagem',
      retakePhoto: 'Tirar novamente',
      saved: 'Envelope lançado com sucesso.',
      startDate: 'Data inicial',
      title: 'Envelopes',
      takePhoto: 'Tirar foto',
      total: 'Total',
      usePhoto: 'Usar esta foto',
      view: 'Ver detalhes',
    },
    dashboard: {
      annualBook: 'Livro Anual',
      annualBookDescription:
        'Registre o movimento diário, confira cartões e acompanhe os depósitos esperados.',
      churches: 'Igrejas',
      churchesDescription:
        'Cadastre, renomeie e organize as igrejas disponíveis na plataforma.',
      donations: 'Doações',
      donationsDescription:
        'Consulte os lançamentos e as imagens dos envelopes.',
      launch: 'Lançar',
      launchDescription:
        'Registre uma nova doação, a forma de pagamento e a imagem do envelope.',
      members: 'Membros',
      membersDescription: 'Cadastre, consulte e atualize os membros da igreja.',
      open: 'Acessar',
      reports: 'Relatórios',
      reportsDescription:
        'Gere relatórios por período, membro e forma de pagamento.',
      subtitle: 'Acesse as principais áreas de gestão da igreja.',
      title: 'Visão geral',
    },
    reports: {
      archive: 'Relatórios arquivados',
      allMembers: 'Todos os membros',
      annualBook: 'Livro Anual',
      annualBookDescription:
        'Dinheiro, cheque, cartão, Online, Designated e Undesignated do período.',
      annualBookFilterHint:
        'Este relatório utiliza os lançamentos diários do Livro Anual.',
      annualBookDays: 'Dias lançados',
      annualMembers: 'Resumo anual por doador',
      annualMembersDescription:
        'Todos os doadores em linhas, com janeiro a dezembro e total anual.',
      annualMembersFilterHint:
        'Este formato sempre reúne todos os doadores do ano escolhido.',
      contentDescription: 'Escolha como os dados serão organizados.',
      contentTitle: 'O que o relatório deve mostrar?',
      customPeriod: 'Período personalizado',
      detailed: 'Todos os lançamentos',
      detailedDescription:
        'Data, membro, valor e forma de pagamento de cada envelope.',
      donor: 'Doador',
      download: 'Baixar PDF',
      downloadError: 'Não foi possível baixar o PDF. Tente novamente.',
      empty: 'Escolha as opções acima para visualizar o relatório.',
      generate: 'Visualizar relatório',
      imagesIntro: 'Decida se o PDF também deve levar os comprovantes.',
      imagesTitle: 'Incluir imagens?',
      includeImages: 'Incluir imagens dos envelopes no PDF',
      includeImagesDescription:
        'Cada imagem ficará junto aos dados do lançamento correspondente.',
      intro: 'Monte o relatório escolhendo o conteúdo, as imagens e o período.',
      last30Days: 'Últimos 30 dias',
      lastMonth: 'Mês anterior',
      memberTotals: 'Resumo por contribuinte',
      memberTotalsDescription:
        'Valor total doado por cada contribuinte no período selecionado.',
      memberFilterDescription:
        'Busque no cadastro ou mantenha todos os membros no relatório.',
      memberFilterLabel: 'Membro do relatório',
      memberFilterTitle: 'Para quem é o relatório?',
      memberSearchEmpty: 'Nenhum membro encontrado com essa busca.',
      memberSearchPlaceholder: 'Digite o nome, e-mail ou telefone',
      monthLabel: 'Selecione ou digite o mês',
      monthMode: 'Mês',
      monthModeHint: 'Escolha um mês específico',
      nextYear: 'Próximo ano',
      noResults: 'Nenhum lançamento foi encontrado no período escolhido.',
      paymentMethods: 'Total por forma de pagamento',
      paymentMethodsDescription:
        'Totais separados entre dinheiro, cartão e cheque.',
      period: 'Período',
      periodDescription: 'Use um atalho, escolha um mês ou informe as datas.',
      periodTitle: 'Qual período?',
      previewTitle: 'RELATÓRIO SELECIONADO',
      previousYear: 'Ano anterior',
      reportType: 'Tipo de relatório',
      savedReports: 'relatórios salvos',
      selectionSummary: 'Sua seleção',
      thisMonth: 'Este mês',
      thisYear: 'Este ano',
      title: 'Relatórios',
      customPeriodHint: 'Defina duas datas',
      useEntireYear: 'Usar o ano inteiro',
      athMobile: 'Online',
      designated: 'Designated',
      totalWithoutAth: 'Total sem Online',
      undesignated: 'Undesignated',
      withImages: 'Com imagens',
      withoutImages: 'Sem imagens',
      yearLabel: 'Selecione ou digite o ano',
      yearMode: 'Ano inteiro',
      yearModeHint: 'De janeiro a dezembro',
    },
  },
  en: {
    common: {
      active: 'Active',
      anonymous: 'Anonymous',
      back: 'Back',
      cancel: 'Cancel',
      church: 'Church',
      inactive: 'Inactive',
      loading: 'Loading…',
      optional: 'Optional',
      save: 'Save',
      saving: 'Saving…',
    },
    churches: {
      create: 'Create church',
      created: 'Church created successfully.',
      creating: 'Creating…',
      delete: 'Delete church',
      deleteConfirm:
        'Remove “{name}” from the menu? Members, donations and reports will be preserved.',
      deleteError: 'The church could not be deleted. Try again.',
      deleted: 'Church removed from the menu successfully.',
      edit: 'Edit church',
      empty: 'No churches have been created.',
      error: 'The church could not be created. Review the name and try again.',
      intro:
        'Add only the name needed to separate members, entries and reports.',
      lastChurchError: 'The last active church cannot be deleted.',
      listTitle: 'Available churches',
      name: 'Church name',
      namePlaceholder: 'Example: UCKG New York',
      restricted: 'This area is restricted to the platform administrator.',
      title: 'Churches',
      updateError: 'The new church name could not be saved. Try again.',
      updated: 'Church name updated successfully.',
    },
    profile: {
      changePassword: 'Change password',
      changed: 'Password changed successfully.',
      changing: 'Changing…',
      confirmPassword: 'Confirm new password',
      currentPassword: 'Current password',
      email: 'Login email',
      error: 'Your profile could not be saved. Review the details.',
      intro: 'Update your login details and keep your account protected.',
      invalidCurrent: 'The current password is incorrect.',
      loginAgain: 'Sign in again using your new password.',
      mismatch: 'The new passwords do not match.',
      name: 'Display name',
      newPassword: 'New password',
      passwordHint: 'Use between 6 and 128 characters.',
      personalTitle: 'Personal details',
      save: 'Save profile',
      saved: 'Profile updated successfully.',
      securityTitle: 'Account security',
      title: 'My profile',
    },
    users: {
      active: 'Active',
      auditor: 'Audit',
      churchAdmin: 'Local administrator',
      create: 'Create user',
      created: 'User created successfully.',
      createTitle: 'New access',
      disabled: 'Access suspended',
      email: 'Login email',
      empty: 'No users have been created for this church.',
      error: 'The user could not be created. Please try again.',
      financialOperator: 'Financial operations',
      intro: 'Create access and define what each user can do in this church.',
      listTitle: 'Users in this church',
      name: 'Display name',
      password: 'Initial password',
      passwordHint: 'Between 6 and 128 characters.',
      restricted: 'This area is restricted to church administrators.',
      role: 'Access role',
      saveAccess: 'Save access',
      saving: 'Saving…',
      status: 'Status',
      title: 'Users',
      updateError:
        'Access could not be changed. Keep at least one active administrator.',
      updated: 'Access updated successfully.',
    },
    members: {
      actions: 'Actions',
      address1: 'Address',
      address2: 'Address line 2',
      city: 'City',
      country: 'Country',
      created: 'Registered on',
      details: 'Member details',
      delete: 'Delete member',
      deleteConfirm: 'Delete this member? Donation history will be preserved.',
      deleteError: 'Unable to delete the member. Try again.',
      deleted: 'Member deleted successfully.',
      deleting: 'Deleting…',
      edit: 'Edit member',
      email: 'Email',
      empty: 'No members found.',
      error: 'Unable to save the member. Review the details and try again.',
      formIntro: 'Personal details, address and selected church assignment.',
      historyEmpty: 'No entries have been recorded for this member.',
      historyIntro:
        'Donations recorded for this member, from newest to oldest.',
      historyTitle: 'Entry history',
      listIntro: 'Find, review and manage members in this church.',
      name: 'Full name',
      new: 'New member',
      notes: 'Notes',
      phone: 'Phone',
      postalCode: 'ZIP Code',
      region: 'State',
      saved: 'Member saved successfully.',
      search: 'Name, email or phone',
      searchAction: 'Search',
      status: 'Status',
      title: 'Members',
    },
    envelopes: {
      addImage: 'Add image',
      allMembers: 'All members',
      amount: 'Amount',
      cameraAction: 'Photograph envelope',
      cameraIntro: 'Position the entire envelope inside the camera area.',
      cameraPermissionError:
        'The camera could not be accessed. Allow camera access and try again.',
      cameraStarting: 'Opening camera…',
      cameraTitle: 'Envelope camera',
      cameraUnavailable:
        'The camera is not available on this device or browser.',
      card: 'Card',
      cash: 'Cash',
      check: 'Check',
      chooseImage: 'Select image',
      closeCamera: 'Close camera',
      count: 'Envelopes',
      date: 'Date received',
      details: 'Envelope details',
      empty: 'No envelopes found.',
      endDate: 'End date',
      error: 'Unable to save the envelope.',
      image: 'Envelope image',
      imageError:
        'The image could not be prepared. Use a JPEG or PNG photo and try again.',
      imageHint:
        'The image will only be uploaded when you save the envelope and will not be added to the photo gallery.',
      imageReady: 'Image ready to upload',
      imageSaved: 'Image successfully added to the entry.',
      imageUploadError:
        'The entry was saved, but the image was not uploaded. Select it again to retry.',
      imageUploading: 'Uploading image…',
      listIntro: 'Review entries and images for the active church.',
      member: 'Related member',
      new: 'Record envelope',
      notes: 'Note',
      operator: 'Operator',
      paymentMethod: 'Payment method',
      previewAlt: 'Envelope image preview',
      removeImage: 'Remove image',
      retakePhoto: 'Retake photo',
      saved: 'Envelope recorded successfully.',
      startDate: 'Start date',
      title: 'Envelopes',
      takePhoto: 'Take photo',
      total: 'Total',
      usePhoto: 'Use this photo',
      view: 'View details',
    },
    dashboard: {
      annualBook: 'Annual Book',
      annualBookDescription:
        'Record daily activity, reconcile card totals and track expected deposits.',
      churches: 'Churches',
      churchesDescription:
        'Create, rename and organize the churches available on the platform.',
      donations: 'Donations',
      donationsDescription: 'Review donation entries and envelope images.',
      launch: 'Record',
      launchDescription:
        'Record a new donation, payment method and envelope image.',
      members: 'Members',
      membersDescription: 'Register, review and update members of the church.',
      open: 'Open',
      reports: 'Reports',
      reportsDescription:
        'Generate reports by period, member and payment method.',
      subtitle: 'Open the main management areas for this church.',
      title: 'Overview',
    },
    reports: {
      archive: 'Archived reports',
      allMembers: 'All members',
      annualBook: 'Annual Book',
      annualBookDescription:
        'Cash, checks, cards, Online, Designated and Undesignated for the period.',
      annualBookFilterHint:
        'This report uses the daily entries from the Annual Book.',
      annualBookDays: 'Recorded days',
      annualMembers: 'Annual donor summary',
      annualMembersDescription:
        'All donors in rows, with January through December and an annual total.',
      annualMembersFilterHint:
        'This format always includes every donor in the selected year.',
      contentDescription: 'Choose how the data should be organized.',
      contentTitle: 'What should the report show?',
      customPeriod: 'Custom period',
      detailed: 'All entries',
      detailedDescription:
        'Date, member, amount and payment method for every envelope.',
      donor: 'Donor',
      download: 'Download PDF',
      downloadError: 'The PDF could not be downloaded. Try again.',
      empty: 'Choose the options above to preview the report.',
      generate: 'Preview report',
      imagesIntro: 'Choose whether the PDF should include the records.',
      imagesTitle: 'Include images?',
      includeImages: 'Include envelope images in the PDF',
      includeImagesDescription:
        'Each image will stay with the corresponding entry details.',
      intro: 'Build a report by choosing its content, images and period.',
      last30Days: 'Last 30 days',
      lastMonth: 'Previous month',
      memberTotals: 'Contributor summary',
      memberTotalsDescription:
        'Total donated by each contributor in the selected period.',
      memberFilterDescription:
        'Search the member registry or keep everyone in the report.',
      memberFilterLabel: 'Report member',
      memberFilterTitle: 'Who is this report for?',
      memberSearchEmpty: 'No members matched this search.',
      memberSearchPlaceholder: 'Type a name, email or phone',
      monthLabel: 'Select or type the month',
      monthMode: 'Month',
      monthModeHint: 'Choose a specific month',
      nextYear: 'Next year',
      noResults: 'No entries were found in the selected period.',
      paymentMethods: 'Total by payment method',
      paymentMethodsDescription: 'Totals separated into cash, card and check.',
      period: 'Period',
      periodDescription: 'Use a shortcut, choose a month or enter dates.',
      periodTitle: 'Which period?',
      previewTitle: 'SELECTED REPORT',
      previousYear: 'Previous year',
      reportType: 'Report type',
      savedReports: 'saved reports',
      selectionSummary: 'Your selection',
      thisMonth: 'This month',
      thisYear: 'This year',
      title: 'Reports',
      customPeriodHint: 'Set two dates',
      useEntireYear: 'Use the entire year',
      athMobile: 'Online',
      designated: 'Designated',
      totalWithoutAth: 'Total without Online',
      undesignated: 'Undesignated',
      withImages: 'With images',
      withoutImages: 'Without images',
      yearLabel: 'Select or type the year',
      yearMode: 'Entire year',
      yearModeHint: 'January through December',
    },
  },
  es: {
    common: {
      active: 'Activo',
      anonymous: 'Anónimo',
      back: 'Volver',
      cancel: 'Cancelar',
      church: 'Iglesia',
      inactive: 'Inactivo',
      loading: 'Cargando…',
      optional: 'Opcional',
      save: 'Guardar',
      saving: 'Guardando…',
    },
    churches: {
      create: 'Crear iglesia',
      created: 'Iglesia creada correctamente.',
      creating: 'Creando…',
      delete: 'Eliminar iglesia',
      deleteConfirm:
        '¿Eliminar “{name}” del menú? Se conservarán los miembros, las donaciones y los informes.',
      deleteError: 'No fue posible eliminar la iglesia. Inténtalo de nuevo.',
      deleted: 'Iglesia eliminada del menú correctamente.',
      edit: 'Editar iglesia',
      empty: 'No hay iglesias registradas.',
      error:
        'No fue posible crear la iglesia. Revisa el nombre e inténtalo de nuevo.',
      intro:
        'Registra únicamente el nombre necesario para separar miembros, registros e informes.',
      lastChurchError: 'No se puede eliminar la última iglesia activa.',
      listTitle: 'Iglesias disponibles',
      name: 'Nombre de la iglesia',
      namePlaceholder: 'Ej.: UCKG New York',
      restricted: 'Esta área es exclusiva del administrador de la plataforma.',
      title: 'Iglesias',
      updateError:
        'No fue posible guardar el nuevo nombre de la iglesia. Inténtalo de nuevo.',
      updated: 'Nombre de la iglesia actualizado correctamente.',
    },
    profile: {
      changePassword: 'Cambiar contraseña',
      changed: 'Contraseña cambiada correctamente.',
      changing: 'Cambiando…',
      confirmPassword: 'Confirma la nueva contraseña',
      currentPassword: 'Contraseña actual',
      email: 'Correo de acceso',
      error: 'No fue posible guardar tu perfil. Revisa los datos.',
      intro: 'Actualiza tus datos de acceso y mantén tu cuenta protegida.',
      invalidCurrent: 'La contraseña actual es incorrecta.',
      loginAgain: 'Inicia sesión nuevamente con tu nueva contraseña.',
      mismatch: 'Las nuevas contraseñas no coinciden.',
      name: 'Nombre visible',
      newPassword: 'Nueva contraseña',
      passwordHint: 'Usa entre 6 y 128 caracteres.',
      personalTitle: 'Datos personales',
      save: 'Guardar perfil',
      saved: 'Perfil actualizado correctamente.',
      securityTitle: 'Seguridad de la cuenta',
      title: 'Mi perfil',
    },
    users: {
      active: 'Activo',
      auditor: 'Auditoría',
      churchAdmin: 'Administrador local',
      create: 'Registrar usuario',
      created: 'Usuario registrado correctamente.',
      createTitle: 'Nuevo acceso',
      disabled: 'Acceso suspendido',
      email: 'Correo de acceso',
      empty: 'No hay usuarios registrados en esta iglesia.',
      error: 'No fue posible registrar el usuario. Inténtalo de nuevo.',
      financialOperator: 'Operación financiera',
      intro:
        'Crea accesos y define qué puede hacer cada usuario en esta iglesia.',
      listTitle: 'Usuarios de esta iglesia',
      name: 'Nombre visible',
      password: 'Contraseña inicial',
      passwordHint: 'Entre 6 y 128 caracteres.',
      restricted:
        'Esta área es exclusiva de los administradores de la iglesia.',
      role: 'Perfil de acceso',
      saveAccess: 'Guardar acceso',
      saving: 'Guardando…',
      status: 'Estado',
      title: 'Usuarios',
      updateError:
        'No fue posible cambiar el acceso. Mantén al menos un administrador activo.',
      updated: 'Acceso actualizado correctamente.',
    },
    members: {
      actions: 'Acciones',
      address1: 'Dirección',
      address2: 'Complemento',
      city: 'Ciudad',
      country: 'País',
      created: 'Registrado el',
      details: 'Detalles del miembro',
      delete: 'Eliminar miembro',
      deleteConfirm:
        '¿Eliminar este miembro? Se conservará el historial de donaciones.',
      deleteError: 'No fue posible eliminar el miembro. Inténtalo de nuevo.',
      deleted: 'Miembro eliminado correctamente.',
      deleting: 'Eliminando…',
      edit: 'Editar miembro',
      email: 'Correo electrónico',
      empty: 'No se encontraron miembros.',
      error:
        'No fue posible guardar el miembro. Revisa los datos e inténtalo de nuevo.',
      formIntro:
        'Datos personales, dirección y vínculo con la iglesia seleccionada.',
      historyEmpty: 'No se registraron movimientos para este miembro.',
      historyIntro:
        'Donaciones registradas para este miembro, de la más reciente a la más antigua.',
      historyTitle: 'Historial de registros',
      listIntro: 'Consulta, busca y administra los miembros de esta iglesia.',
      name: 'Nombre completo',
      new: 'Nuevo miembro',
      notes: 'Observaciones',
      phone: 'Teléfono',
      postalCode: 'ZIP Code',
      region: 'Estado',
      saved: 'Miembro guardado correctamente.',
      search: 'Nombre, correo o teléfono',
      searchAction: 'Buscar',
      status: 'Estado',
      title: 'Miembros',
    },
    envelopes: {
      addImage: 'Añadir imagen',
      allMembers: 'Todos los miembros',
      amount: 'Valor',
      cameraAction: 'Fotografiar sobre',
      cameraIntro: 'Coloca el sobre completo dentro del área de la cámara.',
      cameraPermissionError:
        'No fue posible acceder a la cámara. Autoriza el acceso e inténtalo de nuevo.',
      cameraStarting: 'Abriendo cámara…',
      cameraTitle: 'Cámara del sobre',
      cameraUnavailable:
        'La cámara no está disponible en este dispositivo o navegador.',
      card: 'Tarjeta',
      cash: 'Efectivo',
      check: 'Cheque',
      chooseImage: 'Seleccionar imagen',
      closeCamera: 'Cerrar cámara',
      count: 'Sobres',
      date: 'Fecha de recepción',
      details: 'Detalles del sobre',
      empty: 'No se encontraron sobres.',
      endDate: 'Fecha final',
      error: 'No fue posible guardar el sobre.',
      image: 'Imagen del sobre',
      imageError:
        'No fue posible preparar la imagen. Usa una foto JPEG o PNG e inténtalo de nuevo.',
      imageHint:
        'La imagen se enviará únicamente al guardar el sobre y no se añadirá a la galería.',
      imageReady: 'Imagen lista para enviar',
      imageSaved: 'Imagen añadida correctamente al registro.',
      imageUploadError:
        'El registro se guardó, pero la imagen no se envió. Selecciónala de nuevo para volver a intentarlo.',
      imageUploading: 'Enviando imagen…',
      listIntro: 'Consulta registros e imágenes de la iglesia activa.',
      member: 'Miembro relacionado',
      new: 'Registrar sobre',
      notes: 'Observación',
      operator: 'Operador',
      paymentMethod: 'Forma de pago',
      previewAlt: 'Vista previa de la imagen del sobre',
      removeImage: 'Eliminar imagen',
      retakePhoto: 'Tomar otra foto',
      saved: 'Sobre registrado correctamente.',
      startDate: 'Fecha inicial',
      title: 'Sobres',
      takePhoto: 'Tomar foto',
      total: 'Total',
      usePhoto: 'Usar esta foto',
      view: 'Ver detalles',
    },
    dashboard: {
      annualBook: 'Libro Anual',
      annualBookDescription:
        'Registra el movimiento diario, concilia tarjetas y controla los depósitos esperados.',
      churches: 'Iglesias',
      churchesDescription:
        'Crea, renombra y organiza las iglesias disponibles en la plataforma.',
      donations: 'Donaciones',
      donationsDescription:
        'Consulta los registros y las imágenes de los sobres.',
      launch: 'Registrar',
      launchDescription:
        'Registra una nueva donación, la forma de pago y la imagen del sobre.',
      members: 'Miembros',
      membersDescription:
        'Registra, consulta y actualiza los miembros de la iglesia.',
      open: 'Acceder',
      reports: 'Informes',
      reportsDescription:
        'Genera informes por período, miembro y forma de pago.',
      subtitle: 'Accede a las principales áreas de gestión de la iglesia.',
      title: 'Vista general',
    },
    reports: {
      archive: 'Informes archivados',
      allMembers: 'Todos los miembros',
      annualBook: 'Libro Anual',
      annualBookDescription:
        'Efectivo, cheques, tarjetas, Online, Designated y Undesignated del período.',
      annualBookFilterHint:
        'Este informe utiliza los registros diarios del Libro Anual.',
      annualBookDays: 'Días registrados',
      annualMembers: 'Resumen anual por donante',
      annualMembersDescription:
        'Todos los donantes en filas, con enero a diciembre y total anual.',
      annualMembersFilterHint:
        'Este formato siempre incluye todos los donantes del año elegido.',
      contentDescription: 'Elige cómo se organizarán los datos.',
      contentTitle: '¿Qué debe mostrar el informe?',
      customPeriod: 'Período personalizado',
      detailed: 'Todos los registros',
      detailedDescription:
        'Fecha, miembro, valor y forma de pago de cada sobre.',
      donor: 'Donante',
      download: 'Descargar PDF',
      downloadError: 'No fue posible descargar el PDF. Inténtalo de nuevo.',
      empty: 'Elige las opciones anteriores para visualizar el informe.',
      generate: 'Visualizar informe',
      imagesIntro: 'Decide si el PDF también debe incluir los comprobantes.',
      imagesTitle: '¿Incluir imágenes?',
      includeImages: 'Incluir imágenes de los sobres en el PDF',
      includeImagesDescription:
        'Cada imagen permanecerá junto a los datos del registro correspondiente.',
      intro:
        'Crea el informe eligiendo el contenido, las imágenes y el período.',
      last30Days: 'Últimos 30 días',
      lastMonth: 'Mes anterior',
      memberTotals: 'Resumen por contribuyente',
      memberTotalsDescription:
        'Valor total donado por cada contribuyente en el período seleccionado.',
      memberFilterDescription:
        'Busca en el registro o mantén todos los miembros en el informe.',
      memberFilterLabel: 'Miembro del informe',
      memberFilterTitle: '¿Para quién es el informe?',
      memberSearchEmpty: 'No se encontraron miembros con esta búsqueda.',
      memberSearchPlaceholder: 'Escribe el nombre, correo o teléfono',
      monthLabel: 'Selecciona o escribe el mes',
      monthMode: 'Mes',
      monthModeHint: 'Elige un mes específico',
      nextYear: 'Año siguiente',
      noResults: 'No se encontraron registros en el período seleccionado.',
      paymentMethods: 'Total por forma de pago',
      paymentMethodsDescription:
        'Totales separados entre efectivo, tarjeta y cheque.',
      period: 'Período',
      periodDescription:
        'Usa un acceso rápido, elige un mes o indica las fechas.',
      periodTitle: '¿Qué período?',
      previewTitle: 'INFORME SELECCIONADO',
      previousYear: 'Año anterior',
      reportType: 'Tipo de informe',
      savedReports: 'informes guardados',
      selectionSummary: 'Tu selección',
      thisMonth: 'Este mes',
      thisYear: 'Este año',
      title: 'Informes',
      customPeriodHint: 'Define dos fechas',
      useEntireYear: 'Usar el año completo',
      athMobile: 'Online',
      designated: 'Designated',
      totalWithoutAth: 'Total sin Online',
      undesignated: 'Undesignated',
      withImages: 'Con imágenes',
      withoutImages: 'Sin imágenes',
      yearLabel: 'Selecciona o escribe el año',
      yearMode: 'Año completo',
      yearModeHint: 'De enero a diciembre',
    },
  },
};
