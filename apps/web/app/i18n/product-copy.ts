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
  members: {
    address1: string;
    address2: string;
    city: string;
    country: string;
    created: string;
    empty: string;
    formIntro: string;
    listIntro: string;
    name: string;
    new: string;
    notes: string;
    phone: string;
    postalCode: string;
    region: string;
    search: string;
    status: string;
    title: string;
    email: string;
    edit: string;
    details: string;
    saved: string;
    error: string;
  };
  envelopes: {
    allMembers: string;
    amount: string;
    count: string;
    date: string;
    details: string;
    empty: string;
    endDate: string;
    error: string;
    image: string;
    listIntro: string;
    member: string;
    new: string;
    notes: string;
    operator: string;
    saved: string;
    startDate: string;
    title: string;
    total: string;
    view: string;
  };
  dashboard: {
    envelopes: string;
    latest: string;
    members: string;
    newEnvelope: string;
    newMember: string;
    subtitle: string;
    title: string;
    total: string;
  };
  reports: {
    archive: string;
    download: string;
    empty: string;
    generate: string;
    intro: string;
    title: string;
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
    members: {
      address1: 'Endereço',
      address2: 'Complemento',
      city: 'Cidade',
      country: 'País',
      created: 'Cadastrado em',
      details: 'Detalhes do membro',
      edit: 'Editar membro',
      email: 'E-mail',
      empty: 'Nenhum membro encontrado.',
      error:
        'Não foi possível salvar o membro. Revise os dados e tente novamente.',
      formIntro: 'Dados pessoais, endereço e vínculo com a congregação ativa.',
      listIntro: 'Consulte, pesquise e mantenha os membros desta congregação.',
      name: 'Nome completo',
      new: 'Novo membro',
      notes: 'Observações',
      phone: 'Telefone',
      postalCode: 'ZIP Code',
      region: 'Estado',
      saved: 'Membro salvo com sucesso.',
      search: 'Buscar por nome, e-mail ou telefone',
      status: 'Status',
      title: 'Membros',
    },
    envelopes: {
      allMembers: 'Todos os membros',
      amount: 'Valor',
      count: 'Envelopes',
      date: 'Data de recebimento',
      details: 'Detalhes do envelope',
      empty: 'Nenhum envelope encontrado.',
      endDate: 'Data final',
      error: 'Não foi possível salvar o envelope.',
      image: 'Imagem do envelope',
      listIntro: 'Consulte lançamentos e imagens da congregação ativa.',
      member: 'Membro relacionado',
      new: 'Lançar envelope',
      notes: 'Observação',
      operator: 'Operador',
      saved: 'Envelope lançado com sucesso.',
      startDate: 'Data inicial',
      title: 'Envelopes',
      total: 'Total',
      view: 'Ver detalhes',
    },
    dashboard: {
      envelopes: 'Envelopes no período',
      latest: 'Últimos envelopes',
      members: 'Membros ativos',
      newEnvelope: 'Lançar envelope',
      newMember: 'Cadastrar membro',
      subtitle: 'Resumo atualizado da congregação selecionada.',
      title: 'Visão geral',
      total: 'Total no período',
    },
    reports: {
      archive: 'Relatórios arquivados',
      download: 'Baixar PDF',
      empty: 'Escolha o período para gerar o relatório.',
      generate: 'Gerar relatório',
      intro: 'Totais e lançamentos consolidados em um PDF.',
      title: 'Relatórios',
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
    members: {
      address1: 'Address',
      address2: 'Address line 2',
      city: 'City',
      country: 'Country',
      created: 'Registered on',
      details: 'Member details',
      edit: 'Edit member',
      email: 'Email',
      empty: 'No members found.',
      error: 'Unable to save the member. Review the details and try again.',
      formIntro:
        'Personal details, address and active congregation assignment.',
      listIntro: 'Find, review and manage members in this congregation.',
      name: 'Full name',
      new: 'New member',
      notes: 'Notes',
      phone: 'Phone',
      postalCode: 'ZIP Code',
      region: 'State',
      saved: 'Member saved successfully.',
      search: 'Search by name, email or phone',
      status: 'Status',
      title: 'Members',
    },
    envelopes: {
      allMembers: 'All members',
      amount: 'Amount',
      count: 'Envelopes',
      date: 'Date received',
      details: 'Envelope details',
      empty: 'No envelopes found.',
      endDate: 'End date',
      error: 'Unable to save the envelope.',
      image: 'Envelope image',
      listIntro: 'Review entries and images for the active congregation.',
      member: 'Related member',
      new: 'Record envelope',
      notes: 'Note',
      operator: 'Operator',
      saved: 'Envelope recorded successfully.',
      startDate: 'Start date',
      title: 'Envelopes',
      total: 'Total',
      view: 'View details',
    },
    dashboard: {
      envelopes: 'Envelopes in period',
      latest: 'Latest envelopes',
      members: 'Active members',
      newEnvelope: 'Record envelope',
      newMember: 'Register member',
      subtitle: 'Current summary for the selected congregation.',
      title: 'Overview',
      total: 'Period total',
    },
    reports: {
      archive: 'Archived reports',
      download: 'Download PDF',
      empty: 'Select a period to generate the report.',
      generate: 'Generate report',
      intro: 'Consolidated totals and entries in a PDF.',
      title: 'Reports',
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
    members: {
      address1: 'Dirección',
      address2: 'Complemento',
      city: 'Ciudad',
      country: 'País',
      created: 'Registrado el',
      details: 'Detalles del miembro',
      edit: 'Editar miembro',
      email: 'Correo electrónico',
      empty: 'No se encontraron miembros.',
      error:
        'No fue posible guardar el miembro. Revisa los datos e inténtalo de nuevo.',
      formIntro:
        'Datos personales, dirección y vínculo con la congregación activa.',
      listIntro:
        'Consulta, busca y administra los miembros de esta congregación.',
      name: 'Nombre completo',
      new: 'Nuevo miembro',
      notes: 'Observaciones',
      phone: 'Teléfono',
      postalCode: 'ZIP Code',
      region: 'Estado',
      saved: 'Miembro guardado correctamente.',
      search: 'Buscar por nombre, correo o teléfono',
      status: 'Estado',
      title: 'Miembros',
    },
    envelopes: {
      allMembers: 'Todos los miembros',
      amount: 'Valor',
      count: 'Sobres',
      date: 'Fecha de recepción',
      details: 'Detalles del sobre',
      empty: 'No se encontraron sobres.',
      endDate: 'Fecha final',
      error: 'No fue posible guardar el sobre.',
      image: 'Imagen del sobre',
      listIntro: 'Consulta registros e imágenes de la congregación activa.',
      member: 'Miembro relacionado',
      new: 'Registrar sobre',
      notes: 'Observación',
      operator: 'Operador',
      saved: 'Sobre registrado correctamente.',
      startDate: 'Fecha inicial',
      title: 'Sobres',
      total: 'Total',
      view: 'Ver detalles',
    },
    dashboard: {
      envelopes: 'Sobres en el período',
      latest: 'Últimos sobres',
      members: 'Miembros activos',
      newEnvelope: 'Registrar sobre',
      newMember: 'Registrar miembro',
      subtitle: 'Resumen actualizado de la congregación seleccionada.',
      title: 'Vista general',
      total: 'Total del período',
    },
    reports: {
      archive: 'Informes archivados',
      download: 'Descargar PDF',
      empty: 'Elige el período para generar el informe.',
      generate: 'Generar informe',
      intro: 'Totales y registros consolidados en un PDF.',
      title: 'Informes',
    },
  },
};
