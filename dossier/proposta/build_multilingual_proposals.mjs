import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const sourcePath = new URL('./proposta-comercial-uckg.html', import.meta.url);
const source = await readFile(sourcePath, 'utf8');

const rows = [
  ['Proposta Comercial · Universal Gestão Financeira', 'Commercial Proposal · Universal Financial Management', 'Propuesta Comercial · Universal Gestión Financiera'],
  ['Proposta comercial da plataforma Universal Gestão Financeira, com licenciamento individual por igreja.', 'Commercial proposal for the Universal Financial Management platform, licensed individually per church.', 'Propuesta comercial de la plataforma Universal Gestión Financiera, con licencia individual por iglesia.'],
  ['Voltar ao início', 'Back to top', 'Volver al inicio'],
  ['Gestão Financeira', 'Financial Management', 'Gestión Financiera'],
  ['A solução', 'Solution', 'La solución'],
  ['Segurança', 'Security', 'Seguridad'],
  ['Investimento', 'Investment', 'Inversión'],
  ['Imprimir / Salvar PDF', 'Print / Save PDF', 'Imprimir / Guardar PDF'],
  ['Proposta comercial · 2026', 'Commercial proposal · 2026', 'Propuesta comercial · 2026'],
  ['Clareza para cuidar. Segurança para servir.', 'Clarity to care. Security to serve.', 'Claridad para cuidar. Seguridad para servir.'],
  ['Plataforma de gestão de membros, envelopes e relatórios, preparada para organizar a operação financeira de cada igreja com rastreabilidade, privacidade e visão centralizada.', 'A member, envelope and reporting management platform designed to organize each church’s financial operations with traceability, privacy and a centralized view.', 'Plataforma de gestión de miembros, sobres e informes, diseñada para organizar la operación financiera de cada iglesia con trazabilidad, privacidad y una visión centralizada.'],
  ['Contratação individual por igreja', 'Individual contracting per church', 'Contratación individual por iglesia'],
  ['Dados da proposta', 'Proposal details', 'Datos de la propuesta'],
  ['Documento', 'Document', 'Documento'],
  ['Proposta PC-2026-0806', 'Proposal PC-2026-0806', 'Propuesta PC-2026-0806'],
  ['Destinatário', 'Recipient', 'Destinatario'],
  ['Igreja interessada', 'Interested church', 'Iglesia interesada'],
  ['Modelo', 'Model', 'Modelo'],
  ['Por igreja', 'Per church', 'Por iglesia'],
  ['Moeda', 'Currency', 'Moneda'],
  ['Dólar americano', 'US dollars', 'Dólar estadounidense'],
  ['Emissão', 'Issued', 'Emisión'],
  ['06 ago. 2026', 'Aug 6, 2026', '6 ago. 2026'],
  ['Validade', 'Valid through', 'Vigencia'],
  ['05 set. 2026', 'Sep 5, 2026', '5 sep. 2026'],
  ['Visão executiva', 'Executive overview', 'Visión ejecutiva'],
  ['Uma operação mais simples, verificável e responsável.', 'A simpler, verifiable and accountable operation.', 'Una operación más sencilla, verificable y responsable.'],
  ['O sistema reúne em uma única experiência o cadastro de membros, o lançamento de envelopes, as imagens dos comprovantes e a emissão de relatórios. Cada igreja decide individualmente se deseja contratar, sem depender da adesão de outras unidades.', 'The system brings member registration, envelope records, receipt images and report generation into one experience. Each church decides independently whether to subscribe, without depending on other units joining.', 'El sistema reúne en una sola experiencia el registro de miembros, los registros de sobres, las imágenes de comprobantes y la emisión de informes. Cada iglesia decide individualmente si desea contratarlo, sin depender de la adhesión de otras unidades.'],
  ['Menos trabalho manual', 'Less manual work', 'Menos trabajo manual'],
  ['Cadastro, busca, lançamentos e relatórios seguem um fluxo único, reduzindo planilhas paralelas e retrabalho administrativo.', 'Registration, search, records and reports follow one workflow, reducing parallel spreadsheets and administrative rework.', 'El registro, la búsqueda, los movimientos y los informes siguen un flujo único, reduciendo hojas de cálculo paralelas y retrabajo administrativo.'],
  ['Mais rastreabilidade', 'More traceability', 'Mayor trazabilidad'],
  ['Cada lançamento registra data, valor, forma de pagamento, membro relacionado, operador e imagem do envelope quando aplicável.', 'Each entry records the date, amount, payment method, related member, operator and envelope image when applicable.', 'Cada registro guarda la fecha, el importe, la forma de pago, el miembro relacionado, el operador y la imagen del sobre cuando corresponde.'],
  ['Dados separados por igreja', 'Data separated by church', 'Datos separados por iglesia'],
  ['A arquitetura foi desenhada para que cada igreja visualize somente seus próprios membros, registros, imagens e relatórios.', 'The architecture was designed so each church can see only its own members, records, images and reports.', 'La arquitectura fue diseñada para que cada iglesia vea únicamente sus propios miembros, registros, imágenes e informes.'],
  ['Escopo funcional', 'Functional scope', 'Alcance funcional'],
  ['Tudo o que a igreja precisa para a rotina de gestão.', 'Everything the church needs for daily management.', 'Todo lo que la iglesia necesita para su gestión diaria.'],
  ['A plataforma já contempla os principais fluxos administrativos e financeiros do projeto, com experiência responsiva em português, inglês e espanhol.', 'The platform already covers the project’s main administrative and financial workflows, with a responsive experience in Portuguese, English and Spanish.', 'La plataforma ya cubre los principales flujos administrativos y financieros del proyecto, con una experiencia adaptable en portugués, inglés y español.'],
  ['Acesso e perfis', 'Access and roles', 'Acceso y perfiles'],
  ['Login protegido, igreja ativa, administrador da plataforma, administrador da igreja, operador financeiro e auditor, com permissões adequadas a cada função.', 'Protected sign-in, active church, platform administrator, church administrator, financial operator and auditor, with appropriate permissions for each role.', 'Inicio de sesión protegido, iglesia activa, administrador de la plataforma, administrador de la iglesia, operador financiero y auditor, con permisos adecuados para cada función.'],
  ['Gestão de igrejas e usuários', 'Church and user management', 'Gestión de iglesias y usuarios'],
  ['Cadastro e organização das unidades disponíveis, seleção da igreja ativa e administração dos usuários autorizados.', 'Registration and organization of available units, active church selection and management of authorized users.', 'Registro y organización de las unidades disponibles, selección de la iglesia activa y administración de usuarios autorizados.'],
  ['Cadastro de membros', 'Member management', 'Registro de miembros'],
  ['Lista, pesquisa, inclusão, edição, status, contatos, endereço, observações, detalhe individual e histórico de lançamentos.', 'Listing, search, registration, editing, status, contacts, address, notes, individual details and transaction history.', 'Listado, búsqueda, alta, edición, estado, contactos, dirección, observaciones, detalle individual e historial de registros.'],
  ['Lançamento de envelopes', 'Envelope recording', 'Registro de sobres'],
  ['Lançamento de envelope', 'Envelope recording', 'Registro de sobre'],
  ['Registro do valor, data, forma de pagamento, membro, notas e fotografia privada do envelope pelo computador ou celular.', 'Recording of amount, date, payment method, member, notes and a private envelope photo from a computer or mobile device.', 'Registro del importe, fecha, forma de pago, miembro, notas y fotografía privada del sobre desde una computadora o un teléfono móvil.'],
  ['Relatórios e PDFs', 'Reports and PDFs', 'Informes y PDF'],
  ['Relatório detalhado, resumo anual por doador, total por membro, filtros por período e opção de incluir as imagens dos envelopes no PDF.', 'Detailed report, annual donor summary, totals by member, date filters and the option to include envelope images in the PDF.', 'Informe detallado, resumen anual por donante, total por miembro, filtros por período y opción de incluir las imágenes de los sobres en el PDF.'],
  ['Experiência multilíngue', 'Multilingual experience', 'Experiencia multilingüe'],
  ['Interface disponível em português, inglês e espanhol, com navegação responsiva para desktop, tablet e celular.', 'Interface available in Portuguese, English and Spanish, with responsive navigation for desktop, tablet and mobile.', 'Interfaz disponible en portugués, inglés y español, con navegación adaptable para computadora, tableta y teléfono móvil.'],
  ['Experiência do produto', 'Product experience', 'Experiencia del producto'],
  ['Uma interface clara para quem opera todos os dias.', 'A clear interface for everyday operators.', 'Una interfaz clara para quienes operan todos los días.'],
  ['As telas abaixo são registros reais da aplicação executada com dados demonstrativos. Nenhuma informação pessoal de membros reais foi utilizada nesta proposta.', 'The screens below are real captures of the application running with demonstration data. No personal information from real members was used in this proposal.', 'Las pantallas siguientes son capturas reales de la aplicación ejecutada con datos de demostración. No se utilizó información personal de miembros reales en esta propuesta.'],
  ['Tela de visão geral da plataforma', 'Platform overview screen', 'Pantalla de vista general de la plataforma'],
  ['Visão geral', 'Overview', 'Vista general'],
  ['Acesso rápido aos módulos da igreja ativa', 'Quick access to the active church modules', 'Acceso rápido a los módulos de la iglesia activa'],
  ['Tela de acesso seguro ao sistema', 'Secure system access screen', 'Pantalla de acceso seguro al sistema'],
  ['Acesso protegido', 'Protected access', 'Acceso protegido'],
  ['Login institucional e seleção de idioma.', 'Institutional sign-in and language selection.', 'Inicio de sesión institucional y selección de idioma.'],
  ['Tela de listagem e pesquisa de membros', 'Member listing and search screen', 'Pantalla de listado y búsqueda de miembros'],
  ['Gestão de membros', 'Member management', 'Gestión de miembros'],
  ['Busca, situação cadastral e ações administrativas.', 'Search, registration status and administrative actions.', 'Búsqueda, estado de registro y acciones administrativas.'],
  ['Tela de lançamento de envelope', 'Envelope recording screen', 'Pantalla de registro de sobres'],
  ['Valor, pagamento, membro e imagem em um único fluxo.', 'Amount, payment, member and image in a single workflow.', 'Importe, pago, miembro e imagen en un único flujo.'],
  ['Tela para configuração dos relatórios', 'Report configuration screen', 'Pantalla de configuración de informes'],
  ['Construtor de relatórios', 'Report builder', 'Constructor de informes'],
  ['Conteúdo, membro, imagens e período configuráveis.', 'Configurable content, member, images and period.', 'Contenido, miembro, imágenes y período configurables.'],
  ['Prestação de contas', 'Accountability', 'Rendición de cuentas'],
  ['Relatórios prontos para consultar, arquivar e compartilhar.', 'Reports ready to review, archive and share.', 'Informes listos para consultar, archivar y compartir.'],
  ['A igreja pode visualizar os resultados na tela, baixar o PDF e, quando necessário, incluir as imagens vinculadas a cada lançamento para conferência documental.', 'The church can view results on screen, download the PDF and, when needed, include the images linked to each entry for document verification.', 'La iglesia puede ver los resultados en pantalla, descargar el PDF y, cuando sea necesario, incluir las imágenes vinculadas a cada registro para su verificación documental.'],
  ['Resultado demonstrativo de um relatório de doações', 'Demonstration result of a donation report', 'Resultado demostrativo de un informe de donaciones'],
  ['Resultado demonstrativo', 'Demonstration result', 'Resultado demostrativo'],
  ['Informação organizada para decisões e auditoria.', 'Organized information for decisions and audits.', 'Información organizada para decisiones y auditorías.'],
  ['Os dados são apresentados com período, membro, valor, método de pagamento e indicação da existência da imagem do envelope.', 'Data is presented with period, member, amount, payment method and an indication that an envelope image exists.', 'Los datos se presentan con período, miembro, importe, forma de pago e indicación de la existencia de la imagen del sobre.'],
  ['Filtros por período e por membro.', 'Filters by period and member.', 'Filtros por período y por miembro.'],
  ['Consolidação individual e anual.', 'Individual and annual consolidation.', 'Consolidación individual y anual.'],
  ['PDFs arquivados e disponíveis para recuperação.', 'Archived PDFs available for retrieval.', 'PDF archivados y disponibles para recuperación.'],
  ['Inclusão opcional das imagens dos comprovantes.', 'Optional inclusion of receipt images.', 'Inclusión opcional de las imágenes de los comprobantes.'],
  ['Exemplos gerados pelo sistema', 'Examples generated by the system', 'Ejemplos generados por el sistema'],
  ['Abra e consulte os relatórios completos.', 'Open and review the complete reports.', 'Abra y consulte los informes completos.'],
  ['Os documentos abaixo foram gerados pela própria plataforma e demonstram diferentes formatos de consolidação e conferência.', 'The documents below were generated by the platform itself and demonstrate different consolidation and verification formats.', 'Los documentos siguientes fueron generados por la propia plataforma y muestran distintos formatos de consolidación y verificación.'],
  ['Prévia do relatório anual por doador', 'Preview of the annual donor report', 'Vista previa del informe anual por donante'],
  ['Relatório anual', 'Annual report', 'Informe anual'],
  ['Resumo anual por doador', 'Annual summary by donor', 'Resumen anual por donante'],
  ['Tabela consolidada com os valores mensais e o total de cada membro no período selecionado.', 'Consolidated table with monthly amounts and each member’s total for the selected period.', 'Tabla consolidada con los importes mensuales y el total de cada miembro en el período seleccionado.'],
  ['Prévia do relatório detalhado com imagens dos envelopes', 'Preview of the detailed report with envelope images', 'Vista previa del informe detallado con imágenes de los sobres'],
  ['Relatório detalhado · 2 páginas', 'Detailed report · 2 pages', 'Informe detallado · 2 páginas'],
  ['Lançamentos com imagens', 'Entries with images', 'Registros con imágenes'],
  ['Cada registro apresenta membro, data, valor, operador e a fotografia privada do envelope quando disponível.', 'Each record shows the member, date, amount, operator and the private envelope photo when available.', 'Cada registro muestra el miembro, la fecha, el importe, el operador y la fotografía privada del sobre cuando está disponible.'],
  ['Prévia do relatório de totais por membro', 'Preview of the totals-by-member report', 'Vista previa del informe de totales por miembro'],
  ['Consolidação por membro', 'Member consolidation', 'Consolidación por miembro'],
  ['Totais de contribuições', 'Contribution totals', 'Totales de contribuciones'],
  ['Visão objetiva da quantidade de lançamentos e do valor total atribuído a cada membro.', 'An objective view of the number of entries and the total amount assigned to each member.', 'Vista objetiva de la cantidad de registros y del importe total atribuido a cada miembro.'],
  ['Abrir PDF completo', 'Open complete PDF', 'Abrir PDF completo'],
  ['Fluxo operacional', 'Operational workflow', 'Flujo operativo'],
  ['Do cadastro ao relatório em quatro etapas.', 'From registration to reporting in four steps.', 'Del registro al informe en cuatro etapas.'],
  ['A jornada foi desenhada para reduzir dúvidas e tornar a operação consistente mesmo entre equipes com níveis diferentes de familiaridade tecnológica.', 'The journey was designed to reduce uncertainty and keep operations consistent even among teams with different levels of technical familiarity.', 'El recorrido fue diseñado para reducir dudas y mantener una operación consistente incluso entre equipos con distintos niveles de familiaridad tecnológica.'],
  ['Passo 01', 'Step 01', 'Paso 01'],
  ['Selecionar a igreja', 'Select the church', 'Seleccionar la iglesia'],
  ['O usuário autorizado trabalha dentro da igreja ativa.', 'The authorized user works within the active church.', 'El usuario autorizado trabaja dentro de la iglesia activa.'],
  ['Passo 02', 'Step 02', 'Paso 02'],
  ['Localizar o membro', 'Find the member', 'Localizar al miembro'],
  ['Busca rápida por nome, e-mail ou telefone.', 'Quick search by name, email or phone.', 'Búsqueda rápida por nombre, correo o teléfono.'],
  ['Passo 03', 'Step 03', 'Paso 03'],
  ['Registrar o envelope', 'Record the envelope', 'Registrar el sobre'],
  ['Valor, método, data e imagem são salvos juntos.', 'Amount, method, date and image are saved together.', 'Importe, método, fecha e imagen se guardan juntos.'],
  ['Passo 04', 'Step 04', 'Paso 04'],
  ['Emitir o relatório', 'Generate the report', 'Emitir el informe'],
  ['A equipe visualiza, baixa e arquiva o documento gerado.', 'The team views, downloads and archives the generated document.', 'El equipo visualiza, descarga y archiva el documento generado.'],
  ['Segurança e privacidade', 'Security and privacy', 'Seguridad y privacidad'],
  ['Proteção em camadas para reduzir o risco de vazamento.', 'Layered protection to reduce the risk of data leaks.', 'Protección en capas para reducir el riesgo de fuga de datos.'],
  ['A segurança não depende de uma única barreira. A plataforma combina proteção de credenciais, sessão, autorização, banco de dados e arquivos privados, preservando o princípio do menor acesso possível.', 'Security does not depend on a single barrier. The platform combines credential, session, authorization, database and private-file protection while preserving the principle of least privilege.', 'La seguridad no depende de una única barrera. La plataforma combina la protección de credenciales, sesiones, autorizaciones, base de datos y archivos privados, preservando el principio de mínimo privilegio.'],
  ['Implementado', 'Implemented', 'Implementado'],
  ['Senhas protegidas', 'Protected passwords', 'Contraseñas protegidas'],
  ['Senhas são transformadas por algoritmo de derivação com sal individual; a senha original não é armazenada no banco.', 'Passwords are transformed with a derivation algorithm and individual salt; the original password is not stored in the database.', 'Las contraseñas se transforman mediante un algoritmo de derivación con sal individual; la contraseña original no se almacena en la base de datos.'],
  ['Sessões seguras', 'Secure sessions', 'Sesiones seguras'],
  ['Tokens opacos de alta entropia, somente o hash persistido, cookies HTTP-only, SameSite Strict e Secure em produção.', 'High-entropy opaque tokens, only the hash persisted, HTTP-only cookies, SameSite Strict and Secure in production.', 'Tokens opacos de alta entropía, solo el hash persistido, cookies HTTP-only, SameSite Strict y Secure en producción.'],
  ['Isolamento por igreja', 'Church-level isolation', 'Aislamiento por iglesia'],
  ['Contexto de igreja aplicado nas transações, políticas no banco e verificações para impedir acesso cruzado entre igrejas.', 'Church context applied to transactions, database policies and checks to prevent cross-church access.', 'Contexto de iglesia aplicado a las transacciones, políticas en la base de datos y verificaciones para impedir el acceso cruzado entre iglesias.'],
  ['Permissões por função', 'Role-based permissions', 'Permisos por función'],
  ['Rotas e operações são liberadas conforme o papel do usuário e sua associação válida com a igreja ativa.', 'Routes and operations are enabled according to the user’s role and valid association with the active church.', 'Las rutas y operaciones se habilitan según la función del usuario y su asociación válida con la iglesia activa.'],
  ['Arquivos privados', 'Private files', 'Archivos privados'],
  ['Imagens e PDFs ficam em armazenamento privado. O acesso usa links temporários, com validade padrão de cinco minutos.', 'Images and PDFs remain in private storage. Access uses temporary links with a default five-minute validity.', 'Las imágenes y los PDF permanecen en almacenamiento privado. El acceso utiliza enlaces temporales con una vigencia predeterminada de cinco minutos.'],
  ['Limites e validação', 'Limits and validation', 'Límites y validación'],
  ['Upload restrito a JPEG ou PNG com até 4 MB, políticas de origem, cabeçalhos de segurança e limites para o corpo das requisições.', 'Uploads restricted to JPEG or PNG up to 4 MB, origin policies, security headers and request-body limits.', 'Carga restringida a JPEG o PNG de hasta 4 MB, políticas de origen, encabezados de seguridad y límites para el cuerpo de las solicitudes.'],
  ['Pacote de preparação para produção', 'Production readiness package', 'Paquete de preparación para producción'],
  ['Antes da entrada em operação serão configurados e testados: limitação de tentativas de login, cópia e restauração de backup, monitoramento com dados sensíveis removidos, rotação de segredos e procedimento de resposta a incidentes.', 'Before go-live, the following will be configured and tested: login attempt limits, backup and restore, monitoring with sensitive data removed, secret rotation and an incident-response procedure.', 'Antes de la puesta en marcha se configurarán y probarán: limitación de intentos de inicio de sesión, copia y restauración de respaldo, monitoreo sin datos sensibles, rotación de secretos y procedimiento de respuesta a incidentes.'],
  ['Incluído na implantação', 'Included in implementation', 'Incluido en la implementación'],
  ['Investimento por igreja', 'Investment per church', 'Inversión por iglesia'],
  ['Duas formas de contratar. Uma decisão por igreja.', 'Two ways to contract. One decision per church.', 'Dos formas de contratar. Una decisión por iglesia.'],
  ['Não existe compromisso mínimo para a rede. Uma igreja pode aderir e outra não; cada contratação possui implantação, ambiente, dados e cobrança individualizados.', 'There is no network-wide minimum commitment. One church may join while another may not; each contract has its own implementation, environment, data and billing.', 'No existe un compromiso mínimo para toda la red. Una iglesia puede adherirse y otra no; cada contratación tiene implementación, entorno, datos y facturación individuales.'],
  ['Todos os valores abaixo são para 1 igreja.', 'All prices below are for 1 church.', 'Todos los valores siguientes corresponden a 1 iglesia.'],
  ['Novas igrejas recebem sua própria proposta e escolhem a modalidade mais adequada à realidade local.', 'New churches receive their own proposal and choose the option that best fits their local needs.', 'Las nuevas iglesias reciben su propia propuesta y eligen la modalidad más adecuada a su realidad local.'],
  ['Valores sujeitos a negociação.', 'Prices are subject to negotiation.', 'Los valores están sujetos a negociación.'],
  ['As condições comerciais podem ser ajustadas conforme o escopo, o prazo e as necessidades específicas de cada igreja.', 'Commercial terms may be adjusted according to scope, timeline and the specific needs of each church.', 'Las condiciones comerciales pueden ajustarse según el alcance, el plazo y las necesidades específicas de cada iglesia.'],
  ['Sem pacote de 150 unidades', 'No 150-unit package', 'Sin paquete de 150 unidades'],
  ['Modalidade 01', 'Option 01', 'Modalidad 01'],
  ['Aquisição do código completo', 'Full source-code acquisition', 'Adquisición del código fuente completo'],
  ['Para a igreja que deseja manter uma cópia própria do sistema e assumir a infraestrutura após a entrega.', 'For a church that wants to keep its own copy of the system and assume responsibility for infrastructure after delivery.', 'Para la iglesia que desea conservar una copia propia del sistema y asumir la infraestructura después de la entrega.'],
  ['US$ 14.900', 'US$ 14,900', 'US$ 14.900'],
  ['pagamento único', 'one-time payment', 'pago único'],
  ['por igreja', 'per church', 'por iglesia'],
  ['Inclui', 'Includes', 'Incluye'],
  ['Código-fonte completo da aplicação.', 'Complete application source code.', 'Código fuente completo de la aplicación.'],
  ['Licença perpétua e não exclusiva para uma igreja.', 'Perpetual, non-exclusive license for one church.', 'Licencia perpetua y no exclusiva para una iglesia.'],
  ['Configuração de um ambiente de produção.', 'Configuration of one production environment.', 'Configuración de un entorno de producción.'],
  ['Importação inicial de até 500 membros.', 'Initial import of up to 500 members.', 'Importación inicial de hasta 500 miembros.'],
  ['Duas sessões remotas de treinamento.', 'Two remote training sessions.', 'Dos sesiones remotas de capacitación.'],
  ['Documentação técnica e operacional.', 'Technical and operational documentation.', 'Documentación técnica y operativa.'],
  ['Garantia corretiva de 90 dias após o aceite.', '90-day corrective warranty after acceptance.', 'Garantía correctiva de 90 días después de la aceptación.'],
  ['Pagamento sugerido', 'Suggested payment schedule', 'Forma de pago sugerida'],
  ['40% na contratação (US$ 5.960), 30% na homologação (US$ 4.470) e 30% na entrega (US$ 4.470). À vista: US$ 14.155, com 5% de desconto.', '40% at signing (US$ 5,960), 30% at acceptance testing (US$ 4,470) and 30% at delivery (US$ 4,470). Upfront: US$ 14,155, with a 5% discount.', '40% al contratar (US$ 5.960), 30% en la homologación (US$ 4.470) y 30% en la entrega (US$ 4.470). Al contado: US$ 14.155, con un 5% de descuento.'],
  ['Recomendado', 'Recommended', 'Recomendado'],
  ['Modalidade 02', 'Option 02', 'Modalidad 02'],
  ['Implementação + mensalidade', 'Implementation + monthly subscription', 'Implementación + mensualidad'],
  ['Para a igreja que prefere utilizar o sistema sem administrar servidores, atualizações e rotina técnica.', 'For a church that prefers to use the system without managing servers, updates and technical operations.', 'Para la iglesia que prefiere utilizar el sistema sin administrar servidores, actualizaciones y la operación técnica.'],
  ['por mês', 'per month', 'por mes'],
  ['Implantação inicial: US$ 1.290', 'Initial implementation: US$ 1,290', 'Implementación inicial: US$ 1.290'],
  ['Ambiente hospedado e administrado.', 'Hosted and managed environment.', 'Entorno alojado y administrado.'],
  ['Configuração e importação de até 500 membros.', 'Configuration and import of up to 500 members.', 'Configuración e importación de hasta 500 miembros.'],
  ['Atualizações funcionais e de segurança.', 'Functional and security updates.', 'Actualizaciones funcionales y de seguridad.'],
  ['Backups, monitoramento e manutenção técnica.', 'Backups, monitoring and technical maintenance.', 'Copias de respaldo, monitoreo y mantenimiento técnico.'],
  ['Suporte remoto em horário comercial.', 'Remote support during business hours.', 'Soporte remoto en horario comercial.'],
  ['Até 10 usuários administrativos e 10 GB de arquivos.', 'Up to 10 administrative users and 10 GB of files.', 'Hasta 10 usuarios administrativos y 10 GB de archivos.'],
  ['Implantação: 50% no início e 50% no aceite. Mensalidade a partir da entrada em produção, com permanência mínima de 12 meses. Anuidade antecipada: US$ 2.041,20, com 10% de desconto.', 'Implementation: 50% at kickoff and 50% at acceptance. Monthly subscription starts at go-live, with a 12-month minimum term. Prepaid annual subscription: US$ 2,041.20, with a 10% discount.', 'Implementación: 50% al inicio y 50% en la aceptación. La mensualidad comienza con la puesta en producción, con una permanencia mínima de 12 meses. Anualidad anticipada: US$ 2.041,20, con un 10% de descuento.'],
  ['Comparação', 'Comparison', 'Comparación'],
  ['Aquisição do código', 'Source-code acquisition', 'Adquisición del código'],
  ['Investimento inicial', 'Initial investment', 'Inversión inicial'],
  ['US$ 1.290', 'US$ 1,290', 'US$ 1.290'],
  ['Recorrência obrigatória', 'Required recurring fee', 'Pago recurrente obligatorio'],
  ['Não', 'No', 'No'],
  ['US$ 189/mês', 'US$ 189/month', 'US$ 189/mes'],
  ['Infraestrutura', 'Infrastructure', 'Infraestructura'],
  ['Responsabilidade da igreja após a entrega', 'Church responsibility after delivery', 'Responsabilidad de la iglesia después de la entrega'],
  ['Administrada e incluída', 'Managed and included', 'Administrada e incluida'],
  ['Atualizações contínuas', 'Continuous updates', 'Actualizaciones continuas'],
  ['Plano opcional', 'Optional plan', 'Plan opcional'],
  ['Incluídas', 'Included', 'Incluidas'],
  ['Melhor para', 'Best for', 'Ideal para'],
  ['Autonomia técnica e investimento de capital', 'Technical autonomy and capital investment', 'Autonomía técnica e inversión de capital'],
  ['Previsibilidade e operação sem equipe técnica', 'Predictability and operation without a technical team', 'Previsibilidad y operación sin equipo técnico'],
  ['Nota sobre a aquisição:', 'Acquisition note:', 'Nota sobre la adquisición:'],
  ['“código completo” significa licença perpétua, irrevogável e não exclusiva para uso por uma igreja. A propriedade intelectual original permanece com o fornecedor, permitindo a contratação individual por outras igrejas. Cessão exclusiva dos direitos sobre o produto, que impediria sua comercialização para outras unidades, não está incluída e exige negociação específica. Suporte e atualizações após os 90 dias podem ser contratados por US$ 2.490/ano ou US$ 249/mês. Na modalidade de aquisição, custos de nuvem e serviços de terceiros são pagos pela igreja e estimados inicialmente entre US$ 25 e US$ 100/mês, conforme uso.', '“Complete source code” means a perpetual, irrevocable and non-exclusive license for use by one church. The original intellectual property remains with the supplier, allowing individual contracts with other churches. Exclusive assignment of product rights, which would prevent its sale to other units, is not included and requires a separate negotiation. Support and updates after the 90-day period may be purchased for US$ 2,490/year or US$ 249/month. Under the acquisition option, cloud and third-party service costs are paid by the church and initially estimated at US$ 25 to US$ 100/month, depending on usage.', '“Código completo” significa una licencia perpetua, irrevocable y no exclusiva para uso de una iglesia. La propiedad intelectual original permanece con el proveedor, lo que permite la contratación individual por otras iglesias. La cesión exclusiva de los derechos del producto, que impediría su comercialización a otras unidades, no está incluida y requiere una negociación específica. El soporte y las actualizaciones después de los 90 días pueden contratarse por US$ 2.490/año o US$ 249/mes. En la modalidad de adquisición, los costos de nube y servicios de terceros son pagados por la iglesia y se estiman inicialmente entre US$ 25 y US$ 100/mes, según el uso.'],
  ['Plano de implantação', 'Implementation plan', 'Plan de implementación'],
  ['Entrada em produção em 10 a 15 dias úteis.', 'Go-live in 10 to 15 business days.', 'Puesta en producción en 10 a 15 días hábiles.'],
  ['O prazo começa após a assinatura, o pagamento inicial e o recebimento dos dados e responsáveis indicados pela igreja.', 'The timeline begins after signing, initial payment and receipt of the data and contacts designated by the church.', 'El plazo comienza después de la firma, el pago inicial y la recepción de los datos y responsables indicados por la iglesia.'],
  ['Etapa 01 · 2 dias', 'Stage 01 · 2 days', 'Etapa 01 · 2 días'],
  ['Kick-off e diagnóstico', 'Kickoff and assessment', 'Inicio y diagnóstico'],
  ['Definição dos responsáveis, igreja, usuários, idioma, domínio e formato dos dados existentes.', 'Definition of contacts, church, users, language, domain and the format of existing data.', 'Definición de responsables, iglesia, usuarios, idioma, dominio y formato de los datos existentes.'],
  ['Etapa 02 · 5 dias', 'Stage 02 · 5 days', 'Etapa 02 · 5 días'],
  ['Configuração e importação', 'Configuration and import', 'Configuración e importación'],
  ['Preparação do ambiente, segurança, perfis e carga inicial dos membros fornecidos pela igreja.', 'Environment, security and role setup, followed by the initial load of members supplied by the church.', 'Preparación del entorno, seguridad, perfiles y carga inicial de los miembros proporcionados por la iglesia.'],
  ['Etapa 03 · 3 dias', 'Stage 03 · 3 days', 'Etapa 03 · 3 días'],
  ['Homologação e treinamento', 'Acceptance testing and training', 'Homologación y capacitación'],
  ['Validação dos fluxos, testes com responsáveis e treinamento da equipe administrativa.', 'Workflow validation, testing with designated contacts and administrative-team training.', 'Validación de los flujos, pruebas con los responsables y capacitación del equipo administrativo.'],
  ['Etapa 04 · 2 dias', 'Stage 04 · 2 days', 'Etapa 04 · 2 días'],
  ['Entrada em produção', 'Go-live', 'Puesta en producción'],
  ['Publicação, acompanhamento assistido e correção de eventuais ajustes de configuração.', 'Release, assisted follow-up and correction of any configuration adjustments.', 'Publicación, acompañamiento asistido y corrección de eventuales ajustes de configuración.'],
  ['Responsabilidades do fornecedor', 'Supplier responsibilities', 'Responsabilidades del proveedor'],
  ['Configurar e validar o ambiente contratado.', 'Configure and validate the contracted environment.', 'Configurar y validar el entorno contratado.'],
  ['Importar os dados recebidos no formato acordado.', 'Import the data received in the agreed format.', 'Importar los datos recibidos en el formato acordado.'],
  ['Treinar os responsáveis e fornecer documentação.', 'Train designated staff and provide documentation.', 'Capacitar a los responsables y proporcionar documentación.'],
  ['Aplicar os controles técnicos descritos nesta proposta.', 'Apply the technical controls described in this proposal.', 'Aplicar los controles técnicos descritos en esta propuesta.'],
  ['Corrigir defeitos cobertos pela garantia ou assinatura.', 'Correct defects covered by the warranty or subscription.', 'Corregir defectos cubiertos por la garantía o la suscripción.'],
  ['Responsabilidades da igreja', 'Church responsibilities', 'Responsabilidades de la iglesia'],
  ['Indicar um responsável pela implantação e aceite.', 'Designate an implementation and acceptance owner.', 'Designar un responsable de la implementación y aceptación.'],
  ['Fornecer dados corretos e autorização para importação.', 'Provide accurate data and authorization for import.', 'Proporcionar datos correctos y autorización para la importación.'],
  ['Gerenciar quem terá acesso administrativo ao sistema.', 'Manage who has administrative access to the system.', 'Administrar quién tendrá acceso administrativo al sistema.'],
  ['Orientar sua equipe sobre sigilo e uso adequado.', 'Guide its team on confidentiality and proper use.', 'Orientar a su equipo sobre confidencialidad y uso adecuado.'],
  ['Validar os resultados dentro do período de homologação.', 'Validate results during the acceptance period.', 'Validar los resultados dentro del período de homologación.'],
  ['Premissas e itens não incluídos', 'Assumptions and exclusions', 'Supuestos y elementos no incluidos'],
  ['O sistema registra contribuições; não processa pagamentos e não substitui software contábil.', 'The system records contributions; it does not process payments or replace accounting software.', 'El sistema registra contribuciones; no procesa pagos ni sustituye al software contable.'],
  ['Integrações bancárias, gateways, aplicativos móveis nativos e conciliação automática exigem orçamento adicional.', 'Bank integrations, payment gateways, native mobile apps and automatic reconciliation require an additional estimate.', 'Las integraciones bancarias, pasarelas de pago, aplicaciones móviles nativas y la conciliación automática requieren un presupuesto adicional.'],
  ['Migrações acima de 500 membros ou dados com tratamento especial serão estimadas após análise.', 'Migrations exceeding 500 members or data requiring special treatment will be estimated after review.', 'Las migraciones de más de 500 miembros o los datos que requieran tratamiento especial se cotizarán después del análisis.'],
  ['Domínio, taxas de terceiros e impostos aplicáveis não estão incluídos, salvo indicação expressa.', 'Domain, third-party fees and applicable taxes are not included unless expressly stated.', 'El dominio, las tarifas de terceros y los impuestos aplicables no están incluidos, salvo indicación expresa.'],
  ['Suporte e nível de serviço', 'Support and service level', 'Soporte y nivel de servicio'],
  ['Atendimento remoto em dias úteis, dentro do horário comercial acordado com a igreja.', 'Remote support on business days during the business hours agreed with the church.', 'Atención remota en días hábiles, dentro del horario comercial acordado con la iglesia.'],
  ['Incidente crítico: primeira resposta em até 4 horas úteis.', 'Critical incident: initial response within 4 business hours.', 'Incidente crítico: primera respuesta en un máximo de 4 horas hábiles.'],
  ['Meta de disponibilidade na modalidade mensal: 99,5%, excluindo manutenções programadas e falhas de terceiros.', 'Monthly subscription availability target: 99.5%, excluding scheduled maintenance and third-party failures.', 'Objetivo de disponibilidad en la modalidad mensual: 99,5%, excluyendo mantenimientos programados y fallas de terceros.'],
  ['Ajustes evolutivos específicos são avaliados e orçados antes da execução.', 'Specific enhancements are reviewed and quoted before execution.', 'Las mejoras específicas se evalúan y cotizan antes de su ejecución.'],
  ['Próximo passo', 'Next step', 'Próximo paso'],
  ['Contato', 'Contact', 'Contacto'],
  ['Em caso de dúvidas, estou à disposição.', 'If you have any questions, I am available to help.', 'Si tiene alguna duda, estoy a su disposición.'],
  ['Entre em contato para conversar sobre o sistema, condições comerciais, implantação ou qualquer necessidade específica da igreja.', 'Please get in touch to discuss the system, commercial terms, implementation or any specific needs of the church.', 'Póngase en contacto para conversar sobre el sistema, las condiciones comerciales, la implementación o cualquier necesidad específica de la iglesia.'],
  ['E-mail', 'Email', 'Correo electrónico'],
  ['Telefone / WhatsApp', 'Phone / WhatsApp', 'Teléfono / WhatsApp'],
  ['Escolher a modalidade e iniciar a implantação da igreja.', 'Choose an option and begin the church’s implementation.', 'Elegir la modalidad e iniciar la implementación de la iglesia.'],
  ['A assinatura desta proposta confirma o escopo comercial. O contrato definitivo detalhará proteção de dados, condições de pagamento, suporte, rescisão e responsabilidades de cada parte.', 'Signing this proposal confirms the commercial scope. The final agreement will detail data protection, payment terms, support, termination and each party’s responsibilities.', 'La firma de esta propuesta confirma el alcance comercial. El contrato definitivo detallará la protección de datos, las condiciones de pago, el soporte, la rescisión y las responsabilidades de cada parte.'],
  ['Igreja contratante', 'Contracting church', 'Iglesia contratante'],
  ['Nome, assinatura e data', 'Name, signature and date', 'Nombre, firma y fecha'],
  ['Responsável pelo fornecedor', 'Supplier representative', 'Representante del proveedor'],
  ['Modalidade escolhida', 'Selected option', 'Modalidad elegida'],
  ['☐ Aquisição do código &nbsp; ☐ Mensalidade', '☐ Source-code acquisition &nbsp; ☐ Subscription', '☐ Adquisición del código &nbsp; ☐ Mensualidad'],
  ['Universal · Sistema de Gestão Financeira', 'Universal · Financial Management System', 'Universal · Sistema de Gestión Financiera'],
  ['Proposta PC-2026-0806 · Valores individuais por igreja', 'Proposal PC-2026-0806 · Individual pricing per church', 'Propuesta PC-2026-0806 · Valores individuales por iglesia'],
  ['Valores individuais por igreja · sujeitos a negociação', 'Individual pricing per church · subject to negotiation', 'Valores individuales por iglesia · sujetos a negociación'],
];

const languageCss = `
      .language-links {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-right: 4px;
      }

      .topbar__actions .language-links a {
        display: inline-flex;
        min-height: 34px;
        padding: 0 9px;
        border-color: transparent;
        color: rgba(255, 255, 255, 0.66);
        font-size: 0.7rem;
      }

      .topbar__actions .language-links a.is-active {
        border-color: rgba(255, 255, 255, 0.23);
        color: white;
        background: rgba(255, 255, 255, 0.09);
      }

      @media (max-width: 620px) {
        .print-button {
          display: none;
        }

        .topbar__actions .language-links a {
          display: inline-flex;
        }
      }

`;

const files = {
  'pt-BR': 'proposta-comercial-uckg-pt.html',
  en: 'commercial-proposal-uckg-en.html',
  es: 'propuesta-comercial-uckg-es.html',
};

const labels = {
  'pt-BR': 'Idiomas da proposta',
  en: 'Proposal languages',
  es: 'Idiomas de la propuesta',
};

function languageNav(locale) {
  return `<nav class="language-links" aria-label="${labels[locale]}"><a class="${locale === 'pt-BR' ? 'is-active' : ''}" href="${files['pt-BR']}">PT</a><a class="${locale === 'en' ? 'is-active' : ''}" href="${files.en}">EN</a><a class="${locale === 'es' ? 'is-active' : ''}" href="${files.es}">ES</a></nav>`;
}

function applyTranslations(value, targetIndex) {
  const translations = [...rows].sort((a, b) => b[0].length - a[0].length);
  translations.forEach((row, index) => {
    value = value.replaceAll(row[0], `__UCKG_I18N_${index}__`);
  });
  translations.forEach((row, index) => {
    value = value.replaceAll(`__UCKG_I18N_${index}__`, row[targetIndex]);
  });
  return value;
}

function translateBody(html, locale) {
  if (locale === 'pt-BR') return html;
  const targetIndex = locale === 'en' ? 1 : 2;
  const match = html.match(/<body>[\s\S]*?<\/body>/);
  if (!match) throw new Error('Body not found.');
  let body = match[0].replace(/\s+/g, ' ');
  body = applyTranslations(body, targetIndex);
  return html.replace(match[0], body);
}

for (const locale of ['pt-BR', 'en', 'es']) {
  let html = translateBody(source, locale)
    .replace('<html lang="pt-BR">', `<html lang="${locale}">`)
    .replace('      @media (max-width: 900px) {', `${languageCss}      @media (max-width: 900px) {`)
    .replace('<div class="topbar__actions">', `<div class="topbar__actions">${languageNav(locale)}`);

  if (locale !== 'pt-BR') {
    const targetIndex = locale === 'en' ? 1 : 2;
    const headMatch = html.match(/<head>[\s\S]*?<\/head>/);
    if (!headMatch) throw new Error('Head not found.');
    const head = applyTranslations(headMatch[0], targetIndex);
    html = html.replace(headMatch[0], head);
    html = html.replaceAll('assets/screens/', `assets/screens/${locale}/`);
  }

  await writeFile(new URL(`./${files[locale]}`, import.meta.url), html);
}

console.log(Object.values(files).join('\n'));
