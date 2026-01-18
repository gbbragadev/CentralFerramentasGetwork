export type DefaultRecipientsMapping = {
  phonePath: string;
  namePath?: string;
  iterateOverPath?: string;
  filterExpression?: string;
};

export type DefaultMappings = {
  employeeNamePath?: string;
  companyNamePath?: string;
  defaultRecipients: DefaultRecipientsMapping;
};

export type DataSourcePreset = {
  id: string;
  name: string;
  description: string;
  module: string;
  apiModule: string;
  apiMethod: 'GET' | 'POST';
  apiEndpoint: string;
  apiParams: Record<string, unknown>;
  responseDataPath?: string;
  availableFields?: string[];
  defaultMappings?: DefaultMappings;
};

export type TemplatePreset = {
  id: string;
  name: string;
  description: string;
  module: string;
  messageBody: string;
  recipientField?: string;
  recipientNameField?: string;
  iterateOverField?: string;
  filterExpression?: string;
};

export type ModulePreset = {
  id: string;
  label: string;
  description: string;
  apiModule: string;
  defaultDataSource: Omit<DataSourcePreset, 'id' | 'module' | 'description'> & {
    description?: string;
  };
  defaultMappings: DefaultMappings;
  dataSourcePresets: DataSourcePreset[];
  templatePresets: TemplatePreset[];
  endpoints: Array<{ path: string; name: string; method: 'GET' | 'POST' }>;
};

export const modulePresets: ModulePreset[] = [
  {
    id: 'PLATFORM_SIGN',
    label: 'Platform Sign',
    description: 'Assinaturas eletronicas e digitais',
    apiModule: 'sign',
    defaultDataSource: {
      name: 'Envelopes pendentes de assinatura',
      description: 'Lista envelopes aguardando assinatura',
      apiModule: 'sign',
      apiMethod: 'POST',
      apiEndpoint: 'queries/listEnvelopes',
      apiParams: {
        status: ['PENDING'],
        offset: 0,
        limit: 100,
      },
      responseDataPath: 'contents',
    },
    defaultMappings: {
      employeeNamePath: 'signers[].name',
      companyNamePath: 'createdBy',
      defaultRecipients: {
        phonePath: 'signers[].phoneNumber',
        namePath: 'signers[].name',
        iterateOverPath: 'signers',
        filterExpression: "status == 'PENDING'",
      },
    },
    dataSourcePresets: [
      {
        id: 'sign-list-envelopes-pending',
        name: 'Envelopes pendentes de assinatura',
        description: 'Lista envelopes aguardando assinatura',
        module: 'PLATFORM_SIGN',
        apiModule: 'sign',
        apiMethod: 'POST',
        apiEndpoint: 'queries/listEnvelopes',
        apiParams: {
          status: ['PENDING'],
          offset: 0,
          limit: 100,
        },
        responseDataPath: 'contents',
        availableFields: [
          'id',
          'name',
          'status',
          'createdBy',
          'createdDate',
          'expirationDate',
          'signers[].name',
          'signers[].email',
          'signers[].phoneNumber',
          'signers[].status',
        ],
      },
      {
        id: 'sign-envelope-info',
        name: 'Detalhes do envelope',
        description: 'Busca informacoes completas de um envelope',
        module: 'PLATFORM_SIGN',
        apiModule: 'sign',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getEnvelopeInfo',
        apiParams: {
          envelopeId: '{{envelopeId}}',
        },
        responseDataPath: 'envelope',
        availableFields: [
          'id',
          'name',
          'status',
          'createdBy',
          'createdDate',
          'instructionsToSigner',
          'signers[].name',
          'signers[].email',
          'signers[].phoneNumber',
          'documents[].originalFilename',
        ],
      },
    ],
    templatePresets: [
      {
        id: 'sign-pending',
        name: 'Assinatura pendente',
        description: 'Aviso de assinatura pendente',
        module: 'PLATFORM_SIGN',
        messageBody: `Ola {{signers[].name}},

Existe um documento pendente de assinatura: *{{name}}*.

Assine aqui: {{signUrl}}

Atenciosamente,
{{tenantName}}`,
        recipientField: 'signers[].phoneNumber',
        recipientNameField: 'signers[].name',
        iterateOverField: 'signers',
        filterExpression: "status == 'PENDING'",
      },
    ],
    endpoints: [
      { path: 'queries/listEnvelopes', name: 'Listar envelopes', method: 'POST' },
      { path: 'queries/getEnvelopeInfo', name: 'Info do envelope', method: 'POST' },
      { path: 'queries/getSignatureEnvelopeConfiguration', name: 'Config para assinatura', method: 'POST' },
      { path: 'queries/countListEnvelopes', name: 'Contar envelopes', method: 'POST' },
      { path: 'actions/resendRequestSign', name: 'Reenviar solicitacao', method: 'POST' },
    ],
  },
  {
    id: 'HCM_GED',
    label: 'HCM GED (ECM)',
    description: 'Gestao de documentos e GED',
    apiModule: 'ecm_ged',
    defaultDataSource: {
      name: 'Status de assinatura do envelope',
      description: 'Status detalhado de assinaturas',
      apiModule: 'ecm_ged',
      apiMethod: 'POST',
      apiEndpoint: 'queries/getEnvelopeSignStatus',
      apiParams: {
        envelopeId: '{{envelopeId}}',
      },
      responseDataPath: '',
    },
    defaultMappings: {
      employeeNamePath: 'signers[].name',
      companyNamePath: '',
      defaultRecipients: {
        phonePath: 'signers[].phoneNumber',
        namePath: 'signers[].name',
        iterateOverPath: 'signers',
        filterExpression: "status == 'PENDING'",
      },
    },
    dataSourcePresets: [
      {
        id: 'ged-sign-urls',
        name: 'URLs de assinatura',
        description: 'Retorna URLs base para assinatura',
        module: 'HCM_GED',
        apiModule: 'ecm_ged',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getSignUrls',
        apiParams: {},
        responseDataPath: '',
        availableFields: ['requestToken', 'sign'],
      },
      {
        id: 'ged-envelope-status',
        name: 'Status do envelope',
        description: 'Status detalhado dos signatarios',
        module: 'HCM_GED',
        apiModule: 'ecm_ged',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getEnvelopeSignStatus',
        apiParams: {
          envelopeId: '{{envelopeId}}',
        },
        responseDataPath: '',
        availableFields: ['envelopeId', 'status', 'isFinished', 'signers[].email', 'signers[].name', 'signers[].status'],
      },
    ],
    templatePresets: [
      {
        id: 'ged-doc-pending',
        name: 'Documento pendente no GED',
        description: 'Aviso de documento pendente',
        module: 'HCM_GED',
        messageBody: `Ola {{signers[].name}},

Voce tem um documento pendente no GED.

Acesse: {{signUrl}}`,
        recipientField: 'signers[].phoneNumber',
        recipientNameField: 'signers[].name',
        iterateOverField: 'signers',
        filterExpression: "status == 'PENDING'",
      },
    ],
    endpoints: [
      { path: 'queries/getSignUrls', name: 'URLs de assinatura', method: 'POST' },
      { path: 'queries/getEnvelopeSignStatus', name: 'Status do envelope', method: 'POST' },
      { path: 'queries/getEnvelopeHistory', name: 'Historico', method: 'POST' },
      { path: 'queries/getSignedDocuments', name: 'Docs assinados', method: 'POST' },
    ],
  },
  {
    id: 'HCM_EMPLOYEEJOURNEY',
    label: 'HCM Employee Journey',
    description: 'Jornada do colaborador',
    apiModule: 'hcm_employeejourney',
    defaultDataSource: {
      name: 'Colaboradores em jornada',
      description: 'Lista registros da jornada de colaboradores',
      apiModule: 'hcm_employeejourney',
      apiMethod: 'POST',
      apiEndpoint: 'queries/listEmployees',
      apiParams: {
        offset: 0,
        limit: 100,
      },
      responseDataPath: 'contents',
    },
    defaultMappings: {
      employeeNamePath: 'contents[].name',
      companyNamePath: 'contents[].companyName',
      defaultRecipients: {
        phonePath: 'contents[].phoneNumber',
        namePath: 'contents[].name',
        iterateOverPath: 'contents',
        filterExpression: '',
      },
    },
    dataSourcePresets: [
      {
        id: 'employeejourney-list',
        name: 'Lista de colaboradores',
        description: 'Lista colaboradores na jornada',
        module: 'HCM_EMPLOYEEJOURNEY',
        apiModule: 'hcm_employeejourney',
        apiMethod: 'POST',
        apiEndpoint: 'queries/listEmployees',
        apiParams: {
          offset: 0,
          limit: 100,
        },
        responseDataPath: 'contents',
        availableFields: ['id', 'name', 'email', 'phoneNumber', 'companyName'],
      },
    ],
    templatePresets: [
      {
        id: 'employeejourney-notification',
        name: 'Jornada do colaborador',
        description: 'Aviso de etapa da jornada',
        module: 'HCM_EMPLOYEEJOURNEY',
        messageBody: `Ola {{contents[].name}},

Ha uma atualizacao na sua jornada de colaborador.`,
        recipientField: 'contents[].phoneNumber',
        recipientNameField: 'contents[].name',
        iterateOverField: 'contents',
      },
    ],
    endpoints: [
      { path: 'queries/listEmployees', name: 'Listar colaboradores', method: 'POST' },
      { path: 'queries/getEmployee', name: 'Dados do colaborador', method: 'POST' },
    ],
  },
  {
    id: 'PLATFORM_USER',
    label: 'Platform User',
    description: 'Usuarios da plataforma',
    apiModule: 'user',
    defaultDataSource: {
      name: 'Usuarios da plataforma',
      description: 'Lista usuarios da plataforma',
      apiModule: 'user',
      apiMethod: 'POST',
      apiEndpoint: 'queries/listUsers',
      apiParams: {
        offset: 0,
        limit: 100,
      },
      responseDataPath: 'contents',
    },
    defaultMappings: {
      employeeNamePath: 'contents[].name',
      companyNamePath: '',
      defaultRecipients: {
        phonePath: 'contents[].phoneNumber',
        namePath: 'contents[].name',
        iterateOverPath: 'contents',
        filterExpression: '',
      },
    },
    dataSourcePresets: [
      {
        id: 'platform-user-list',
        name: 'Usuarios da plataforma',
        description: 'Lista usuarios da plataforma',
        module: 'PLATFORM_USER',
        apiModule: 'user',
        apiMethod: 'POST',
        apiEndpoint: 'queries/listUsers',
        apiParams: {
          offset: 0,
          limit: 100,
        },
        responseDataPath: 'contents',
        availableFields: ['id', 'name', 'email', 'phoneNumber'],
      },
    ],
    templatePresets: [
      {
        id: 'platform-user-notification',
        name: 'Aviso para usuario',
        description: 'Mensagem generica para usuarios',
        module: 'PLATFORM_USER',
        messageBody: `Ola {{contents[].name}},

Voce possui uma atualizacao na plataforma.`,
        recipientField: 'contents[].phoneNumber',
        recipientNameField: 'contents[].name',
        iterateOverField: 'contents',
      },
    ],
    endpoints: [
      { path: 'queries/listUsers', name: 'Listar usuarios', method: 'POST' },
      { path: 'queries/getUser', name: 'Dados do usuario', method: 'POST' },
    ],
  },
  {
    id: 'PLATFORM_AUTHORIZATION',
    label: 'Platform Authorization',
    description: 'Autorizacoes e permissoes',
    apiModule: 'authorization',
    defaultDataSource: {
      name: 'Perfis e autorizacoes',
      description: 'Lista perfis e autorizacoes',
      apiModule: 'authorization',
      apiMethod: 'POST',
      apiEndpoint: 'queries/listProfiles',
      apiParams: {
        offset: 0,
        limit: 100,
      },
      responseDataPath: 'contents',
    },
    defaultMappings: {
      employeeNamePath: '',
      companyNamePath: '',
      defaultRecipients: {
        phonePath: 'contents[].phoneNumber',
        namePath: 'contents[].name',
        iterateOverPath: 'contents',
        filterExpression: '',
      },
    },
    dataSourcePresets: [
      {
        id: 'authorization-profiles',
        name: 'Perfis de acesso',
        description: 'Lista perfis de autorizacao',
        module: 'PLATFORM_AUTHORIZATION',
        apiModule: 'authorization',
        apiMethod: 'POST',
        apiEndpoint: 'queries/listProfiles',
        apiParams: {
          offset: 0,
          limit: 100,
        },
        responseDataPath: 'contents',
        availableFields: ['id', 'name', 'description'],
      },
    ],
    templatePresets: [
      {
        id: 'authorization-notification',
        name: 'Atualizacao de autorizacao',
        description: 'Aviso de mudanca de perfil',
        module: 'PLATFORM_AUTHORIZATION',
        messageBody: `Ola,

Houve uma atualizacao nas autorizacoes da sua conta.`,
      },
    ],
    endpoints: [
      { path: 'queries/listProfiles', name: 'Listar perfis', method: 'POST' },
      { path: 'queries/getProfile', name: 'Dados do perfil', method: 'POST' },
    ],
  },
];
