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
    imageHint: string;
    imageReady: string;
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
    contentDescription: string;
    contentTitle: string;
    customPeriod: string;
    detailed: string;
    detailedDescription: string;
    download: string;
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
    withImages: string;
    withoutImages: string;
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
      listIntro: 'Consulte, pesquise e mantenha os membros desta congregação.',
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
      imageHint:
        'A imagem será enviada somente ao salvar o envelope e não será adicionada à galeria.',
      imageReady: 'Imagem pronta para envio',
      listIntro: 'Consulte lançamentos e imagens da congregação ativa.',
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
      membersDescription:
        'Cadastre, consulte e atualize os membros da congregação.',
      open: 'Acessar',
      reports: 'Relatórios',
      reportsDescription:
        'Gere relatórios por período, membro e forma de pagamento.',
      subtitle: 'Acesse as principais áreas de gestão da congregação.',
      title: 'Visão geral',
    },
    reports: {
      archive: 'Relatórios arquivados',
      contentDescription: 'Escolha como os dados serão organizados.',
      contentTitle: 'O que o relatório deve mostrar?',
      customPeriod: 'Período personalizado',
      detailed: 'Todos os lançamentos',
      detailedDescription:
        'Data, membro, valor e forma de pagamento de cada envelope.',
      download: 'Baixar PDF',
      empty: 'Escolha as opções acima para visualizar o relatório.',
      generate: 'Visualizar relatório',
      imagesIntro: 'Decida se o PDF também deve levar os comprovantes.',
      imagesTitle: 'Incluir imagens?',
      includeImages: 'Incluir imagens dos envelopes no PDF',
      includeImagesDescription:
        'As imagens serão adicionadas em um anexo organizado após o relatório.',
      intro: 'Monte o relatório escolhendo o conteúdo, as imagens e o período.',
      last30Days: 'Últimos 30 dias',
      lastMonth: 'Mês anterior',
      memberTotals: 'Total por membro',
      memberTotalsDescription:
        'Quantidade de envelopes e valor total doado por cada membro.',
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
      withImages: 'Com imagens',
      withoutImages: 'Sem imagens',
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
      listIntro: 'Find, review and manage members in this congregation.',
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
      imageHint:
        'The image will only be uploaded when you save the envelope and will not be added to the photo gallery.',
      imageReady: 'Image ready to upload',
      listIntro: 'Review entries and images for the active congregation.',
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
      churches: 'Churches',
      churchesDescription:
        'Create, rename and organize the churches available on the platform.',
      donations: 'Donations',
      donationsDescription: 'Review donation entries and envelope images.',
      launch: 'Record',
      launchDescription:
        'Record a new donation, payment method and envelope image.',
      members: 'Members',
      membersDescription:
        'Register, review and update members of the congregation.',
      open: 'Open',
      reports: 'Reports',
      reportsDescription:
        'Generate reports by period, member and payment method.',
      subtitle: 'Open the main management areas for this congregation.',
      title: 'Overview',
    },
    reports: {
      archive: 'Archived reports',
      contentDescription: 'Choose how the data should be organized.',
      contentTitle: 'What should the report show?',
      customPeriod: 'Custom period',
      detailed: 'All entries',
      detailedDescription:
        'Date, member, amount and payment method for every envelope.',
      download: 'Download PDF',
      empty: 'Choose the options above to preview the report.',
      generate: 'Preview report',
      imagesIntro: 'Choose whether the PDF should include the records.',
      imagesTitle: 'Include images?',
      includeImages: 'Include envelope images in the PDF',
      includeImagesDescription:
        'Images will be added in an organized appendix after the report.',
      intro: 'Build a report by choosing its content, images and period.',
      last30Days: 'Last 30 days',
      lastMonth: 'Previous month',
      memberTotals: 'Total by member',
      memberTotalsDescription:
        'Envelope count and total donated by each member.',
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
      withImages: 'With images',
      withoutImages: 'Without images',
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
      listIntro:
        'Consulta, busca y administra los miembros de esta congregación.',
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
      imageHint:
        'La imagen se enviará únicamente al guardar el sobre y no se añadirá a la galería.',
      imageReady: 'Imagen lista para enviar',
      listIntro: 'Consulta registros e imágenes de la congregación activa.',
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
        'Registra, consulta y actualiza los miembros de la congregación.',
      open: 'Acceder',
      reports: 'Informes',
      reportsDescription:
        'Genera informes por período, miembro y forma de pago.',
      subtitle: 'Accede a las principales áreas de gestión de la congregación.',
      title: 'Vista general',
    },
    reports: {
      archive: 'Informes archivados',
      contentDescription: 'Elige cómo se organizarán los datos.',
      contentTitle: '¿Qué debe mostrar el informe?',
      customPeriod: 'Período personalizado',
      detailed: 'Todos los registros',
      detailedDescription:
        'Fecha, miembro, valor y forma de pago de cada sobre.',
      download: 'Descargar PDF',
      empty: 'Elige las opciones anteriores para visualizar el informe.',
      generate: 'Visualizar informe',
      imagesIntro: 'Decide si el PDF también debe incluir los comprobantes.',
      imagesTitle: '¿Incluir imágenes?',
      includeImages: 'Incluir imágenes de los sobres en el PDF',
      includeImagesDescription:
        'Las imágenes se añadirán en un anexo organizado después del informe.',
      intro:
        'Crea el informe eligiendo el contenido, las imágenes y el período.',
      last30Days: 'Últimos 30 días',
      lastMonth: 'Mes anterior',
      memberTotals: 'Total por miembro',
      memberTotalsDescription:
        'Cantidad de sobres y valor total donado por cada miembro.',
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
      withImages: 'Con imágenes',
      withoutImages: 'Sin imágenes',
    },
  },
};
